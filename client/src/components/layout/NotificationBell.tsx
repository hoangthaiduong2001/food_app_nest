import { useState, useRef, useEffect } from 'react'
import { Bell, Package, Wallet, Info, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/stores/notification.store'
import { Button } from '@/components/ui/button'
import type { AppNotification } from '@/stores/notification.store'

const TYPE_ICON: Record<AppNotification['type'], React.ReactNode> = {
  order: <Package className="h-4 w-4 text-blue-500" />,
  wallet: <Wallet className="h-4 w-4 text-green-500" />,
  system: <Info className="h-4 w-4 text-gray-400" />,
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleOpen() {
    setOpen((v) => !v)
  }

  function handleMarkRead(id: string) {
    markRead(id)
  }

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" onClick={handleOpen} className="relative" title={t('notification.title')}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="font-semibold text-gray-900">{t('notification.title')}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t('notification.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                <Bell className="h-8 w-8 opacity-30" />
                <span className="text-sm">{t('notification.empty')}</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={[
                    'flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-gray-50',
                    !n.read ? 'bg-blue-50/50' : '',
                  ].join(' ')}
                >
                  <div className="mt-0.5 flex-shrink-0">{TYPE_ICON[n.type]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={['text-sm', !n.read ? 'font-semibold text-gray-900' : 'text-gray-700'].join(' ')}>
                        {n.title}
                      </p>
                      <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                  </div>
                  {!n.read && (
                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
