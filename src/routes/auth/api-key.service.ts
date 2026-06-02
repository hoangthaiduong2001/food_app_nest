import { UserStatus } from '@/shared/constants/auth.constant';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ApiKeyRepository } from './api-key.repository';

const API_KEY_PREFIX = 'fap_';
const RAW_KEY_BYTES = 32;

export interface ApiKeyResolvedUser {
  userId: number;
  roleId: number;
  roleName: string;
  apiKeyId: number;
}

@Injectable()
export class ApiKeyService {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async create({
    userId,
    label,
    expiresAt,
  }: {
    userId: number;
    label: string;
    expiresAt?: Date | null;
  }) {
    const rawKey = `${API_KEY_PREFIX}${randomBytes(RAW_KEY_BYTES).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);

    const created = await this.apiKeyRepository.create({
      keyHash,
      label,
      userId,
      expiresAt,
    });

    return { rawKey, ...created };
  }

  async verifyKey(rawKey: string): Promise<ApiKeyResolvedUser> {
    if (!rawKey || !rawKey.startsWith(API_KEY_PREFIX)) {
      throw new UnauthorizedException({ message: 'Invalid API key' });
    }

    const keyHash = this.hashKey(rawKey);
    const record = await this.apiKeyRepository.findActiveByKeyHash(keyHash);

    if (!record) {
      throw new UnauthorizedException({ message: 'Invalid API key' });
    }

    if (record.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({ message: 'User is not active' });
    }

    this.apiKeyRepository.touchLastUsed(record.id).catch(() => {});

    return {
      userId: record.userId,
      roleId: record.user.roleId,
      roleName: record.user.role.name,
      apiKeyId: record.id,
    };
  }

  list(userId: number) {
    return this.apiKeyRepository.listByUser(userId);
  }

  async revoke(id: number, userId: number) {
    const result = await this.apiKeyRepository.revoke(id, userId);
    return { revoked: result.count > 0 };
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
