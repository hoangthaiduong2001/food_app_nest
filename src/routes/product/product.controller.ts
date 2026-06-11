import { RoleName } from '@/shared/constants/role.constant';
import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { Public } from '@/shared/decorator/public.decorator';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { HttpCacheInterceptor } from '@/shared/interceptor/http-cache.interceptor';
import { ApiError, ApiSuccess } from '@/shared/swagger/api-response.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateProductBodyDto,
  ListProductQueryDto,
  ListProductResDto,
  ProductResDto,
  UpdateProductBodyDto,
} from './product.dto';
import { ProductService } from './product.service';

@ApiTags('Product')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(60_000)
  @ApiOperation({ summary: 'List products (public, cursor pagination)' })
  @ApiSuccess(ListProductResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListProductResDto)
  list(@Query() query: ListProductQueryDto) {
    return this.productService.list(query);
  }

  @Public()
  @Get(':id')
  @UseInterceptors(HttpCacheInterceptor)
  @CacheKey('product-detail')
  @CacheTTL(300_000)
  @ApiOperation({ summary: 'Get product detail (public)' })
  @ApiSuccess(ProductResDto, { description: 'OK' })
  @ApiError(404, 'Product not found', 'Product not found')
  @SuccessMessage('OK')
  @ZodSerializerDto(ProductResDto)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id);
  }

  @Roles(RoleName.Admin)
  @Post()
  @AuthSwagger()
  @ApiOperation({ summary: 'Create product with variants (admin only)' })
  @ApiSuccess(ProductResDto, { description: 'Product created' })
  @ApiError(400, 'Brand/category not found', 'Brand not found')
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ApiError(409, 'Duplicate SKU', 'Sku already exists')
  @SuccessMessage('Product created')
  @ZodSerializerDto(ProductResDto)
  create(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreateProductBodyDto,
  ) {
    return this.productService.create(body, user.userId);
  }

  @Roles(RoleName.Admin)
  @Patch(':id')
  @AuthSwagger()
  @ApiOperation({ summary: 'Update product (admin only)' })
  @ApiSuccess(ProductResDto, { description: 'Product updated' })
  @ApiError(404, 'Product not found', 'Product not found')
  @SuccessMessage('Product updated')
  @ZodSerializerDto(ProductResDto)
  update(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductBodyDto,
  ) {
    return this.productService.update(id, body, user.userId);
  }

  @Roles(RoleName.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Soft delete product (admin only)' })
  @ApiError(404, 'Product not found', 'Product not found')
  @SuccessMessage('Product deleted')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.softDelete(id);
  }
}
