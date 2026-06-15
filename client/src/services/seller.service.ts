import { api } from '@/lib/api'
import type { Category, Brand, SellerProfile, RegisterSellerPayload } from '@/types'

export interface SellerFilters {
  categories: Pick<Category, 'id' | 'name'>[]
  brands: Pick<Brand, 'id' | 'name' | 'logo'>[]
}

export const sellerService = {
  register: (payload: RegisterSellerPayload) =>
    api.post<{ data: SellerProfile }>('/sellers/register', payload).then((r) => r.data.data),

  getMe: () =>
    api.get<{ data: SellerProfile }>('/sellers/me').then((r) => r.data.data),

  activate: (activationToken: string) =>
    api.post<{ data: SellerProfile }>('/sellers/activate', { activationToken }).then((r) => r.data.data),

  // Public — lấy categories và brands mà seller đang bán
  getFilters: (sellerId: number) =>
    api.get<{ data: SellerFilters }>(`/sellers/${sellerId}/filters`).then((r) => r.data.data),
}
