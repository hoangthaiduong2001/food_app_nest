import { isoDateTime, isoDateTimeNullable } from '@/shared/model/transform.helper';
import z from 'zod';

export const BrandSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(500),
  logo: z.string().min(1).max(1000),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTimeNullable,
});

export const CreateBrandBodySchema = BrandSchema.pick({
  name: true,
  logo: true,
}).strict();

export const UpdateBrandBodySchema = CreateBrandBodySchema.partial().strict();

export const BrandResSchema = BrandSchema.omit({ deletedAt: true });

export const ListBrandResSchema = z.array(BrandResSchema);

export const BrandIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateBrandBodyType = z.infer<typeof CreateBrandBodySchema>;
export type UpdateBrandBodyType = z.infer<typeof UpdateBrandBodySchema>;
export type BrandResType = z.infer<typeof BrandResSchema>;
