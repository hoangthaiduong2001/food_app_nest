import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useQuery } from '@tanstack/react-query'
import { sellerService } from '@/services/seller.service'
import { Spinner } from '@/components/ui/spinner'

interface ProtectedRouteProps {
  requireAdmin?: boolean
  requireSeller?: boolean
  blockAdmin?: boolean
  blockSeller?: boolean
}

export function ProtectedRoute({ requireAdmin = false, requireSeller = false, blockAdmin = false, blockSeller = false }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  const isAdmin = user?.roleName?.toUpperCase() === 'ADMIN'

  // Query seller-me khi cần kiểm tra (requireSeller hoặc blockSeller)
  const needSellerCheck = isAuthenticated && !isAdmin && (requireSeller || blockSeller)
  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ['seller-me'],
    queryFn: sellerService.getMe,
    enabled: needSellerCheck,
    retry: false,
  })

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (blockAdmin && isAdmin) {
    return <Navigate to="/admin" replace />
  }

  // Chờ load xong khi cần kiểm tra seller
  if (needSellerCheck && sellerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (requireSeller && !seller) {
    return <Navigate to="/" replace />
  }

  if (blockSeller && seller) {
    return <Navigate to="/seller" replace />
  }

  return <Outlet />
}
