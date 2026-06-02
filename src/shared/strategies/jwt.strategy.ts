import envConfig from '@/shared/config';
import { ActiveUserData } from '@/shared/types/active-user.type';
import { VerifyAccessTokenPayload } from '@/shared/types/jwt.type';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig.ACCESS_TOKEN_SECRET,
      algorithms: ['HS256'],
    });
  }

  validate(payload: VerifyAccessTokenPayload): ActiveUserData {
    return {
      userId: payload.userId,
      deviceId: payload.deviceId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      source: 'jwt',
    };
  }
}
