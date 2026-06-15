import envConfig from '@/shared/config';
import { EmailJobName, QueueName } from '@/shared/constants/queue.constant';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import * as path from 'path';

const TEMPLATES_DIR = path.join(
  process.cwd(),
  'src',
  'routes',
  'email',
  'templates',
);

function renderTemplate(
  name: string,
  context: Record<string, unknown>,
): string {
  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  const source = fs.readFileSync(filePath, 'utf8');
  return Handlebars.compile(source)(context);
}

@Processor(QueueName.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly ses: SESClient | null = null;

  constructor() {
    super();
    if (envConfig.SES_ACCESS_KEY && envConfig.SES_SECRET_KEY) {
      this.ses = new SESClient({
        region: envConfig.SES_REGION,
        credentials: {
          accessKeyId: envConfig.SES_ACCESS_KEY,
          secretAccessKey: envConfig.SES_SECRET_KEY,
        },
      });
    }
  }

  async process(job: Job): Promise<void> {
    this.logger.log(
      `Processing email job: ${job.name} (id=${job.id}), data: ${JSON.stringify(job.data)}`,
    );

    try {
      switch (job.name) {
        case EmailJobName.ORDER_CONFIRMATION:
          await this.sendOrderConfirmation(job.data);
          break;
        case EmailJobName.DEPOSIT_APPROVED:
          await this.sendDepositApproved(job.data);
          break;
        case EmailJobName.DEPOSIT_REJECTED:
          await this.sendDepositRejected(job.data);
          break;
        case EmailJobName.SELLER_APPROVED:
          await this.sendSellerApproved(job.data);
          break;
        case EmailJobName.SELLER_REJECTED:
          await this.sendSellerRejected(job.data);
          break;
        default:
          this.logger.warn(`Unknown email job: ${job.name}`);
      }
    } catch (err) {
      this.logger.error(
        `Email job failed [${job.name}]: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  // DLQ: job hết attempts → log cảnh báo để alert/monitor
  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      this.logger.error(
        `[DLQ] Email job permanently failed after ${job.attemptsMade} attempts. ` +
        `job=${job.name} id=${job.id} to=${job.data?.to} error=${err.message}`,
      );
      // TODO: gửi alert Slack/PagerDuty hoặc lưu vào bảng failed_jobs
    }
  }

  private async sendEmail(params: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.ses) {
      this.logger.warn(
        `[DEV] Email not sent (SES not configured). To: ${params.to} | Subject: ${params.subject}`,
      );
      return;
    }

    await this.ses.send(
      new SendEmailCommand({
        Source: params.from,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject, Charset: 'UTF-8' },
          Body: { Html: { Data: params.html, Charset: 'UTF-8' } },
        },
      }),
    );
    this.logger.log(`Email sent to ${params.to}: ${params.subject}`);
  }

  private async sendOrderConfirmation(
    data: Record<string, unknown>,
  ): Promise<void> {
    const html = renderTemplate('order-confirmation', data);
    await this.sendEmail({
      from: data.from as string,
      to: data.to as string,
      subject: `Order Confirmed — #${data.orderId}`,
      html,
    });
  }

  private async sendDepositApproved(
    data: Record<string, unknown>,
  ): Promise<void> {
    const html = renderTemplate('deposit-approved', data);
    await this.sendEmail({
      from: data.from as string,
      to: data.to as string,
      subject: `Deposit Approved — ${data.amount} ${data.currency}`,
      html,
    });
  }

  private async sendDepositRejected(
    data: Record<string, unknown>,
  ): Promise<void> {
    const html = renderTemplate('deposit-rejected', data);
    await this.sendEmail({
      from: data.from as string,
      to: data.to as string,
      subject: `Deposit Request Rejected — #${data.requestId}`,
      html,
    });
  }

  private async sendSellerApproved(data: Record<string, unknown>): Promise<void> {
    const html = renderTemplate('seller-approved', data);
    await this.sendEmail({
      from: data.from as string,
      to: data.to as string,
      subject: `Your seller account "${data.shopName}" has been approved!`,
      html,
    });
  }

  private async sendSellerRejected(data: Record<string, unknown>): Promise<void> {
    const html = renderTemplate('seller-rejected', data);
    await this.sendEmail({
      from: data.from as string,
      to: data.to as string,
      subject: `Update on your seller application — ${data.shopName}`,
      html,
    });
  }
}
