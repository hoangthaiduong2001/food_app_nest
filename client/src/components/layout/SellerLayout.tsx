import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, BarChart2, LogOut, Store, MessageCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { chatService } from '@/services/chat.service'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth.store'
import { useLogout } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { SellerNotificationBell } from './SellerNotificationBell'

function LangSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('vi') ? 'vi' : 'en'
  return (
    <button
      onClick={() => i18n.changeLanguage(current === 'vi' ? 'en' : 'vi')}
      className="rounded border border-gray-700 px-2 py-0.5 text-xs font-semibold text-gray-400 hover:border-green-500 hover:text-green-400 transition-colors"
    >
      {current === 'vi' ? 'VI' : 'EN'}
    </button>
  )
}

export function SellerLayout() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const logout = useLogout()
  const navigate = useNavigate()

  const { data: conversations } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatService.listConversations,
    refetchInterval: 15_000,
  })
  const totalUnread = (conversations ?? []).reduce((s, c) => s + c.unreadCount, 0)

  const navItems = [
    { to: '/seller', label: t('seller.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/seller/products', label: t('seller.nav.products'), icon: Package },
    { to: '/seller/orders', label: t('seller.nav.orders'), icon: ShoppingCart },
    { to: '/seller/analytics', label: t('seller.analytics'), icon: BarChart2 },
    { to: '/seller/chat', label: 'Tin nhắn', icon: MessageCircle, badge: totalUnread },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 flex flex-col">
        <div
          className="flex h-16 items-center gap-2 px-6 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Store className="h-6 w-6 text-green-400" />
          <span className="font-bold text-white text-lg">TechStore</span>
          <span className="ml-auto rounded bg-green-600 px-1.5 py-0.5 text-xs text-white">
            Seller
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-400 px-1 text-xs font-bold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
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
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-gray-100 bg-white px-8 shadow-sm">
          <SellerNotificationBell />
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
