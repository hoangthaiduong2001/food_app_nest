import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorMessage } from '@/lib/api'

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
      toast.success('Logged in successfully!')
      navigate(user.roleName?.toUpperCase() === 'ADMIN' ? '/admin' : '/')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
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
      toast.success('Account created successfully!')
      navigate('/')
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
      toast.success('Logged out')
    },
  })
}
