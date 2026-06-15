import z from 'zod';

export const RegisterSellerBodySchema = z
  .object({
    shopName: z.string().min(2).max(500),
    shopSlug: z
      .string()
      .min(2)
      .max(600)
      .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
    description: z.string().max(2000).nullable().optional(),
    logo: z.string().url().nullable().optional(),
    email: z.string().email().max(255),
    phone: z.string().min(8).max(50),
    address: z.string().min(5).max(500),
  })
  .strict();

export const ApproveSellerBodySchema = z
  .object({
    commissionRate: z.number().min(0).max(100).default(10),
  })
  .strict();

export const RejectSellerBodySchema = z
  .object({
    reason: z.string().min(5).max(500),
  })
  .strict();

export const ActivateSellerBodySchema = z
  .object({
    activationToken: z.string().min(1),
  })
  .strict();

export const SellerResSchema = z.object({
  id: z.number(),
  userId: z.number(),
  shopName: z.string(),
  shopSlug: z.string(),
  description: z.string().nullable(),
  logo: z.string().nullable(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'SUSPENDED']),
  commissionRate: z.number(),
  // apiKey + secretKey chỉ trả khi register (1 lần duy nhất)
  apiKey: z.string().optional(),
  secretKey: z.string().optional(),
  approvedAt: z.string().nullable(),
  activatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ListSellerQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'SUSPENDED']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.coerce.number().int().positive().optional(),
  })
  .strict();

export type RegisterSellerBodyType = z.infer<typeof RegisterSellerBodySchema>;
export type ApproveSellerBodyType = z.infer<typeof ApproveSellerBodySchema>;
export type RejectSellerBodyType = z.infer<typeof RejectSellerBodySchema>;
export type ActivateSellerBodyType = z.infer<typeof ActivateSellerBodySchema>;
export type SellerResType = z.infer<typeof SellerResSchema>;
export type ListSellerQueryType = z.infer<typeof ListSellerQuerySchema>;
