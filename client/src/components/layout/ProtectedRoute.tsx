import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface ProtectedRouteProps {
  requireAdmin?: boolean
  blockAdmin?: boolean
}

export function ProtectedRoute({ requireAdmin = false, blockAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  const isAdmin = user?.roleName?.toUpperCase() === 'ADMIN'

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  if (blockAdmin && isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
