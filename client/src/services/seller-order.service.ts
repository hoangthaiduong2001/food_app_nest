import { api as sellerApi } from '@/lib/api'
import type { OrderListItem, Order, OrderStatus } from '@/types'

const BASE = '/sellers/me/orders'

export interface SellerOrderListParams {
  cursor?: number
  limit?: number
  status?: OrderStatus
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface SellerOrderListResponse {
  data: OrderListItem[]
  nextCursor: number | null
  hasMore: boolean
}

export const sellerOrderService = {
  list: (params: SellerOrderListParams = {}) =>
    sellerApi
      .get<{ data: SellerOrderListResponse }>(BASE, { params })
      .then((r) => r.data.data),

  getOne: (id: number) =>
    sellerApi.get<{ data: Order }>(`${BASE}/${id}`).then((r) => r.data.data),

  updateStatus: (id: number, status: OrderStatus) =>
    sellerApi
      .patch<{ data: Order }>(`${BASE}/${id}/status`, { status })
      .then((r) => r.data.data),
}
