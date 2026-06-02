import envConfig from '@/shared/config';
import { UserStatus } from '@/shared/constants/auth.constant';
import { ShareRoleRepository } from '@/shared/repositories/share-role.repo';
import { HashingService } from '@/shared/services/hashing.service';
import { TokenService } from '@/shared/services/token.service';
import { handlePrismaError } from '@/shared/utils/prisma-error.util';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ms, { StringValue } from 'ms';
import {
  LoginResType,
  MeResType,
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
