import { IS_PUBLIC_KEY } from '@/shared/decorator/public.decorator';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
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

  // Passport gọi getRequest() nội bộ — cần trả về đúng request cho cả HTTP và GQL
  getRequest(context: ExecutionContext): Request {
    if (context.getType<GqlContextType>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: Request }>().req;
    }
    return context.switchToHttp().getRequest<Request>();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // GraphQL context — lấy req từ GQL context thay vì HTTP context
    const req =
      context.getType<GqlContextType>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext<{ req: Request }>().req
        : context.switchToHttp().getRequest<Request>();

    const authHeader = req.headers.authorization?.toLowerCase();
    const hasBearer = authHeader?.startsWith('bearer ');
    const hasApiKey = !!req.headers['x-api-key'];

    // GraphQL resolvers tự quản lý auth qua @UseGuards(GqlAuthGuard)
    // Global guard chỉ cần verify token nếu có — không ép buộc auth
    if (context.getType<GqlContextType>() === 'graphql') {
      if (!hasBearer) return true;
      return super.canActivate(context);
    }

    if (!hasBearer) {
      if (!hasApiKey) return true; // route không cần auth sẽ được guard riêng handle
      return this.apiKeyGuard.canActivate(context) as boolean | Promise<boolean>;
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
