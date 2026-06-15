import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Loader2, Search, User, ChevronDown } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { chatService } from '@/services/chat.service'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorMessage } from '@/lib/api'
import type { ChatMessage, Conversation } from '@/services/chat.service'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3003'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}p`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ name, avatar, size = 'md' }: { name: string; avatar?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  if (avatar) return <img src={avatar} alt={name} className={`${cls} shrink-0 rounded-full object-cover`} />
  return (
    <div className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-green-400 to-emerald-600 font-bold text-white`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function SellerChatPage() {
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const myId = user?.userId

  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Danh sách conversations
  const { data: conversations, isLoading: convLoading } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatService.listConversations,
    refetchInterval: 15_000,
  })

  const filtered = (conversations ?? []).filter((c) =>
    c.partnerName.toLowerCase().includes(searchQ.toLowerCase())
  )

  const selectedConv = (conversations ?? []).find((c) => c.partnerId === selectedPartnerId)

  // Load lịch sử với partner được chọn
  const {
    data: historyData,
    isLoading: histLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['chat-messages', selectedPartnerId],
    queryFn: ({ pageParam }) =>
      chatService.listMessages(selectedPartnerId!, 30, pageParam as number | undefined),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor ?? undefined : undefined),
    enabled: !!selectedPartnerId,
  })

  // Gộp history + dedupe realtime, sort asc theo id (mới nhất ở cuối)
  useEffect(() => {
    if (!historyData) return
    const history = historyData.pages.flatMap((p) => p.data)
    setMessages((prev) => {
      const ids = new Set(history.map((m) => m.id))
      const rtOnly = prev.filter((m) => !ids.has(m.id))
      return [...history, ...rtOnly].sort((a, b) => a.id - b.id)
    })
  }, [historyData])

  // Reset messages khi chuyển conversation
  useEffect(() => {
    setMessages([])
    setText('')
  }, [selectedPartnerId])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Socket /chat
  useEffect(() => {
    if (!accessToken) return

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })
    socketRef.current = socket

    // Nhận tin nhắn real-time trong conversation room
    socket.on('chat:message', (msg: ChatMessage) => {
      // Chỉ thêm vào nếu đang xem đúng conversation
      if (
        (msg.fromUserId === selectedPartnerId && msg.toUserId === myId) ||
        (msg.toUserId === selectedPartnerId && msg.fromUserId === myId)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
      // Luôn invalidate conversation list để cập nhật lastMessage + unread badge
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    })

    // Khi có tin nhắn mới từ user khác (trong personal room)
    socket.on('chat:new_message', () => {
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, myId, qc])

  // Join room khi đổi partner
  useEffect(() => {
    if (!selectedPartnerId || !socketRef.current) return
    socketRef.current.emit('chat:join', { partnerId: selectedPartnerId })
  }, [selectedPartnerId])

  const sendMsg = useMutation({
    mutationFn: () => chatService.send(selectedPartnerId!, text.trim()),
    onSuccess: (msg) => {
      setText('')
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      inputRef.current?.focus()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() && !sendMsg.isPending && selectedPartnerId) sendMsg.mutate()
    }
  }

  const totalUnread = (conversations ?? []).reduce((s, c) => s + c.unreadCount, 0)

  return (
    <div className="flex h-[calc(100vh-112px)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

      {/* ── Left: Conversation list ── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-gray-100">
        {/* Header */}
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <h1 className="font-bold text-gray-900">Tin nhắn</h1>
              {totalUnread > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </div>
          </div>
          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Tìm khách hàng..."
              className="h-8 w-full rounded-full border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <MessageCircle className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">
                {searchQ ? 'Không tìm thấy' : 'Chưa có tin nhắn nào'}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.partnerId}
                conv={conv}
                active={selectedPartnerId === conv.partnerId}
                onClick={() => setSelectedPartnerId(conv.partnerId)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: Chat panel ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedPartnerId && selectedConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-gray-100 bg-white px-5 py-3.5 shadow-sm">
              <Avatar name={selectedConv.partnerName} avatar={selectedConv.partnerAvatar} />
              <div>
                <p className="font-semibold text-gray-900">{selectedConv.partnerName}</p>
                <p className="text-xs text-green-500">Đang hoạt động</p>
              </div>
            </div>

            {/* Load more older */}
            {hasNextPage && (
              <div className="flex justify-center border-b border-gray-100 py-1.5">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600"
                >
                  {isFetchingNextPage
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <ChevronDown className="h-3 w-3" />
                  }
                  Xem tin nhắn cũ hơn
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {histLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <Avatar name={selectedConv.partnerName} avatar={selectedConv.partnerAvatar} size="lg" />
                  <div>
                    <p className="font-semibold text-gray-700">{selectedConv.partnerName}</p>
                    <p className="mt-0.5 text-sm text-gray-400">Bắt đầu cuộc trò chuyện</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => {
                    const isMe = msg.fromUserId === myId
                    const showAvatar = !isMe && (i === 0 || messages[i - 1]?.fromUserId !== msg.fromUserId)
                    const showTime = i === messages.length - 1 || messages[i + 1]?.fromUserId !== msg.fromUserId

                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar placeholder để giữ align */}
                        {!isMe && (
                          <div className="w-8 shrink-0">
                            {showAvatar && (
                              <Avatar name={msg.fromUser.name} avatar={msg.fromUser.avatar} size="sm" />
                            )}
                          </div>
                        )}

                        <div className={`flex max-w-[60%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMe
                              ? 'rounded-br-sm bg-green-500 text-white'
                              : 'rounded-bl-sm bg-gray-100 text-gray-800'
                          }`}>
                            {msg.content}
                          </div>
                          {showTime && (
                            <span className="px-1 text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-4">
              <div className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn trả lời... (Enter để gửi)"
                  rows={1}
                  className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                />
                <button
                  onClick={() => { if (text.trim() && !sendMsg.isPending) sendMsg.mutate() }}
                  disabled={!text.trim() || sendMsg.isPending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600 disabled:opacity-40"
                >
                  {sendMsg.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </button>
              </div>
              <p className="mt-1.5 text-center text-xs text-gray-400">Shift+Enter để xuống dòng</p>
            </div>
          </>
        ) : (
          /* Empty state — chưa chọn conversation */
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <MessageCircle className="h-10 w-10 text-green-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Trả lời khách hàng</p>
              <p className="mt-1 text-sm text-gray-400">
                Chọn một cuộc trò chuyện bên trái để bắt đầu
              </p>
            </div>
            {(conversations ?? []).length === 0 && !convLoading && (
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <User className="h-4 w-4 text-gray-400" />
                <p className="text-xs text-gray-500">Khách hàng hỏi về sản phẩm sẽ hiện ở đây</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationItem({
  conv, active, onClick,
}: {
  conv: Conversation
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
        active ? 'border-l-2 border-green-500 bg-green-50/60' : 'border-l-2 border-transparent'
      }`}
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
          <p className={`truncate text-xs ${conv.unreadCount > 0 ? 'font-medium text-gray-600' : 'text-gray-400'}`}>
            {conv.lastMessage}
          </p>
          {conv.unreadCount > 0 && (
            <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
