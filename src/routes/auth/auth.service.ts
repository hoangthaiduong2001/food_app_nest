import envConfig from '@/shared/config';
import { UserStatus } from '@/shared/constants/auth.constant';
import { ShareRoleRepository } from '@/shared/repositories/share-role.repo';
import { HashingService } from '@/shared/services/hashing.service';
import { TokenBlacklistService } from '@/shared/services/token-blacklist.service';
import { TokenService } from '@/shared/services/token.service';
import { handlePrismaError } from '@/shared/utils/prisma-error.util';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import ms, { StringValue } from 'ms';
import {
  LoginResType,
  LogoutResType,
  MeResType,
  RefreshTokenResType,
  RegisterBodyType,
  RegisterResType,
} from './auth.model';
import { AuthRepository } from './auth.repository';

export interface ValidatedUser {
  id: number;
  roleId: number;
  roleName: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly shareRoleRepository: ShareRoleRepository,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) return null;

    const isPasswordValid = await this.hashingService.compare(
      password,
      user.password,
    );
    if (!isPasswordValid) return null;

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException({
        message: 'Account has been blocked',
        path: 'email',
      });
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException({
        message: 'Account is not activated',
        path: 'email',
      });
    }

    return { id: user.id, roleId: user.roleId, roleName: user.role.name };
  }

  async register({
    data,
    userAgent,
    ip,
  }: {
    data: RegisterBodyType;
    userAgent: string;
    ip: string;
  }): Promise<RegisterResType> {
    try {
      const clientRoleId = await this.shareRoleRepository.getClientRoleId();
      const hashedPassword = await this.hashingService.hash(data.password);

      const user = await this.authRepository.createUser({
        email: data.email,
        name: data.name,
        password: hashedPassword,
        phoneNumber: data.phoneNumber,
        roleId: clientRoleId,
      });

      const device = await this.authRepository.upsertDevice({
        userId: user.id,
        userAgent,
        ip,
      });

      return this.generateTokens({
        userId: user.id,
        deviceId: device.id,
        roleId: user.roleId,
        roleName: user.role.name,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async getProfile(userId: number): Promise<MeResType> {
    const user = await this.authRepository.findUserProfileById(userId);
    if (!user) {
      throw new NotFoundException({ message: 'User not found', path: 'userId' });
    }

    return {
      userId: user.id,
      username: user.name,
      email: user.email,
      phone: user.phoneNumber,
      address: user.address,
      avatar: user.avatar,
      roleId: user.roleId,
      roleName: user.role.name,
    };
  }

  async loginWithValidatedUser({
    user,
    userAgent,
    ip,
  }: {
    user: ValidatedUser;
    userAgent: string;
    ip: string;
  }): Promise<LoginResType> {
    const device = await this.authRepository.upsertDevice({
      userId: user.id,
      userAgent,
      ip,
    });

    return this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.roleName,
    });
  }

  /**
   * Rotation flow:
   *  1. Verify refresh token + check còn trong DB (chưa bị xoá)
   *  2. Xoá refresh token cũ (1 lần dùng duy nhất)
   *  3. Cấp cặp token mới
   * Nếu attacker tái dùng refresh token đã rotate → bước 1 fail → 401 → user/device phải re-login.
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResType> {
    // Verify signature + expiry; payload không cần dùng vì ta load lại từ DB
    try {
      await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid or expired refresh token',
      });
    }

    const stored = await this.authRepository.findRefreshToken(refreshToken);
    if (!stored) {
      // Token hợp lệ về signature nhưng không còn trong DB → có thể đã bị rotate hoặc logout
      throw new UnauthorizedException({
        message: 'Refresh token has been revoked',
      });
    }

    if (stored.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({ message: 'Account is not active' });
    }

    // Xoá refresh token cũ — rotation
    await this.authRepository.deleteRefreshTokenByToken(refreshToken);

    return this.generateTokens({
      userId: stored.userId,
      deviceId: stored.deviceId,
      roleId: stored.user.roleId,
      roleName: stored.user.role.name,
    });
  }

  /**
   * Logout cho device hiện tại:
   *  - Xoá refresh token của (userId, deviceId)
   *  - Blacklist access token đang dùng theo jti tới khi nó tự expire
   */
  async logout({
    userId,
    deviceId,
    accessTokenJti,
    accessTokenExp,
  }: {
    userId: number;
    deviceId: number;
    accessTokenJti: string;
    accessTokenExp: number;
  }): Promise<LogoutResType> {
    await this.authRepository.deleteRefreshTokenByDevice(userId, deviceId);

    await this.tokenBlacklist.revoke({
      jti: accessTokenJti,
      userId,
      expiresAt: new Date(accessTokenExp * 1000),
      reason: 'logout',
    });

    return { loggedOut: true };
  }

  private async generateTokens({
    userId,
    deviceId,
    roleId,
    roleName,
  }: {
    userId: number;
    deviceId: number;
    roleId: number;
    roleName: string;
  }): Promise<LoginResType> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({ userId, deviceId, roleId, roleName }),
      this.tokenService.signRefreshToken({ userId }),
    ]);

    const expiresAt = new Date(
      Date.now() + ms(envConfig.REFRESH_TOKEN_EXPIRES_IN as StringValue),
    );

    await this.authRepository.upsertRefreshToken({
      token: refreshToken,
      userId,
      deviceId,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
