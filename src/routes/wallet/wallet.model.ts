import { isoDateTime } from '@/shared/model/transform.helper';
import z from 'zod';
import { CurrencyEnum } from './currency.model';

export const WalletTransactionType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
} as const;

export type WalletTransactionTypeEnum =
  (typeof WalletTransactionType)[keyof typeof WalletTransactionType];

export const WalletTransactionResSchema = z.object({
  id: z.number(),
  type: z.enum([
    WalletTransactionType.DEPOSIT,
    WalletTransactionType.WITHDRAW,
    WalletTransactionType.PAYMENT,
    WalletTransactionType.REFUND,
    WalletTransactionType.TRANSFER_IN,
    WalletTransactionType.TRANSFER_OUT,
  ]),
  amount: z.number(),
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  orderId: z.number().nullable(),
  originalAmount: z.number().nullable(),
  originalCurrency: CurrencyEnum.nullable(),
  exchangeRate: z.number().nullable(),
  counterpartyAccount: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: isoDateTime,
});

export const WalletInfoResSchema = z.object({
  accountNumber: z.string().nullable(),
  currency: CurrencyEnum,
  balance: z.number(),
});

export const SetWalletCurrencyBodySchema = z
  .object({
    currency: CurrencyEnum,
  })
  .strict();

export const ListTransactionQuerySchema = z
  .object({
    type: z
      .enum([
        WalletTransactionType.DEPOSIT,
        WalletTransactionType.WITHDRAW,
        WalletTransactionType.PAYMENT,
        WalletTransactionType.REFUND,
        WalletTransactionType.TRANSFER_IN,
        WalletTransactionType.TRANSFER_OUT,
      ])
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const ListTransactionResSchema = z.object({
  data: z.array(WalletTransactionResSchema),
  nextCursor: z.number().nullable(),
  hasMore: z.boolean(),
});

export const TransferBodySchema = z
  .object({
    toAccountNumber: z.string().min(6).max(20),
    amount: z.number().int().positive().max(1_000_000_000),
    description: z.string().max(255).optional(),
  })
  .strict();

export const TransferResSchema = z.object({
  fromAccountNumber: z.string(),
  toAccountNumber: z.string(),
  amount: z.number(),
  balanceAfter: z.number(),
});

export const AccountLookupResSchema = z.object({
  accountNumber: z.string(),
  accountName: z.string(),
});

export type WalletInfoResType = z.infer<typeof WalletInfoResSchema>;
export type ListTransactionQueryType = z.infer<
  typeof ListTransactionQuerySchema
>;
export type TransferBodyType = z.infer<typeof TransferBodySchema>;
export type TransferResType = z.infer<typeof TransferResSchema>;
export type AccountLookupResType = z.infer<typeof AccountLookupResSchema>;
export type SetWalletCurrencyBodyType = z.infer<
  typeof SetWalletCurrencyBodySchema
>;
