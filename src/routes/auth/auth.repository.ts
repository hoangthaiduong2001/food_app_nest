import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prismaService.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        password: true,
        status: true,
        roleId: true,
        role: { select: { id: true, name: true } },
      },
    });
  }

  findUserProfileById(id: number) {
    return this.prismaService.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        address: true,
        avatar: true,
        status: true,
        roleId: true,
        role: { select: { id: true, name: true } },
      },
    });
  }

  createUser({
    email,
    name,
    password,
    phoneNumber,
    roleId,
  }: {
    email: string;
    name: string;
    password: string;
    phoneNumber: string;
    roleId: number;
  }) {
    return this.prismaService.user.create({
      data: {
        email,
        name,
        password,
        phoneNumber,
        roleId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        roleId: true,
        role: { select: { name: true } },
      },
    });
  }

  async upsertDevice({
    userId,
    userAgent,
    ip,
  }: {
    userId: number;
    userAgent: string;
    ip: string;
  }): Promise<{ id: number }> {
    const existing = await this.prismaService.device.findFirst({
      where: { userId, userAgent, ip, isActive: true },
      select: { id: true },
    });

    if (existing) {
      await this.prismaService.device.update({
        where: { id: existing.id },
        data: { lastActive: new Date() },
      });
      return existing;
    }

    return this.prismaService.device.create({
      data: { userId, userAgent, ip },
      select: { id: true },
    });
  }

  upsertRefreshToken({
    token,
    userId,
    deviceId,
    expiresAt,
  }: {
    token: string;
    userId: number;
    deviceId: number;
    expiresAt: Date;
  }) {
    return this.prismaService.refreshToken.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { token, userId, deviceId, expiresAt },
      update: { token, expiresAt },
    });
  }

  findRefreshToken(token: string) {
    return this.prismaService.refreshToken.findUnique({
      where: { token },
      select: {
        token: true,
        userId: true,
        deviceId: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            status: true,
            roleId: true,
            role: { select: { name: true } },
          },
        },
      },
    });
  }

  // Xóa refresh token theo (userId, deviceId) — dùng cho logout
  deleteRefreshTokenByDevice(userId: number, deviceId: number) {
    return this.prismaService.refreshToken.deleteMany({
      where: { userId, deviceId },
    });
  }

  // Xóa theo token cụ thể — dùng cho rotation (xóa token cũ vừa được dùng)
  deleteRefreshTokenByToken(token: string) {
    return this.prismaService.refreshToken.deleteMany({
      where: { token },
    });
  }

  revokeAccessToken({
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

  isAccessTokenRevoked(jti: string) {
    return this.prismaService.revokedAccessToken.findUnique({
      where: { jti },
      select: { jti: true },
    });
  }
}
