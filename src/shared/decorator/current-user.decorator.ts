import { ActiveUserData } from '@/shared/types/active-user.type';
import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  <K extends keyof ActiveUserData>(
    field: K | undefined,
    ctx: ExecutionContext,
  ): ActiveUserData | ActiveUserData[K] | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUserData | undefined;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
