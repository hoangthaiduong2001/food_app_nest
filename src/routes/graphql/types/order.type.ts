import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderItemType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  productId!: number;

  @Field(() => Int, { nullable: true })
  variantId!: number | null;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Float)
  unitPrice!: number;

  @Field(() => Float)
  totalPrice!: number;

  @Field()
  productName!: string;

  @Field(() => String, { nullable: true })
  productImage!: string | null;
}

@ObjectType()
export class ReceiverType {
  @Field()
  name!: string;

  @Field()
  phone!: string;

  @Field()
  address!: string;
}

@ObjectType()
export class OrderType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field()
  status!: string;

  @Field()
  paymentStatus!: string;

  @Field()
  paymentMethod!: string;

  @Field(() => Float)
  shippingFee!: number;

  @Field(() => Float)
  totalAmount!: number;

  @Field(() => Float)
  finalAmount!: number;

  @Field(() => ReceiverType)
  receiver!: ReceiverType;

  @Field(() => [OrderItemType])
  items!: OrderItemType[];

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class OrderListItemType {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field()
  status!: string;

  @Field()
  paymentStatus!: string;

  @Field()
  paymentMethod!: string;

  @Field(() => Float)
  finalAmount!: number;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class OrderStatusChangedType {
  @Field(() => Int)
  id!: number;

  @Field()
  status!: string;

  @Field()
  updatedAt!: Date;
}
