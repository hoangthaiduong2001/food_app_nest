export interface AccessTokenPayloadCreate {
  userId: number;
  deviceId: number;
  roleId: number;
  roleName: string;
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
