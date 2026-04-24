import { createZodDto } from 'nestjs-zod';
import { CreateUserBodySchema, CreateUserResSchema } from './user.model';

export class CreateUserBodyDto extends createZodDto(CreateUserBodySchema) {}

export class CreateUserResDto extends createZodDto(CreateUserResSchema) {}
