import { createZodDto } from 'nestjs-zod';
import {
  CreateApiKeyBodySchema,
  CreateApiKeyResSchema,
  ListApiKeyResSchema,
  LoginBodySchema,
  LoginResSchema,
  MeResSchema,
  RegisterBodySchema,
  RegisterResSchema,
  RevokeApiKeyResSchema,
} from './auth.model';

export class LoginBodyDto extends createZodDto(LoginBodySchema) {}

export class LoginResDto extends createZodDto(LoginResSchema) {}

export class RegisterBodyDto extends createZodDto(RegisterBodySchema) {}

export class RegisterResDto extends createZodDto(RegisterResSchema) {}

export class MeResDto extends createZodDto(MeResSchema) {}

export class CreateApiKeyBodyDto extends createZodDto(CreateApiKeyBodySchema) {}

export class CreateApiKeyResDto extends createZodDto(CreateApiKeyResSchema) {}

export class ListApiKeyResDto extends createZodDto(ListApiKeyResSchema) {}

export class RevokeApiKeyResDto extends createZodDto(RevokeApiKeyResSchema) {}
