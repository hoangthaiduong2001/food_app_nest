import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
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
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { SellerRepository } from './seller.repository';
import {
  ListOrderQueryDto,
  ListOrderResDto,
  OrderResDto,
  UpdateOrderStatusBodyDto,
} from '../order/order.dto';
import { OrderService } from '../order/order.service';

/**
 * Seller order routes — require JWT (global guard).
 * Seller chỉ thấy và thao tác orders có sellerId match.
 */
@ApiTags('Seller — Orders')
@Controller('sellers/me/orders')
export class SellerOrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly sellerRepository: SellerRepository,
  ) {}

  private async resolveSeller(userId: number) {
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) throw new UnauthorizedException({ message: 'No seller account found' });
    return seller;
  }

  @Get()
  @ApiOperation({ summary: '[Seller] List my orders' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListOrderResDto)
  async list(@CurrentUser() user: ActiveUserData, @Query() query: ListOrderQueryDto) {
    const seller = await this.resolveSeller(user.userId);
    return this.orderService.listForSeller(seller.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Seller] Get order detail' })
  @SuccessMessage('OK')
  @ZodSerializerDto(OrderResDto)
  async findOne(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const seller = await this.resolveSeller(user.userId);
    return this.orderService.getOrderForSeller(id, seller.id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Seller] Update order delivery status' })
  @SuccessMessage('Order status updated')
  @ZodSerializerDto(OrderResDto)
  async updateStatus(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrderStatusBodyDto,
  ) {
    const seller = await this.resolveSeller(user.userId);
    return this.orderService.updateStatusForSeller(id, seller.id, body.status, seller.userId);
  }
}
