import { api } from '@/lib/api'
import type { AdminUser, PaginatedResponse } from '@/types'

export interface ListUsersParams {
  page?: number
  limit?: number
  search?: string
}

export interface CreateUserPayload {
  email: string
  name: string
  phoneNumber: string
  password: string
  roleId: number
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
}

export interface UpdateUserPayload {
  name?: string
  phoneNumber?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  roleId?: number
  avatar?: string
}

export const userService = {
  list: (params: ListUsersParams): Promise<PaginatedResponse<AdminUser>> =>
    api.get('/user', { params }).then((r) => r.data.data),

  getById: (id: number): Promise<AdminUser> =>
    api.get(`/user/${id}`).then((r) => r.data.data),

  create: (data: CreateUserPayload): Promise<AdminUser> =>
    api.post('/user', data).then((r) => r.data.data),

  update: (id: number, data: UpdateUserPayload): Promise<AdminUser> =>
    api.put(`/user/${id}`, data).then((r) => r.data.data),

  delete: (id: number): Promise<void> =>
    api.delete(`/user/${id}`).then((r) => r.data),
}
