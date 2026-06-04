import {
  CreateProductBodyType,
  ListProductQueryType,
  ProductResType,
  UpdateProductBodyType,
} from './product.model';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface IProductRepository {
  findById(id: number): Promise<ProductResType | null>;
  list(query: ListProductQueryType): Promise<{
    data: Omit<ProductResType, 'variants' | 'categories'>[];
    nextCursor: number | null;
    hasMore: boolean;
  }>;
  create(
    data: CreateProductBodyType & { createdById: number },
  ): Promise<ProductResType>;
  update(
    id: number,
    data: UpdateProductBodyType & { updatedById: number },
  ): Promise<ProductResType>;
  softDelete(id: number): Promise<{ count: number }>;
  brandExists(brandId: number): Promise<boolean>;
  countExistingCategories(ids: number[]): Promise<number>;
}
