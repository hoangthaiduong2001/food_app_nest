import { createZodDto } from 'nestjs-zod';
import {
  CreatePaymentIntentBodySchema,
  PaymentIntentResSchema,
} from './payment.model';

export class CreatePaymentIntentBodyDto extends createZodDto(
  CreatePaymentIntentBodySchema,
) {}
export class PaymentIntentResDto extends createZodDto(PaymentIntentResSchema) {}
