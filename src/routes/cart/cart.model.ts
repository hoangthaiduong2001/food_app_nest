import z from 'zod';

export const AddToCartBodySchema = z
  .object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().positive().max(1000),
  })
  .strict();

export const UpdateCartItemBodySchema = z
  .object({
    quantity: z.number().int().positive().max(1000),
  })
  .strict();

export const CartItemResSchema = z.object({
  variantId: z.number(),
  quantity: z.number(),
  sku: z.string(),
  variantName: z.string().nullable(),
  price: z.number(),
  stock: z.number(),
  productId: z.number(),
  productName: z.string(),
  productImage: z.string().nullable(),
  lineTotal: z.number(),
  inStock: z.boolean(),
});

export const CartResSchema = z.object({
  items: z.array(CartItemResSchema),
  totalItems: z.number(),
  totalAmount: z.number(),
});

export type AddToCartBodyType = z.infer<typeof AddToCartBodySchema>;
export type UpdateCartItemBodyType = z.infer<typeof UpdateCartItemBodySchema>;
export type CartItemResType = z.infer<typeof CartItemResSchema>;
export type CartResType = z.infer<typeof CartResSchema>;
