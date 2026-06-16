import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './chat.repository';
import {
  ListConversationsResDto,
  ListMessagesQueryDto,
  ListMessagesResDto,
  MessageResDto,
  SendMessageBodyDto,
} from './chat.dto';
import { PrismaService } from '@/shared/services/prisma.service';

@ApiTags('Chat')
@Controller('chat')
@AuthSwagger()
export class ChatController {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly chatGateway: ChatGateway,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Gửi tin nhắn đến 1 user (thường là seller.userId lấy từ product detail).
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi tin nhắn đến user/seller' })
  @SuccessMessage('Message sent')
  @ZodSerializerDto(MessageResDto)
  async send(
    @CurrentUser() me: ActiveUserData,
    @Body() body: SendMessageBodyDto,
  ) {
    // Kiểm tra receiver tồn tại
    const receiver = await this.prisma.user.findFirst({
      where: { id: body.toUserId, deletedAt: null },
      select: { id: true },
    });
    if (!receiver) {
      throw new NotFoundException({ message: 'Recipient not found', path: 'toUserId' });
    }

    const msg = await this.chatRepository.send(me.userId, body.toUserId, body.content);

    const serialized = {
      ...msg,
      readAt: msg.readAt?.toISOString() ?? null,
      createdAt: msg.createdAt.toISOString(),
    };

    // Emit real-time — fire-and-forget
    this.chatGateway.emitNewMessage(me.userId, body.toUserId, serialized);

    return serialized;
  }

  /**
   * Lấy lịch sử tin nhắn với 1 user cụ thể (cursor-based, mới nhất trước).
   */
  @Get('messages')
  @ApiOperation({ summary: 'Lịch sử tin nhắn với 1 user' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListMessagesResDto)
  async listMessages(
    @CurrentUser() me: ActiveUserData,
    @Query() query: ListMessagesQueryDto,
  ) {
    const result = await this.chatRepository.listMessages(
      me.userId,
      query.withUserId,
      query.limit,
      query.cursor,
    );

    // Emit read receipt cho sender biết tin đã được đọc
    if (result.readAt) {
      this.chatGateway.emitReadReceipt(me.userId, query.withUserId, result.readAt);
    }

    return {
      ...result,
      data: result.data.map((m) => ({
        ...m,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Danh sách conversations — mỗi dòng là 1 partner với tin nhắn cuối + unread count.
   */
  @Get('conversations')
  @ApiOperation({ summary: 'Danh sách cuộc trò chuyện' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListConversationsResDto)
  listConversations(@CurrentUser() me: ActiveUserData) {
    return this.chatRepository.listConversations(me.userId);
  }
}
