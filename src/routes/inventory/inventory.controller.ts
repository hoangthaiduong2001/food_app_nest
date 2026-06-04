import { RoleName } from '@/shared/constants/role.constant';
import { Public } from '@/shared/decorator/public.decorator';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import {
  ApiError,
  ApiSuccess,
} from '@/shared/swagger/api-response.decorator';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { ZodSerializerDto } from 'nestjs-zod';
import { InventoryService } from './inventory.service';
import {
  AdjustStockBodyDto,
  ReleaseStockBodyDto,
  ReserveStockBodyDto,
  StockResDto,
} from './inventory.dto';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Public()
  @Get(':variantId')
  @ApiOperation({ summary: 'Get current stock of a variant (public)' })
  @ApiSuccess(StockResDto, { description: 'OK' })
  @ApiError(404, 'Variant not found', 'Variant not found')
  @SuccessMessage('OK')
  @ZodSerializerDto(StockResDto)
  getStock(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.inventoryService.getStock(variantId);
  }

  @Roles(RoleName.Admin)
  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({
    summary: 'Reserve (decrement) stock with pessimistic lock',
  })
  @ApiSuccess(StockResDto, { description: 'Stock reserved' })
  @ApiError(404, 'Variant not found', 'Variant not found')
  @ApiError(409, 'Insufficient stock', 'Insufficient stock. Available: 0, requested: 1')
  @SuccessMessage('Stock reserved')
  @ZodSerializerDto(StockResDto)
  reserve(@Body() body: ReserveStockBodyDto) {
    return this.inventoryService.reserve(body.variantId, body.quantity);
  }

  @Roles(RoleName.Admin)
  @Post('release')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Release (increment) stock back' })
  @ApiSuccess(StockResDto, { description: 'Stock released' })
  @ApiError(404, 'Variant not found', 'Variant not found')
  @SuccessMessage('Stock released')
  @ZodSerializerDto(StockResDto)
  release(@Body() body: ReleaseStockBodyDto) {
    return this.inventoryService.release(body.variantId, body.quantity);
  }

  @Roles(RoleName.Admin)
  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Adjust stock by delta (admin only)' })
  @ApiSuccess(StockResDto, { description: 'Stock adjusted' })
  @ApiError(404, 'Variant not found', 'Variant not found')
  @ApiError(409, 'Would make stock negative', 'Adjustment would make stock negative')
  @SuccessMessage('Stock adjusted')
  @ZodSerializerDto(StockResDto)
  adjust(@Body() body: AdjustStockBodyDto) {
    return this.inventoryService.adjust(body.variantId, body.delta);
  }
}
