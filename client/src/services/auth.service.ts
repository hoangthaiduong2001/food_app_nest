import { api } from '@/lib/api'
import type { User, MeProfile, UpdateProfilePayload } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  name: string
  password: string
  confirmPassword: string
  phoneNumber: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<{ data: AuthTokens }>('/auth/login', payload).then((r) => r.data.data),

  register: (payload: RegisterPayload) =>
    api.post<{ data: AuthTokens }>('/auth/register', payload).then((r) => r.data.data),

  me: () => api.get<{ data: MeProfile }>('/auth/me').then((r) => r.data.data),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<{ data: MeProfile }>('/auth/me', payload).then((r) => r.data.data),

  logout: () => api.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    api
      .post<{ data: AuthTokens }>('/auth/refresh', { refreshToken })
      .then((r) => r.data.data),
}
