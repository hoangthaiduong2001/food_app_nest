import { Injectable } from '@nestjs/common';
import { ActivityLog } from './activity-log.schema';
import { IActivityLogService, LogActivityInput } from './activity-log.interface';

@Injectable()
export class NoopActivityLogService implements IActivityLogService {
  log(_input: LogActivityInput): void {}

  findByUser(
    _userId: number,
    _opts: { limit: number; skip: number },
  ): Promise<ActivityLog[]> {
    return Promise.resolve([]);
  }

  findByResource(
    _resourceType: string,
    _resourceId: string,
  ): Promise<ActivityLog[]> {
    return Promise.resolve([]);
  }
}
