import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma, SellerStatus } from '@prisma/client';

const sellerSelect = {
  id: true,
  userId: true,
  shopName: true,
  shopSlug: true,
  description: true,
  logo: true,
  email: true,
  phone: true,
  address: true,
  status: true,
  commissionRate: true,
  apiKey: true,
  secretKeyHash: true,
  activationToken: true,
  activationExpiresAt: true,
  activatedAt: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type RawSeller = Prisma.SellerGetPayload<{ select: typeof sellerSelect }>;

@Injectable()
export class SellerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: number) {
    return this.prisma.seller.findUnique({ where: { userId }, select: sellerSelect });
  }

  findById(id: number) {
    return this.prisma.seller.findFirst({
      where: { id, deletedAt: null },
      select: sellerSelect,
    });
  }

  // Guard chỉ cho phép ACTIVE seller gọi API
  findByApiKey(apiKey: string) {
    return this.prisma.seller.findFirst({
      where: { apiKey, status: SellerStatus.ACTIVE, deletedAt: null },
      select: sellerSelect,
    });
  }

  findByActivationToken(token: string) {
    return this.prisma.seller.findFirst({
      where: { activationToken: token, deletedAt: null },
      select: sellerSelect,
    });
  }

  findBySlug(shopSlug: string) {
    return this.prisma.seller.findFirst({
      where: { shopSlug, deletedAt: null },
      select: { id: true },
    });
  }

  create(data: {
    userId: number;
    shopName: string;
    shopSlug: string;
    description?: string | null;
    logo?: string | null;
    email: string;
    phone: string;
    address: string;
    apiKey: string;
    secretKeyHash: string;
  }) {
    return this.prisma.seller.create({ data, select: sellerSelect });
  }

  // Admin approve: set APPROVED + lưu activationToken để seller dùng verify
  approve(
    id: number,
    approvedById: number,
    commissionRate: number,
    activationToken: string,
    activationExpiresAt: Date,
  ) {
    return this.prisma.seller.update({
      where: { id },
      data: {
        status: SellerStatus.APPROVED,
        commissionRate,
        approvedById,
        approvedAt: new Date(),
        activationToken,
        activationExpiresAt,
      },
      select: sellerSelect,
    });
  }

  // Seller verify token → chuyển sang ACTIVE, xoá token
  activate(id: number) {
    return this.prisma.seller.update({
      where: { id },
      data: {
        status: SellerStatus.ACTIVE,
        activatedAt: new Date(),
        activationToken: null,
        activationExpiresAt: null,
      },
      select: sellerSelect,
    });
  }

  reject(id: number, approvedById: number, reason: string) {
    return this.prisma.seller.update({
      where: { id },
      data: {
        status: SellerStatus.REJECTED,
        approvedById,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
      select: sellerSelect,
    });
  }

  suspend(id: number) {
    return this.prisma.seller.update({
      where: { id },
      data: { status: SellerStatus.SUSPENDED },
      select: sellerSelect,
    });
  }

  async getFilters(sellerId: number) {
    const products = await this.prisma.product.findMany({
      where: { sellerId, deletedAt: null },
      select: {
        brandId: true,
        brand: { select: { id: true, name: true, logo: true } },
        categories: { select: { id: true, name: true } },
      },
    });

    const brandsMap = new Map<number, { id: number; name: string; logo: string | null }>();
    const categoriesMap = new Map<number, { id: number; name: string }>();

    for (const p of products) {
      if (!brandsMap.has(p.brandId)) brandsMap.set(p.brandId, p.brand);
      for (const c of p.categories) {
        if (!categoriesMap.has(c.id)) categoriesMap.set(c.id, c);
      }
    }

    return {
      brands: Array.from(brandsMap.values()),
      categories: Array.from(categoriesMap.values()),
    };
  }

  async list(opts: { status?: SellerStatus; limit: number; cursor?: number }) {
    const { status, limit, cursor } = opts;
    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const rows = await this.prisma.seller.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      select: sellerSelect,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  }
}
