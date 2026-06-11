import { QueueName, ReportJobName } from '@/shared/constants/queue.constant';
import { PrismaService } from '@/shared/services/prisma.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface DailyRevenueJobData {
  date: string;
}

@Processor(QueueName.REPORT_GEN)
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing report job: ${job.name} (id=${job.id})`);

    switch (job.name) {
      case ReportJobName.DAILY_REVENUE:
        await this.generateDailyRevenue(job.data as DailyRevenueJobData);
        break;
      default:
        this.logger.warn(`Unknown report job: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      this.logger.error(
        `[DLQ] Report job permanently failed after ${job.attemptsMade} attempts. ` +
          `job=${job.name} id=${job.id} date=${(job.data as DailyRevenueJobData)?.date} error=${err.message}`,
      );
    }
  }

  private async generateDailyRevenue(data: DailyRevenueJobData): Promise<void> {
    const from = new Date(data.date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(data.date);
    to.setHours(23, 59, 59, 999);

    const result = await this.prismaService.order.aggregate({
      where: {
        paymentStatus: 'SUCCESS',
        paidAt: { gte: from, lte: to },
        deletedAt: null,
      },
      _sum: { finalAmount: true },
      _count: { id: true },
    });

    const revenue = result._sum.finalAmount ?? 0;
    const orderCount = result._count.id;

    this.logger.log(
      `Daily revenue report [${data.date}]: ${orderCount} orders, revenue = ${revenue}`,
    );

    // Lưu vào DB nếu có bảng report, hoặc gửi email tóm tắt
    // TODO: persist to ReportSummary table when schema is ready
  }
}
