import z from 'zod';

export const ReserveStockBodySchema = z
  .object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })
  .strict();

export const ReleaseStockBodySchema = ReserveStockBodySchema;

export const AdjustStockBodySchema = z
  .object({
    variantId: z.number().int().positive(),
    delta: z
      .number()
      .int()
      .refine((v) => v !== 0, {
        message: 'delta must not be zero',
      }),
  })
  .strict();

export const StockResSchema = z.object({
  variantId: z.number(),
  sku: z.string(),
  stock: z.number(),
});

export type ReserveStockBodyType = z.infer<typeof ReserveStockBodySchema>;
export type ReleaseStockBodyType = z.infer<typeof ReleaseStockBodySchema>;
export type AdjustStockBodyType = z.infer<typeof AdjustStockBodySchema>;
export type StockResType = z.infer<typeof StockResSchema>;
