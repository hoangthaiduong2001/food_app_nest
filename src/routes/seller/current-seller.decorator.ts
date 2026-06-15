import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SELLER_KEY } from './seller-api-key.guard';
import type { RawSeller } from './seller.repository';

export const CurrentSeller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RawSeller => {
    const req = ctx.switchToHttp().getRequest();
    return req[SELLER_KEY];
  },
);
