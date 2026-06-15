import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import { authService } from '@/services/auth.service'
import { sellerService } from '@/services/seller.service'
import { useAuthStore } from '@/stores/auth.store'
import { useSellerStore } from '@/stores/seller.store'
import { getErrorMessage } from '@/lib/api'

async function resolveRedirect(roleName: string): Promise<string> {
  if (roleName?.toUpperCase() === 'ADMIN') return '/admin'
  // Check if CLIENT user also has a seller account
  try {
    const seller = await sellerService.getMe()
    if (seller) return '/seller'
  } catch {
    // Not a seller — normal client
  }
  return '/'
}

export function useMe() {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ['me'],
    queryFn: authService.me,
    enabled: isAuthenticated,
    retry: false,
  })
}

export function useLogin() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  return useMutation({
    mutationFn: authService.login,
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await authService.me()
      setUser(user)
      toast.success('Đăng nhập thành công!')
      const redirectTo = await resolveRedirect(user.roleName)
      navigate(redirectTo)
    },
    onError: (error) => {
      // BE ném 403 khi seller APPROVED nhưng chưa activate
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const msg: string = error.response.data?.error?.message ?? ''
        if (msg.toLowerCase().includes('activated')) {
          navigate('/seller/verify')
          return
        }
      }
      toast.error(getErrorMessage(error))
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()

  return useMutation({
    mutationFn: authService.register,
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await authService.me()
      setUser(user)
      toast.success('Tạo tài khoản thành công!')
      navigate('/')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useRegisterSeller() {
  const navigate = useNavigate()
  const { setTokens, setUser, logout } = useAuthStore()
  const { setCredentials } = useSellerStore()

  return useMutation({
    mutationFn: async (payload: Parameters<typeof authService.register>[0] & {
      shopName: string
      shopSlug: string
      shopEmail: string
      shopPhone: string
      shopAddress: string
      shopDescription?: string
    }) => {
      const { shopName, shopSlug, shopEmail, shopPhone, shopAddress, shopDescription, ...registerPayload } = payload
      // 1. Tạo user account
      const tokens = await authService.register(registerPayload)
      setTokens(tokens.accessToken, tokens.refreshToken)
      const user = await authService.me()
      setUser(user)
      // 2. Tạo seller account — nếu fail thì throw để onError xử lý
      const seller = await sellerService.register({
        shopName,
        shopSlug,
        email: shopEmail,
        phone: shopPhone,
        address: shopAddress,
        description: shopDescription ?? null,
      })
      // Lưu apiKey + secretKey ngay (chỉ trả về 1 lần duy nhất)
      if (seller.apiKey && seller.secretKey) {
        setCredentials({ apiKey: seller.apiKey, secretKey: seller.secretKey })
      }
      // 3. Đăng xuất sau khi tạo xong — user phải tự login lại
      await authService.logout().catch(() => undefined)
      logout()
    },
    onSuccess: () => {
      toast.success('Tạo tài khoản Seller thành công! Đăng nhập để tiếp tục.', { duration: 5000 })
      navigate('/login')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logout()
      navigate('/login')
      toast.success('Đã đăng xuất')
    },
  })
}
