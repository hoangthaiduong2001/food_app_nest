import { Module } from '@nestjs/common';
import { BrandController } from './brand.controller';
import { BRAND_REPOSITORY } from './brand.repository.interface';
import { BrandService } from './brand.service';
import { PrismaBrandRepository } from './prisma-brand.repository';

@Module({
  controllers: [BrandController],
  providers: [
    BrandService,
    { provide: BRAND_REPOSITORY, useClass: PrismaBrandRepository },
  ],
  exports: [BrandService],
})
export class BrandModule {}
