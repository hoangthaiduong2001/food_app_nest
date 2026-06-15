import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, Store, Loader2, ChevronUp } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { chatService } from '@/services/chat.service'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorMessage } from '@/lib/api'
import type { ChatMessage } from '@/services/chat.service'
import type { SellerBrief } from '@/types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3003'

function SellerAvatar({ name, logo }: { name: string; logo?: string | null }) {
  if (logo) return <img src={logo} alt={name} className="h-7 w-7 shrink-0 rounded-full object-cover" />
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
      {name[0]?.toUpperCase()}
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  seller: SellerBrief
  productName: string
  onClose: () => void
}

export function ChatDrawer({ seller, productName, onClose }: Props) {
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  // FIX: user là MeProfile → dùng userId, không phải id
  const myUserId = user?.userId

  const [text, setText] = useState('')
  const [realtimeMsgs, setRealtimeMsgs] = useState<ChatMessage[]>([])
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load lịch sử — cursor pagination, trang đầu = 30 tin mới nhất
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['chat-messages', seller.userId],
    queryFn: ({ pageParam }) =>
      chatService.listMessages(seller.userId, 30, pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  })

  // BE trả về desc (mới nhất trước) — flatten rồi sort asc theo id để mới nhất ở cuối
  const historyMsgs = data
    ? data.pages.flatMap((p) => p.data)
    : []

  const historyIds = new Set(historyMsgs.map((m) => m.id))
  const allMessages = [
    ...historyMsgs,
    ...realtimeMsgs.filter((m) => !historyIds.has(m.id)),
  ].sort((a, b) => a.id - b.id)

  // Scroll to bottom khi có tin mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  // Socket /chat — connect 1 lần, join room với seller
  useEffect(() => {
    if (!accessToken) return

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('chat:join', { partnerId: seller.userId })
    })

    socket.on('chat:message', (msg: ChatMessage) => {
      setRealtimeMsgs((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [accessToken, seller.userId, qc])

  const sendMsg = useMutation({
    mutationFn: () => chatService.send(seller.userId, text.trim()),
    onSuccess: (msg) => {
      setText('')
      setRealtimeMsgs((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      setTimeout(() => inputRef.current?.focus(), 0)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() && !sendMsg.isPending) sendMsg.mutate()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 bg-orange-500 px-4 py-3">
        <SellerAvatar name={seller.shopName} logo={seller.logo} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Store className="h-3 w-3 text-white/80" />
            <p className="truncate text-sm font-bold text-white">{seller.shopName}</p>
          </div>
          <p className="text-xs text-orange-100">Đang hoạt động</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Product context chip ── */}
      <div className="border-b border-orange-100 bg-orange-50 px-4 py-1.5">
        <p className="truncate text-xs text-orange-600">
          💬 Hỏi về: <span className="font-semibold">{productName}</span>
        </p>
      </div>

      {/* ── Load older ── */}
      {hasNextPage && (
        <div className="flex justify-center bg-gray-50 py-1.5">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500"
          >
            {isFetchingNextPage
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <ChevronUp className="h-3 w-3" />
            }
            Xem tin nhắn cũ hơn
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex flex-col gap-2 overflow-y-auto p-4" style={{ height: 340 }}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Store className="h-10 w-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Bắt đầu trò chuyện với seller</p>
            <p className="text-xs text-gray-400">Hỏi về giá, tình trạng, giao hàng...</p>
          </div>
        ) : (
          allMessages.map((msg, i) => {
            const isMe = msg.fromUserId === myUserId
            const prevMsg = allMessages[i - 1]
            const nextMsg = allMessages[i + 1]
            // Gom cụm: cùng người gửi liên tiếp
            const sameAsPrev = prevMsg?.fromUserId === msg.fromUserId
            const sameAsNext = nextMsg?.fromUserId === msg.fromUserId
            // Chỉ show avatar ở tin đầu tiên của cụm seller
            const showAvatar = !isMe && !sameAsPrev
            // Chỉ show timestamp ở tin cuối cùng của cụm
            const showTime = !sameAsNext

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar seller (placeholder width để giữ align khi không hiện) */}
                {!isMe && (
                  <div className="w-7 shrink-0">
                    {showAvatar && <SellerAvatar name={seller.shopName} logo={seller.logo} />}
                  </div>
                )}

                <div className={`flex max-w-[72%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isMe
                        ? 'rounded-br-none bg-orange-500 text-white'          // tôi — cam, bên phải
                        : 'rounded-bl-none bg-gray-100 text-gray-800'          // seller — xám, bên trái
                    } ${sameAsPrev && isMe ? 'rounded-tr-md' : ''} ${sameAsPrev && !isMe ? 'rounded-tl-md' : ''}`}
                  >
                    {msg.content}
                  </div>

                  {/* Timestamp chỉ ở tin cuối cụm */}
                  {showTime && (
                    <span className="px-0.5 text-[11px] text-gray-400">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (Enter để gửi)"
            rows={1}
            className="max-h-24 flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            style={{ minHeight: '22px' }}
          />
          <button
            onClick={() => { if (text.trim() && !sendMsg.isPending) sendMsg.mutate() }}
            disabled={!text.trim() || sendMsg.isPending}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-40"
          >
            {sendMsg.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Send className="h-3.5 w-3.5" />
            }
          </button>
        </div>
        <p className="mt-1 text-center text-[11px] text-gray-400">Shift+Enter xuống dòng</p>
      </div>
    </div>
  )
}
