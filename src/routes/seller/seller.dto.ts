import { createZodDto } from 'nestjs-zod';
import {
  ActivateSellerBodySchema,
  ApproveSellerBodySchema,
  ListSellerQuerySchema,
  RejectSellerBodySchema,
  RegisterSellerBodySchema,
  SellerResSchema,
} from './seller.model';

export class RegisterSellerBodyDto extends createZodDto(RegisterSellerBodySchema) {}
export class ApproveSellerBodyDto extends createZodDto(ApproveSellerBodySchema) {}
export class RejectSellerBodyDto extends createZodDto(RejectSellerBodySchema) {}
export class ActivateSellerBodyDto extends createZodDto(ActivateSellerBodySchema) {}
export class SellerResDto extends createZodDto(SellerResSchema) {}
export class ListSellerQueryDto extends createZodDto(ListSellerQuerySchema) {}
