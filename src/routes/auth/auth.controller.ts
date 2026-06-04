import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { Public } from '@/shared/decorator/public.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { LocalAuthGuard } from '@/shared/guards/local-auth.guard';
import { ApiError, ApiSuccess } from '@/shared/swagger/api-response.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { ApiKeyService } from './api-key.service';
import {
  CreateApiKeyBodyDto,
  CreateApiKeyResDto,
  ListApiKeyResDto,
  LoginBodyDto,
  LoginResDto,
  LogoutResDto,
  MeResDto,
  RefreshTokenBodyDto,
  RefreshTokenResDto,
  RegisterBodyDto,
  RegisterResDto,
  RevokeApiKeyResDto,
} from './auth.dto';
import { AuthService, ValidatedUser } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiSuccess(RegisterResDto, { description: 'Registered successfully' })
  @ApiError(400, 'Validation error', 'Passwords do not match')
  @ApiError(409, 'Conflict — duplicate field', 'Email already exists')
  @SuccessMessage('Registered successfully')
  @ZodSerializerDto(RegisterResDto)
  register(
    @Body() body: RegisterBodyDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    return this.authService.register({
      data: body,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      ip: ip ?? 'unknown',
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiSuccess(LoginResDto, { description: 'Login successful' })
  @ApiError(400, 'Validation error', 'Email required')
  @ApiError(401, 'Invalid credentials', 'Invalid email or password')
  @ApiError(403, 'Account blocked or inactive', 'Account has been blocked')
  @SuccessMessage('Login successful')
  @ZodSerializerDto(LoginResDto)
  login(
    @Body() _body: LoginBodyDto,
    @Req() req: Request & { user: ValidatedUser },
    @Ip() ip: string,
  ) {
    return this.authService.loginWithValidatedUser({
      user: req.user,
      userAgent: req.headers['user-agent'] ?? 'unknown',
      ip: ip ?? 'unknown',
    });
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh tokens (rotate). Old refresh token is invalidated.',
  })
  @ApiSuccess(RefreshTokenResDto, { description: 'Tokens refreshed' })
  @ApiError(400, 'Validation error', 'refreshToken required')
  @ApiError(
    401,
    'Invalid or revoked refresh token',
    'Refresh token has been revoked',
  )
  @ApiError(403, 'Account not active', 'Account is not active')
  @SuccessMessage('Tokens refreshed')
  @ZodSerializerDto(RefreshTokenResDto)
  refresh(@Body() body: RefreshTokenBodyDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({
    summary: 'Logout current device — revoke refresh + blacklist access token',
  })
  @ApiSuccess(LogoutResDto, { description: 'Logged out' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @SuccessMessage('Logged out')
  @ZodSerializerDto(LogoutResDto)
  logout(@CurrentUser() user: ActiveUserData) {
    if (
      user.source !== 'jwt' ||
      user.deviceId === undefined ||
      !user.accessTokenJti ||
      !user.accessTokenExp
    ) {
      throw new ForbiddenException({
        message: 'Logout just support JWT access token',
      });
    }

    return this.authService.logout({
      userId: user.userId,
      deviceId: user.deviceId,
      accessTokenJti: user.accessTokenJti,
      accessTokenExp: user.accessTokenExp,
    });
  }

  @Get('me')
  @AuthSwagger()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiSuccess(MeResDto, { description: 'Get information successfully' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @ApiError(404, 'User not found', 'User not found')
  @SuccessMessage('Get information successfully')
  @ZodSerializerDto(MeResDto)
  me(@CurrentUser() user: ActiveUserData) {
    return this.authService.getProfile(user.userId);
  }

  @Post('api-keys')
  @AuthSwagger()
  @ApiOperation({ summary: 'Create a new API key (one-time view raw key)' })
  @ApiSuccess(CreateApiKeyResDto, { description: 'API key created' })
  @ApiError(400, 'Validation error', 'Label required')
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @SuccessMessage('API key created')
  @ZodSerializerDto(CreateApiKeyResDto)
  createApiKey(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreateApiKeyBodyDto,
  ) {
    return this.apiKeyService.create({
      userId: user.userId,
      label: body.label,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });
  }

  @Get('api-keys')
  @AuthSwagger()
  @ApiOperation({ summary: 'List my API keys (no raw key returned)' })
  @ApiSuccess(ListApiKeyResDto, { description: 'OK' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @SuccessMessage('OK')
  @ZodSerializerDto(ListApiKeyResDto)
  listApiKeys(@CurrentUser() user: ActiveUserData) {
    return this.apiKeyService.list(user.userId);
  }

  @Delete('api-keys/:id')
  @AuthSwagger()
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiSuccess(RevokeApiKeyResDto, { description: 'API key revoked' })
  @ApiError(401, 'Missing or invalid token', 'Unauthorized')
  @SuccessMessage('API key revoked')
  @ZodSerializerDto(RevokeApiKeyResDto)
  revokeApiKey(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.apiKeyService.revoke(id, user.userId);
  }
}
