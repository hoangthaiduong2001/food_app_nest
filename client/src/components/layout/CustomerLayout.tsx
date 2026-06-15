import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { FloatingChat } from '@/components/chat/FloatingChat'

export function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mt-12 border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
        © 2026 ShopVN. Mua sắm đa dạng — điện tử, gia dụng, thời trang và nhiều hơn nữa.
      </footer>
      <FloatingChat />
    </div>
  )
}
