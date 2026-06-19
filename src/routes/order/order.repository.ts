import {
  OrderStatus,
  OrderStatusType,
} from '@/shared/constants/order.constant';
import { PrismaService } from '@/shared/services/prisma.service';
import { shouldReleaseStock } from '@/shared/state-machine/order-state-machine';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceiverType } from './order.model';

export interface CheckoutItemInput {
  variantId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  productName: string;
  productImage: string | null;
  attributes: Prisma.InputJsonValue | undefined;
}

@Injectable()
export class OrderRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createOrderWithStock({
    userId,
    sellerId,
    items,
    receiver,
    paymentMethod,
    shippingFee,
    vatRate = 0,
  }: {
    userId: number;
    sellerId: number | null;
    items: CheckoutItemInput[];
    receiver: ReceiverType;
    paymentMethod: string;
    shippingFee: number;
    vatRate?: number;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      for (const item of items) {
        const rows = await tx.$queryRaw<{ id: number; stock: number }[]>`
          SELECT id, stock FROM "ProductVariant"
          WHERE id = ${item.variantId} AND "deletedAt" IS NULL
          FOR UPDATE
        `;
        const variant = rows[0];
        if (!variant) {
          throw new NotFoundException({
            message: `Variant ${item.variantId} not found`,
            path: 'variantId',
          });
        }
        if (variant.stock < item.quantity) {
          throw new ConflictException({
            message: `Insufficient stock for variant ${item.variantId}. Available: ${variant.stock}, requested: ${item.quantity}`,
            path: 'quantity',
          });
        }
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const totalAmount = items.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0,
      );
      const vatAmount = Math.round(totalAmount * (vatRate / 100));
      const finalAmount = totalAmount + shippingFee + vatAmount;

      const order = await tx.order.create({
        data: {
          userId,
          ...(sellerId !== null ? { sellerId } : {}),
          status: OrderStatus.PENDING_PAYMENT,
          paymentMethod: paymentMethod as never,
          shippingFee,
          totalAmount,
          vatAmount,
          finalAmount,
          receiver: receiver as unknown as Prisma.InputJsonValue,
          createdById: userId,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.unitPrice * i.quantity,
              productName: i.productName,
              productImage: i.productImage,
              attributes: i.attributes,
            })),
          },
        },
        include: { items: true },
      });

      return order;
    });
  }

  findById(id: number) {
    return this.prismaService.order.findFirst({
      where: { id, deletedAt: null },
      include: { items: true },
    });
  }

  findByIdForUser(id: number, userId: number) {
    return this.prismaService.order.findFirst({
      where: { id, userId, deletedAt: null },
      include: { items: true },
    });
  }

  findByIdForInvoice(id: number) {
    return this.prismaService.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: true,
        seller: { select: { id: true, shopName: true, vatRate: true, commissionRate: true } },
        user: { select: { name: true, email: true } },
      },
    });
  }

  findByIdForSeller(id: number, sellerId: number) {
    return this.prismaService.order.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { sellerId },
          { items: { some: { product: { sellerId } } } },
        ],
      },
      include: {
        items: true,
        seller: { select: { id: true, shopName: true, commissionRate: true, vatRate: true } },
        user: { select: { name: true, email: true } },
      },
    });
  }

  async list({
    userId,
    sellerId,
    status,
    search,
    dateFrom,
    dateTo,
    limit,
    cursor,
  }: {
    userId?: number;
    sellerId?: number;
    status?: OrderStatusType;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit: number;
    cursor?: number;
  }) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (userId) where['userId'] = userId;
    if (sellerId) {
      where['OR'] = [
        { sellerId },
        { items: { some: { product: { sellerId } } } },
      ];
    }
    if (status) where['status'] = status;

    if (dateFrom || dateTo) {
      where['createdAt'] = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    // search theo tên hoặc phone người nhận (JSON field)
    if (search) {
      where['OR'] = [
        { receiver: { path: ['name'], string_contains: search } },
        { receiver: { path: ['phone'], string_contains: search } },
        {
          createdBy: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const rows = await this.prismaService.order.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        shippingFee: true,
        totalAmount: true,
        finalAmount: true,
        receiver: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return { data: page, nextCursor, hasMore };
  }

  /**
   * Đổi status — transaction atomic:
   *  1. Update order.status
   *  2. Nếu cancel/return → hoàn kho từng item
   *  3. Nếu có `refund` (order đã thanh toán) → hoàn tiền về ví (callback refundFn)
   * Tất cả trong 1 transaction → rollback hết nếu fail.
   */
  async updateStatusWithStock(
    orderId: number,
    newStatus: OrderStatusType,
    updatedById: number,
    items: { variantId: number | null; quantity: number }[],
    refundFn?: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      const data: Prisma.OrderUpdateInput = {
        status: newStatus,
        updatedBy: { connect: { id: updatedById } },
      };
      // Nếu hoàn tiền → đánh dấu paymentStatus REFUNDED
      if (refundFn) {
        data.paymentStatus = 'REFUNDED';
      }

      await tx.order.update({ where: { id: orderId }, data });

      // Hoàn kho
      if (shouldReleaseStock(newStatus)) {
        for (const item of items) {
          if (item.variantId !== null) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      // Hoàn tiền ví (nếu order đã thanh toán)
      if (refundFn) {
        await refundFn(tx);
      }

      return tx.order.findFirst({
        where: { id: orderId },
        include: { items: true },
      });
    });
  }

  async payOrderWithWallet(
    orderId: number,
    newStatus: OrderStatusType,
    debitFn: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await debitFn(tx);

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          paymentStatus: 'SUCCESS',
          paidAt: new Date(),
        },
      });

      return tx.order.findFirst({
        where: { id: orderId },
        include: { items: true },
      });
    });
  }
}
