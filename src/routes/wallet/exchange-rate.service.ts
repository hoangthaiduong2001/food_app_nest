import { Injectable } from '@nestjs/common';
import { CurrencyType, ExchangeRateResType } from './currency.model';
import { ExchangeRateRepository } from './exchange-rate.repository';

@Injectable()
export class ExchangeRateService {
  constructor(private readonly rateRepository: ExchangeRateRepository) {}

  list(): Promise<ExchangeRateResType[]> {
    return this.rateRepository.list() as Promise<ExchangeRateResType[]>;
  }

  setRate(
    from: CurrencyType,
    to: CurrencyType,
    rate: number,
    adminId: number,
  ): Promise<ExchangeRateResType> {
    return this.rateRepository.upsert(
      from,
      to,
      rate,
      adminId,
    ) as Promise<ExchangeRateResType>;
  }
}
