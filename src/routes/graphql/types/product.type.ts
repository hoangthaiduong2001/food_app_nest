import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VariantType {
  @Field(() => Int)
  id!: number;

  @Field()
  sku!: string;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => Float)
  price!: number;

  @Field(() => Int)
  stock!: number;

  @Field()
  isDefault!: boolean;

  @Field()
  isActive!: boolean;
}

@ObjectType()
export class ProductCategoryType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}

@ObjectType()
export class ProductType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Float)
  basePrice!: number;

  @Field(() => Float)
  virtualPrice!: number;

  @Field(() => Int)
  totalStock!: number;

  @Field()
  isActive!: boolean;

  @Field(() => String, { nullable: true })
  slug!: string | null;

  @Field(() => Int)
  brandId!: number;

  @Field(() => [String])
  images!: string[];

  @Field()
  createdAt!: Date;

  @Field(() => [ProductCategoryType])
  categories!: ProductCategoryType[];

  @Field(() => [VariantType])
  variants!: VariantType[];
}

@ObjectType()
export class ProductListType {
  @Field(() => [ProductType])
  data!: ProductType[];

  @Field(() => Int, { nullable: true })
  nextCursor!: number | null;

  @Field()
  hasMore!: boolean;
}
