import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreateCategoryBodyType,
  ListCategoryQueryType,
  UpdateCategoryBodyType,
} from './category.model';
import {
  CategoryEntity,
  ICategoryRepository,
} from './category.repository.interface';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findById(id: number): Promise<CategoryEntity | null> {
    return this.prismaService.category.findFirst({
      where: { id, deletedAt: null },
    });
  }

  list(query: ListCategoryQueryType): Promise<CategoryEntity[]> {
    const parentFilter =
      query.parentId === undefined
        ? {}
        : {
            parentCategoryId: query.parentId === 'null' ? null : query.parentId,
          };

    return this.prismaService.category.findMany({
      where: { deletedAt: null, ...parentFilter },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(
    data: CreateCategoryBodyType & { createdById: number },
  ): Promise<CategoryEntity> {
    return this.prismaService.category.create({
      data: {
        name: data.name,
        logo: data.logo ?? null,
        parentCategoryId: data.parentCategoryId ?? null,
        createdById: data.createdById,
      },
    });
  }

  update(
    id: number,
    data: UpdateCategoryBodyType & { updatedById: number },
  ): Promise<CategoryEntity> {
    return this.prismaService.category.update({
      where: { id },
      data: {
        ...data,
        updatedById: data.updatedById,
      },
    });
  }

  async softDelete(id: number): Promise<{ count: number }> {
    const result = await this.prismaService.category.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { count: result.count };
  }

  async hasChildren(id: number): Promise<boolean> {
    const child = await this.prismaService.category.findFirst({
      where: { parentCategoryId: id, deletedAt: null },
      select: { id: true },
    });
    return child !== null;
  }
}
