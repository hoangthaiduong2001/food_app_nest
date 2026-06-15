import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { SellerRepository } from './seller.repository';
import { AnalyticsRepository } from '../report/analytics.repository';
import { SellerAnalyticsQueryDto, SellerAnalyticsResDto } from '../report/report.dto';

@ApiTags('Seller — Analytics')
@Controller('sellers/me/analytics')
@AuthSwagger()
export class SellerAnalyticsController {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly analyticsRepository: AnalyticsRepository,
  ) {}

  @Get()
  @ApiOperation({
    summary: '[Seller] Dashboard analytics — doanh thu, đơn hàng, top products, settlements',
    description:
      'Mặc định 30 ngày gần nhất. granularity=day|week|month để nhóm biểu đồ doanh thu.',
  })
  @SuccessMessage('OK')
  @ZodSerializerDto(SellerAnalyticsResDto)
  async getAnalytics(
    @CurrentUser() user: ActiveUserData,
    @Query() query: SellerAnalyticsQueryDto,
  ) {
    const seller = await this.sellerRepository.findByUserId(user.userId);
    if (!seller) {
      throw new UnauthorizedException({ message: 'No seller account found' });
    }

    return this.analyticsRepository.getSellerAnalytics(
      seller.id,
      query.dateFrom,
      query.dateTo,
      query.granularity,
    );
  }
}
