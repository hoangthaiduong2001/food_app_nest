import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
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

export function useSocket(): void {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const add = useNotificationStore((s) => s.add)
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socketRef.current?.disconnect()
      socketRef.current = null
      return
    }

    const socket = io(`${SOCKET_URL}/orders`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    // Event chính — BE emit từ NotificationService.send()
    // Covers: đặt hàng thành công, cập nhật trạng thái, duyệt/từ chối ví
    socket.on('notification', (data: NotificationEvent) => {
      add({
        title: data.title,
        body: data.body,
        type: data.type ?? 'system',
      })
    })

    // Event phụ — BE emit riêng từ emitOrderStatusChanged()
    // Dùng để sync UI: invalidate orders query ngay khi có cập nhật
    socket.on('order:status_changed', (data: OrderStatusChangedEvent) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', data.orderId] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, accessToken, add, qc])
}
