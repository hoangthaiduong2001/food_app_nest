import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PubSubModule } from '@/shared/pubsub.module';
import { CartRepository } from '../cart/cart.repository';
import { InvoicePdfService } from '../email/invoice-pdf.service';
import { WalletModule } from '../wallet/wallet.module';
import { OrderController } from './order.controller';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';

@Module({
  imports: [WalletModule, EmailModule, PubSubModule, NotificationModule, ActivityLogModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, CartRepository, InvoicePdfService],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
