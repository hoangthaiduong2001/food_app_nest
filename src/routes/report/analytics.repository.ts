import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toDateRange(dateFrom?: string, dateTo?: string) {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 86400_000);
    const to = dateTo ? new Date(dateTo + 'T23:59:59.999Z') : new Date();
    // Kỳ trước cùng độ dài để tính growth
    const diffMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - diffMs);
    const prevTo = new Date(from.getTime() - 1);
    return { from, to, prevFrom, prevTo };
  }

  private growthPct(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async getAdminDashboard(dateFrom?: string, dateTo?: string) {
    const { from, to, prevFrom, prevTo } = this.toDateRange(dateFrom, dateTo);

    const [
      revenueRow,
      prevRevenueRow,
      ordersByStatus,
      totalUsers,
      newUsers,
      prevNewUsers,
      sellersByStatus,
      topSellers,
      revenueByDay,
      totalProducts,
      commissionRow,
      pendingSettlement,
    ] = await Promise.all([
      // Doanh thu + số đơn kỳ hiện tại (chỉ đơn SUCCESS/DELIVERED)
      this.prisma.$queryRaw<{ revenue: bigint; order_count: bigint }[]>`
        SELECT COALESCE(SUM("finalAmount"), 0) AS revenue,
               COUNT(*)::bigint               AS order_count
        FROM "Order"
        WHERE "deletedAt" IS NULL
          AND "paymentStatus" = 'SUCCESS'
          AND "createdAt" BETWEEN ${from} AND ${to}
      `,

      // Doanh thu kỳ trước
      this.prisma.$queryRaw<{ revenue: bigint }[]>`
        SELECT COALESCE(SUM("finalAmount"), 0) AS revenue
        FROM "Order"
        WHERE "deletedAt" IS NULL
          AND "paymentStatus" = 'SUCCESS'
          AND "createdAt" BETWEEN ${prevFrom} AND ${prevTo}
      `,

      // Orders by status trong kỳ
      this.prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
        SELECT status, COUNT(*)::bigint AS cnt
        FROM "Order"
        WHERE "deletedAt" IS NULL AND "createdAt" BETWEEN ${from} AND ${to}
        GROUP BY status
      `,

      // Tổng users (không tính deleted)
      this.prisma.user.count({ where: { deletedAt: null } }),

      // User mới trong kỳ
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
      }),

      // User mới kỳ trước
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: prevFrom, lte: prevTo } },
      }),

      // Sellers by status
      this.prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
        SELECT status, COUNT(*)::bigint AS cnt
        FROM "Seller"
        WHERE "deletedAt" IS NULL
        GROUP BY status
      `,

      // Top 5 sellers theo doanh thu trong kỳ
      this.prisma.$queryRaw<{
        seller_id: number;
        shop_name: string;
        revenue: bigint;
        order_count: bigint;
      }[]>`
        SELECT o."sellerId" AS seller_id,
               s."shopName" AS shop_name,
               COALESCE(SUM(o."finalAmount"), 0) AS revenue,
               COUNT(*)::bigint AS order_count
        FROM "Order" o
        JOIN "Seller" s ON s.id = o."sellerId"
        WHERE o."deletedAt" IS NULL
          AND o."paymentStatus" = 'SUCCESS'
          AND o."createdAt" BETWEEN ${from} AND ${to}
          AND o."sellerId" IS NOT NULL
        GROUP BY o."sellerId", s."shopName"
        ORDER BY revenue DESC
        LIMIT 5
      `,

      // Doanh thu theo ngày trong kỳ
      this.prisma.$queryRaw<{ day: Date; revenue: bigint; order_count: bigint }[]>`
        SELECT DATE_TRUNC('day', "createdAt") AS day,
               COALESCE(SUM("finalAmount"), 0) AS revenue,
               COUNT(*)::bigint AS order_count
        FROM "Order"
        WHERE "deletedAt" IS NULL
          AND "paymentStatus" = 'SUCCESS'
          AND "createdAt" BETWEEN ${from} AND ${to}
        GROUP BY day
        ORDER BY day
      `,

      // Tổng products active
      this.prisma.product.count({ where: { deletedAt: null } }),

      // Commission đã thu (từ settlements đã xử lý xong)
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COALESCE(SUM("commissionAmt"), 0) AS total
        FROM "Settlement"
        WHERE status = 'PROCESSED'
          AND "createdAt" BETWEEN ${from} AND ${to}
      `,

      // Settlement đang chờ xử lý (tổng netAmount)
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COALESCE(SUM("netAmount"), 0) AS total
        FROM "Settlement"
        WHERE status = 'PENDING'
      `,
    ]);

    const currentRevenue = Number(revenueRow[0]?.revenue ?? 0);
    const previousRevenue = Number(prevRevenueRow[0]?.revenue ?? 0);
    const currentOrders = Number(revenueRow[0]?.order_count ?? 0);

    // Tổng orders kỳ trước để tính growth
    const prevOrdersRow = await this.prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*)::bigint AS cnt FROM "Order"
      WHERE "deletedAt" IS NULL AND "paymentStatus" = 'SUCCESS'
        AND "createdAt" BETWEEN ${prevFrom} AND ${prevTo}
    `;
    const previousOrders = Number(prevOrdersRow[0]?.cnt ?? 0);

    return {
      totalRevenue: currentRevenue,
      totalOrders: currentOrders,
      totalUsers,
      totalSellers: await this.prisma.seller.count({ where: { deletedAt: null } }),
      totalProducts,

      revenueGrowth: this.growthPct(currentRevenue, previousRevenue),
      orderGrowth: this.growthPct(currentOrders, previousOrders),
      newUsersGrowth: this.growthPct(newUsers, prevNewUsers),

      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((r) => [r.status, Number(r.cnt)]),
      ),
      revenueByDay: revenueByDay.map((r) => ({
        date: r.day.toISOString().slice(0, 10),
        revenue: Number(r.revenue),
        orderCount: Number(r.order_count),
      })),

      sellersByStatus: Object.fromEntries(
        sellersByStatus.map((r) => [r.status, Number(r.cnt)]),
      ),
      topSellers: topSellers.map((r) => ({
        sellerId: r.seller_id,
        shopName: r.shop_name,
        revenue: Number(r.revenue),
        orderCount: Number(r.order_count),
      })),

      totalCommission: Number(commissionRow[0]?.total ?? 0),
      pendingSettlement: Number(pendingSettlement[0]?.total ?? 0),
    };
  }

  // ─── Seller ────────────────────────────────────────────────────────────────

  async getSellerAnalytics(
    sellerId: number,
    dateFrom?: string,
    dateTo?: string,
    granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    const { from, to, prevFrom, prevTo } = this.toDateRange(dateFrom, dateTo);

    const truncUnit = granularity === 'month' ? 'month' : granularity === 'week' ? 'week' : 'day';

    const [
      currentRow,
      prevRow,
      ordersByStatus,
      revenueByPeriod,
      topProducts,
      recentSettlements,
      wallet,
    ] = await Promise.all([
      // KPIs kỳ hiện tại
      this.prisma.$queryRaw<{
        revenue: bigint;
        order_count: bigint;
        seller_amount: bigint;
      }[]>`
        SELECT COALESCE(SUM("finalAmount"), 0)    AS revenue,
               COUNT(*)::bigint                   AS order_count,
               COALESCE(SUM("sellerAmount"), 0)   AS seller_amount
        FROM "Order"
        WHERE "deletedAt" IS NULL
          AND "sellerId" = ${sellerId}
          AND "paymentStatus" = 'SUCCESS'
          AND "createdAt" BETWEEN ${from} AND ${to}
      `,

      // KPIs kỳ trước
      this.prisma.$queryRaw<{ revenue: bigint; order_count: bigint }[]>`
        SELECT COALESCE(SUM("finalAmount"), 0) AS revenue,
               COUNT(*)::bigint               AS order_count
        FROM "Order"
        WHERE "deletedAt" IS NULL
          AND "sellerId" = ${sellerId}
          AND "paymentStatus" = 'SUCCESS'
          AND "createdAt" BETWEEN ${prevFrom} AND ${prevTo}
      `,

      // Orders by status trong kỳ
      this.prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
        SELECT status, COUNT(*)::bigint AS cnt
        FROM "Order"
        WHERE "deletedAt" IS NULL
          AND "sellerId" = ${sellerId}
          AND "createdAt" BETWEEN ${from} AND ${to}
        GROUP BY status
      `,

      // Doanh thu theo granularity
      this.prisma.$queryRaw<{ period: Date; revenue: bigint; order_count: bigint }[]>`
        SELECT DATE_TRUNC(${truncUnit}, "createdAt") AS period,
               COALESCE(SUM("finalAmount"), 0) AS revenue,
               COUNT(*)::bigint AS order_count
        FROM "Order"
        WHERE "deletedAt" IS NULL
          AND "sellerId" = ${sellerId}
          AND "paymentStatus" = 'SUCCESS'
          AND "createdAt" BETWEEN ${from} AND ${to}
        GROUP BY period
        ORDER BY period
      `,

      // Top 10 products theo doanh thu
      this.prisma.$queryRaw<{
        product_id: number;
        product_name: string;
        total_sold: bigint;
        revenue: bigint;
      }[]>`
        SELECT oi."productId"   AS product_id,
               oi."productName" AS product_name,
               SUM(oi.quantity)::bigint        AS total_sold,
               SUM(oi."totalPrice")            AS revenue
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        WHERE o."deletedAt" IS NULL
          AND o."sellerId" = ${sellerId}
          AND o."paymentStatus" = 'SUCCESS'
          AND o."createdAt" BETWEEN ${from} AND ${to}
        GROUP BY oi."productId", oi."productName"
        ORDER BY revenue DESC
        LIMIT 10
      `,

      // 5 settlements gần nhất
      this.prisma.settlement.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          periodFrom: true,
          periodTo: true,
          orderCount: true,
          grossAmount: true,
          commissionAmt: true,
          netAmount: true,
          status: true,
          processedAt: true,
        },
      }),

      // Số dư ví
      this.prisma.sellerWallet.findUnique({
        where: { sellerId },
        select: { balance: true },
      }),
    ]);

    const currentRevenue = Number(currentRow[0]?.revenue ?? 0);
    const currentOrders = Number(currentRow[0]?.order_count ?? 0);
    const netRevenue = Number(currentRow[0]?.seller_amount ?? 0);
    const prevRevenue = Number(prevRow[0]?.revenue ?? 0);
    const prevOrders = Number(prevRow[0]?.order_count ?? 0);

    return {
      totalRevenue: currentRevenue,
      netRevenue,
      totalOrders: currentOrders,
      totalCommission: currentRevenue - netRevenue,
      walletBalance: Number(wallet?.balance ?? 0),

      revenueGrowth: this.growthPct(currentRevenue, prevRevenue),
      orderGrowth: this.growthPct(currentOrders, prevOrders),

      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((r) => [r.status, Number(r.cnt)]),
      ),
      revenueByPeriod: revenueByPeriod.map((r) => ({
        period: r.period.toISOString().slice(0, 10),
        revenue: Number(r.revenue),
        orderCount: Number(r.order_count),
      })),

      topProducts: topProducts.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        totalSold: Number(r.total_sold),
        revenue: Number(r.revenue),
      })),

      recentSettlements: recentSettlements.map((s) => ({
        id: s.id,
        periodFrom: s.periodFrom.toISOString().slice(0, 10),
        periodTo: s.periodTo.toISOString().slice(0, 10),
        orderCount: s.orderCount,
        grossAmount: Number(s.grossAmount),
        commissionAmt: Number(s.commissionAmt),
        netAmount: Number(s.netAmount),
        status: s.status,
        processedAt: s.processedAt?.toISOString() ?? null,
      })),
    };
  }
}
