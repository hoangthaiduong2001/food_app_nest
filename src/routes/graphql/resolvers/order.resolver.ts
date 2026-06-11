import { PubSubEvent } from '@/shared/constants/queue.constant';
import { GqlAuthGuard } from '@/shared/guards/gql-auth.guard';
import { PUB_SUB } from '@/shared/pubsub.provider';
import { ActiveUserData } from '@/shared/types/active-user.type';
import { Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { PubSub } from 'graphql-subscriptions';
import { OrderService } from '../../order/order.service';
import {
  DataLoaderService,
  UserLoaderData,
} from '../dataloader/dataloader.service';
import {
  OrderListItemType,
  OrderStatusChangedType,
  OrderType,
} from '../types/order.type';
import { UserType } from '../types/user.type';

interface GqlContext {
  req: { user: ActiveUserData };
  userLoader: DataLoader<number, UserLoaderData | null>;
}

@Resolver(() => OrderType)
export class OrderResolver {
  constructor(
    private readonly orderService: OrderService,
    private readonly dataLoaderService: DataLoaderService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [OrderListItemType], {
    description: 'List orders of current user',
  })
  @UseGuards(GqlAuthGuard)
  async orders(
    @Context() ctx: GqlContext,
    @Args('status', { nullable: true }) status?: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit?: number,
    @Args('cursor', { type: () => Int, nullable: true }) cursor?: number,
  ) {
    return this.orderService.list(
      { status: status as never, limit: limit ?? 20, cursor },
      { userId: ctx.req.user.userId, roleName: ctx.req.user.roleName },
    );
  }

  @Query(() => OrderType, { description: 'Detail order by id' })
  @UseGuards(GqlAuthGuard)
  async order(
    @Args('id', { type: () => Int }) id: number,
    @Context() ctx: GqlContext,
  ) {
    return this.orderService.getOrderForUser(id, {
      userId: ctx.req.user.userId,
      roleName: ctx.req.user.roleName,
    });
  }

  // Field resolver với DataLoader — tránh N+1 khi query orders { user { name } }
  @ResolveField(() => UserType, { nullable: true })
  async user(
    @Parent() order: OrderType,
    @Context() ctx: GqlContext,
  ): Promise<UserLoaderData | null> {
    if (!ctx.userLoader) {
      ctx.userLoader = this.dataLoaderService.createUserLoader();
    }
    return ctx.userLoader.load(order.userId);
  }

  @Subscription(() => OrderStatusChangedType, {
    filter: (
      payload: { orderStatusChanged: OrderStatusChangedType },
      variables: { orderId: number },
    ) => payload.orderStatusChanged.id === variables.orderId,
    description: 'Real-time update status order',
  })
  orderStatusChanged(@Args('orderId', { type: () => Int }) _orderId: number) {
    return this.pubSub.asyncIterableIterator(PubSubEvent.ORDER_STATUS_CHANGED);
  }
}
