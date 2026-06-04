import {
  CreateCategoryBodyType,
  ListCategoryQueryType,
  UpdateCategoryBodyType,
} from './category.model';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryEntity {
  id: number;
  name: string;
  logo: string | null;
  parentCategoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ICategoryRepository {
  findById(id: number): Promise<CategoryEntity | null>;
  list(query: ListCategoryQueryType): Promise<CategoryEntity[]>;
  create(
    data: CreateCategoryBodyType & { createdById: number },
  ): Promise<CategoryEntity>;
  update(
    id: number,
    data: UpdateCategoryBodyType & { updatedById: number },
  ): Promise<CategoryEntity>;
  softDelete(id: number): Promise<{ count: number }>;
  hasChildren(id: number): Promise<boolean>;
}
