import { RoleName } from '@/shared/constants/role.constant';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { AdminDashboardQueryDto, AdminDashboardResDto } from './report.dto';
import { AnalyticsRepository } from './analytics.repository';

@ApiTags('Admin — Dashboard')
@Controller('admin/dashboard')
@Roles(RoleName.Admin)
@AuthSwagger()
export class AdminDashboardController {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  @Get()
  @ApiOperation({
    summary: '[Admin] Dashboard tổng quan — doanh thu, đơn hàng, users, sellers',
    description:
      'Mặc định 30 ngày gần nhất. Truyền dateFrom/dateTo để chọn kỳ. ' +
      'Growth % so sánh với kỳ trước cùng độ dài.',
  })
  @SuccessMessage('OK')
  @ZodSerializerDto(AdminDashboardResDto)
  getDashboard(@Query() query: AdminDashboardQueryDto) {
    return this.analyticsRepository.getAdminDashboard(query.dateFrom, query.dateTo);
  }
}
