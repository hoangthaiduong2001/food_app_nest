import { ActiveUserData } from '@/shared/types/active-user.type';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeyService: ApiKeyService) {
    super();
  }

  async validate(req: Request): Promise<ActiveUserData> {
    const rawHeader = req.headers['x-api-key'];
    const rawKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!rawKey) {
      throw new UnauthorizedException({
        message: 'Missing x-api-key header or token',
      });
    }

    const resolved = await this.apiKeyService.verifyKey(rawKey);

    return {
      userId: resolved.userId,
      roleId: resolved.roleId,
      roleName: resolved.roleName,
      apiKeyId: resolved.apiKeyId,
      source: 'api-key',
    };
  }
}
