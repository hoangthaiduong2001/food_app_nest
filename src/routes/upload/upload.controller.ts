import { RoleName } from '@/shared/constants/role.constant';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { S3Service } from '@/shared/services/s3.service';
import { ApiError, ApiSuccess } from '@/shared/swagger/api-response.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { PresignUploadBodyDto, PresignUploadResDto } from './upload.dto';

@ApiTags('Upload')
@Controller('uploads')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Roles(RoleName.Admin)
  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({
    summary:
      'Get a presigned PUT URL to upload an image directly to S3 (admin only)',
  })
  @ApiSuccess(PresignUploadResDto, { description: 'Presigned URL created' })
  @ApiError(400, 'Invalid file type', 'Invalid content type')
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ApiError(500, 'S3 not configured', 'S3 is not configured on the server')
  @SuccessMessage('Presigned URL created')
  @ZodSerializerDto(PresignUploadResDto)
  async createPresignedUrl(@Body() body: PresignUploadBodyDto) {
    return this.s3Service.createPresignedUpload(
      body.filename,
      body.contentType,
    );
  }
}
