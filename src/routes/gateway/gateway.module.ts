import { ShareModule } from '@/shared/share.module';
import { Module } from '@nestjs/common';
import { OrderGateway } from './order.gateway';

@Module({
  imports: [ShareModule],
  providers: [OrderGateway],
  exports: [OrderGateway],
})
export class GatewayModule {}
