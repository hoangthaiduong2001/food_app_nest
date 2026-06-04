import { StockResType } from './inventory.model';

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface IInventoryRepository {
  /** Trừ kho an toàn với pessimistic lock. Throw nếu không đủ stock. */
  reserve(variantId: number, quantity: number): Promise<StockResType>;
  /** Hoàn kho (cộng lại). */
  release(variantId: number, quantity: number): Promise<StockResType>;
  /** Admin điều chỉnh kho theo delta (±). Không cho âm. */
  adjust(variantId: number, delta: number): Promise<StockResType>;
  getStock(variantId: number): Promise<StockResType | null>;
}
