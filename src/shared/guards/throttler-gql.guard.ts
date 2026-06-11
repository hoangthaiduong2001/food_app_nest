import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerGqlGuard extends ThrottlerGuard {
  override canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType<GqlContextType>() === 'graphql') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }
}
