import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import {
  ApiError,
  ApiSuccess,
} from '@/shared/swagger/api-response.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { OrderService } from './order.service';
import {
  CheckoutBodyDto,
  ListOrderQueryDto,
  ListOrderResDto,
  OrderResDto,
  UpdateOrderStatusBodyDto,
} from './order.dto';

@ApiTags('Order')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @AuthSwagger()
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key to prevent duplicate orders (UUID recommended)',
    required: true,
  })
  @ApiOperation({
    summary: 'Checkout: create order from cart (validate → reserve → create)',
  })
  @ApiSuccess(OrderResDto, { description: 'Order created' })
  @ApiError(400, 'Cart empty / missing Idempotency-Key', 'Cart is empty')
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(409, 'Insufficient stock / duplicate checkout', 'Insufficient stock')
  @SuccessMessage('Order created')
  @ZodSerializerDto(OrderResDto)
  checkout(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CheckoutBodyDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ) {
    return this.orderService.checkout(user.userId, body, idempotencyKey);
  }

  @Get()
  @AuthSwagger()
  @ApiOperation({
    summary:
      'List orders — user: own orders; admin: all with filters (status, search, dateFrom, dateTo, userId)',
  })
  @ApiSuccess(ListOrderResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListOrderResDto)
  list(
    @CurrentUser() user: ActiveUserData,
    @Query() query: ListOrderQueryDto,
  ) {
    return this.orderService.list(query, {
      userId: user.userId,
      roleName: user.roleName,
    });
  }

  @Get(':id')
  @AuthSwagger()
  @ApiOperation({ summary: 'Get order detail (own or admin)' })
  @ApiSuccess(OrderResDto, { description: 'OK' })
  @ApiError(404, 'Order not found', 'Order not found')
  @SuccessMessage('OK')
  @ZodSerializerDto(OrderResDto)
  getOne(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getOrderForUser(id, {
      userId: user.userId,
      roleName: user.roleName,
    });
  }

  @Get(':id/invoice')
  @AuthSwagger()
  @ApiOperation({ summary: 'Download invoice PDF for a delivered order' })
  async downloadInvoice(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const pdf = await this.orderService.generateInvoicePdf(id, {
      userId: user.userId,
      roleName: user.roleName,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-order-${id}.pdf"`);
    res.end(pdf);
  }

  @Patch(':id/status')
  @AuthSwagger()
  @ApiOperation({
    summary:
      'Update order status (admin: any valid transition, user: cancel own pending order)',
  })
  @ApiSuccess(OrderResDto, { description: 'Status updated' })
  @ApiError(403, 'Not allowed', 'You can only cancel your order')
  @ApiError(404, 'Order not found', 'Order not found')
  @ApiError(409, 'Invalid transition', 'Cannot transition from X to Y')
  @SuccessMessage('Order status updated')
  @ZodSerializerDto(OrderResDto)
  updateStatus(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrderStatusBodyDto,
  ) {
    return this.orderService.updateStatus(id, body.status, {
      userId: user.userId,
      roleName: user.roleName,
    });
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({
    summary: 'Pay order with wallet balance (PENDING_PAYMENT → PENDING_PICKUP)',
  })
  @ApiSuccess(OrderResDto, { description: 'Order paid' })
  @ApiError(404, 'Order not found', 'Order not found')
  @ApiError(409, 'Insufficient balance / invalid state', 'Insufficient balance')
  @SuccessMessage('Order paid')
  @ZodSerializerDto(OrderResDto)
  pay(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.payOrder(id, { userId: user.userId });
  }
}
