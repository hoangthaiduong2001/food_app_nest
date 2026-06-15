import { api } from '@/lib/api'

export interface ChatMessage {
  id: number
  fromUserId: number
  toUserId: number
  content: string
  readAt: string | null
  createdAt: string
  fromUser: { id: number; name: string; avatar: string | null }
  toUser: { id: number; name: string; avatar: string | null }
}

export interface Conversation {
  partnerId: number
  partnerName: string
  partnerAvatar: string | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export const chatService = {
  send: (toUserId: number, content: string) =>
    api
      .post<{ data: ChatMessage }>('/chat/messages', { toUserId, content })
      .then((r) => r.data.data),

  listMessages: (withUserId: number, limit = 30, cursor?: number) =>
    api
      .get<{ data: { data: ChatMessage[]; nextCursor: number | null; hasMore: boolean } }>(
        '/chat/messages',
        { params: { withUserId, limit, cursor } },
      )
      .then((r) => r.data.data),

  listConversations: () =>
    api
      .get<{ data: { data: Conversation[] } }>('/chat/conversations')
      .then((r) => r.data.data.data),
}
