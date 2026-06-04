import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INVENTORY_REPOSITORY } from './inventory.repository.interface';
import type { IInventoryRepository } from './inventory.repository.interface';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly inventoryRepository: IInventoryRepository,
  ) {}

  reserve(variantId: number, quantity: number) {
    return this.inventoryRepository.reserve(variantId, quantity);
  }

  release(variantId: number, quantity: number) {
    return this.inventoryRepository.release(variantId, quantity);
  }

  adjust(variantId: number, delta: number) {
    return this.inventoryRepository.adjust(variantId, delta);
  }

  async getStock(variantId: number) {
    const stock = await this.inventoryRepository.getStock(variantId);
    if (!stock) {
      throw new NotFoundException({
        message: 'Variant not found',
        path: 'variantId',
      });
    }
    return stock;
  }
}
