import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

type ConversationRow = {
  partnerId: bigint;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: bigint;
};

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async send(fromUserId: number, toUserId: number, content: string) {
    return this.prisma.message.create({
      data: { fromUserId, toUserId, content },
      select: messageSelect,
    });
  }

  async listMessages(
    meId: number,
    partnerId: number,
    limit: number,
    cursor?: number,
  ): Promise<{
    data: {
      id: number;
      fromUserId: number;
      toUserId: number;
      content: string;
      readAt: Date | null;
      createdAt: Date;
      fromUser: { id: number; name: string; avatar: string | null };
      toUser: { id: number; name: string; avatar: string | null };
    }[];
    nextCursor: number | null;
    hasMore: boolean;
    readAt: string | null;
  }> {
    const where: Prisma.MessageWhereInput = {
      OR: [
        { fromUserId: meId, toUserId: partnerId },
        { fromUserId: partnerId, toUserId: meId },
      ],
      ...(cursor ? { id: { lt: cursor } } : {}),
    };

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: messageSelect,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Mark unread từ partner là đã đọc, lấy readAt để emit read receipt
    const now = new Date();
    const { count } = await this.prisma.message.updateMany({
      where: { fromUserId: partnerId, toUserId: meId, readAt: null },
      data: { readAt: now },
    });
    const readAt = count > 0 ? now.toISOString() : null;

    return { data: page.reverse(), nextCursor, hasMore, readAt };
  }

  // 1 raw query thay vì N*3 queries
  async listConversations(meId: number): Promise<{
    data: {
      partnerId: number;
      partnerName: string;
      partnerAvatar: string | null;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }[];
  }> {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>`
      WITH partners AS (
        SELECT DISTINCT
          CASE WHEN "fromUserId" = ${meId} THEN "toUserId" ELSE "fromUserId" END AS "partnerId"
        FROM "Message"
        WHERE "fromUserId" = ${meId} OR "toUserId" = ${meId}
      ),
      last_msgs AS (
        SELECT DISTINCT ON (
          LEAST(m."fromUserId", m."toUserId"),
          GREATEST(m."fromUserId", m."toUserId")
        )
          m.content       AS "lastMessage",
          m."createdAt"   AS "lastMessageAt",
          CASE WHEN m."fromUserId" = ${meId} THEN m."toUserId" ELSE m."fromUserId" END AS "partnerId"
        FROM "Message" m
        WHERE m."fromUserId" = ${meId} OR m."toUserId" = ${meId}
        ORDER BY
          LEAST(m."fromUserId", m."toUserId"),
          GREATEST(m."fromUserId", m."toUserId"),
          m."createdAt" DESC
      ),
      unread_counts AS (
        SELECT "fromUserId" AS "partnerId", COUNT(*) AS cnt
        FROM "Message"
        WHERE "toUserId" = ${meId} AND "readAt" IS NULL
        GROUP BY "fromUserId"
      )
      SELECT
        p."partnerId",
        u.name          AS "partnerName",
        u.avatar        AS "partnerAvatar",
        lm."lastMessage",
        lm."lastMessageAt",
        COALESCE(uc.cnt, 0) AS "unreadCount"
      FROM partners p
      JOIN "User" u ON u.id = p."partnerId"
      JOIN last_msgs lm ON lm."partnerId" = p."partnerId"
      LEFT JOIN unread_counts uc ON uc."partnerId" = p."partnerId"
      ORDER BY lm."lastMessageAt" DESC
    `;

    return {
      data: rows.map((r) => ({
        partnerId: Number(r.partnerId),
        partnerName: r.partnerName,
        partnerAvatar: r.partnerAvatar,
        lastMessage: r.lastMessage,
        lastMessageAt: new Date(r.lastMessageAt).toISOString(),
        unreadCount: Number(r.unreadCount),
      })),
    };
  }
}
