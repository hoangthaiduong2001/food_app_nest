import { OrderStatus } from '@/shared/constants/order.constant';
import { isoDateTime } from '@/shared/model/transform.helper';
import z from 'zod';

const PaymentMethod = [
  'COD',
  'BANK_TRANSFER',
  'E_WALLET',
  'CREDIT_CARD',
] as const;

export const ReceiverSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(8).max(20),
  address: z.string().min(1).max(500),
});

export const CheckoutBodySchema = z
  .object({
    receiver: ReceiverSchema,
    paymentMethod: z.enum(PaymentMethod),
    shippingFee: z.number().int().nonnegative().default(0),
    variantIds: z.array(z.number().int().positive()).optional(),
  })
  .strict();

export const OrderItemResSchema = z.object({
  id: z.number(),
  productId: z.number(),
  variantId: z.number().nullable(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  productName: z.string(),
  productImage: z.string().nullable(),
});

export const OrderResSchema = z.object({
  id: z.number(),
  userId: z.number(),
  status: z.enum([
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.PENDING_PICKUP,
    OrderStatus.PENDING_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.RETURNED,
    OrderStatus.CANCELLED,
  ]),
  paymentStatus: z.string(),
  paymentMethod: z.string(),
  shippingFee: z.number(),
  totalAmount: z.number(),
  vatRate: z.number().nonnegative().default(0),
  vatAmount: z.number().int().nonnegative().default(0),
  finalAmount: z.number(),
  receiver: ReceiverSchema,
  items: z.array(OrderItemResSchema),
  createdAt: isoDateTime,
});

export const OrderListItemSchema = OrderResSchema.omit({ items: true }).extend({
  user: z
    .object({ id: z.number(), name: z.string(), email: z.string() })
    .optional(),
});

export const ListOrderQuerySchema = z
  .object({
    status: z
      .enum([
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PENDING_PICKUP,
        OrderStatus.PENDING_DELIVERY,
        OrderStatus.DELIVERED,
        OrderStatus.RETURNED,
        OrderStatus.CANCELLED,
      ])
      .optional(),
    // filter theo tên/phone người nhận (admin only)
    search: z.string().trim().optional(),
    // filter theo khoảng ngày tạo đơn (ISO 8601 string, e.g. 2024-01-01)
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
    // filter theo userId cụ thể (admin only)
    userId: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const ListOrderResSchema = z.object({
  data: z.array(OrderListItemSchema),
  nextCursor: z.number().nullable(),
  hasMore: z.boolean(),
});

export const UpdateOrderStatusBodySchema = z
  .object({
    status: z.enum([
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PENDING_PICKUP,
      OrderStatus.PENDING_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.RETURNED,
      OrderStatus.CANCELLED,
    ]),
  })
  .strict();

export type ReceiverType = z.infer<typeof ReceiverSchema>;
export type CheckoutBodyType = z.infer<typeof CheckoutBodySchema>;
export type OrderResType = z.infer<typeof OrderResSchema>;
export type ListOrderQueryType = z.infer<typeof ListOrderQuerySchema>;
export type UpdateOrderStatusBodyType = z.infer<
  typeof UpdateOrderStatusBodySchema
>;
