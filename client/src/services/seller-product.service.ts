import { api as sellerApi } from '@/lib/api'
import type { Product, ProductListItem, CreateProductPayload, UpdateProductPayload } from '@/types'

const BASE = '/sellers/me/products'

export interface SellerProductListParams {
  cursor?: number
  limit?: number
  q?: string
}

export interface SellerProductListResponse {
  data: ProductListItem[]
  nextCursor: number | null
  hasMore: boolean
}

export const sellerProductService = {
  list: (params: SellerProductListParams = {}) =>
    sellerApi
      .get<{ data: SellerProductListResponse }>(BASE, { params })
      .then((r) => r.data.data),

  getOne: (id: number) =>
    sellerApi.get<{ data: Product }>(`${BASE}/${id}`).then((r) => r.data.data),

  create: (payload: CreateProductPayload) =>
    sellerApi.post<{ data: Product }>(BASE, payload).then((r) => r.data.data),

  update: (id: number, payload: UpdateProductPayload) =>
    sellerApi.patch<{ data: Product }>(`${BASE}/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) =>
    sellerApi.delete<{ data: { deleted: boolean } }>(`${BASE}/${id}`).then((r) => r.data.data),
}
