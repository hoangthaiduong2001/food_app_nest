import { toISO } from '@/shared/model/transform.helper';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CurrencyType } from './currency.model';
import {
  AccountLookupResType,
  ListTransactionQueryType,
  TransferResType,
  WalletInfoResType,
} from './wallet.model';
import { WalletRepository } from './wallet.repository';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async getWalletInfo(userId: number): Promise<WalletInfoResType> {
    const wallet = await this.walletRepository.getOrCreate(userId);
    return {
      accountNumber: wallet.accountNumber ?? null,
      currency: wallet.currency as WalletInfoResType['currency'],
      balance: Number(wallet.balance),
    };
  }

  async setCurrency(
    userId: number,
    currency: CurrencyType,
  ): Promise<WalletInfoResType> {
    await this.walletRepository.getOrCreate(userId);
    const updated = await this.walletRepository.setCurrency(userId, currency);
    return {
      accountNumber: updated.accountNumber ?? null,
      currency: updated.currency as WalletInfoResType['currency'],
      balance: Number(updated.balance),
    };
  }

  async listTransactions(userId: number, query: ListTransactionQueryType) {
    await this.walletRepository.getOrCreate(userId);
    const result = await this.walletRepository.listTransactions({
      userId,
      type: query.type,
      limit: query.limit,
      cursor: query.cursor,
    });
    return {
      data: result.data.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
        orderId: t.orderId,
        originalAmount:
          t.originalAmount === null ? null : Number(t.originalAmount),
        originalCurrency: t.originalCurrency as CurrencyType | null,
        exchangeRate: t.exchangeRate,
        counterpartyAccount: t.counterpartyAccount,
        description: t.description,
        createdAt: toISO(t.createdAt),
      })),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  transfer(
    fromUserId: number,
    toAccountNumber: string,
    amount: number,
    description?: string,
  ): Promise<TransferResType> {
    return this.walletRepository.transfer({
      fromUserId,
      toAccountNumber,
      amount,
      description,
    });
  }

  async lookupAccount(accountNumber: string): Promise<AccountLookupResType> {
    const found = await this.walletRepository.lookupAccount(accountNumber);
    if (!found || !found.accountNumber) {
      throw new NotFoundException({
        message: 'Account not found',
        path: 'accountNumber',
      });
    }
    return {
      accountNumber: found.accountNumber,
      accountName: found.user.name,
    };
  }
}
