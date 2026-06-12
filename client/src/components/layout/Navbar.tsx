import { Link, useNavigate } from 'react-router-dom'
import { Smartphone, ShoppingCart, User, LogOut, LayoutDashboard, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import { useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { NotificationBell } from './NotificationBell'

function LangSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('vi') ? 'vi' : 'en'

  return (
    <button
      onClick={() => i18n.changeLanguage(current === 'vi' ? 'en' : 'vi')}
      className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
      title="Switch language"
    >
      {current === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
    </button>
  )
}

export function Navbar() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuthStore()
  const itemCount = useCartStore((s) => s.itemCount())
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-blue-600 text-xl">
          <Smartphone className="h-6 w-6" />
          TechStore
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/products" className="text-gray-600 hover:text-blue-600 transition-colors">
            {t('nav.products')}
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/orders" className="text-gray-600 hover:text-blue-600 transition-colors">
                {t('nav.orders')}
              </Link>
              <Link to="/wallet" className="text-gray-600 hover:text-blue-600 transition-colors">
                {t('nav.wallet')}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <LangSwitcher />

          {isAuthenticated ? (
            <>
              <NotificationBell />

              <Button variant="ghost" size="icon" onClick={() => navigate('/cart')} className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Button>

              {user?.roleName?.toUpperCase() === 'ADMIN' && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} title={t('nav.adminDashboard')}>
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
                <Wallet className="h-5 w-5" />
              </Button>

              <button
                onClick={() => navigate('/me')}
                className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 hover:bg-blue-100 transition-colors"
                title={t('me.title')}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-blue-600" />
                )}
                <span className="max-w-24 truncate text-sm font-medium text-gray-700">{user?.name}</span>
              </button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                title={t('nav.logout')}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                {t('nav.login')}
              </Button>
              <Button onClick={() => navigate('/register')}>{t('nav.register')}</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
