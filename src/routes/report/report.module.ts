import { QueueName } from '@/shared/constants/queue.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ReportProcessor } from './report.processor';
import { ReportScheduler } from './report.scheduler';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.REPORT_GEN })],
  providers: [ReportProcessor, ReportScheduler],
})
export class ReportModule {}
