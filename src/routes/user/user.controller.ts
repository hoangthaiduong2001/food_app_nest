import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { RoleName } from '@/shared/constants/role.constant';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  ApiError,
  ApiSuccess,
} from '@/shared/swagger/api-response.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateUserBodyDto,
  CreateUserResDto,
  GetUserResDto,
  GetUsersQueryDto,
  GetUsersResDto,
  UpdateUserBodyDto,
  UpdateUserResDto,
} from './user.dto';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(RoleName.Admin)
  @Get()
  @AuthSwagger()
  @ApiOperation({ summary: 'List users with pagination (admin only)' })
  @ApiSuccess(GetUsersResDto, { description: 'User list' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ZodSerializerDto(GetUsersResDto)
  list(@Query() query: GetUsersQueryDto) {
    return this.userService.list(query);
  }

  @Roles(RoleName.Admin)
  @Get(':id')
  @AuthSwagger()
  @ApiOperation({ summary: 'Get user by id (admin only)' })
  @ApiSuccess(GetUserResDto, { description: 'User detail' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ApiError(404, 'User not found', 'Not Found')
  @ZodSerializerDto(GetUserResDto)
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getById(id);
  }

  @Roles(RoleName.Admin)
  @Post()
  @AuthSwagger()
  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiSuccess(CreateUserResDto, { description: 'User created successfully' })
  @ApiError(400, 'Validation error', 'Email required')
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ApiError(409, 'Conflict — duplicate field', 'Email already exists')
  @SuccessMessage('Created user successfully')
  @ZodSerializerDto(CreateUserResDto)
  create(@Body() body: CreateUserBodyDto) {
    return this.userService.create({ data: body });
  }

  @Roles(RoleName.Admin)
  @Put(':id')
  @AuthSwagger()
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiSuccess(UpdateUserResDto, { description: 'User updated successfully' })
  @ApiError(400, 'Validation error', 'Invalid roleId')
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ApiError(404, 'User not found', 'Not Found')
  @ApiError(409, 'Conflict — duplicate field', 'Phone already exists')
  @SuccessMessage('Updated user successfully')
  @ZodSerializerDto(UpdateUserResDto)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserBodyDto,
    @CurrentUser() user: ActiveUserData,
  ) {
    return this.userService.update({
      id,
      data: body,
      roleNameAgent: user.roleName,
    });
  }

  @Roles(RoleName.Admin)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthSwagger()
  @ApiOperation({ summary: 'Delete user (soft delete, admin only)' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(403, 'Forbidden — requires ADMIN role', 'Requires role: ADMIN')
  @ApiError(404, 'User not found', 'Not Found')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }
}
