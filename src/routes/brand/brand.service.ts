import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBrandBodyType, UpdateBrandBodyType } from './brand.model';
import type { IBrandRepository } from './brand.repository.interface';
import { BRAND_REPOSITORY } from './brand.repository.interface';

@Injectable()
export class BrandService {
  constructor(
    @Inject(BRAND_REPOSITORY)
    private readonly brandRepository: IBrandRepository,
  ) {}

  list() {
    return this.brandRepository.list();
  }

  async findById(id: number) {
    const brand = await this.brandRepository.findById(id);
    if (!brand) {
      throw new NotFoundException({ message: 'Brand not found', path: 'id' });
    }
    return brand;
  }

  create(data: CreateBrandBodyType, userId: number) {
    return this.brandRepository.create({ ...data, createdById: userId });
  }

  async update(id: number, data: UpdateBrandBodyType, userId: number) {
    await this.findById(id);
    return this.brandRepository.update(id, { ...data, updatedById: userId });
  }

  async softDelete(id: number) {
    const result = await this.brandRepository.softDelete(id);
    if (result.count === 0) {
      throw new NotFoundException({ message: 'Brand not found', path: 'id' });
    }
    return { deleted: true };
  }
}
