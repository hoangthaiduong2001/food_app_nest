import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class TokenBlacklistService {
  constructor(private readonly prismaService: PrismaService) {}

  async isRevoked(jti: string): Promise<boolean> {
    const found = await this.prismaService.revokedAccessToken.findUnique({
      where: { jti },
      select: { jti: true },
    });
    return found !== null;
  }

  revoke({
    jti,
    userId,
    expiresAt,
    reason,
  }: {
    jti: string;
    userId: number;
    expiresAt: Date;
    reason: string;
  }) {
    return this.prismaService.revokedAccessToken.upsert({
      where: { jti },
      create: { jti, userId, expiresAt, reason },
      update: {},
    });
  }
}
