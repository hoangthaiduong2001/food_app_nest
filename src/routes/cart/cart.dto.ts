import { createZodDto } from 'nestjs-zod';
import {
  AddToCartBodySchema,
  CartResSchema,
  UpdateCartItemBodySchema,
} from './cart.model';

export class AddToCartBodyDto extends createZodDto(AddToCartBodySchema) {}
export class UpdateCartItemBodyDto extends createZodDto(
  UpdateCartItemBodySchema,
) {}
export class CartResDto extends createZodDto(CartResSchema) {}
