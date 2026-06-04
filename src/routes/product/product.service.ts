import { handlePrismaError } from '@/shared/utils/prisma-error.util';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProductBodyType,
  ListProductQueryType,
  UpdateProductBodyType,
} from './product.model';
import type { IProductRepository } from './product.repository.interface';
import { PRODUCT_REPOSITORY } from './product.repository.interface';

@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  list(query: ListProductQueryType) {
    return this.productRepository.list(query);
  }

  async findById(id: number) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException({ message: 'Product not found', path: 'id' });
    }
    return product;
  }

  async create(data: CreateProductBodyType, userId: number) {
    await this.validateRelations(data.brandId, data.categoryIds);

    try {
      return await this.productRepository.create({
        ...data,
        createdById: userId,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async update(id: number, data: UpdateProductBodyType, userId: number) {
    await this.findById(id);
    await this.validateRelations(data.brandId, data.categoryIds);

    try {
      return await this.productRepository.update(id, {
        ...data,
        updatedById: userId,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async softDelete(id: number) {
    const result = await this.productRepository.softDelete(id);
    if (result.count === 0) {
      throw new NotFoundException({ message: 'Product not found', path: 'id' });
    }
    return { deleted: true };
  }

  private async validateRelations(
    brandId: number | undefined,
    categoryIds: number[] | undefined,
  ) {
    if (brandId !== undefined) {
      const exists = await this.productRepository.brandExists(brandId);
      if (!exists) {
        throw new BadRequestException({
          message: 'Brand not found',
          path: 'brandId',
        });
      }
    }

    if (categoryIds !== undefined && categoryIds.length > 0) {
      const count =
        await this.productRepository.countExistingCategories(categoryIds);
      if (count !== categoryIds.length) {
        throw new BadRequestException({
          message: 'One or more categories not found',
          path: 'categoryIds',
        });
      }
    }
  }
}
