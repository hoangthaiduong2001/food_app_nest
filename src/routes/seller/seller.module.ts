import { PrismaProductRepository } from '@/routes/product/prisma-product.repository';
import { OrderModule } from '@/routes/order/order.module';
import { ReportModule } from '@/routes/report/report.module';
import { EmailModule } from '@/routes/email/email.module';
import { ShareModule } from '@/shared/share.module';
import { Module } from '@nestjs/common';
import { SellerApiKeyGuard } from './seller-api-key.guard';
import { SellerAnalyticsController } from './seller-analytics.controller';
import { SellerController } from './seller.controller';
import { SellerOrderController } from './seller-order.controller';
import { SellerProductController } from './seller-product.controller';
import { SellerRepository } from './seller.repository';
import { SellerService } from './seller.service';
import { SellerSettlementService } from './seller-settlement.service';

@Module({
  imports: [ShareModule, EmailModule, OrderModule, ReportModule],
  controllers: [
    SellerController,
    SellerProductController,
    SellerOrderController,
    SellerAnalyticsController,
  ],
  providers: [
    SellerService,
    SellerRepository,
    SellerApiKeyGuard,
    SellerSettlementService,
    PrismaProductRepository,
  ],
  exports: [SellerRepository, SellerApiKeyGuard],
})
export class SellerModule {}
