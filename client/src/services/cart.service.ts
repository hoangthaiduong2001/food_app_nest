import { api } from '@/lib/api'
import type { Cart } from '@/types'

export const cartService = {
  get: () => api.get<{ data: Cart }>('/cart').then((r) => r.data.data),

  addItem: (variantId: number, quantity: number) =>
    api
      .post<{ data: Cart }>('/cart/items', { variantId, quantity })
      .then((r) => r.data.data),

  updateItem: (variantId: number, quantity: number) =>
    api
      .patch<{ data: Cart }>(`/cart/items/${variantId}`, { quantity })
      .then((r) => r.data.data),

  removeItem: (variantId: number) =>
    api.delete<{ data: Cart }>(`/cart/items/${variantId}`).then((r) => r.data.data),

  clear: () => api.delete<{ data: Cart }>('/cart').then((r) => r.data.data),
}
