import {
  isoDateTime,
  isoDateTimeNullable,
} from '@/shared/model/transform.helper';
import z from 'zod';
import { CurrencyEnum } from './currency.model';

export const DepositRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type DepositRequestStatusType =
  (typeof DepositRequestStatus)[keyof typeof DepositRequestStatus];

export const WalletRequestType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
} as const;

export type WalletRequestTypeEnum =
  (typeof WalletRequestType)[keyof typeof WalletRequestType];

export const CreateDepositRequestBodySchema = z
  .object({
    currency: CurrencyEnum.default('VND'),
    amount: z.number().int().positive().max(1_000_000_000),
    note: z.string().max(255).optional(),
  })
  .strict();

export const RejectDepositBodySchema = z
  .object({
    rejectReason: z.string().min(1).max(255),
  })
  .strict();

export const DepositRequestResSchema = z.object({
  id: z.number(),
  userId: z.number(),
  type: z.enum([WalletRequestType.DEPOSIT, WalletRequestType.WITHDRAW]),
  currency: CurrencyEnum,
  amount: z.number(),
  status: z.enum([
    DepositRequestStatus.PENDING,
    DepositRequestStatus.APPROVED,
    DepositRequestStatus.REJECTED,
    DepositRequestStatus.CANCELLED,
  ]),
  note: z.string().nullable(),
  reviewedById: z.number().nullable(),
  reviewedAt: isoDateTimeNullable,
  rejectReason: z.string().nullable(),
  createdAt: isoDateTime,
});

export const ListDepositRequestQuerySchema = z
  .object({
    status: z
      .enum([
        DepositRequestStatus.PENDING,
        DepositRequestStatus.APPROVED,
        DepositRequestStatus.REJECTED,
        DepositRequestStatus.CANCELLED,
      ])
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const ListDepositRequestResSchema = z.object({
  data: z.array(DepositRequestResSchema),
  nextCursor: z.number().nullable(),
  hasMore: z.boolean(),
});

export type CreateDepositRequestBodyType = z.infer<
  typeof CreateDepositRequestBodySchema
>;
export type RejectDepositBodyType = z.infer<typeof RejectDepositBodySchema>;
export type DepositRequestResType = z.infer<typeof DepositRequestResSchema>;
export type ListDepositRequestQueryType = z.infer<
  typeof ListDepositRequestQuerySchema
>;
