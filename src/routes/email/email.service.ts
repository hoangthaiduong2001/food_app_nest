import envConfig from '@/shared/config';
import { EmailJobName, QueueName } from '@/shared/constants/queue.constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export interface OrderConfirmationPayload {
  to: string;
  customerName: string;
  orderId: number;
  items: { productName: string; quantity: number; totalPrice: string }[];
  finalAmount: string;
  paymentMethod: string;
  shippingAddress: string;
}

export interface DepositApprovedPayload {
  to: string;
  customerName: string;
  requestId: number;
  amount: string;
  currency: string;
  newBalance: string;
}

export interface DepositRejectedPayload {
  to: string;
  customerName: string;
  requestId: number;
  amount: string;
  currency: string;
  rejectReason?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = envConfig.SES_FROM_EMAIL;

  constructor(
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async sendOrderConfirmation(
    payload: OrderConfirmationPayload,
  ): Promise<void> {
    await this.emailQueue.add(EmailJobName.ORDER_CONFIRMATION, {
      from: this.fromEmail,
      ...payload,
    });
    this.logger.log(
      `Queued order-confirmation email to ${payload.to} for order #${payload.orderId}`,
    );
  }

  async sendDepositApproved(payload: DepositApprovedPayload): Promise<void> {
    await this.emailQueue.add(EmailJobName.DEPOSIT_APPROVED, {
      from: this.fromEmail,
      ...payload,
    });
    this.logger.log(
      `Queued deposit-approved email to ${payload.to} for request #${payload.requestId}`,
    );
  }

  async sendDepositRejected(payload: DepositRejectedPayload): Promise<void> {
    await this.emailQueue.add(EmailJobName.DEPOSIT_REJECTED, {
      from: this.fromEmail,
      ...payload,
    });
    this.logger.log(
      `Queued deposit-rejected email to ${payload.to} for request #${payload.requestId}`,
    );
  }

  async enqueue(jobName: string, data: Record<string, unknown>): Promise<void> {
    await this.emailQueue.add(jobName, { from: this.fromEmail, ...data });
  }
}
