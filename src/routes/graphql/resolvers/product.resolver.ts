import {
  Args,
  Context,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { ProductService } from '../../product/product.service';
import {
  DataLoaderService,
  ProductVariantsLoaderData,
} from '../dataloader/dataloader.service';
import {
  ProductListType,
  ProductType,
  VariantType,
} from '../types/product.type';

interface GqlContext {
  productVariantsLoader: DataLoader<number, ProductVariantsLoaderData[]>;
}

@Resolver(() => ProductType)
export class ProductResolver {
  constructor(
    private readonly productService: ProductService,
    private readonly dataLoaderService: DataLoaderService,
  ) {}

  @Query(() => ProductListType, {
    description: 'List product (cursor-based pagination)',
  })
  async products(
    @Args('brandId', { type: () => Int, nullable: true }) brandId?: number,
    @Args('categoryId', { type: () => Int, nullable: true })
    categoryId?: number,
    @Args('q', { nullable: true }) q?: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit?: number,
    @Args('cursor', { type: () => Int, nullable: true }) cursor?: number,
  ) {
    return this.productService.list({
      brandId,
      categoryId,
      q,
      limit: limit ?? 20,
      cursor,
    });
  }

  @Query(() => ProductType, { description: 'Detail product by id' })
  async product(@Args('id', { type: () => Int }) id: number) {
    return this.productService.findById(id);
  }

  // Field resolver — chỉ chạy khi client request field `variants`
  // DataLoader batch nhiều productId → 1 query duy nhất
  @ResolveField(() => [VariantType])
  async variants(
    @Parent() product: ProductType,
    @Context() ctx: GqlContext,
  ): Promise<VariantType[]> {
    if (!ctx.productVariantsLoader) {
      ctx.productVariantsLoader =
        this.dataLoaderService.createProductVariantsLoader();
    }
    return ctx.productVariantsLoader.load(product.id);
  }
}
