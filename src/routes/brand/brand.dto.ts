import { createZodDto } from 'nestjs-zod';
import {
  BrandResSchema,
  CreateBrandBodySchema,
  ListBrandResSchema,
  UpdateBrandBodySchema,
} from './brand.model';

export class CreateBrandBodyDto extends createZodDto(CreateBrandBodySchema) {}
export class UpdateBrandBodyDto extends createZodDto(UpdateBrandBodySchema) {}
export class BrandResDto extends createZodDto(BrandResSchema) {}
export class ListBrandResDto extends createZodDto(ListBrandResSchema) {}
