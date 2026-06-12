import { api } from '@/lib/api'
import type { Category } from '@/types'

export const categoryService = {
  list: (parentId?: number) =>
    api
      .get<{ data: Category[] }>('/categories', { params: parentId ? { parentId } : {} })
      .then((r) => r.data.data),

  get: (id: number) =>
    api.get<{ data: Category }>(`/categories/${id}`).then((r) => r.data.data),

  create: (payload: { name: string; logo?: string; parentCategoryId?: number }) =>
    api.post<{ data: Category }>('/categories', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<{ name: string; logo: string; parentCategoryId: number }>) =>
    api.patch<{ data: Category }>(`/categories/${id}`, payload).then((r) => r.data.data),

  delete: (id: number) => api.delete(`/categories/${id}`),
}
