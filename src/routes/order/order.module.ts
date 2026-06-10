import { Module } from '@nestjs/common';
import { CartRepository } from '../cart/cart.repository';
import { WalletModule } from '../wallet/wallet.module';
import { OrderController } from './order.controller';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';

@Module({
  imports: [WalletModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, CartRepository],
  exports: [OrderService],
})
export class OrderModule {}
