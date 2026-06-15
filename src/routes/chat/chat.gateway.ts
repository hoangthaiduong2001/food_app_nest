import { TokenService } from '@/shared/services/token.service';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth['token'] as string | undefined) ??
      client.handshake.headers.authorization?.replace('Bearer ', '') ??
      '';

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      client.data = { userId: payload.userId };
      await client.join(`chat:${payload.userId}`);
      this.logger.log(`Chat connected: userId=${payload.userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Chat disconnected: socketId=${client.id}`);
  }

  // Client join room của conversation với 1 partner cụ thể
  @SubscribeMessage('chat:join')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { partnerId: number },
  ): Promise<void> {
    const userId = client.data?.userId as number | undefined;
    if (!userId) return;
    const room = this.roomKey(userId, data.partnerId);
    await client.join(room);
    client.emit('chat:joined', { room });
  }

  // Emit tin nhắn mới đến cả 2 user (sender + receiver)
  emitNewMessage(
    fromUserId: number,
    toUserId: number,
    message: {
      id: number;
      fromUserId: number;
      toUserId: number;
      content: string;
      readAt: string | null;
      createdAt: string;
      fromUser: { id: number; name: string; avatar: string | null };
      toUser: { id: number; name: string; avatar: string | null };
    },
  ): void {
    // Emit vào room conversation nếu cả 2 đang trong room
    const room = this.roomKey(fromUserId, toUserId);
    this.server.to(room).emit('chat:message', message);

    // Emit vào personal room của receiver để hiện badge/notification
    this.server.to(`chat:${toUserId}`).emit('chat:new_message', {
      fromUserId,
      fromName: message.fromUser.name,
      preview: message.content.slice(0, 80),
    });
  }

  private roomKey(a: number, b: number): string {
    // Đảm bảo room key nhất quán bất kể ai gọi trước
    return `conversation:${Math.min(a, b)}:${Math.max(a, b)}`;
  }
}
