import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Settlement flow (chạy hàng ngày lúc 2:00 AM):
 *  1. Lấy tất cả order DELIVERED, paymentStatus SUCCESS, chưa settle (settledAt IS NULL)
 *  2. Group theo sellerId
 *  3. Với mỗi seller: tính gross, commission, net → tạo Settlement record
 *  4. Cộng net vào SellerWallet (transaction)
 *  5. Mark order.settledAt = now
 */
@Injectable()
export class SellerSettlementService {
  private readonly logger = new Logger(SellerSettlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailySettlement() {
    this.logger.log('Starting daily settlement run...');
    try {
      await this.settle();
    } catch (err) {
      this.logger.error('Settlement failed', err);
    }
  }

  async settle() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        paymentStatus: 'SUCCESS',
        settledAt: null,
        sellerId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        sellerId: true,
        finalAmount: true,
        seller: { select: { commissionRate: true } },
      },
    });

    if (orders.length === 0) {
      this.logger.log('No orders to settle.');
      return;
    }

    // Group theo sellerId
    const grouped = new Map<number, typeof orders>();
    for (const o of orders) {
      const sid = o.sellerId!;
      if (!grouped.has(sid)) grouped.set(sid, []);
      grouped.get(sid)!.push(o);
    }

    const now = new Date();
    const periodFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const [sellerId, sellerOrders] of grouped) {
      const commissionRate = Number(sellerOrders[0].seller!.commissionRate);
      const grossAmount = sellerOrders.reduce((s, o) => s + o.finalAmount, 0);
      const commissionAmt = Math.round(grossAmount * (commissionRate / 100));
      const netAmount = grossAmount - commissionAmt;
      const orderIds = sellerOrders.map((o) => o.id);

      try {
        await this.prisma.$transaction(async (tx) => {
          // Tạo settlement record
          const settlement = await tx.settlement.create({
            data: {
              sellerId,
              periodFrom,
              periodTo: now,
              orderCount: sellerOrders.length,
              grossAmount: BigInt(grossAmount),
              commissionAmt: BigInt(commissionAmt),
              netAmount: BigInt(netAmount),
              status: 'PROCESSED',
              processedAt: now,
            },
          });

          // Upsert seller wallet
          const wallet = await tx.sellerWallet.upsert({
            where: { sellerId },
            create: { sellerId, balance: 0n },
            update: {},
          });

          const newBalance = wallet.balance + BigInt(netAmount);

          // Cập nhật balance
          await tx.sellerWallet.update({
            where: { sellerId },
            data: { balance: newBalance },
          });

          // Ghi transaction
          await tx.sellerWalletTx.create({
            data: {
              walletId: wallet.id,
              type: 'SETTLEMENT',
              amount: BigInt(netAmount),
              balanceBefore: wallet.balance,
              balanceAfter: newBalance,
              settlementId: settlement.id,
              description: `Settlement #${settlement.id}: ${sellerOrders.length} orders`,
            },
          });

          // Mark orders đã settled
          await tx.order.updateMany({
            where: { id: { in: orderIds } },
            data: { settledAt: now, sellerAmount: netAmount },
          });
        });

        this.logger.log(
          `Seller ${sellerId}: settled ${sellerOrders.length} orders, net=${netAmount}`,
        );
      } catch (err) {
        this.logger.error(`Failed to settle seller ${sellerId}`, err);
      }
    }

    this.logger.log(`Settlement done. Processed ${grouped.size} sellers.`);
  }
}
