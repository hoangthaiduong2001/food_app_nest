import { EmailModule } from '@/routes/email/email.module';
import { Module } from '@nestjs/common';
import { CurrencyConverterService } from './currency-converter.service';
import { DepositRepository } from './deposit.repository';
import { DepositService } from './deposit.service';
import { ExchangeRateSyncService } from './exchange-rate-sync.service';
import { ExchangeRateRepository } from './exchange-rate.repository';
import { ExchangeRateService } from './exchange-rate.service';
import { WalletController } from './wallet.controller';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';

@Module({
  imports: [EmailModule],
  controllers: [WalletController],
  providers: [
    WalletService,
    WalletRepository,
    DepositService,
    DepositRepository,
    ExchangeRateService,
    ExchangeRateRepository,
    ExchangeRateSyncService,
    CurrencyConverterService,
  ],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}
