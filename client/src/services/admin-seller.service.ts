import { api } from '@/lib/api'
import type { SellerProfile } from '@/types'

export interface SellerListParams {
  status?: string
  cursor?: number
  limit?: number
}

export interface SellerListResponse {
  data: SellerProfile[]
  nextCursor: number | null
  hasMore: boolean
}

export const adminSellerService = {
  list: (params: SellerListParams = {}) =>
    api
      .get<{ data: SellerListResponse }>('/sellers', { params })
      .then((r) => r.data.data),

  getOne: (id: number) =>
    api.get<{ data: SellerProfile }>(`/sellers/${id}`).then((r) => r.data.data),

  approve: (id: number, commissionRate: number) =>
    api
      .patch<{ data: SellerProfile }>(`/sellers/${id}/approve`, { commissionRate })
      .then((r) => r.data.data),

  reject: (id: number, reason: string) =>
    api
      .patch<{ data: SellerProfile }>(`/sellers/${id}/reject`, { reason })
      .then((r) => r.data.data),

  suspend: (id: number) =>
    api
      .patch<{ data: SellerProfile }>(`/sellers/${id}/suspend`)
      .then((r) => r.data.data),
}
