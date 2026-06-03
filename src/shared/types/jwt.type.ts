export interface AccessTokenPayloadCreate {
  userId: number;
  deviceId: number;
  roleId: number;
  roleName: string;
}

// jti = JWT ID — dùng để blacklist token đã revoke
export interface VerifyAccessTokenPayload extends AccessTokenPayloadCreate {
  jti: string;
  exp: number;
  iat: number;
}

export interface RefreshTokenPayloadCreate {
  userId: number;
}

export interface VerifyRefreshTokenPayload extends RefreshTokenPayloadCreate {
  jti: string;
  exp: number;
  iat: number;
}
