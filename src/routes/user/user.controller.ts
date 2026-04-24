import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { CreateUserBodyDto, CreateUserResDto } from './user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @SuccessMessage('Created user successfully')
  @ZodSerializerDto(CreateUserResDto)
  create(@Body() body: CreateUserBodyDto) {
    return this.userService.create({
      data: body,
    });
  }
}
