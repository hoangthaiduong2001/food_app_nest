import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CURRENCY_VALUES, CurrencyType } from './currency.model';
import { ExchangeRateRepository } from './exchange-rate.repository';

const API_URL = 'https://open.er-api.com/v6/latest/USD';

interface ErApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

@Injectable()
export class ExchangeRateSyncService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateSyncService.name);

  constructor(private readonly rateRepository: ExchangeRateRepository) {}

  async onModuleInit() {
    const rates = await this.rateRepository.list();
    if (rates.length === 0) {
      this.logger.log('No exchange rates found, syncing on startup...');
      await this.sync().catch((e) =>
        this.logger.error('Startup sync failed', e),
      );
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleScheduledSync() {
    this.logger.log('Exchange rate sync triggered');
    await this.sync().catch((e) =>
      this.logger.error('Scheduled sync failed', e),
    );
  }

  async sync(): Promise<{ updated: number }> {
    const res = await fetch(API_URL);
    if (!res.ok) {
      throw new Error(`Exchange rate API HTTP ${res.status}`);
    }
    const data = (await res.json()) as ErApiResponse;
    if (data.result !== 'success') {
      throw new Error(`Exchange rate API returned: ${data.result}`);
    }

    const rates = data.rates;

    const pairs: {
      fromCurrency: CurrencyType;
      toCurrency: CurrencyType;
      rate: number;
    }[] = [];
    for (const from of CURRENCY_VALUES) {
      for (const to of CURRENCY_VALUES) {
        if (from === to) continue;
        const rFrom = rates[from];
        const rTo = rates[to];
        if (rFrom === undefined || rTo === undefined) {
          this.logger.warn(`Missing rate for ${from} or ${to}, skipping`);
          continue;
        }
        pairs.push({
          fromCurrency: from as CurrencyType,
          toCurrency: to as CurrencyType,
          rate: rTo / rFrom,
        });
      }
    }

    const updated = await this.rateRepository.replaceAll(pairs);

    this.logger.log(
      `Exchange rates synced: ${updated} pairs (cleaned + reseeded)`,
    );
    return { updated };
  }
}
