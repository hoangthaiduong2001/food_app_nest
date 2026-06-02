import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create({
    keyHash,
    label,
    userId,
    expiresAt,
  }: {
    keyHash: string;
    label: string;
    userId: number;
    expiresAt?: Date | null;
  }) {
    return this.prismaService.apiKey.create({
      data: { keyHash, label, userId, expiresAt: expiresAt ?? null },
      select: { id: true, label: true, expiresAt: true, createdAt: true },
    });
  }

  findActiveByKeyHash(keyHash: string) {
    return this.prismaService.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            roleId: true,
            status: true,
            role: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  listByUser(userId: number) {
    return this.prismaService.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  revoke(id: number, userId: number) {
    return this.prismaService.apiKey.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Async fire-and-forget từ strategy — không await để không làm chậm request
  touchLastUsed(id: number) {
    return this.prismaService.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
      select: { id: true },
    });
  }
}
