export interface ActiveUserData {
  userId: number;
  roleId: number;
  roleName: string;
  source: 'jwt' | 'api-key';
  deviceId?: number;
  apiKeyId?: number;
  accessTokenJti?: string;
  accessTokenExp?: number;
}
