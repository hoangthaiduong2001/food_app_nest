import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCategoryBodyType,
  ListCategoryQueryType,
  UpdateCategoryBodyType,
} from './category.model';
import type { ICategoryRepository } from './category.repository.interface';
import { CATEGORY_REPOSITORY } from './category.repository.interface';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  list(query: ListCategoryQueryType) {
    return this.categoryRepository.list(query);
  }

  async findById(id: number) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException({
        message: 'Category not found',
        path: 'id',
      });
    }
    return category;
  }

  async create(data: CreateCategoryBodyType, userId: number) {
    if (data.parentCategoryId !== undefined && data.parentCategoryId !== null) {
      await this.findById(data.parentCategoryId);
    }
    return this.categoryRepository.create({ ...data, createdById: userId });
  }

  async update(id: number, data: UpdateCategoryBodyType, userId: number) {
    await this.findById(id);

    if (data.parentCategoryId !== undefined && data.parentCategoryId !== null) {
      if (data.parentCategoryId === id) {
        throw new BadRequestException({
          message: 'Category cannot be its own parent',
          path: 'parentCategoryId',
        });
      }
      await this.findById(data.parentCategoryId);
    }

    return this.categoryRepository.update(id, {
      ...data,
      updatedById: userId,
    });
  }

  async softDelete(id: number) {
    const hasChildren = await this.categoryRepository.hasChildren(id);
    if (hasChildren) {
      throw new ConflictException({
        message: 'Cannot delete category that has children',
        path: 'id',
      });
    }

    const result = await this.categoryRepository.softDelete(id);
    if (result.count === 0) {
      throw new NotFoundException({
        message: 'Category not found',
        path: 'id',
      });
    }
    return { deleted: true };
  }
}
