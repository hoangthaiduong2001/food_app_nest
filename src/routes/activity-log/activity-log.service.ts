import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IActivityLogService, LogActivityInput } from './activity-log.interface';
import { ActivityLog, ActivityLogDocument } from './activity-log.schema';

export type { LogActivityInput };

@Injectable()
export class ActivityLogService implements IActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  log(input: LogActivityInput): void {
    this.activityLogModel
      .create(input)
      .catch((err: Error) =>
        this.logger.error(`Failed to write activity log: ${err.message}`),
      );
  }

  async findByUser(
    userId: number,
    opts: { limit: number; skip: number },
  ): Promise<ActivityLog[]> {
    return this.activityLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(opts.skip)
      .limit(opts.limit)
      .lean()
      .exec();
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<ActivityLog[]> {
    return this.activityLogModel
      .find({ resourceType, resourceId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }
}
