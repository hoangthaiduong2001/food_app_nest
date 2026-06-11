import { Injectable } from '@nestjs/common';
import { ActivityLog } from './activity-log.schema';
import { LogActivityInput } from './activity-log.service';

@Injectable()
export class NoopActivityLogService {
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
