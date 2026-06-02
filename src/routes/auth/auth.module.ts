import { ShareRoleRepository } from '@/shared/repositories/share-role.repo';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApiKeyRepository } from './api-key.repository';
import { ApiKeyService } from './api-key.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    ShareRoleRepository,
    ApiKeyService,
    ApiKeyRepository,
    LocalStrategy,
    ApiKeyStrategy,
  ],
})
export class AuthModule {}
