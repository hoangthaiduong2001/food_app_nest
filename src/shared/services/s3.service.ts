import envConfig from '@/shared/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

const PRESIGN_EXPIRES_SECONDS = 300;

export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client | null;
  private readonly bucket?: string;
  private readonly publicUrl?: string;

  constructor() {
    const { S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME } =
      envConfig;

    if (S3_REGION && S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET_NAME) {
      this.client = new S3Client({
        region: S3_REGION,
        credentials: {
          accessKeyId: S3_ACCESS_KEY,
          secretAccessKey: S3_SECRET_KEY,
        },
      });
      this.bucket = S3_BUCKET_NAME;
      this.publicUrl =
        envConfig.S3_PUBLIC_URL ||
        `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com`;
      this.logger.log('S3 client initialized');
    } else {
      this.client = null;
      this.logger.warn('S3 not configured — upload endpoints will return 500');
    }
  }

  private getConfigured(): {
    client: S3Client;
    bucket: string;
    publicUrl: string;
  } {
    if (!this.client || !this.bucket || !this.publicUrl) {
      throw new InternalServerErrorException({
        message: 'S3 is not configured on the server',
      });
    }
    return {
      client: this.client,
      bucket: this.bucket,
      publicUrl: this.publicUrl,
    };
  }

  async createPresignedUpload(
    filename: string,
    contentType: string,
    folder = 'products',
  ): Promise<PresignedUpload> {
    const { client, bucket, publicUrl } = this.getConfigured();

    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGN_EXPIRES_SECONDS,
    });

    return {
      uploadUrl,
      key,
      publicUrl: `${publicUrl}/${key}`,
      expiresIn: PRESIGN_EXPIRES_SECONDS,
    };
  }
}
