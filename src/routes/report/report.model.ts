import z from 'zod';

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

export const AdminDashboardQuerySchema = z
  .object({
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
  })
  .strict();

export const RevenueByDaySchema = z.object({
  date: z.string(),
  revenue: z.number(),
  orderCount: z.number(),
});

export const AdminDashboardResSchema = z.object({
  // KPIs tổng quan
  totalRevenue: z.number(),
  totalOrders: z.number(),
  totalUsers: z.number(),
  totalSellers: z.number(),
  totalProducts: z.number(),

  // So sánh với kỳ trước (%)
  revenueGrowth: z.number(),
  orderGrowth: z.number(),
  newUsersGrowth: z.number(),

  // Breakdown
  ordersByStatus: z.record(z.string(), z.number()),
  revenueByDay: z.array(RevenueByDaySchema),

  // Seller stats
  sellersByStatus: z.record(z.string(), z.number()),
  topSellers: z.array(
    z.object({
      sellerId: z.number(),
      shopName: z.string(),
      revenue: z.number(),
      orderCount: z.number(),
    }),
  ),

  // Commission
  totalCommission: z.number(),
  pendingSettlement: z.number(),
});

// ─── Seller Analytics ─────────────────────────────────────────────────────────

export const SellerAnalyticsQuerySchema = z
  .object({
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
    // granularity cho biểu đồ doanh thu
    granularity: z.enum(['day', 'week', 'month']).default('day'),
  })
  .strict();

export const SellerAnalyticsResSchema = z.object({
  // KPIs
  totalRevenue: z.number(),
  netRevenue: z.number(),
  totalOrders: z.number(),
  totalCommission: z.number(),
  walletBalance: z.number(),

  // Growth
  revenueGrowth: z.number(),
  orderGrowth: z.number(),

  // Breakdown
  ordersByStatus: z.record(z.string(), z.number()),
  revenueByPeriod: z.array(
    z.object({
      period: z.string(),
      revenue: z.number(),
      orderCount: z.number(),
    }),
  ),

  // Top products
  topProducts: z.array(
    z.object({
      productId: z.number(),
      productName: z.string(),
      totalSold: z.number(),
      revenue: z.number(),
    }),
  ),

  // Settlement history (5 gần nhất)
  recentSettlements: z.array(
    z.object({
      id: z.number(),
      periodFrom: z.string(),
      periodTo: z.string(),
      orderCount: z.number(),
      grossAmount: z.number(),
      commissionAmt: z.number(),
      netAmount: z.number(),
      status: z.string(),
      processedAt: z.string().nullable(),
    }),
  ),
});

export type AdminDashboardQueryType = z.infer<typeof AdminDashboardQuerySchema>;
export type AdminDashboardResType = z.infer<typeof AdminDashboardResSchema>;
export type SellerAnalyticsQueryType = z.infer<typeof SellerAnalyticsQuerySchema>;
export type SellerAnalyticsResType = z.infer<typeof SellerAnalyticsResSchema>;
