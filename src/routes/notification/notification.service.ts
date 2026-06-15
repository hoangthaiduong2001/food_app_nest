import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { OrderGateway } from '../gateway/order.gateway';

export interface SendNotificationInput {
  userId: number;
  title: string;
  body: string;
  type: 'order' | 'wallet' | 'system';
  email?: {
    to: string;
    jobName: string;
    payload: Record<string, unknown>;
  };
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly orderGateway: OrderGateway,
    private readonly emailService: EmailService,
  ) {}

  send(input: SendNotificationInput): void {
    this.orderGateway.emitNotification(input.userId, {
      title: input.title,
      body: input.body,
      type: input.type,
    });

    if (input.email) {
      const { to, jobName, payload } = input.email;
      this.emailService
        .enqueue(jobName, { to, ...payload })
        .catch((err: Error) =>
          this.logger.error(
            `Failed to enqueue email notification: ${err.message}`,
          ),
        );
    }
  }

  notifyOrderStatusChanged(params: {
    userId: number;
    orderId: number;
    status: string;
    userEmail?: string;
  }): void {
    this.orderGateway.emitOrderStatusChanged(
      params.orderId,
      params.status,
      params.userId,
    );

    this.send({
      userId: params.userId,
      title: 'Order Updated',
      body: `Your order #${params.orderId} is now ${params.status}`,
      type: 'order',
    });
  }

  notifySellerNewOrder(params: {
    sellerUserId: number;
    orderId: number;
    buyerName: string;
    itemCount: number;
    finalAmount: number;
  }): void {
    this.send({
      userId: params.sellerUserId,
      title: 'Đơn hàng mới',
      body: `${params.buyerName} vừa đặt đơn #${params.orderId} — ${params.itemCount} sản phẩm, ${params.finalAmount.toLocaleString('vi-VN')}đ`,
      type: 'order',
    });
  }
}
