import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { CustomerLayout } from '@/components/layout/CustomerLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useAuthStore } from '@/stores/auth.store'
import { useSocket } from '@/hooks/useSocket'

function AdminRedirect({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.roleName?.toUpperCase() === 'ADMIN') {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}

function SocketProvider({ children }: { children: React.ReactNode }) {
  useSocket()
  return <>{children}</>
}

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Customer
import HomePage from '@/pages/customer/HomePage'
import ProductsPage from '@/pages/customer/ProductsPage'
import ProductDetailPage from '@/pages/customer/ProductDetailPage'
import CartPage from '@/pages/customer/CartPage'
import CheckoutPage from '@/pages/customer/CheckoutPage'
import OrdersPage from '@/pages/customer/OrdersPage'
import OrderDetailPage from '@/pages/customer/OrderDetailPage'
import WalletPage from '@/pages/customer/WalletPage'
import MePage from '@/pages/customer/MePage'

// Admin
import DashboardPage from '@/pages/admin/DashboardPage'
import AdminProductsPage from '@/pages/admin/AdminProductsPage'
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage'
import AdminBrandsPage from '@/pages/admin/AdminBrandsPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminWalletPage from '@/pages/admin/AdminWalletPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SocketProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<AdminRedirect><HomePage /></AdminRedirect>} />
            <Route path="/products" element={<AdminRedirect><ProductsPage /></AdminRedirect>} />
            <Route path="/products/:id" element={<AdminRedirect><ProductDetailPage /></AdminRedirect>} />

            {/* Protected customer routes (phải đăng nhập, không phải admin) */}
            <Route element={<ProtectedRoute blockAdmin />}>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/me" element={<MePage />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/products" element={<AdminProductsPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/brands" element={<AdminBrandsPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/wallet" element={<AdminWalletPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </SocketProvider>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
        }}
      />
    </QueryClientProvider>
  )
}
