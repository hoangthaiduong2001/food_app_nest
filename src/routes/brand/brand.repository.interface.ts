import { CreateBrandBodyType, UpdateBrandBodyType } from './brand.model';

export const BRAND_REPOSITORY = Symbol('BRAND_REPOSITORY');

export interface BrandEntity {
  id: number;
  name: string;
  logo: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IBrandRepository {
  findById(id: number): Promise<BrandEntity | null>;
  list(): Promise<BrandEntity[]>;
  create(
    data: CreateBrandBodyType & { createdById: number },
  ): Promise<BrandEntity>;
  update(
    id: number,
    data: UpdateBrandBodyType & { updatedById: number },
  ): Promise<BrandEntity>;
  softDelete(id: number): Promise<{ count: number }>;
}
