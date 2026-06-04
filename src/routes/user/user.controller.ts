import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { RoleName } from '@/shared/constants/role.constant';
import {
  ApiError,
  ApiSuccess,
} from '@/shared/swagger/api-response.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { ZodSerializerDto } from 'nestjs-zod';
import { CreateUserBodyDto, CreateUserResDto } from './user.dto';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
    return this.userService.create({
      data: body,
    });
  }
}
