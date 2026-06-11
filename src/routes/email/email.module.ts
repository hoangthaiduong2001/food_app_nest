import { QueueName } from '@/shared/constants/queue.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailProcessor } from './email.processor';
import { EmailService } from './email.service';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.EMAIL })],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
