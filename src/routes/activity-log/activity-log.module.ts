import envConfig from '@/shared/config';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from './activity-log.schema';
import { ActivityLogService } from './activity-log.service';
import { NoopActivityLogService } from './noop-activity-log.service';

const mongooseFeature = envConfig.MONGODB_URI
  ? [
      MongooseModule.forFeature([
        { name: ActivityLog.name, schema: ActivityLogSchema },
      ]),
    ]
  : [];

const serviceProvider = envConfig.MONGODB_URI
  ? [ActivityLogService]
  : [{ provide: ActivityLogService, useClass: NoopActivityLogService }];

@Module({
  imports: mongooseFeature,
  providers: serviceProvider,
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
