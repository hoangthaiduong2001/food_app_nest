import { createZodDto } from 'nestjs-zod';
import {
  CreateUserBodySchema,
  CreateUserResSchema,
  GetUsersQuerySchema,
  GetUsersResSchema,
  GetUserResSchema,
  UpdateUserBodySchema,
  UpdateUserResSchema,
} from './user.model';

export class GetUsersQueryDto extends createZodDto(GetUsersQuerySchema) {}
export class GetUsersResDto extends createZodDto(GetUsersResSchema) {}
export class GetUserResDto extends createZodDto(GetUserResSchema) {}
export class CreateUserBodyDto extends createZodDto(CreateUserBodySchema) {}
export class CreateUserResDto extends createZodDto(CreateUserResSchema) {}
export class UpdateUserBodyDto extends createZodDto(UpdateUserBodySchema) {}
export class UpdateUserResDto extends createZodDto(UpdateUserResSchema) {}
