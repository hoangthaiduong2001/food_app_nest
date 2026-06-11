import { Module } from '@nestjs/common';
import { ProductModule } from '../product/product.module';
import { OrderModule } from '../order/order.module';
import { PubSubModule } from '@/shared/pubsub.module';
import { DataLoaderService } from './dataloader/dataloader.service';
import { UserResolver } from './resolvers/user.resolver';
import { ProductResolver } from './resolvers/product.resolver';
import { OrderResolver } from './resolvers/order.resolver';

@Module({
  imports: [PubSubModule, ProductModule, OrderModule],
  providers: [
    DataLoaderService,
    UserResolver,
    ProductResolver,
    OrderResolver,
  ],
})
export class GraphqlModule {}
