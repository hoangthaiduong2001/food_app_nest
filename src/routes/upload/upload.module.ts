import { S3Service } from '@/shared/services/s3.service';
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
  providers: [S3Service],
})
export class UploadModule {}
