import envConfig from '@/shared/config';
import { TokenBlacklistService } from '@/shared/services/token-blacklist.service';
import { ActiveUserData } from '@/shared/types/active-user.type';
import { VerifyAccessTokenPayload } from '@/shared/types/jwt.type';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly tokenBlacklist: TokenBlacklistService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig.ACCESS_TOKEN_SECRET,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: VerifyAccessTokenPayload): Promise<ActiveUserData> {
    const isRevoked = await this.tokenBlacklist.isRevoked(payload.jti);
    if (isRevoked) {
      throw new UnauthorizedException({ message: 'Token has been revoked' });
    }

    return {
      userId: payload.userId,
      deviceId: payload.deviceId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      source: 'jwt',
      accessTokenJti: payload.jti,
      accessTokenExp: payload.exp,
    };
  }
}
