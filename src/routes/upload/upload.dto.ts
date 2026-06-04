import { createZodDto } from 'nestjs-zod';
import {
  PresignUploadBodySchema,
  PresignUploadResSchema,
} from './upload.model';

export class PresignUploadBodyDto extends createZodDto(
  PresignUploadBodySchema,
) {}
export class PresignUploadResDto extends createZodDto(PresignUploadResSchema) {}
