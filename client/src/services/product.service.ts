import { api } from '@/lib/api'
import type { Product, ProductListItem, PaginationMeta } from '@/types'

export interface ProductFilters {
  brandId?: number
  categoryId?: number
  sellerId?: number
  q?: string
  limit?: number
  cursor?: number
}

export interface CreateProductPayload {
  name: string
  description?: string | null
  basePrice: number
  virtualPrice: number
  stock: number
  isActive: boolean
  slug?: string
  brandId: number
  images: string[]
  categoryIds: number[]
  publishedAt?: string
}

export const productService = {
  list: (filters: ProductFilters = {}) =>
    api
      .get<{ data: { data: ProductListItem[]; nextCursor: number | null; hasMore: boolean } & PaginationMeta }>(
        '/products',
        { params: filters },
      )
      .then((r) => r.data.data),

  get: (id: number) =>
    api.get<{ data: Product }>(`/products/${id}`).then((r) => r.data.data),

  create: (payload: CreateProductPayload) =>
    api.post<{ data: Product }>('/products', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<CreateProductPayload>) =>
    api.patch<{ data: Product }>(`/products/${id}`, payload).then((r) => r.data.data),

  delete: (id: number) => api.delete(`/products/${id}`),
}
