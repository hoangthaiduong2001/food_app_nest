import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGqlGuard } from './guards/throttler-gql.guard';
import { QueueName } from './constants/queue.constant';
import { JwtOrApiKeyGuard } from './guards/jwt-or-api-key.guard';
import { RolesGuard } from './guards/roles.guard';
import { DistributedLockService } from './services/distributed-lock.service';
import { HashingService } from './services/hashing.service';
import { IdempotencyService } from './services/idempotency.service';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import envConfig from './config';

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
    BullModule.forRoot({
      connection: { url: envConfig.REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    BullModule.registerQueue(
      { name: QueueName.EMAIL },
      { name: QueueName.INVENTORY_SYNC },
      { name: QueueName.REPORT_GEN },
    ),
  ],
  providers: [
    PrismaService,
    HashingService,
    TokenService,
    RedisService,
    TokenBlacklistService,
    IdempotencyService,
    DistributedLockService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: ThrottlerGqlGuard },
    { provide: APP_GUARD, useClass: JwtOrApiKeyGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    PrismaService,
    HashingService,
    TokenService,
    RedisService,
    TokenBlacklistService,
    IdempotencyService,
    DistributedLockService,
    BullModule,
  ],
})
export class ShareModule {}
