import { InventoryJobName, QueueName } from '@/shared/constants/queue.constant';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InventoryService } from '../inventory/inventory.service';

export interface ReleaseStockJobData {
  items: { variantId: number; quantity: number }[];
  orderId: number;
  reason: string;
}

@Processor(QueueName.INVENTORY_SYNC)
export class InventoryJobProcessor extends WorkerHost {
  private readonly logger = new Logger(InventoryJobProcessor.name);

  constructor(private readonly inventoryService: InventoryService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing inventory job: ${job.name} (id=${job.id})`);

    switch (job.name) {
      case InventoryJobName.RELEASE_STOCK:
        await this.releaseStock(job.data as ReleaseStockJobData);
        break;
      default:
        this.logger.warn(`Unknown inventory job: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      this.logger.error(
        `[DLQ] Inventory job permanently failed after ${job.attemptsMade} attempts. ` +
        `job=${job.name} id=${job.id} orderId=${(job.data as ReleaseStockJobData)?.orderId} error=${err.message}`,
      );
    }
  }

  private async releaseStock(data: ReleaseStockJobData): Promise<void> {
    const { items, orderId, reason } = data;
    this.logger.log(`Releasing stock for order #${orderId} (${reason}): ${items.length} variants`);

    for (const item of items) {
      await this.inventoryService.release(item.variantId, item.quantity);
    }

    this.logger.log(`Stock released for order #${orderId}`);
  }
}
