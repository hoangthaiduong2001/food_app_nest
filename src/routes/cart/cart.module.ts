import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';

@Module({
  controllers: [CartController],
  // RedisService + PrismaService là Global (ShareModule) nên không cần khai báo lại
  providers: [CartService, CartRepository],
  exports: [CartService],
})
export class CartModule {}
