import { toISO } from '@/shared/model/transform.helper';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateProductBodyType,
  ListProductQueryType,
  ProductResType,
  UpdateProductBodyType,
} from './product.model';
import { IProductRepository } from './product.repository.interface';

const productInclude = {
  categories: { select: { id: true, name: true } },
  variants: {
    where: { deletedAt: null },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      stock: true,
      attributes: true,
      isDefault: true,
      isActive: true,
    },
  },
} as const;

type RawProduct = {
  id: number;
  name: string;
  basePrice: number;
  virtualPrice: number;
  isActive: boolean;
  slug: string | null;
  brandId: number;
  images: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categories: { id: number; name: string }[];
  variants: {
    id: number;
    sku: string;
    name: string | null;
    price: number;
    stock: number;
    attributes: unknown;
    isDefault: boolean;
    isActive: boolean;
  }[];
};

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private toResponse(p: RawProduct): ProductResType {
    // totalStock = tổng stock các variant (nguồn stock thật, không dùng p.stock)
    const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
    return {
      id: p.id,
      name: p.name,
      basePrice: p.basePrice,
      virtualPrice: p.virtualPrice,
      totalStock,
      isActive: p.isActive,
      slug: p.slug,
      brandId: p.brandId,
      images: p.images,
      publishedAt: toISO(p.publishedAt),
      createdAt: toISO(p.createdAt),
      updatedAt: toISO(p.updatedAt),
      categories: p.categories,
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        stock: v.stock,
        attributes: v.attributes ?? null,
        isDefault: v.isDefault,
        isActive: v.isActive,
      })),
    };
  }

  async findById(id: number): Promise<ProductResType | null> {
    const product = await this.prismaService.product.findFirst({
      where: { id, deletedAt: null },
      include: productInclude,
    });
    return product ? this.toResponse(product as unknown as RawProduct) : null;
  }

  async list(query: ListProductQueryType) {
    const { limit, cursor, brandId, categoryId, q } = query;

    if (q) {
      return this.search(q, query);
    }

    const where = {
      deletedAt: null,
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    };

    const rows = await this.prismaService.product.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        basePrice: true,
        virtualPrice: true,
        isActive: true,
        slug: true,
        brandId: true,
        images: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        // Lấy stock từng variant để tính totalStock
        variants: {
          where: { deletedAt: null },
          select: { stock: true },
        },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return {
      data: page.map((p) => ({
        id: p.id,
        name: p.name,
        basePrice: p.basePrice,
        virtualPrice: p.virtualPrice,
        totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
        isActive: p.isActive,
        slug: p.slug,
        brandId: p.brandId,
        images: p.images,
        publishedAt: toISO(p.publishedAt),
        createdAt: toISO(p.createdAt),
        updatedAt: toISO(p.updatedAt),
      })),
      nextCursor,
      hasMore,
    };
  }

  private async search(q: string, query: ListProductQueryType) {
    const { limit, cursor, brandId, categoryId } = query;
    const offset = cursor ?? 0;

    const brandCond = brandId
      ? Prisma.sql`AND p."brandId" = ${brandId}`
      : Prisma.sql``;
    const categoryCond = categoryId
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "_CategoryToProduct" cp
          WHERE cp."B" = p.id AND cp."A" = ${categoryId}
        )`
      : Prisma.sql``;

    const rows = await this.prismaService.$queryRaw<
      Array<{
        id: number;
        name: string;
        basePrice: number;
        virtualPrice: number;
        totalStock: bigint;
        isActive: boolean;
        slug: string | null;
        brandId: number;
        images: string[];
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        rank: number;
      }>
    >`
      SELECT
        p.id, p.name, p."basePrice", p."virtualPrice",
        p."isActive", p.slug, p."brandId", p.images,
        p."publishedAt", p."createdAt", p."updatedAt",
        COALESCE((
          SELECT SUM(pv.stock) FROM "ProductVariant" pv
          WHERE pv."productId" = p.id AND pv."deletedAt" IS NULL
        ), 0) AS "totalStock",
        ts_rank(p."searchVector", plainto_tsquery('simple', ${q})) AS rank
      FROM "Product" p
      WHERE p."deletedAt" IS NULL
        AND p."searchVector" @@ plainto_tsquery('simple', ${q})
        ${brandCond}
        ${categoryCond}
      ORDER BY rank DESC, p.id ASC
      LIMIT ${limit + 1} OFFSET ${offset}
    `;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? offset + limit : null;

    return {
      data: page.map((p) => ({
        id: p.id,
        name: p.name,
        basePrice: p.basePrice,
        virtualPrice: p.virtualPrice,
        totalStock: Number(p.totalStock), // SUM() trả bigint → convert
        isActive: p.isActive,
        slug: p.slug,
        brandId: p.brandId,
        images: p.images,
        publishedAt: toISO(p.publishedAt),
        createdAt: toISO(p.createdAt),
        updatedAt: toISO(p.updatedAt),
      })),
      nextCursor,
      hasMore,
    };
  }

  async create(
    data: CreateProductBodyType & { createdById: number },
  ): Promise<ProductResType> {
    const product = await this.prismaService.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          name: data.name,
          basePrice: data.basePrice,
          virtualPrice: data.virtualPrice,
          stock: data.stock,
          isActive: data.isActive,
          slug: data.slug ?? null,
          brand: { connect: { id: data.brandId } },
          images: data.images,
          createdBy: { connect: { id: data.createdById } },
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
          categories: data.categoryIds.length
            ? { connect: data.categoryIds.map((id) => ({ id })) }
            : undefined,
          variants: data.variants.length
            ? {
                create: data.variants.map((v) => ({
                  sku: v.sku,
                  name: v.name ?? null,
                  price: v.price,
                  stock: v.stock,
                  attributes:
                    v.attributes === null || v.attributes === undefined
                      ? undefined
                      : (v.attributes as Prisma.InputJsonValue),
                  isDefault: v.isDefault,
                  isActive: v.isActive,
                })),
              }
            : undefined,
        },
        include: productInclude,
      });
    });

    return this.toResponse(product as unknown as RawProduct);
  }

  async update(
    id: number,
    data: UpdateProductBodyType & { updatedById: number },
  ): Promise<ProductResType> {
    const { categoryIds, publishedAt, slug, updatedById, ...rest } = data;

    const product = await this.prismaService.product.update({
      where: { id },
      data: {
        ...rest,
        updatedById,
        ...(slug !== undefined ? { slug } : {}),
        ...(publishedAt !== undefined
          ? { publishedAt: publishedAt ? new Date(publishedAt) : null }
          : {}),
        ...(categoryIds !== undefined
          ? { categories: { set: categoryIds.map((cid) => ({ id: cid })) } }
          : {}),
      },
      include: productInclude,
    });

    return this.toResponse(product as unknown as RawProduct);
  }

  async softDelete(id: number): Promise<{ count: number }> {
    const result = await this.prismaService.product.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { count: result.count };
  }

  async brandExists(brandId: number): Promise<boolean> {
    const brand = await this.prismaService.brand.findFirst({
      where: { id: brandId, deletedAt: null },
      select: { id: true },
    });
    return brand !== null;
  }

  async countExistingCategories(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    return this.prismaService.category.count({
      where: { id: { in: ids }, deletedAt: null },
    });
  }
}
