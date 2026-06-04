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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { ZodSerializerDto } from 'nestjs-zod';
import { CategoryService } from './category.service';
import {
  CategoryResDto,
  CreateCategoryBodyDto,
  ListCategoryQueryDto,
  ListCategoryResDto,
  UpdateCategoryBodyDto,
} from './category.dto';

@ApiTags('Category')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List categories (public). Filter ?parentId=null for roots.',
  })
  @ApiSuccess(ListCategoryResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListCategoryResDto)
  list(@Query() query: ListCategoryQueryDto) {
    return this.categoryService.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category by id (public)' })
  @ApiSuccess(CategoryResDto, { description: 'OK' })
  @ApiError(404, 'Category not found', 'Category not found')
  @SuccessMessage('OK')
  @ZodSerializerDto(CategoryResDto)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findById(id);
  }

  @Roles(RoleName.Admin)
  @Post()
  @AuthSwagger()
  @ApiOperation({ summary: 'Create a new category (admin only)' })
  @ApiSuccess(CategoryResDto, { description: 'Category created' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ApiError(404, 'Parent category not found', 'Category not found')
  @SuccessMessage('Category created')
  @ZodSerializerDto(CategoryResDto)
  create(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreateCategoryBodyDto,
  ) {
    return this.categoryService.create(body, user.userId);
  }

  @Roles(RoleName.Admin)
  @Patch(':id')
  @AuthSwagger()
  @ApiOperation({ summary: 'Update a category (admin only)' })
  @ApiSuccess(CategoryResDto, { description: 'Category updated' })
  @ApiError(400, 'Category cannot be its own parent', 'Category cannot be its own parent')
  @ApiError(404, 'Category not found', 'Category not found')
  @SuccessMessage('Category updated')
  @ZodSerializerDto(CategoryResDto)
  update(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryBodyDto,
  ) {
    return this.categoryService.update(id, body, user.userId);
  }

  @Roles(RoleName.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Soft delete a category (admin only)' })
  @ApiError(404, 'Category not found', 'Category not found')
  @ApiError(409, 'Has children', 'Cannot delete category that has children')
  @SuccessMessage('Category deleted')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.softDelete(id);
  }
}
