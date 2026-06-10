import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrencyConverterService } from './currency-converter.service';
import { CurrencyType } from './currency.model';
import {
  DepositRequestStatus,
  DepositRequestStatusType,
  WalletRequestType,
  WalletRequestTypeEnum,
} from './deposit.model';
import { WalletTransactionType } from './wallet.model';
import { WalletRepository } from './wallet.repository';

@Injectable()
export class DepositRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly walletRepository: WalletRepository,
    private readonly converter: CurrencyConverterService,
  ) {}

  async create(
    userId: number,
    type: WalletRequestTypeEnum,
    currency: CurrencyType,
    amount: number,
    note?: string,
  ) {
    if (type === WalletRequestType.DEPOSIT) {
      return this.prismaService.depositRequest.create({
        data: {
          userId,
          type,
          currency: currency as never,
          amount,
          note: note ?? null,
        },
      });
    }

    return this.prismaService.$transaction(async (tx) => {
      const walletCurrency = (await this.walletRepository.getCurrency(
        userId,
        tx,
      )) as CurrencyType;
      const { convertedAmount, rate } = await this.converter.convert(
        amount,
        currency,
        walletCurrency,
        tx,
      );

      await this.walletRepository.changeBalanceInTx(tx, {
        userId,
        delta: -convertedAmount,
        type: WalletTransactionType.WITHDRAW,
        description: 'Withdraw request (hold)',
        originalAmount: currency === walletCurrency ? undefined : amount,
        originalCurrency: currency === walletCurrency ? undefined : currency,
        exchangeRate: currency === walletCurrency ? undefined : rate,
      });
      return tx.depositRequest.create({
        data: {
          userId,
          type,
          currency: currency as never,
          amount,
          note: note ?? null,
        },
      });
    });
  }

  findById(id: number) {
    return this.prismaService.depositRequest.findUnique({ where: { id } });
  }

  async list({
    userId,
    status,
    limit,
    cursor,
  }: {
    userId?: number;
    status?: DepositRequestStatusType;
    limit: number;
    cursor?: number;
  }) {
    const where = {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    };
    const rows = await this.prismaService.depositRequest.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;
    return { data: page, nextCursor, hasMore };
  }

  private async toWalletAmount(
    tx: Prisma.TransactionClient,
    userId: number,
    currency: CurrencyType,
    amount: number,
  ): Promise<number> {
    const walletCurrency = (await this.walletRepository.getCurrency(
      userId,
      tx,
    )) as CurrencyType;
    const { convertedAmount } = await this.converter.convert(
      amount,
      currency,
      walletCurrency,
      tx,
    );
    return convertedAmount;
  }

  async cancel(
    id: number,
    userId: number,
    type: WalletRequestTypeEnum,
    currency: CurrencyType,
    amount: number,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      if (type === WalletRequestType.WITHDRAW) {
        const refundAmount = await this.toWalletAmount(
          tx,
          userId,
          currency,
          amount,
        );
        await this.walletRepository.changeBalanceInTx(tx, {
          userId,
          delta: refundAmount,
          type: WalletTransactionType.REFUND,
          description: `Withdraw request #${id} cancelled — refund hold`,
        });
      }
      return tx.depositRequest.update({
        where: { id },
        data: { status: DepositRequestStatus.CANCELLED },
      });
    });
  }

  async reject(
    id: number,
    userId: number,
    type: WalletRequestTypeEnum,
    currency: CurrencyType,
    amount: number,
    reviewedById: number,
    rejectReason: string,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      if (type === WalletRequestType.WITHDRAW) {
        const refundAmount = await this.toWalletAmount(
          tx,
          userId,
          currency,
          amount,
        );
        await this.walletRepository.changeBalanceInTx(tx, {
          userId,
          delta: refundAmount,
          type: WalletTransactionType.REFUND,
          description: `Withdraw request #${id} rejected — refund hold`,
        });
      }
      return tx.depositRequest.update({
        where: { id },
        data: {
          status: DepositRequestStatus.REJECTED,
          reviewedById,
          reviewedAt: new Date(),
          rejectReason,
        },
      });
    });
  }

  async approve(
    id: number,
    userId: number,
    type: WalletRequestTypeEnum,
    currency: CurrencyType,
    amount: number,
    reviewedById: number,
  ) {
    return this.prismaService.$transaction(async (tx) => {
      if (type === WalletRequestType.DEPOSIT) {
        const walletCurrency = (await this.walletRepository.getCurrency(
          userId,
          tx,
        )) as CurrencyType;
        const { convertedAmount, rate } = await this.converter.convert(
          amount,
          currency,
          walletCurrency,
          tx,
        );
        await this.walletRepository.changeBalanceInTx(tx, {
          userId,
          delta: convertedAmount,
          type: WalletTransactionType.DEPOSIT,
          description: `Deposit request #${id} approved`,
          originalAmount: currency === walletCurrency ? undefined : amount,
          originalCurrency: currency === walletCurrency ? undefined : currency,
          exchangeRate: currency === walletCurrency ? undefined : rate,
        });
      }

      return tx.depositRequest.update({
        where: { id },
        data: {
          status: DepositRequestStatus.APPROVED,
          reviewedById,
          reviewedAt: new Date(),
        },
      });
    });
  }
}
