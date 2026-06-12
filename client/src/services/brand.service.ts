import { api } from '@/lib/api'
import type { Brand } from '@/types'

export const brandService = {
  list: () => api.get<{ data: Brand[] }>('/brands').then((r) => r.data.data),

  get: (id: number) => api.get<{ data: Brand }>(`/brands/${id}`).then((r) => r.data.data),

  create: (payload: { name: string; logo: string }) =>
    api.post<{ data: Brand }>('/brands', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<{ name: string; logo: string }>) =>
    api.patch<{ data: Brand }>(`/brands/${id}`, payload).then((r) => r.data.data),

  delete: (id: number) => api.delete(`/brands/${id}`),
}
