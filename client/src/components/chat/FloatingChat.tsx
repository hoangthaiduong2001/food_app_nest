import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { MessageCircle, X, Send, Loader2, ChevronUp, ArrowLeft, Search } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { chatService } from '@/services/chat.service'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorMessage } from '@/lib/api'
import type { ChatMessage, Conversation } from '@/services/chat.service'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3003'

function Avatar({ name, avatar, size = 'md' }: { name: string; avatar?: string | null; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  if (avatar) return <img src={avatar} alt={name} className={`${cls} shrink-0 rounded-full object-cover`} />
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}p`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

/* ── Panel: Conversation list ── */
function ConvList({
  onSelect, onClose, isAuthenticated,
}: {
  onSelect: (conv: Conversation) => void
  onClose: () => void
  isAuthenticated: boolean
}) {
  const [q, setQ] = useState('')
  const { data: convs, isLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatService.listConversations,
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  })

  const filtered = (convs ?? []).filter((c) =>
    c.partnerName.toLowerCase().includes(q.toLowerCase())
  )
  const totalUnread = (convs ?? []).reduce((s, c) => s + c.unreadCount, 0)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">Tin nhắn</span>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-bold text-white">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm cuộc trò chuyện..."
            className="h-8 w-full rounded-full border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <MessageCircle className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">
              {q ? 'Không tìm thấy' : 'Chưa có cuộc trò chuyện nào'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.partnerId}
              onClick={() => onSelect(conv)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <Avatar name={conv.partnerName} avatar={conv.partnerAvatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={`truncate text-sm ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {conv.partnerName}
                  </p>
                  <span className="shrink-0 text-xs text-gray-400">{timeAgo(conv.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className={`truncate text-xs ${conv.unreadCount > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                    {conv.lastMessage}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-bold text-white">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/* ── Panel: Chat với 1 partner ── */
function ChatPanel({
  conv, myUserId, onBack,
}: {
  conv: Conversation
  myUserId: number
  onBack: () => void
}) {
  const qc = useQueryClient()
  const { accessToken } = useAuthStore()
  const [text, setText] = useState('')
  const [realtimeMsgs, setRealtimeMsgs] = useState<ChatMessage[]>([])
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['chat-messages', conv.partnerId],
    queryFn: ({ pageParam }) =>
      chatService.listMessages(conv.partnerId, 30, pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
  })

  const historyMsgs = data ? data.pages.flatMap((p) => p.data) : []
  const historyIds = new Set(historyMsgs.map((m) => m.id))
  const allMessages = [
    ...historyMsgs,
    ...realtimeMsgs.filter((m) => !historyIds.has(m.id)),
  ].sort((a, b) => a.id - b.id)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages.length])

  // Socket /chat
  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    })
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('chat:join', { partnerId: conv.partnerId })
    })
    socket.on('chat:message', (msg: ChatMessage) => {
      setRealtimeMsgs((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    })
    return () => { socket.disconnect(); socketRef.current = null }
  }, [accessToken, conv.partnerId, qc])

  const sendMsg = useMutation({
    mutationFn: () => chatService.send(conv.partnerId, text.trim()),
    onSuccess: (msg) => {
      setText('')
      setRealtimeMsgs((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
        <button onClick={onBack} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar name={conv.partnerName} avatar={conv.partnerAvatar} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{conv.partnerName}</p>
          <p className="text-xs text-green-500">Đang hoạt động</p>
        </div>
      </div>

      {/* Load older */}
      {hasNextPage && (
        <div className="flex justify-center border-b border-gray-100 bg-gray-50 py-1">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500"
          >
            {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronUp className="h-3 w-3" />}
            Tin nhắn cũ hơn
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-medium text-gray-500">Chưa có tin nhắn</p>
            <p className="text-xs text-gray-400">Hãy bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          allMessages.map((msg, i) => {
            const isMe = msg.fromUserId === myUserId
            const prevMsg = allMessages[i - 1]
            const nextMsg = allMessages[i + 1]
            const sameAsPrev = prevMsg?.fromUserId === msg.fromUserId
            const sameAsNext = nextMsg?.fromUserId === msg.fromUserId
            const showAvatar = !isMe && !sameAsPrev
            const showTime = !sameAsNext

            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar slot bên trái (chỉ với seller/partner) */}
                {!isMe && (
                  <div className="w-7 shrink-0">
                    {showAvatar && <Avatar name={conv.partnerName} avatar={conv.partnerAvatar} size="sm" />}
                  </div>
                )}

                <div className={`flex max-w-[72%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    isMe
                      ? 'rounded-br-none bg-orange-500 text-white'    /* tôi — cam, phải */
                      : 'rounded-bl-none bg-gray-100 text-gray-800'   /* đối phương — xám, trái */
                  }`}>
                    {msg.content}
                  </div>
                  {showTime && (
                    <span className="px-0.5 text-[11px] text-gray-400">{formatTime(msg.createdAt)}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn tin... (Enter để gửi)"
            rows={1}
            className="max-h-20 flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
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

/* ── Main floating widget ── */
export function FloatingChat() {
  const { isAuthenticated, user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)

  // Đếm unread để hiện badge trên FAB
  const { data: convs } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatService.listConversations,
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  })
  const totalUnread = (convs ?? []).reduce((s, c) => s + c.unreadCount, 0)

  if (!isAuthenticated || !user) return null

  const myUserId = user.userId

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat popup */}
      {open && (
        <div className="flex h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {activeConv ? (
            <ChatPanel
              conv={activeConv}
              myUserId={myUserId}
              onBack={() => setActiveConv(null)}
            />
          ) : (
            <ConvList
              onSelect={setActiveConv}
              onClose={() => setOpen(false)}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => { setOpen((v) => !v); if (open) setActiveConv(null) }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition hover:scale-105 hover:bg-orange-600 active:scale-95"
      >
        {open
          ? <X className="h-6 w-6" />
          : <MessageCircle className="h-6 w-6" />
        }
        {!open && totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  )
}
