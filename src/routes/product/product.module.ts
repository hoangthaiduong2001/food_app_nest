import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PRODUCT_REPOSITORY } from './product.repository.interface';
import { PrismaProductRepository } from './prisma-product.repository';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  ],
  exports: [ProductService],
})
export class ProductModule {}
