import { createZodDto } from 'nestjs-zod';
import {
  CreateProductBodySchema,
  ListProductQuerySchema,
  ListProductResSchema,
  ProductResSchema,
  UpdateProductBodySchema,
} from './product.model';

export class CreateProductBodyDto extends createZodDto(
  CreateProductBodySchema,
) {}
export class UpdateProductBodyDto extends createZodDto(
  UpdateProductBodySchema,
) {}
export class ProductResDto extends createZodDto(ProductResSchema) {}
export class ListProductQueryDto extends createZodDto(ListProductQuerySchema) {}
export class ListProductResDto extends createZodDto(ListProductResSchema) {}
