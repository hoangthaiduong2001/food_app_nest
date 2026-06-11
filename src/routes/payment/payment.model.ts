import z from 'zod';

export const CreatePaymentIntentBodySchema = z
  .object({
    orderId: z.number().int().positive(),
  })
  .strict();

export const PaymentIntentResSchema = z.object({
  clientSecret: z.string(),
  paymentIntentId: z.string(),
  amount: z.number(),
  currency: z.string(),
});

export type CreatePaymentIntentBodyType = z.infer<
  typeof CreatePaymentIntentBodySchema
>;
export type PaymentIntentResType = z.infer<typeof PaymentIntentResSchema>;
