import { RoleName } from '@/shared/constants/role.constant';
import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { Public } from '@/shared/decorator/public.decorator';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import {
  ApiError,
  ApiSuccess,
} from '@/shared/swagger/api-response.decorator';
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
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { ZodSerializerDto } from 'nestjs-zod';
import { BrandService } from './brand.service';
import {
  BrandResDto,
  CreateBrandBodyDto,
  ListBrandResDto,
  UpdateBrandBodyDto,
} from './brand.dto';

@ApiTags('Brand')
@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all brands (public)' })
  @ApiSuccess(ListBrandResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListBrandResDto)
  list() {
    return this.brandService.list();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get brand by id (public)' })
  @ApiSuccess(BrandResDto, { description: 'OK' })
  @ApiError(404, 'Brand not found', 'Brand not found')
  @SuccessMessage('OK')
  @ZodSerializerDto(BrandResDto)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.brandService.findById(id);
  }

  @Roles(RoleName.Admin)
  @Post()
  @AuthSwagger()
  @ApiOperation({ summary: 'Create a new brand (admin only)' })
  @ApiSuccess(BrandResDto, { description: 'Brand created' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @SuccessMessage('Brand created')
  @ZodSerializerDto(BrandResDto)
  create(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreateBrandBodyDto,
  ) {
    return this.brandService.create(body, user.userId);
  }

  @Roles(RoleName.Admin)
  @Patch(':id')
  @AuthSwagger()
  @ApiOperation({ summary: 'Update a brand (admin only)' })
  @ApiSuccess(BrandResDto, { description: 'Brand updated' })
  @ApiError(404, 'Brand not found', 'Brand not found')
  @SuccessMessage('Brand updated')
  @ZodSerializerDto(BrandResDto)
  update(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBrandBodyDto,
  ) {
    return this.brandService.update(id, body, user.userId);
  }

  @Roles(RoleName.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Soft delete a brand (admin only)' })
  @ApiError(404, 'Brand not found', 'Brand not found')
  @SuccessMessage('Brand deleted')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.brandService.softDelete(id);
  }
}
