import { PrismaService } from '@/shared/services/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StockResType } from './inventory.model';
import { IInventoryRepository } from './inventory.repository.interface';

type LockedVariantRow = {
  id: number;
  sku: string;
  stock: number;
};

@Injectable()
export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Trừ kho an toàn chống race condition bằng PESSIMISTIC LOCK.
   *
   * SELECT ... FOR UPDATE khóa row variant trong suốt transaction →
   * request song song trên cùng variant phải XẾP HÀNG đợi commit.
   * Nhờ vậy việc "đọc stock → kiểm tra → trừ" là atomic, không bị oversell.
   */
  async reserve(variantId: number, quantity: number): Promise<StockResType> {
    return this.prismaService.$transaction(async (tx) => {
      // 1. Khóa row. Transaction khác đụng cùng id sẽ block tại đây.
      const rows = await tx.$queryRaw<LockedVariantRow[]>`
        SELECT id, sku, stock
        FROM "ProductVariant"
        WHERE id = ${variantId} AND "deletedAt" IS NULL
        FOR UPDATE
      `;

      const variant = rows[0];
      if (!variant) {
        throw new NotFoundException({
          message: 'Variant not found',
          path: 'variantId',
        });
      }

      // 2. Kiểm tra — an toàn vì đang giữ khóa
      if (variant.stock < quantity) {
        throw new ConflictException({
          message: `Insufficient stock. Available: ${variant.stock}, requested: ${quantity}`,
          path: 'quantity',
        });
      }

      // 3. Trừ kho
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { decrement: quantity } },
        select: { id: true, sku: true, stock: true },
      });

      return {
        variantId: updated.id,
        sku: updated.sku,
        stock: updated.stock,
      };
      // COMMIT khi callback return → Postgres tự nhả khóa
    });
  }

  /** Hoàn kho — cộng lại. Không cần check upper-bound nên đơn giản hơn. */
  async release(variantId: number, quantity: number): Promise<StockResType> {
    return this.prismaService.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedVariantRow[]>`
        SELECT id, sku, stock
        FROM "ProductVariant"
        WHERE id = ${variantId} AND "deletedAt" IS NULL
        FOR UPDATE
      `;
      const variant = rows[0];
      if (!variant) {
        throw new NotFoundException({
          message: 'Variant not found',
          path: 'variantId',
        });
      }

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: quantity } },
        select: { id: true, sku: true, stock: true },
      });

      return { variantId: updated.id, sku: updated.sku, stock: updated.stock };
    });
  }

  /** Admin chỉnh kho theo delta. Chặn kết quả âm. */
  async adjust(variantId: number, delta: number): Promise<StockResType> {
    return this.prismaService.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedVariantRow[]>`
        SELECT id, sku, stock
        FROM "ProductVariant"
        WHERE id = ${variantId} AND "deletedAt" IS NULL
        FOR UPDATE
      `;
      const variant = rows[0];
      if (!variant) {
        throw new NotFoundException({
          message: 'Variant not found',
          path: 'variantId',
        });
      }

      const newStock = variant.stock + delta;
      if (newStock < 0) {
        throw new ConflictException({
          message: `Adjustment would make stock negative. Current: ${variant.stock}, delta: ${delta}`,
          path: 'delta',
        });
      }

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
        select: { id: true, sku: true, stock: true },
      });

      return { variantId: updated.id, sku: updated.sku, stock: updated.stock };
    });
  }

  async getStock(variantId: number): Promise<StockResType | null> {
    const variant = await this.prismaService.productVariant.findFirst({
      where: { id: variantId, deletedAt: null },
      select: { id: true, sku: true, stock: true },
    });
    return variant
      ? { variantId: variant.id, sku: variant.sku, stock: variant.stock }
      : null;
  }
}
