import { Global, Module } from '@nestjs/common';
import { pubSubProvider } from './pubsub.provider';

@Global()
@Module({
  providers: [pubSubProvider],
  exports: [pubSubProvider],
})
export class PubSubModule {}
