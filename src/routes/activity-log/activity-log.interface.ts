import { ActivityLog } from './activity-log.schema';

export interface LogActivityInput {
  userId: number;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface IActivityLogService {
  log(input: LogActivityInput): void;
  findByUser(userId: number, opts: { limit: number; skip: number }): Promise<ActivityLog[]>;
  findByResource(resourceType: string, resourceId: string): Promise<ActivityLog[]>;
}

export const ACTIVITY_LOG_SERVICE = Symbol('IActivityLogService');
