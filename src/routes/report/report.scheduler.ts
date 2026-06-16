import { QueueName, ReportJobName } from '@/shared/constants/queue.constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class ReportScheduler {
  private readonly logger = new Logger(ReportScheduler.name);

  constructor(
    @InjectQueue(QueueName.REPORT_GEN) private readonly reportQueue: Queue,
  ) {}

  // Chạy lúc 00:05 mỗi ngày — tổng kết doanh thu ngày hôm qua
  @Cron('5 0 * * *')
  async scheduleDailyRevenue(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];

    await this.reportQueue.add(
      ReportJobName.DAILY_REVENUE,
      { date },
      { jobId: `daily-revenue-${date}` }, // dedup: không enqueue 2 lần cùng ngày
    );

    this.logger.log(`Scheduled daily-revenue report for ${date}`);
  }
}
