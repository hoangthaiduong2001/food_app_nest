import { InventoryJobName, QueueName } from '@/shared/constants/queue.constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ReleaseStockJobData } from './inventory-job.processor';

@Injectable()
export class InventoryJobService {
  private readonly logger = new Logger(InventoryJobService.name);

  constructor(
    @InjectQueue(QueueName.INVENTORY_SYNC) private readonly inventoryQueue: Queue,
  ) {}

  async enqueueReleaseStock(data: ReleaseStockJobData): Promise<void> {
    await this.inventoryQueue.add(InventoryJobName.RELEASE_STOCK, data, {
      // Delay nhỏ để transaction DB commit xong trước khi worker chạy
      delay: 500,
    });
    this.logger.log(`Enqueued release-stock for order #${data.orderId}`);
  }
}
