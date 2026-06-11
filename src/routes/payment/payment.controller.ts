import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { ApiSuccess } from '@/shared/swagger/api-response.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { CreatePaymentIntentBodyDto, PaymentIntentResDto } from './payment.dto';
import { PaymentService } from './payment.service';
import { Public } from '@/shared/decorator/public.decorator';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe/intent')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Tạo Stripe PaymentIntent cho order CREDIT_CARD' })
  @ApiSuccess(PaymentIntentResDto, { description: 'PaymentIntent created' })
  @SuccessMessage('PaymentIntent created')
  @ZodSerializerDto(PaymentIntentResDto)
  createIntent(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreatePaymentIntentBodyDto,
  ) {
    return this.paymentService.createPaymentIntent(user.userId, body.orderId);
  }

  /**
   * Webhook từ Stripe — phải nhận raw body để verify signature.
   * Route này được đánh dấu @Public() vì Stripe không gửi JWT.
   * Bảo mật qua webhook signature verification.
   */
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (internal)' })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    await this.paymentService.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }
}
