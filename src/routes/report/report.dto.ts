import { createZodDto } from 'nestjs-zod';
import {
  AdminDashboardQuerySchema,
  AdminDashboardResSchema,
  SellerAnalyticsQuerySchema,
  SellerAnalyticsResSchema,
} from './report.model';

export class AdminDashboardQueryDto extends createZodDto(AdminDashboardQuerySchema) {}
export class AdminDashboardResDto extends createZodDto(AdminDashboardResSchema) {}
export class SellerAnalyticsQueryDto extends createZodDto(SellerAnalyticsQuerySchema) {}
export class SellerAnalyticsResDto extends createZodDto(SellerAnalyticsResSchema) {}
