import { createZodDto } from 'nestjs-zod';
import {
  AccountLookupResSchema,
  ListTransactionQuerySchema,
  ListTransactionResSchema,
  SetWalletCurrencyBodySchema,
  TransferBodySchema,
  TransferResSchema,
  WalletInfoResSchema,
} from './wallet.model';

export class WalletInfoResDto extends createZodDto(WalletInfoResSchema) {}
export class SetWalletCurrencyBodyDto extends createZodDto(
  SetWalletCurrencyBodySchema,
) {}
export class ListTransactionQueryDto extends createZodDto(
  ListTransactionQuerySchema,
) {}
export class ListTransactionResDto extends createZodDto(
  ListTransactionResSchema,
) {}
export class TransferBodyDto extends createZodDto(TransferBodySchema) {}
export class TransferResDto extends createZodDto(TransferResSchema) {}
export class AccountLookupResDto extends createZodDto(AccountLookupResSchema) {}
