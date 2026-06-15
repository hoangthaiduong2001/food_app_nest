import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';

const userSelect = { id: true, name: true, avatar: true } as const;

const messageSelect = {
  id: true,
  fromUserId: true,
  toUserId: true,
  content: true,
  readAt: true,
  createdAt: true,
  fromUser: { select: userSelect },
  toUser: { select: userSelect },
} as const;

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async send(fromUserId: number, toUserId: number, content: string) {
    return this.prisma.message.create({
      data: { fromUserId, toUserId, content },
      select: messageSelect,
    });
  }

  async listMessages(meId: number, partnerId: number, limit: number, cursor?: number) {
    const rows = await this.prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: meId, toUserId: partnerId },
          { fromUserId: partnerId, toUserId: meId },
        ],
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: messageSelect,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Mark unread messages từ partner là đã đọc
    this.prisma.message
      .updateMany({
        where: { fromUserId: partnerId, toUserId: meId, readAt: null },
        data: { readAt: new Date() },
      })
      .catch(() => null);

    return { data: page.reverse(), nextCursor, hasMore };
  }

  // Danh sách conversations: mỗi partner hiển thị 1 dòng với tin nhắn cuối + unread count
  async listConversations(meId: number) {
    // Lấy tất cả partner IDs đã nhắn tin
    const sent = await this.prisma.message.findMany({
      where: { fromUserId: meId },
      select: { toUserId: true },
      distinct: ['toUserId'],
    });
    const received = await this.prisma.message.findMany({
      where: { toUserId: meId },
      select: { fromUserId: true },
      distinct: ['fromUserId'],
    });

    const partnerIds = [
      ...new Set([
        ...sent.map((m) => m.toUserId),
        ...received.map((m) => m.fromUserId),
      ]),
    ];

    if (partnerIds.length === 0) return { data: [] };

    // Load last message + unread count cho mỗi partner
    const conversations = await Promise.all(
      partnerIds.map(async (partnerId) => {
        const [lastMsg, unreadCount, partner] = await Promise.all([
          this.prisma.message.findFirst({
            where: {
              OR: [
                { fromUserId: meId, toUserId: partnerId },
                { fromUserId: partnerId, toUserId: meId },
              ],
            },
            orderBy: { id: 'desc' },
            select: { content: true, createdAt: true },
          }),
          this.prisma.message.count({
            where: { fromUserId: partnerId, toUserId: meId, readAt: null },
          }),
          this.prisma.user.findUnique({
            where: { id: partnerId },
            select: { id: true, name: true, avatar: true },
          }),
        ]);

        if (!lastMsg || !partner) return null;
        return {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerAvatar: partner.avatar,
          lastMessage: lastMsg.content,
          lastMessageAt: lastMsg.createdAt.toISOString(),
          unreadCount,
        };
      }),
    );

    const data = conversations
      .filter((c) => c !== null)
      .sort((a, b) => b!.lastMessageAt.localeCompare(a!.lastMessageAt));

    return { data };
  }
}
