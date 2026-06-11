import { GqlAuthGuard } from '@/shared/guards/gql-auth.guard';
import { PrismaService } from '@/shared/services/prisma.service';
import { ActiveUserData } from '@/shared/types/active-user.type';
import { UseGuards } from '@nestjs/common';
import { Context, Query, Resolver } from '@nestjs/graphql';
import { UserType } from '../types/user.type';

@Resolver(() => UserType)
export class UserResolver {
  constructor(private readonly prismaService: PrismaService) {}

  @Query(() => UserType, { description: 'Get. info user login' })
  @UseGuards(GqlAuthGuard)
  async me(
    @Context() ctx: { req: { user: ActiveUserData } },
  ): Promise<UserType> {
    const user = await this.prismaService.user.findUniqueOrThrow({
      where: { id: ctx.req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        createdAt: true,
      },
    });
    return user;
  }
}
