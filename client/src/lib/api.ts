import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }

    isRefreshing = true

    try {
      const refreshToken = useAuthStore.getState().refreshToken
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
      const newToken: string = data.data.accessToken

      useAuthStore.getState().setTokens(newToken, data.data.refreshToken)
      refreshQueue.forEach((cb) => cb(newToken))
      refreshQueue = []

      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export type ApiResponse<T> = {
  data: T
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<{
  data: T[]
  nextCursor: number | null
  hasMore: boolean
}>

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    // { error: { message } } — BE exception shape
    if (typeof data?.error?.message === 'string') return data.error.message
    // { message: string } — simple shape
    if (typeof data?.message === 'string') return data.message
    return error.message
  }
  return 'An error occurred'
}
