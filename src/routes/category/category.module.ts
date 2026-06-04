import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CATEGORY_REPOSITORY } from './category.repository.interface';
import { CategoryService } from './category.service';
import { PrismaCategoryRepository } from './prisma-category.repository';

@Module({
  controllers: [CategoryController],
  providers: [
    CategoryService,
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },
  ],
  exports: [CategoryService],
})
export class CategoryModule {}
