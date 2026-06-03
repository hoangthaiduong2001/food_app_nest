export interface ActiveUserData {
  userId: number;
  roleId: number;
  roleName: string;
  source: 'jwt' | 'api-key';
  deviceId?: number;
  apiKeyId?: number;
  // Có khi source='jwt' — dùng để blacklist token cụ thể khi logout
  accessTokenJti?: string;
  accessTokenExp?: number;
}
