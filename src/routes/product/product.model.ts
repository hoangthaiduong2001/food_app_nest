import {
  isoDateTime,
  isoDateTimeNullable,
} from '@/shared/model/transform.helper';
import z from 'zod';

export const CreateVariantSchema = z
  .object({
    sku: z.string().min(1).max(120),
    name: z.string().max(300).nullable().optional(),
    price: z.number().nonnegative(),
    stock: z.number().int().nonnegative().default(0),
    attributes: z.record(z.string(), z.unknown()).nullable().optional(),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();

export const VariantResSchema = z.object({
  id: z.number(),
  sku: z.string(),
  name: z.string().nullable(),
  price: z.number(),
  stock: z.number(),
  attributes: z.unknown().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export const CreateProductBodySchema = z
  .object({
    name: z.string().min(1).max(500),
    description: z.string().nullable().optional(),
    basePrice: z.number().nonnegative(),
    virtualPrice: z.number().nonnegative(),
    stock: z.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
    slug: z.string().min(1).max(600).nullable().optional(),
    sellerId: z.number().int().positive().nullable().optional(),
    brandId: z.number().int().positive(),
    images: z.array(z.string().url()).default([]),
    categoryIds: z.array(z.number().int().positive()).default([]),
    variants: z.array(CreateVariantSchema).default([]),
    publishedAt: z.iso.datetime().nullable().optional(),
  })
  .strict();

export const UpdateProductBodySchema = CreateProductBodySchema.omit({
  variants: true,
})
  .partial()
  .strict();

export const SellerBriefSchema = z.object({
  id: z.number(),
  userId: z.number(),
  shopName: z.string(),
  shopSlug: z.string(),
  logo: z.string().nullable(),
  phone: z.string(),
  address: z.string(),
});

export const ProductResSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  sellerId: z.number().nullable(),
  seller: SellerBriefSchema.nullable(),
  basePrice: z.number(),
  virtualPrice: z.number(),
  totalStock: z.number(),
  isActive: z.boolean(),
  slug: z.string().nullable(),
  brandId: z.number(),
  images: z.array(z.string()),
  publishedAt: isoDateTimeNullable,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  categories: z.array(z.object({ id: z.number(), name: z.string() })),
  variants: z.array(VariantResSchema),
});

export const ProductListItemSchema = ProductResSchema.omit({
  variants: true,
  categories: true,
});

export const ListProductQuerySchema = z
  .object({
    brandId: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    sellerId: z.coerce.number().int().positive().optional(),
    q: z.string().trim().min(1).max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const ListProductResSchema = z.object({
  data: z.array(ProductListItemSchema),
  nextCursor: z.number().nullable(),
  hasMore: z.boolean(),
});

export type CreateProductBodyType = z.infer<typeof CreateProductBodySchema>;
export type UpdateProductBodyType = z.infer<typeof UpdateProductBodySchema>;
export type ProductResType = z.infer<typeof ProductResSchema>;
export type ListProductQueryType = z.infer<typeof ListProductQuerySchema>;
export type ListProductResType = z.infer<typeof ListProductResSchema>;
