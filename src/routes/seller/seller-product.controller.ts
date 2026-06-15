import { handlePrismaError } from '@/shared/utils/prisma-error.util';
import { PrismaService } from '@/shared/services/prisma.service';
import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { SellerRepository } from './seller.repository';
import {
  CreateProductBodyDto,
  ListProductQueryDto,
  ListProductResDto,
  ProductResDto,
  UpdateProductBodyDto,
} from '../product/product.dto';
import { PrismaProductRepository } from '../product/prisma-product.repository';

/**
 * Seller product routes — require JWT (global guard).
 * Seller chỉ có thể CRUD product của chính mình (sellerId match).
 */
@ApiTags('Seller — Products')
@Controller('sellers/me/products')
export class SellerProductController {
  constructor(
    private readonly productRepository: PrismaProductRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveSeller(userId: number) {
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) throw new UnauthorizedException({ message: 'No seller account found' });
    return seller;
  }

  @Get()
  @ApiOperation({ summary: '[Seller] List my products' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListProductResDto)
  async list(@CurrentUser() user: ActiveUserData, @Query() query: ListProductQueryDto) {
    const seller = await this.resolveSeller(user.userId);
    return this.productRepository.list({ ...query, sellerId: seller.id });
  }

  @Get(':id')
  @ApiOperation({ summary: '[Seller] Get one of my products' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ProductResDto)
  async findOne(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const seller = await this.resolveSeller(user.userId);
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException({ message: 'Product not found' });
    if (product.sellerId !== seller.id) throw new ForbiddenException({ message: 'Not your product' });
    return product;
  }

  @Post()
  @ApiOperation({ summary: '[Seller] Create a product' })
  @SuccessMessage('Product created')
  @ZodSerializerDto(ProductResDto)
  async create(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreateProductBodyDto,
  ) {
    const seller = await this.resolveSeller(user.userId);

    if (body.brandId) {
      const brand = await this.prisma.brand.findFirst({ where: { id: body.brandId, deletedAt: null } });
      if (!brand) throw new NotFoundException({ message: 'Brand not found', path: 'brandId' });
    }

    try {
      return await this.productRepository.create({
        ...body,
        sellerId: seller.id,
        createdById: seller.userId,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Seller] Update my product' })
  @SuccessMessage('Product updated')
  @ZodSerializerDto(ProductResDto)
  async update(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductBodyDto,
  ) {
    const seller = await this.resolveSeller(user.userId);
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException({ message: 'Product not found' });
    if (product.sellerId !== seller.id) throw new ForbiddenException({ message: 'Not your product' });

    try {
      return await this.productRepository.update(id, {
        ...body,
        updatedById: seller.userId,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Seller] Soft delete my product' })
  @SuccessMessage('Product deleted')
  async remove(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const seller = await this.resolveSeller(user.userId);
    const product = await this.productRepository.findById(id);
    if (!product) throw new NotFoundException({ message: 'Product not found' });
    if (product.sellerId !== seller.id) throw new ForbiddenException({ message: 'Not your product' });

    const result = await this.productRepository.softDelete(id);
    return { deleted: result.count > 0 };
  }
}
