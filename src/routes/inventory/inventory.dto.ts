import { createZodDto } from 'nestjs-zod';
import {
  AdjustStockBodySchema,
  ReleaseStockBodySchema,
  ReserveStockBodySchema,
  StockResSchema,
} from './inventory.model';

export class ReserveStockBodyDto extends createZodDto(ReserveStockBodySchema) {}
export class ReleaseStockBodyDto extends createZodDto(ReleaseStockBodySchema) {}
export class AdjustStockBodyDto extends createZodDto(AdjustStockBodySchema) {}
export class StockResDto extends createZodDto(StockResSchema) {}
