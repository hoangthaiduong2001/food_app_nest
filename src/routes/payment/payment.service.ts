import envConfig from '@/shared/config';
import { OrderStatus } from '@/shared/constants/order.constant';
import { PrismaService } from '@/shared/services/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentIntentResType } from './payment.model';

// Stripe v22 uses `export =` — must require() to avoid TS namespace conflicts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeLib: new (key: string) => StripeClient = require('stripe');

interface StripePaymentIntent {
  id: string;
  client_secret: string | null;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, string>;
}

interface StripeCharge {
  payment_intent: string | { id: string } | null;
}

interface StripeEvent {
  type: string;
  data: { object: unknown };
}

interface StripeClient {
  paymentIntents: {
    create(params: Record<string, unknown>): Promise<StripePaymentIntent>;
    retrieve(id: string): Promise<StripePaymentIntent>;
  };
  webhooks: {
    constructEvent(
      payload: Buffer | string,
      header: string,
      secret: string,
    ): StripeEvent;
  };
}

@Injectable()
export class PaymentService {
  private readonly stripe: StripeClient | null = null;
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prismaService: PrismaService) {
    if (envConfig.STRIPE_SECRET_KEY) {
      this.stripe = new StripeLib(envConfig.STRIPE_SECRET_KEY);
    }
  }

  private get stripeClient(): StripeClient {
    if (!this.stripe) {
      throw new BadRequestException({
        message: 'Stripe is not configured on this server',
      });
    }
    return this.stripe;
  }

  async createPaymentIntent(
    userId: number,
    orderId: number,
  ): Promise<PaymentIntentResType> {
    const order = await this.prismaService.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      select: {
        id: true,
        finalAmount: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      throw new NotFoundException({ message: 'Order not found', path: 'orderId' });
    }
    if (order.paymentMethod !== 'CREDIT_CARD') {
      throw new BadRequestException({
        message: 'Order payment method is not CREDIT_CARD',
        path: 'orderId',
      });
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        message: 'Order is not pending payment',
        path: 'orderId',
      });
    }
    if (order.paymentStatus === 'SUCCESS') {
      throw new BadRequestException({
        message: 'Order is already paid',
        path: 'orderId',
      });
    }

    // Tái sử dụng PaymentIntent PENDING nếu đã có
    const existingTx = await this.prismaService.paymentTransaction.findFirst({
      where: { orderId, status: 'PENDING', gateway: 'stripe' },
      select: { referenceNumber: true },
    });
    if (existingTx?.referenceNumber) {
      const existing = await this.stripeClient.paymentIntents.retrieve(
        existingTx.referenceNumber,
      );
      if (
        existing.status === 'requires_payment_method' ||
        existing.status === 'requires_confirmation'
      ) {
        return {
          clientSecret: existing.client_secret!,
          paymentIntentId: existing.id,
          amount: existing.amount,
          currency: existing.currency,
        };
      }
    }

    const intent = await this.stripeClient.paymentIntents.create({
      amount: order.finalAmount,
      currency: 'vnd',
      metadata: { orderId: String(orderId), userId: String(userId) },
      automatic_payment_methods: { enabled: true },
    });

    await this.prismaService.paymentTransaction.create({
      data: {
        orderId,
        gateway: 'stripe',
        status: 'PENDING',
        amountIn: order.finalAmount,
        referenceNumber: intent.id,
        transactionContent: `Stripe PaymentIntent for order #${orderId}`,
      },
    });

    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = envConfig.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured — skipping verification');
      return;
    }

    let event: StripeEvent;
    try {
      event = this.stripeClient.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException({ message: 'Invalid Stripe webhook signature' });
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentSucceeded(event.data.object as StripePaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentFailed(event.data.object as StripePaymentIntent);
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object as StripeCharge);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async onPaymentSucceeded(intent: StripePaymentIntent): Promise<void> {
    const orderId = intent.metadata?.orderId
      ? Number(intent.metadata.orderId)
      : null;
    if (!orderId) return;

    await this.prismaService.$transaction(async (tx) => {
      await tx.paymentTransaction.updateMany({
        where: { referenceNumber: intent.id },
        data: { status: 'SUCCESS', transactionDate: new Date() },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'SUCCESS',
          status: OrderStatus.PENDING_PICKUP,
          paidAt: new Date(),
        },
      });
    });

    this.logger.log(`Order #${orderId} paid via Stripe (intent: ${intent.id})`);
  }

  private async onPaymentFailed(intent: StripePaymentIntent): Promise<void> {
    const orderId = intent.metadata?.orderId
      ? Number(intent.metadata.orderId)
      : null;
    if (!orderId) return;

    await this.prismaService.paymentTransaction.updateMany({
      where: { referenceNumber: intent.id },
      data: { status: 'FAILED' },
    });

    this.logger.warn(
      `Payment failed for order #${orderId} (intent: ${intent.id})`,
    );
  }

  private async onChargeRefunded(charge: StripeCharge): Promise<void> {
    const intentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!intentId) return;

    await this.prismaService.paymentTransaction.updateMany({
      where: { referenceNumber: intentId },
      data: { status: 'REFUNDED' },
    });

    this.logger.log(`Charge refunded for intent: ${intentId}`);
  }
}
