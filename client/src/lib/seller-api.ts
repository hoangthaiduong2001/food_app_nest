import axios from 'axios'
import { useSellerStore } from '@/stores/seller.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Tính HMAC-SHA256 signature theo format BE yêu cầu:
 *   HMAC-SHA256(secretKey, "<timestamp>:<METHOD>:<path>")
 * Dùng Web Crypto API (available in browser).
 */
async function sign(secretKey: string, timestamp: number, method: string, path: string): Promise<string> {
  const payload = `${timestamp}:${method.toUpperCase()}:${path}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const sellerApi = axios.create({ baseURL: BASE_URL })

sellerApi.interceptors.request.use(async (config) => {
  const creds = useSellerStore.getState().credentials
  if (!creds) throw new Error('Seller credentials not found. Please log in again.')

  const timestamp = Date.now()
  const method = config.method?.toUpperCase() ?? 'GET'

  // config.url là path của resource, ví dụ "/sellers/me/products"
  // BE nhận req.path sau khi Vite proxy đã strip "/api" prefix
  // nên path dùng để ký phải là config.url gốc (không có baseURL prefix)
  const rawPath = config.url ?? '/'
  // Tách phần pathname nếu có query string dính vào
  const path = rawPath.split('?')[0]

  const signature = await sign(creds.secretKey, timestamp, method, path)

  config.headers['X-Api-Key'] = creds.apiKey
  config.headers['X-Timestamp'] = String(timestamp)
  config.headers['X-Signature'] = signature

  return config
})
