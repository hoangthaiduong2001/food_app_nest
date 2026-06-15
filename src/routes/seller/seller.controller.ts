import { RoleName } from '@/shared/constants/role.constant';
import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { Public } from '@/shared/decorator/public.decorator';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentSeller } from './current-seller.decorator';
import { SellerApiKeyGuard } from './seller-api-key.guard';
import {
  ActivateSellerBodyDto,
  ApproveSellerBodyDto,
  ListSellerQueryDto,
  RejectSellerBodyDto,
  RegisterSellerBodyDto,
  SellerResDto,
} from './seller.dto';
import { SellerService } from './seller.service';
import type { RawSeller } from './seller.repository';

@ApiTags('Seller')
@Controller('sellers')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  /**
   * Bất kỳ user đã đăng nhập đều có thể đăng ký làm seller.
   * Trả về apiKey + secretKey 1 lần duy nhất — lưu lại ngay.
   */
  @Post('register')
  @AuthSwagger()
  @ApiOperation({ summary: 'Register as a seller (authenticated users only)' })
  @SuccessMessage('Seller registered. Save your secretKey — it will not be shown again.')
  @ZodSerializerDto(SellerResDto)
  register(
    @CurrentUser() user: ActiveUserData,
    @Body() body: RegisterSellerBodyDto,
  ) {
    return this.sellerService.register(user.userId, body);
  }

  /**
   * Seller dùng activation token nhận qua email để chuyển account từ APPROVED → ACTIVE.
   * Public endpoint — không cần JWT, token đủ để xác minh.
   */
  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate seller account using token received via email' })
  @SuccessMessage('Seller account activated successfully')
  @ZodSerializerDto(SellerResDto)
  activate(@Body() body: ActivateSellerBodyDto) {
    return this.sellerService.activate(body);
  }

  /**
   * Seller xem thông tin account của mình.
   * Dùng JWT auth (user đã login) — không cần HMAC.
   */
  @Get('me')
  @AuthSwagger()
  @ApiOperation({ summary: 'Get my seller account info' })
  @SuccessMessage('OK')
  @ZodSerializerDto(SellerResDto)
  getMe(@CurrentUser() user: ActiveUserData) {
    return this.sellerService.getMe(user.userId);
  }

  /**
   * Seller verify HMAC — dùng để test credentials hoặc health check.
   */
  @Get('me/verify')
  @UseGuards(SellerApiKeyGuard)
  @ApiOperation({ summary: 'Verify seller API key + HMAC signature' })
  @SuccessMessage('Credentials valid')
  @ZodSerializerDto(SellerResDto)
  verifyCredentials(@CurrentSeller() seller: RawSeller) {
    // Guard đã verify, chỉ cần trả lại thông tin
    return this.sellerService.getMe(seller.userId);
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────

  @Get()
  @Roles(RoleName.Admin)
  @AuthSwagger()
  @ApiOperation({ summary: '[Admin] List sellers with filter by status' })
  @SuccessMessage('OK')
  list(@Query() query: ListSellerQueryDto) {
    return this.sellerService.list(query);
  }

  @Public()
  @Get(':id/filters')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get categories and brands of a seller (public)' })
  @SuccessMessage('OK')
  getFilters(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.getFilters(id);
  }

  @Get(':id')
  @Roles(RoleName.Admin)
  @AuthSwagger()
  @ApiOperation({ summary: '[Admin] Get seller detail' })
  @SuccessMessage('OK')
  @ZodSerializerDto(SellerResDto)
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.getById(id);
  }

  @Patch(':id/approve')
  @Roles(RoleName.Admin)
  @AuthSwagger()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Approve seller registration' })
  @SuccessMessage('Seller approved')
  @ZodSerializerDto(SellerResDto)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: ActiveUserData,
    @Body() body: ApproveSellerBodyDto,
  ) {
    return this.sellerService.approve(id, admin.userId, body);
  }

  @Patch(':id/reject')
  @Roles(RoleName.Admin)
  @AuthSwagger()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Reject seller registration' })
  @SuccessMessage('Seller rejected')
  @ZodSerializerDto(SellerResDto)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: ActiveUserData,
    @Body() body: RejectSellerBodyDto,
  ) {
    return this.sellerService.reject(id, admin.userId, body);
  }

  @Patch(':id/suspend')
  @Roles(RoleName.Admin)
  @AuthSwagger()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Suspend an approved seller' })
  @SuccessMessage('Seller suspended')
  @ZodSerializerDto(SellerResDto)
  suspend(@Param('id', ParseIntPipe) id: number) {
    return this.sellerService.suspend(id);
  }
}
