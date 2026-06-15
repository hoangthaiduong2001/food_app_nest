import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { MessageCircle } from 'lucide-react'
import { createElement } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import type { AppNotification } from '@/stores/notification.store'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3003'

interface NotificationEvent {
  title: string
  body: string
  type: AppNotification['type']
}

interface OrderStatusChangedEvent {
  orderId: number
  status: string
  updatedAt: string
}

interface ChatNewMessageEvent {
  fromUserId: number
  fromName: string
  preview: string
}

export function useSocket(): void {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const add = useNotificationStore((s) => s.add)
  const qc = useQueryClient()
  const ordersSocketRef = useRef<Socket | null>(null)
  const chatSocketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      ordersSocketRef.current?.disconnect()
      chatSocketRef.current?.disconnect()
      ordersSocketRef.current = null
      chatSocketRef.current = null
      return
    }

    // ── /orders namespace ──────────────────────────────────────────────
    const ordersSocket = io(`${SOCKET_URL}/orders`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })
    ordersSocketRef.current = ordersSocket

    ordersSocket.on('notification', (data: NotificationEvent) => {
      add({
        title: data.title,
        body: data.body,
        type: data.type ?? 'system',
      })
      toast(data.body, {
        icon: data.type === 'order' ? '🛒' : data.type === 'wallet' ? '💰' : 'ℹ️',
        duration: 4000,
      })
    })

    ordersSocket.on('order:status_changed', (data: OrderStatusChangedEvent) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', data.orderId] })
    })

    // ── /chat namespace ────────────────────────────────────────────────
    const chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })
    chatSocketRef.current = chatSocket

    chatSocket.on('chat:new_message', (data: ChatNewMessageEvent) => {
      // Chỉ toast — không đưa vào bell notification (đã có FloatingChat icon riêng)
      toast(
        createElement(
          'div',
          { className: 'flex items-center gap-2' },
          createElement(MessageCircle, { className: 'h-4 w-4 shrink-0 text-orange-500' }),
          createElement(
            'div',
            null,
            createElement('p', { className: 'text-sm font-semibold text-gray-900' }, data.fromName),
            createElement('p', { className: 'text-xs text-gray-500 line-clamp-1' }, data.preview),
          ),
        ),
        { duration: 5000, style: { padding: '10px 14px' } },
      )

      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      qc.invalidateQueries({ queryKey: ['chat-messages', data.fromUserId] })
    })

    return () => {
      ordersSocket.disconnect()
      chatSocket.disconnect()
      ordersSocketRef.current = null
      chatSocketRef.current = null
    }
  }, [isAuthenticated, accessToken, add, qc])
}
