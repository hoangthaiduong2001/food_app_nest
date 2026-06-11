import { QueueName } from '@/shared/constants/queue.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { InventoryJobProcessor } from './inventory-job.processor';
import { InventoryJobService } from './inventory-job.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueName.INVENTORY_SYNC }),
    InventoryModule,
  ],
  providers: [InventoryJobService, InventoryJobProcessor],
  exports: [InventoryJobService],
})
export class InventoryJobModule {}
