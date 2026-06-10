import { IS_PUBLIC_KEY } from '@/shared/decorator/public.decorator';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

class ApiKeyGuard extends AuthGuard('api-key') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (user) return user;
    const message =
      (err as { message?: string } | undefined)?.message ??
      (info as { message?: string } | undefined)?.message ??
      'Missing or invalid x-api-key';
    throw new UnauthorizedException({ message, code: 'API_KEY_INVALID' });
  }
}

@Injectable()
export class JwtOrApiKeyGuard extends AuthGuard('jwt') {
  private readonly apiKeyGuard: ApiKeyGuard;

  constructor(private readonly reflector: Reflector) {
    super();
    this.apiKeyGuard = new ApiKeyGuard();
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
      return this.apiKeyGuard.canActivate(context) as
        | boolean
        | Promise<boolean>;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (user) return user;

    const infoName = (info as { name?: string } | undefined)?.name;
    const errMessage = (err as { message?: string } | undefined)?.message;

    if (infoName === 'TokenExpiredError') {
      throw new UnauthorizedException({
        message: 'Access token has expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (infoName === 'JsonWebTokenError') {
      throw new UnauthorizedException({
        message: 'Invalid access token',
        code: 'TOKEN_INVALID',
      });
    }

    throw new UnauthorizedException({
      message: errMessage ?? 'Authentication failed',
      code: 'AUTH_FAILED',
    });
  }
}
