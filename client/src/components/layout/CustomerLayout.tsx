import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mt-12 border-t border-gray-100 bg-white py-8 text-center text-sm text-gray-400">
        © 2026 TechStore. Điện thoại, máy tính bảng và phụ kiện chính hãng.
      </footer>
    </div>
  )
}
