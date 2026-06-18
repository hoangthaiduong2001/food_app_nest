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

export interface OrderInvoicePayload {
  to: string;
  customerName: string;
  orderId: number;
  shopName: string;
  deliveredAt: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  shippingFee: number;
  vatAmount: number;
  vatRate: number;
  finalAmount: number;
  paymentMethod: string;
}

export interface SellerApprovedPayload {
  to: string;
  sellerName: string;
  shopName: string;
  commissionRate: number;
  approvedAt: string;
  activationToken: string;
  activationExpiresAt: string;
}

export interface SellerRejectedPayload {
  to: string;
  sellerName: string;
  shopName: string;
  rejectedReason?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = envConfig.SES_FROM_EMAIL;

  // Retry tối đa 3 lần, backoff exponential: 30s → 60s → 120s
  private readonly jobOpts = {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  };

  constructor(
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async sendOrderInvoice(payload: OrderInvoicePayload): Promise<void> {
    await this.emailQueue.add(EmailJobName.ORDER_INVOICE, {
      from: this.fromEmail,
      ...payload,
    }, this.jobOpts);
    this.logger.log(`Queued order-invoice email to ${payload.to} for order #${payload.orderId}`);
  }

  async sendOrderConfirmation(
    payload: OrderConfirmationPayload,
  ): Promise<void> {
    await this.emailQueue.add(EmailJobName.ORDER_CONFIRMATION, {
      from: this.fromEmail,
      ...payload,
    }, this.jobOpts);
    this.logger.log(
      `Queued order-confirmation email to ${payload.to} for order #${payload.orderId}`,
    );
  }

  async sendDepositApproved(payload: DepositApprovedPayload): Promise<void> {
    await this.emailQueue.add(EmailJobName.DEPOSIT_APPROVED, {
      from: this.fromEmail,
      ...payload,
    }, this.jobOpts);
    this.logger.log(
      `Queued deposit-approved email to ${payload.to} for request #${payload.requestId}`,
    );
  }

  async sendDepositRejected(payload: DepositRejectedPayload): Promise<void> {
    await this.emailQueue.add(EmailJobName.DEPOSIT_REJECTED, {
      from: this.fromEmail,
      ...payload,
    }, this.jobOpts);
    this.logger.log(
      `Queued deposit-rejected email to ${payload.to} for request #${payload.requestId}`,
    );
  }

  async sendSellerApproved(payload: SellerApprovedPayload): Promise<void> {
    await this.emailQueue.add(EmailJobName.SELLER_APPROVED, {
      from: this.fromEmail,
      ...payload,
    }, this.jobOpts);
    this.logger.log(`Queued seller-approved email to ${payload.to} for shop "${payload.shopName}"`);
  }

  async sendSellerRejected(payload: SellerRejectedPayload): Promise<void> {
    await this.emailQueue.add(EmailJobName.SELLER_REJECTED, {
      from: this.fromEmail,
      ...payload,
    }, this.jobOpts);
    this.logger.log(`Queued seller-rejected email to ${payload.to} for shop "${payload.shopName}"`);
  }

  async enqueue(jobName: string, data: Record<string, unknown>): Promise<void> {
    await this.emailQueue.add(jobName, { from: this.fromEmail, ...data }, this.jobOpts);
  }
}
