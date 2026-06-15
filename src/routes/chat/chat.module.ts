import { ShareModule } from '@/shared/share.module';
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './chat.repository';

@Module({
  imports: [ShareModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatRepository],
})
export class ChatModule {}
