import { PrismaService } from '@/shared/services/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartItemResType, CartResType } from './cart.model';
import { CartRepository } from './cart.repository';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly prismaService: PrismaService,
  ) {}

  private async loadVariant(variantId: number) {
    return this.prismaService.productVariant.findFirst({
      where: { id: variantId, deletedAt: null, isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        stock: true,
        product: {
          select: { id: true, name: true, images: true, deletedAt: true },
        },
      },
    });
  }

  async addToCart(
    userId: number,
    variantId: number,
    quantity: number,
  ): Promise<CartResType> {
    const variant = await this.loadVariant(variantId);
    if (!variant || variant.product.deletedAt !== null) {
      throw new NotFoundException({
        message: 'Variant not found or inactive',
        path: 'variantId',
      });
    }

    const existing =
      (await this.cartRepository.getQuantity(userId, variantId)) ?? 0;
    const totalWanted = existing + quantity;
    if (totalWanted > variant.stock) {
      throw new ConflictException({
        message: `Insufficient stock. Available: ${variant.stock}, in cart: ${existing}, adding: ${quantity}`,
        path: 'quantity',
      });
    }

    await this.cartRepository.addItem(userId, variantId, quantity);
    return this.getCart(userId);
  }

  async updateItem(
    userId: number,
    variantId: number,
    quantity: number,
  ): Promise<CartResType> {
    const current = await this.cartRepository.getQuantity(userId, variantId);
    if (current === null) {
      throw new NotFoundException({
        message: 'Item not in cart',
        path: 'variantId',
      });
    }

    const variant = await this.loadVariant(variantId);
    if (!variant) {
      throw new NotFoundException({
        message: 'Variant not found',
        path: 'variantId',
      });
    }
    if (quantity > variant.stock) {
      throw new ConflictException({
        message: `Insufficient stock. Available: ${variant.stock}, requested: ${quantity}`,
        path: 'quantity',
      });
    }

    await this.cartRepository.setItem(userId, variantId, quantity);
    return this.getCart(userId);
  }

  async removeItem(userId: number, variantId: number): Promise<CartResType> {
    const current = await this.cartRepository.getQuantity(userId, variantId);
    if (current === null) {
      throw new BadRequestException({
        message: 'Item not in cart',
        path: 'variantId',
      });
    }
    await this.cartRepository.removeItem(userId, variantId);
    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<CartResType> {
    await this.cartRepository.clear(userId);
    return this.getCart(userId);
  }

  async getCart(userId: number): Promise<CartResType> {
    const cartMap = await this.cartRepository.getAll(userId);
    if (cartMap.size === 0) {
      return { items: [], totalItems: 0, totalAmount: 0 };
    }

    const variantIds = [...cartMap.keys()];
    const variants = await this.prismaService.productVariant.findMany({
      where: { id: { in: variantIds }, deletedAt: null },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        stock: true,
        product: { select: { id: true, name: true, images: true } },
      },
    });

    const variantById = new Map(variants.map((v) => [v.id, v]));
    const items: CartItemResType[] = [];

    for (const [variantId, quantity] of cartMap) {
      const v = variantById.get(variantId);
      if (!v) {
        await this.cartRepository.removeItem(userId, variantId);
        continue;
      }

      items.push({
        variantId: v.id,
        quantity,
        sku: v.sku,
        variantName: v.name,
        price: v.price,
        stock: v.stock,
        productId: v.product.id,
        productName: v.product.name,
        productImage: v.product.images[0] ?? null,
        lineTotal: v.price * quantity,
        inStock: v.stock >= quantity,
      });
    }

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);

    return { items, totalItems, totalAmount };
  }
}
