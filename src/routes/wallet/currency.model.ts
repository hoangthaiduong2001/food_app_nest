import z from 'zod';

export const Currency = {
  VND: 'VND',
  USD: 'USD',
  GBP: 'GBP',
  JPY: 'JPY',
  KRW: 'KRW',
  CNY: 'CNY',
} as const;

export type CurrencyType = (typeof Currency)[keyof typeof Currency];

export const CURRENCY_VALUES = [
  Currency.VND,
  Currency.USD,
  Currency.GBP,
  Currency.JPY,
  Currency.KRW,
  Currency.CNY,
] as const;

export const CurrencyEnum = z.enum(CURRENCY_VALUES);

export const SetExchangeRateBodySchema = z
  .object({
    fromCurrency: CurrencyEnum,
    toCurrency: CurrencyEnum,
    rate: z.number().positive(),
  })
  .strict()
  .refine((d) => d.fromCurrency !== d.toCurrency, {
    message: 'fromCurrency and toCurrency must differ',
    path: ['toCurrency'],
  });

export const ExchangeRateResSchema = z.object({
  id: z.number(),
  fromCurrency: CurrencyEnum,
  toCurrency: CurrencyEnum,
  rate: z.number(),
});

export const ListExchangeRateResSchema = z.array(ExchangeRateResSchema);

export type SetExchangeRateBodyType = z.infer<typeof SetExchangeRateBodySchema>;
export type ExchangeRateResType = z.infer<typeof ExchangeRateResSchema>;
