export interface AccessTokenPayloadCreate {
  userId: string;
  deviceId: string;
  roleId: number;
}

export interface VerifyAccessTokenPayload extends AccessTokenPayloadCreate {
  exp: number;
  iat: number;
}

export interface RefreshTokenPayloadCreate {
  userId: number;
}

export interface VerifyRefreshTokenPayload extends RefreshTokenPayloadCreate {
  exp: number;
  iat: number;
}
