import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrencyType } from './currency.model';

@Injectable()
export class ExchangeRateRepository {
  constructor(private readonly prismaService: PrismaService) {}

  list() {
    return this.prismaService.exchangeRate.findMany({
      orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }],
      select: { id: true, fromCurrency: true, toCurrency: true, rate: true },
    });
  }

  async getRate(
    from: CurrencyType,
    to: CurrencyType,
    client: PrismaService | Prisma.TransactionClient = this.prismaService,
  ): Promise<number | null> {
    if (from === to) return 1;
    const row = await client.exchangeRate.findUnique({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: from as never,
          toCurrency: to as never,
        },
      },
      select: { rate: true },
    });
    return row?.rate ?? null;
  }

  async replaceAll(
    pairs: {
      fromCurrency: CurrencyType;
      toCurrency: CurrencyType;
      rate: number;
    }[],
  ): Promise<number> {
    await this.prismaService.$transaction([
      this.prismaService.exchangeRate.deleteMany({}),
      this.prismaService.exchangeRate.createMany({
        data: pairs.map((p) => ({
          fromCurrency: p.fromCurrency as never,
          toCurrency: p.toCurrency as never,
          rate: p.rate,
          updatedById: null,
        })),
      }),
    ]);
    return pairs.length;
  }

  upsert(
    from: CurrencyType,
    to: CurrencyType,
    rate: number,
    updatedById: number | null,
  ) {
    return this.prismaService.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: from as never,
          toCurrency: to as never,
        },
      },
      create: {
        fromCurrency: from as never,
        toCurrency: to as never,
        rate,
        updatedById,
      },
      update: { rate, updatedById },
      select: { id: true, fromCurrency: true, toCurrency: true, rate: true },
    });
  }
}
