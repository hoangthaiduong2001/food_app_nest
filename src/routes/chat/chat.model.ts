import z from 'zod';

export const SendMessageBodySchema = z
  .object({
    toUserId: z.number().int().positive(),
    content: z.string().min(1).max(2000).trim(),
  })
  .strict();

export const MessageResSchema = z.object({
  id: z.number(),
  fromUserId: z.number(),
  toUserId: z.number(),
  content: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  fromUser: z.object({ id: z.number(), name: z.string(), avatar: z.string().nullable() }),
  toUser: z.object({ id: z.number(), name: z.string(), avatar: z.string().nullable() }),
});

export const ListConversationsResSchema = z.object({
  data: z.array(
    z.object({
      partnerId: z.number(),
      partnerName: z.string(),
      partnerAvatar: z.string().nullable(),
      lastMessage: z.string(),
      lastMessageAt: z.string(),
      unreadCount: z.number(),
    }),
  ),
});

export const ListMessagesQuerySchema = z
  .object({
    withUserId: z.coerce.number().int().positive(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const ListMessagesResSchema = z.object({
  data: z.array(MessageResSchema),
  nextCursor: z.number().nullable(),
  hasMore: z.boolean(),
});

export type SendMessageBodyType = z.infer<typeof SendMessageBodySchema>;
export type ListMessagesQueryType = z.infer<typeof ListMessagesQuerySchema>;
