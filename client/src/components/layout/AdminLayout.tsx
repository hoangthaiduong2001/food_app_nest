import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Tag,
  Layers,
  ShoppingCart,
  Users,
  Wallet,
  LogOut,
  Smartphone,
  Store,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth.store'
import { useLogout } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

function LangSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('vi') ? 'vi' : 'en'
  return (
    <button
      onClick={() => i18n.changeLanguage(current === 'vi' ? 'en' : 'vi')}
      className="rounded border border-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
    >
      {current === 'vi' ? 'VI' : 'EN'}
    </button>
  )
}

export function AdminLayout() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const logout = useLogout()
  const navigate = useNavigate()

  const navItems = [
    { to: '/admin', label: t('admin.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/admin/products', label: t('admin.products'), icon: Package },
    { to: '/admin/categories', label: t('admin.categories'), icon: Layers },
    { to: '/admin/brands', label: t('admin.brands'), icon: Tag },
    { to: '/admin/orders', label: t('admin.orders'), icon: ShoppingCart },
    { to: '/admin/users', label: t('admin.users'), icon: Users },
    { to: '/admin/sellers', label: t('admin.sellers'), icon: Store },
    { to: '/admin/wallet', label: t('admin.wallet'), icon: Wallet },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 flex flex-col">
        <div
          className="flex h-16 items-center gap-2 px-6 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Smartphone className="h-6 w-6 text-blue-400" />
          <span className="font-bold text-white text-lg">TechStore</span>
          <span className="ml-auto rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white">
            Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.username}</p>
              <p className="truncate text-xs text-gray-400">{user?.email}</p>
            </div>
            <LangSwitcher />
            <button
              onClick={() => logout.mutate()}
              className="text-gray-400 hover:text-white transition-colors"
              title={t('nav.logout')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="ml-64 flex-1">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
