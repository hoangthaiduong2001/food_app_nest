import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';

export const AuthSwagger = () =>
  applyDecorators(ApiBearerAuth('access-token'), ApiSecurity('api-key'));
