import { createZodDto } from 'nestjs-zod';
import {
  CreateDepositRequestBodySchema,
  DepositRequestResSchema,
  ListDepositRequestQuerySchema,
  ListDepositRequestResSchema,
  RejectDepositBodySchema,
} from './deposit.model';

export class CreateDepositRequestBodyDto extends createZodDto(
  CreateDepositRequestBodySchema,
) {}
export class RejectDepositBodyDto extends createZodDto(
  RejectDepositBodySchema,
) {}
export class DepositRequestResDto extends createZodDto(
  DepositRequestResSchema,
) {}
export class ListDepositRequestQueryDto extends createZodDto(
  ListDepositRequestQuerySchema,
) {}
export class ListDepositRequestResDto extends createZodDto(
  ListDepositRequestResSchema,
) {}
