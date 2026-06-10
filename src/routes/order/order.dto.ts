import { createZodDto } from 'nestjs-zod';
import {
  CheckoutBodySchema,
  ListOrderQuerySchema,
  ListOrderResSchema,
  OrderResSchema,
  UpdateOrderStatusBodySchema,
} from './order.model';

export class CheckoutBodyDto extends createZodDto(CheckoutBodySchema) {}
export class OrderResDto extends createZodDto(OrderResSchema) {}
export class ListOrderQueryDto extends createZodDto(ListOrderQuerySchema) {}
export class ListOrderResDto extends createZodDto(ListOrderResSchema) {}
export class UpdateOrderStatusBodyDto extends createZodDto(
  UpdateOrderStatusBodySchema,
) {}
