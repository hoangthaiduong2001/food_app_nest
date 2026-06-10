import { PrismaService } from '@/shared/services/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrencyType } from './currency.model';
import { ExchangeRateRepository } from './exchange-rate.repository';

export interface ConversionResult {
  convertedAmount: number;
  rate: number;
}

@Injectable()
export class CurrencyConverterService {
  constructor(private readonly rateRepository: ExchangeRateRepository) {}

  async convert(
    amount: number,
    from: CurrencyType,
    to: CurrencyType,
    client?: PrismaService | Prisma.TransactionClient,
  ): Promise<ConversionResult> {
    if (from === to) {
      return { convertedAmount: amount, rate: 1 };
    }

    const rate = await this.rateRepository.getRate(from, to, client);
    if (rate === null) {
      throw new BadRequestException({
        message: `No exchange rate configured for ${from} → ${to}`,
        path: 'currency',
      });
    }

    return {
      convertedAmount: Math.round(amount * rate),
      rate,
    };
  }
}
