import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({ timestamps: true, collection: 'activity_logs' })
export class ActivityLog {
  @Prop({ required: true, index: true })
  userId!: number;

  @Prop({ required: true })
  action!: string;

  @Prop({ type: Object })
  metadata!: Record<string, unknown>;

  @Prop({ index: true })
  resourceType!: string;

  @Prop()
  resourceId!: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
