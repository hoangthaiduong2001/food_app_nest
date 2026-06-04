import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreateBrandBodyType,
  UpdateBrandBodyType,
} from './brand.model';
import {
  BrandEntity,
  IBrandRepository,
} from './brand.repository.interface';

@Injectable()
export class PrismaBrandRepository implements IBrandRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findById(id: number): Promise<BrandEntity | null> {
    return this.prismaService.brand.findFirst({
      where: { id, deletedAt: null },
    });
  }

  list(): Promise<BrandEntity[]> {
    return this.prismaService.brand.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(
    data: CreateBrandBodyType & { createdById: number },
  ): Promise<BrandEntity> {
    return this.prismaService.brand.create({
      data: {
        name: data.name,
        logo: data.logo,
        createdById: data.createdById,
      },
    });
  }

  update(
    id: number,
    data: UpdateBrandBodyType & { updatedById: number },
  ): Promise<BrandEntity> {
    return this.prismaService.brand.update({
      where: { id },
      data: {
        ...data,
        updatedById: data.updatedById,
      },
    });
  }

  async softDelete(id: number): Promise<{ count: number }> {
    const result = await this.prismaService.brand.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { count: result.count };
  }
}
