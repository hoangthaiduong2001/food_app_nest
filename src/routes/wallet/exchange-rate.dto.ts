import { createZodDto } from 'nestjs-zod';
import {
  ExchangeRateResSchema,
  ListExchangeRateResSchema,
  SetExchangeRateBodySchema,
} from './currency.model';

export class SetExchangeRateBodyDto extends createZodDto(
  SetExchangeRateBodySchema,
) {}
export class ExchangeRateResDto extends createZodDto(ExchangeRateResSchema) {}
export class ListExchangeRateResDto extends createZodDto(
  ListExchangeRateResSchema,
) {}
