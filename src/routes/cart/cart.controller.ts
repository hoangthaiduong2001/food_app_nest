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
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CartService } from './cart.service';
import {
  AddToCartBodyDto,
  CartResDto,
  UpdateCartItemBodyDto,
} from './cart.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @AuthSwagger()
  @ApiOperation({ summary: 'Get my cart (enriched with product info)' })
  @ApiSuccess(CartResDto, { description: 'OK' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @SuccessMessage('OK')
  @ZodSerializerDto(CartResDto)
  getCart(@CurrentUser() user: ActiveUserData) {
    return this.cartService.getCart(user.userId);
  }

  @Post('items')
  @AuthSwagger()
  @ApiOperation({ summary: 'Add a variant to cart (accumulates quantity)' })
  @ApiSuccess(CartResDto, { description: 'Added' })
  @ApiError(404, 'Variant not found', 'Variant not found or inactive')
  @ApiError(409, 'Insufficient stock', 'Insufficient stock')
  @SuccessMessage('Added to cart')
  @ZodSerializerDto(CartResDto)
  addToCart(
    @CurrentUser() user: ActiveUserData,
    @Body() body: AddToCartBodyDto,
  ) {
    return this.cartService.addToCart(user.userId, body.variantId, body.quantity);
  }

  @Patch('items/:variantId')
  @AuthSwagger()
  @ApiOperation({ summary: 'Set quantity for a cart item' })
  @ApiSuccess(CartResDto, { description: 'Updated' })
  @ApiError(404, 'Item not in cart', 'Item not in cart')
  @ApiError(409, 'Insufficient stock', 'Insufficient stock')
  @SuccessMessage('Cart updated')
  @ZodSerializerDto(CartResDto)
  updateItem(
    @CurrentUser() user: ActiveUserData,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() body: UpdateCartItemBodyDto,
  ) {
    return this.cartService.updateItem(user.userId, variantId, body.quantity);
  }

  @Delete('items/:variantId')
  @AuthSwagger()
  @ApiOperation({ summary: 'Remove an item from cart' })
  @ApiSuccess(CartResDto, { description: 'Removed' })
  @ApiError(400, 'Item not in cart', 'Item not in cart')
  @SuccessMessage('Item removed')
  @ZodSerializerDto(CartResDto)
  removeItem(
    @CurrentUser() user: ActiveUserData,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    return this.cartService.removeItem(user.userId, variantId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiSuccess(CartResDto, { description: 'Cleared' })
  @SuccessMessage('Cart cleared')
  @ZodSerializerDto(CartResDto)
  clearCart(@CurrentUser() user: ActiveUserData) {
    return this.cartService.clearCart(user.userId);
  }
}
