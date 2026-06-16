import { OrderStatus } from '@/shared/constants/order.constant';

const orderDefaults = {
  id: 1,
  userId: 10,
  sellerId: null as number | null,
  status: OrderStatus.PENDING_PAYMENT as string,
  receiver: { name: 'Nguyen Van A', phone: '0901234567', address: '123 ABC St' },
  paymentMethod: 'COD',
  paymentStatus: 'PENDING',
  shippingFee: 30_000,
  totalAmount: 200_000,
  discountAmount: 0,
  finalAmount: 230_000,
  sellerAmount: 0,
  paidAt: null as Date | null,
  settledAt: null as Date | null,
  createdById: 10,
  updatedById: null as number | null,
  deletedAt: null as Date | null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  items: [
    {
      id: 1,
      orderId: 1,
      variantId: 5 as number | null,
      productId: 2,
      quantity: 2,
      unitPrice: 100_000,
      totalPrice: 200_000,
      productName: 'Test Product',
      productImage: null as string | null,
      attributes: null as unknown,
    },
  ],
  createdBy: null as { id: number; name: string; email: string } | null,
};

type OrderRaw = typeof orderDefaults;

export const buildOrderRaw = (overrides: Partial<OrderRaw> = {}): OrderRaw => ({
  ...orderDefaults,
  ...overrides,
});
