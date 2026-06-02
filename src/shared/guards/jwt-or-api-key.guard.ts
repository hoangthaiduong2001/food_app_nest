import { IS_PUBLIC_KEY } from '@/shared/decorator/public.decorator';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class JwtOrApiKeyGuard extends AuthGuard(['jwt', 'api-key']) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const hasBearer = req.headers.authorization
      ?.toLowerCase()
      .startsWith('bearer ');
    if (!hasBearer) {
      const ApiKeyOnly = AuthGuard('api-key');
      const instance = new ApiKeyOnly();
      return instance.canActivate(context) as boolean | Promise<boolean>;
    }

    return super.canActivate(context);
  }
}
