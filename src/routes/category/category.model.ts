import {
  isoDateTime,
  isoDateTimeNullable,
} from '@/shared/model/transform.helper';
import z from 'zod';

export const CategorySchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(500),
  logo: z.string().max(1000).nullable(),
  parentCategoryId: z.number().int().positive().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTimeNullable,
});

export const CreateCategoryBodySchema = z
  .object({
    name: z.string().min(1).max(500),
    logo: z.string().min(1).max(1000).nullable().optional(),
    parentCategoryId: z.number().int().positive().nullable().optional(),
  })
  .strict();

export const UpdateCategoryBodySchema =
  CreateCategoryBodySchema.partial().strict();

export const CategoryResSchema = CategorySchema.omit({ deletedAt: true });

export const ListCategoryResSchema = z.array(CategoryResSchema);

export const ListCategoryQuerySchema = z
  .object({
    parentId: z
      .union([z.literal('null'), z.coerce.number().int().positive()])
      .optional(),
  })
  .strict();

export type CreateCategoryBodyType = z.infer<typeof CreateCategoryBodySchema>;
export type UpdateCategoryBodyType = z.infer<typeof UpdateCategoryBodySchema>;
export type CategoryResType = z.infer<typeof CategoryResSchema>;
export type ListCategoryQueryType = z.infer<typeof ListCategoryQuerySchema>;
