import { createZodDto } from 'nestjs-zod';
import {
  CategoryResSchema,
  CreateCategoryBodySchema,
  ListCategoryQuerySchema,
  ListCategoryResSchema,
  UpdateCategoryBodySchema,
} from './category.model';

export class CreateCategoryBodyDto extends createZodDto(
  CreateCategoryBodySchema,
) {}
export class UpdateCategoryBodyDto extends createZodDto(
  UpdateCategoryBodySchema,
) {}
export class CategoryResDto extends createZodDto(CategoryResSchema) {}
export class ListCategoryResDto extends createZodDto(ListCategoryResSchema) {}
export class ListCategoryQueryDto extends createZodDto(
  ListCategoryQuerySchema,
) {}
