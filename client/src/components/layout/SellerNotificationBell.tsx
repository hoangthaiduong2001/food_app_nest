import { useState, useRef, useEffect } from 'react'
import { Bell, ShoppingCart, Wallet, Info, CheckCheck, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNotificationStore } from '@/stores/notification.store'
import type { AppNotification } from '@/stores/notification.store'

const TYPE_CONFIG: Record<AppNotification['type'], { icon: React.ReactNode; bg: string; dot: string }> = {
  order: {
    icon: <ShoppingCart className="h-4 w-4 text-green-600" />,
    bg: 'bg-green-50',
    dot: 'bg-green-500',
  },
  wallet: {
    icon: <Wallet className="h-4 w-4 text-blue-500" />,
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
  },
  system: {
    icon: <Info className="h-4 w-4 text-gray-400" />,
    bg: 'bg-gray-50',
    dot: 'bg-gray-400',
  },
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s trước`
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

export function SellerNotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAllRead, markRead, clear } = useNotificationStore()
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  // Khi có notification order mới → invalidate seller orders query
  useEffect(() => {
    const lastNotif = notifications[0]
    if (lastNotif && !lastNotif.read && lastNotif.type === 'order') {
      qc.invalidateQueries({ queryKey: ['seller-orders'] })
    }
  }, [notifications, qc])

  // Đóng khi click ngoài
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const orderNotifs = notifications.filter((n) => n.type === 'order')

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-green-400 hover:text-green-600"
        title="Thông báo"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Thông báo</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Đọc tất cả
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clear}
                  className="text-gray-400 hover:text-gray-600"
                  title="Xóa tất cả"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Bell className="h-6 w-6 opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Chưa có thông báo</p>
                  <p className="mt-0.5 text-xs text-gray-400">Đơn hàng mới sẽ hiện ở đây</p>
                </div>
              </div>
            ) : (
              <div>
                {notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.type]
                  return (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                        !n.read ? 'bg-green-50/40' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {n.title}
                          </p>
                          <span className="shrink-0 text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div className={`mt-2 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <p className="text-xs text-gray-400">{notifications.length} thông báo</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
