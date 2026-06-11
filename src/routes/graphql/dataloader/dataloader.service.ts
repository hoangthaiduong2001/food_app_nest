import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';

export interface UserLoaderData {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  status: string;
  createdAt: Date;
}

export interface ProductVariantsLoaderData {
  id: number;
  sku: string;
  name: string | null;
  price: number;
  stock: number;
  isDefault: boolean;
  isActive: boolean;
  productId: number;
}

@Injectable()
export class DataLoaderService {
  constructor(private readonly prismaService: PrismaService) {}

  // Mỗi request tạo DataLoader mới để tránh cache stale giữa các request
  createUserLoader(): DataLoader<number, UserLoaderData | null> {
    return new DataLoader<number, UserLoaderData | null>(async (ids) => {
      const users = await this.prismaService.user.findMany({
        where: { id: { in: [...ids] }, deletedAt: null },
        select: { id: true, email: true, name: true, avatar: true, status: true, createdAt: true },
      });
      const map = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => map.get(id) ?? null);
    });
  }

  // Batch load variants theo productId — dùng cho field resolver Product.variants
  createProductVariantsLoader(): DataLoader<number, ProductVariantsLoaderData[]> {
    return new DataLoader<number, ProductVariantsLoaderData[]>(async (productIds) => {
      const variants = await this.prismaService.productVariant.findMany({
        where: { productId: { in: [...productIds] }, deletedAt: null },
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          stock: true,
          isDefault: true,
          isActive: true,
          productId: true,
        },
      });

      const map = new Map<number, ProductVariantsLoaderData[]>();
      for (const v of variants) {
        const list = map.get(v.productId) ?? [];
        list.push(v);
        map.set(v.productId, list);
      }
      return productIds.map((id) => map.get(id) ?? []);
    });
  }
}
