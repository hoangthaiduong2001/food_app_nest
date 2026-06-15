import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'

import { CustomerLayout } from '@/components/layout/CustomerLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { SellerLayout } from '@/components/layout/SellerLayout'
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

function TitleManager() {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (!isAuthenticated) {
      const authTitles: Record<string, string> = {
        '/login': 'Login — TechStore',
        '/register': 'Register — TechStore',
        '/seller/verify': 'Verify — TechStore',
        '/seller/activate': 'Activate — TechStore',
      }
      document.title = authTitles[location.pathname] ?? 'TechStore'
      return
    }
    const role = user?.roleName?.toUpperCase()
    if (role === 'ADMIN') {
      document.title = 'Admin — TechStore'
    } else if (location.pathname.startsWith('/seller')) {
      document.title = 'Seller — TechStore'
    } else {
      document.title = 'TechStore'
    }
  }, [isAuthenticated, user, location.pathname])

  return null
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

// Seller
import SellerDashboardPage from '@/pages/seller/SellerDashboardPage'
import SellerProductsPage from '@/pages/seller/SellerProductsPage'
import SellerOrdersPage from '@/pages/seller/SellerOrdersPage'
import SellerAnalyticsPage from '@/pages/seller/SellerAnalyticsPage'
import SellerChatPage from '@/pages/seller/SellerChatPage'
import SellerActivatePage from '@/pages/seller/SellerActivatePage'
import SellerVerifyPage from '@/pages/seller/SellerVerifyPage'

// Admin
import DashboardPage from '@/pages/admin/DashboardPage'
import AdminProductsPage from '@/pages/admin/AdminProductsPage'
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage'
import AdminBrandsPage from '@/pages/admin/AdminBrandsPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminSellersPage from '@/pages/admin/AdminSellersPage'
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
        <TitleManager />
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/seller/activate" element={<SellerActivatePage />} />
          <Route path="/seller/verify" element={<SellerVerifyPage />} />

          {/* Customer routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<AdminRedirect><HomePage /></AdminRedirect>} />
            <Route path="/products" element={<AdminRedirect><ProductsPage /></AdminRedirect>} />
            <Route path="/products/:id" element={<AdminRedirect><ProductDetailPage /></AdminRedirect>} />

            {/* Protected customer routes (chỉ user thường — không phải admin, không phải seller) */}
            <Route element={<ProtectedRoute blockAdmin blockSeller />}>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/me" element={<MePage />} />
            </Route>
          </Route>

          {/* Seller routes */}
          <Route element={<ProtectedRoute requireSeller />}>
            <Route element={<SellerLayout />}>
              <Route path="/seller" element={<SellerDashboardPage />} />
              <Route path="/seller/products" element={<SellerProductsPage />} />
              <Route path="/seller/orders" element={<SellerOrdersPage />} />
              <Route path="/seller/analytics" element={<SellerAnalyticsPage />} />
              <Route path="/seller/chat" element={<SellerChatPage />} />
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
              <Route path="/admin/sellers" element={<AdminSellersPage />} />
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
