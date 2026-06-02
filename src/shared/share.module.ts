import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtOrApiKeyGuard } from './guards/jwt-or-api-key.guard';
import { RolesGuard } from './guards/roles.guard';
import { HashingService } from './services/hashing.service';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    JwtModule,
    PassportModule,
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(redisService.client),
      }),
    }),
  ],
  providers: [
    PrismaService,
    HashingService,
    TokenService,
    RedisService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtOrApiKeyGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PrismaService, HashingService, TokenService, RedisService],
})
export class ShareModule {}
