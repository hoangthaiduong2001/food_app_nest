import { QueueName } from '@/shared/constants/queue.constant';
import { ShareModule } from '@/shared/share.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AnalyticsRepository } from './analytics.repository';
import { ReportProcessor } from './report.processor';
import { ReportScheduler } from './report.scheduler';

@Module({
  imports: [ShareModule, BullModule.registerQueue({ name: QueueName.REPORT_GEN })],
  controllers: [AdminDashboardController],
  providers: [ReportProcessor, ReportScheduler, AnalyticsRepository],
  exports: [AnalyticsRepository],
})
export class ReportModule {}
