import { api } from '@/lib/api';
import type { Order, OrderListItem, OrderStatus, PaymentMethod, ReceiverInfo } from '@/types';

export interface CheckoutPayload {
  variantIds?: number[];
  receiver: ReceiverInfo;
  paymentMethod: PaymentMethod;
}

export interface OrderFilters {
  status?: OrderStatus;
  limit?: number;
  cursor?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: number;
}

export const orderService = {
  checkout: (payload: CheckoutPayload) =>
    api
      .post<{ data: Order }>('/orders/checkout', payload, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      .then((r) => r.data.data),

  list: (filters: OrderFilters = {}) =>
    api
      .get<{
        data: { data: OrderListItem[]; nextCursor: number | null; hasMore: boolean };
      }>('/orders', { params: filters })
      .then((r) => r.data.data),

  get: (id: number) =>
    api.get<{ data: Order }>(`/orders/${id}`).then((r) => r.data.data),

  updateStatus: (id: number, status: OrderStatus) =>
    api
      .patch<{ data: Order }>(`/orders/${id}/status`, { status })
      .then((r) => r.data.data),

  pay: (id: number) =>
    api.post<{ data: Order }>(`/orders/${id}/pay`).then((r) => r.data.data),
};
