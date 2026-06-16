import envConfig from '@/shared/config';
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
import { PrismaService } from '@/shared/services/prisma.service';
import { RoleName } from '@/shared/constants/role.constant';

@WebSocketGateway({
  cors: { origin: envConfig!.CORS_ORIGINS.split(','), credentials: true },
  namespace: '/orders',
})
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OrderGateway.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

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

      client.data = { userId: payload.userId, roleName: payload.roleName };

      await client.join(`user:${payload.userId}`);
      this.logger.log(
        `Client connected: userId=${payload.userId} socketId=${client.id}`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(
      `Client disconnected: socketId=${client.id} userId=${client.data?.userId}`,
    );
  }

  @SubscribeMessage('join:order')
  async joinOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ): Promise<void> {
    const userId = client.data?.userId as number | undefined;
    const roleName = client.data?.roleName as string | undefined;
    if (!userId) return;

    // Admin được xem mọi order; user thường chỉ được xem order của mình
    if (roleName !== RoleName.Admin) {
      const order = await this.prisma.order.findFirst({
        where: { id: data.orderId, userId },
        select: { id: true },
      });
      if (!order) {
        client.emit('error', { message: 'Order not found or access denied' });
        return;
      }
    }

    const room = `order:${data.orderId}`;
    await client.join(room);
    this.logger.log(`userId=${userId} joined room ${room}`);
    client.emit('joined', { room });
  }

  @SubscribeMessage('leave:order')
  async leaveOrderRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ): Promise<void> {
    const room = `order:${data.orderId}`;
    await client.leave(room);
    client.emit('left', { room });
  }

  emitOrderStatusChanged(
    orderId: number,
    status: string,
    userId: number,
  ): void {
    const payload = { orderId, status, updatedAt: new Date().toISOString() };

    this.server.to(`order:${orderId}`).emit('order:status_changed', payload);

    this.server.to(`user:${userId}`).emit('order:status_changed', payload);
  }

  emitNotification(
    userId: number,
    notification: { title: string; body: string; type: string },
  ): void {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
