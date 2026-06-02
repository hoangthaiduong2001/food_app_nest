import { ROLES_KEY } from '@/shared/decorator/roles.decorator';
import { ActiveUserData } from '@/shared/types/active-user.type';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUserData | undefined;

    if (!user) {
      throw new ForbiddenException({ message: 'Missing user context' });
    }

    if (!requiredRoles.includes(user.roleName)) {
      throw new ForbiddenException({
        message: `Requires role: ${requiredRoles.join(' or ')}`,
      });
    }

    return true;
  }
}
