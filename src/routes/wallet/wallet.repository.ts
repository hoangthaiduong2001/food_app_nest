import { PrismaService } from '@/shared/services/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrencyConverterService } from './currency-converter.service';
import { CurrencyType } from './currency.model';
import { WalletTransactionTypeEnum } from './wallet.model';

interface LockedWallet {
  id: number;
  balance: number | bigint;
  currency?: string;
}

@Injectable()
export class WalletRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly converter: CurrencyConverterService,
  ) {}

  private randomAccountNumber(): string {
    return Math.floor(1_000_000_000 + Math.random() * 9_000_000_000).toString();
  }

  private async genUniqueAccountNumber(
    client: PrismaService | Prisma.TransactionClient,
  ): Promise<string> {
    const MAX_TRIES = 5;
    for (let i = 0; i < MAX_TRIES; i++) {
      const candidate = this.randomAccountNumber();
      const exists = await client.wallet.findUnique({
        where: { accountNumber: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new ConflictException({
      message: 'Could not generate a unique account number, please retry',
    });
  }

  async getOrCreate(userId: number) {
    const existing = await this.prismaService.wallet.findUnique({
      where: { userId },
      select: { id: true, balance: true, accountNumber: true, currency: true },
    });
    if (existing) return existing;

    const accountNumber = await this.genUniqueAccountNumber(this.prismaService);
    return this.prismaService.wallet.create({
      data: { userId, accountNumber },
      select: { id: true, balance: true, accountNumber: true, currency: true },
    });
  }

  getInfo(userId: number) {
    return this.prismaService.wallet.findUnique({
      where: { userId },
      select: { accountNumber: true, balance: true },
    });
  }

  async listTransactions({
    userId,
    type,
    limit,
    cursor,
  }: {
    userId: number;
    type?: string;
    limit: number;
    cursor?: number;
  }) {
    const wallet = await this.prismaService.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const where = {
      walletId: wallet.id,
      ...(type ? { type: type as never } : {}),
    };

    const rows = await this.prismaService.walletTransaction.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        orderId: true,
        originalAmount: true,
        originalCurrency: true,
        exchangeRate: true,
        counterpartyAccount: true,
        description: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;
    return { data: page, nextCursor, hasMore };
  }

  findByAccountNumber(accountNumber: string) {
    return this.prismaService.wallet.findUnique({
      where: { accountNumber },
      select: { id: true, userId: true, balance: true, accountNumber: true },
    });
  }

  lookupAccount(accountNumber: string) {
    return this.prismaService.wallet.findUnique({
      where: { accountNumber },
      select: {
        accountNumber: true,
        user: { select: { name: true } },
      },
    });
  }

  async transfer({
    fromUserId,
    toAccountNumber,
    amount,
    description,
  }: {
    fromUserId: number;
    toAccountNumber: string;
    amount: number;
    description?: string;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      let fromWallet = await tx.wallet.findUnique({
        where: { userId: fromUserId },
        select: { id: true, accountNumber: true, currency: true },
      });
      if (!fromWallet) {
        const accountNumber = await this.genUniqueAccountNumber(tx);
        fromWallet = await tx.wallet.create({
          data: { userId: fromUserId, accountNumber },
          select: { id: true, accountNumber: true, currency: true },
        });
      }

      const toWallet = await tx.wallet.findUnique({
        where: { accountNumber: toAccountNumber },
        select: { id: true, accountNumber: true, currency: true },
      });
      if (!toWallet) {
        throw new ConflictException({
          message: 'Recipient account not found',
          path: 'toAccountNumber',
        });
      }
      if (toWallet.id === fromWallet.id) {
        throw new ConflictException({
          message: 'Cannot transfer to your own account',
          path: 'toAccountNumber',
        });
      }

      const fromCurrency = fromWallet.currency as CurrencyType;
      const toCurrency = toWallet.currency as CurrencyType;
      const { convertedAmount: amountForReceiver, rate } =
        await this.converter.convert(amount, fromCurrency, toCurrency, tx);

      const [firstId, secondId] =
        fromWallet.id < toWallet.id
          ? [fromWallet.id, toWallet.id]
          : [toWallet.id, fromWallet.id];
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${firstId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${secondId} FOR UPDATE`;

      const fromRow = await tx.wallet.findUnique({
        where: { id: fromWallet.id },
        select: { balance: true },
      });
      const toRow = await tx.wallet.findUnique({
        where: { id: toWallet.id },
        select: { balance: true },
      });
      const fromBefore = Number(fromRow!.balance);
      const toBefore = Number(toRow!.balance);

      if (fromBefore < amount) {
        throw new ConflictException({
          message: `Insufficient balance. Balance: ${fromBefore}, required: ${amount}`,
          path: 'amount',
        });
      }

      const fromAfter = fromBefore - amount;
      const toAfter = toBefore + amountForReceiver;
      const isCrossCurrency = fromCurrency !== toCurrency;

      await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: fromAfter },
      });
      await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: toAfter },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: fromWallet.id,
          type: 'TRANSFER_OUT',
          amount,
          balanceBefore: fromBefore,
          balanceAfter: fromAfter,
          counterpartyAccount: toWallet.accountNumber,
          description: description ?? `Transfer to ${toWallet.accountNumber}`,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: toWallet.id,
          type: 'TRANSFER_IN',
          amount: amountForReceiver,
          balanceBefore: toBefore,
          balanceAfter: toAfter,
          counterpartyAccount: fromWallet.accountNumber,
          originalAmount: isCrossCurrency ? amount : null,
          originalCurrency: isCrossCurrency ? (fromCurrency as never) : null,
          exchangeRate: isCrossCurrency ? rate : null,
          description:
            description ?? `Transfer from ${fromWallet.accountNumber}`,
        },
      });

      return {
        fromAccountNumber: fromWallet.accountNumber!,
        toAccountNumber: toWallet.accountNumber!,
        amount,
        balanceAfter: fromAfter,
      };
    });
  }

  /**
   * Thay đổi balance an toàn với PESSIMISTIC LOCK.
   *
   * delta > 0: cộng (deposit/refund). delta < 0: trừ (withdraw/payment).
   * SELECT FOR UPDATE khóa wallet row → 2 giao dịch song song phải xếp hàng,
   * tránh lost update (đọc cùng balance → ghi đè nhau → mất tiền).
   *
   * Ghi WalletTransaction (audit) trong cùng transaction → balance và log luôn khớp.
   */
  async changeBalance({
    userId,
    delta,
    type,
    orderId,
    description,
  }: {
    userId: number;
    delta: number;
    type: WalletTransactionTypeEnum;
    orderId?: number;
    description?: string;
  }) {
    return this.prismaService.$transaction(async (tx) => {
      // 1. Đảm bảo ví tồn tại (tạo nếu chưa) — ngoài lock vì cần id để lock
      let wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId },
          select: { id: true },
        });
      }

      // 2. Khóa row + đọc balance hiện tại (atomic với check + update)
      const rows = await tx.$queryRaw<LockedWallet[]>`
        SELECT id, balance FROM "Wallet"
        WHERE id = ${wallet.id}
        FOR UPDATE
      `;
      const locked = rows[0];
      const balanceBefore = Number(locked.balance);
      const balanceAfter = balanceBefore + delta;

      // 3. Không cho âm
      if (balanceAfter < 0) {
        throw new ConflictException({
          message: `Insufficient balance. Current: ${balanceBefore}, required: ${Math.abs(delta)}`,
          path: 'amount',
        });
      }

      // 4. Update balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      // 5. Ghi log giao dịch (audit)
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: Math.abs(delta),
          balanceBefore,
          balanceAfter,
          orderId: orderId ?? null,
          description: description ?? null,
        },
      });

      return { balanceBefore, balanceAfter };
    });
  }

  /**
   * Biến thể nhận tx có sẵn — để OrderService gọi trong CÙNG transaction
   * khi thanh toán order (đổi status + trừ ví atomic).
   */
  async changeBalanceInTx(
    tx: Prisma.TransactionClient,
    {
      userId,
      delta,
      type,
      orderId,
      description,
      originalAmount,
      originalCurrency,
      exchangeRate,
    }: {
      userId: number;
      delta: number;
      type: WalletTransactionTypeEnum;
      orderId?: number;
      description?: string;
      originalAmount?: number;
      originalCurrency?: string;
      exchangeRate?: number;
    },
  ) {
    let wallet = await tx.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      const accountNumber = await this.genUniqueAccountNumber(tx);
      wallet = await tx.wallet.create({
        data: { userId, accountNumber },
        select: { id: true },
      });
    }

    const rows = await tx.$queryRaw<LockedWallet[]>`
      SELECT id, balance FROM "Wallet"
      WHERE id = ${wallet.id}
      FOR UPDATE
    `;
    const balanceBefore = Number(rows[0].balance);
    const balanceAfter = balanceBefore + delta;

    if (balanceAfter < 0) {
      throw new ConflictException({
        message: `Insufficient balance. Current: ${balanceBefore}, required: ${Math.abs(delta)}`,
        path: 'amount',
      });
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: Math.abs(delta),
        balanceBefore,
        balanceAfter,
        orderId: orderId ?? null,
        originalAmount: originalAmount ?? null,
        originalCurrency: (originalCurrency as never) ?? null,
        exchangeRate: exchangeRate ?? null,
        description: description ?? null,
      },
    });

    return { balanceBefore, balanceAfter };
  }

  async getCurrency(
    userId: number,
    client: PrismaService | Prisma.TransactionClient = this.prismaService,
  ): Promise<string> {
    const wallet = await client.wallet.findUnique({
      where: { userId },
      select: { currency: true },
    });
    return wallet?.currency ?? 'VND';
  }

  setCurrency(userId: number, currency: CurrencyType) {
    return this.prismaService.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!wallet) {
        const accountNumber = await this.genUniqueAccountNumber(tx);
        wallet = await tx.wallet.create({
          data: { userId, accountNumber },
          select: { id: true },
        });
      }

      const rows = await tx.$queryRaw<LockedWallet[]>`
        SELECT id, balance, currency FROM "Wallet"
        WHERE id = ${wallet.id}
        FOR UPDATE
      `;
      const locked = rows[0];
      const fromCurrency = locked.currency as CurrencyType;
      const { convertedAmount } = await this.converter.convert(
        Number(locked.balance),
        fromCurrency,
        currency,
        tx,
      );

      return tx.wallet.update({
        where: { id: locked.id },
        data: {
          currency: currency,
          balance: convertedAmount,
        },
        select: { currency: true, accountNumber: true, balance: true },
      });
    });
  }
}
