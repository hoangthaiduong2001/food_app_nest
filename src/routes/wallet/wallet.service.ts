import { toISO } from '@/shared/model/transform.helper';
import { NotificationService } from '@/routes/notification/notification.service';
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
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly notificationService: NotificationService,
  ) {}

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

  async transfer(
    fromUserId: number,
    toAccountNumber: string,
    amount: number,
    description?: string,
  ): Promise<TransferResType> {
    const result = await this.walletRepository.transfer({
      fromUserId,
      toAccountNumber,
      amount,
      description,
    });

    // Notify người gửi
    this.notificationService.send({
      userId: fromUserId,
      title: 'Transfer sent',
      body: `You sent ${amount.toLocaleString('vi-VN')} to account ${result.toAccountNumber}.`,
      type: 'wallet',
    });

    // Lookup userId người nhận rồi notify
    this.walletRepository
      .lookupAccount(result.toAccountNumber)
      .then((receiver) => {
        if (!receiver) return;
        this.notificationService.send({
          userId: receiver.userId,
          title: 'Money received',
          body: `You received ${amount.toLocaleString('vi-VN')} from account ${result.fromAccountNumber}.`,
          type: 'wallet',
        });
      })
      .catch(() => undefined);

    return result;
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
