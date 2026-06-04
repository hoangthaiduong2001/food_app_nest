import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { v4 as uuidv4 } from 'uuid';
import envConfig from '../config';
import {
  AccessTokenPayloadCreate,
  RefreshTokenPayloadCreate,
  VerifyAccessTokenPayload,
  VerifyRefreshTokenPayload,
} from '../types/jwt.type';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayloadCreate) {
    return this.jwtService.sign(payload, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
      expiresIn: envConfig.ACCESS_TOKEN_EXPIRES_IN as StringValue,
      algorithm: 'HS256',
      jwtid: uuidv4(),
    });
  }

  signRefreshToken(payload: RefreshTokenPayloadCreate) {
    return this.jwtService.sign(payload, {
      secret: envConfig.REFRESH_TOKEN_SECRET,
      expiresIn: envConfig.REFRESH_TOKEN_EXPIRES_IN as StringValue,
      algorithm: 'HS256',
      jwtid: uuidv4(),
    });
  }

  verifyAccessToken(token: string): Promise<VerifyAccessTokenPayload> {
    return this.jwtService.verify(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
    });
  }

  verifyRefreshToken(token: string): Promise<VerifyRefreshTokenPayload> {
    return this.jwtService.verify(token, {
      secret: envConfig.REFRESH_TOKEN_SECRET,
    });
  }
}
