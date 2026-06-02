import envConfig from '@/shared/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor() {
    this.client = new Redis(envConfig.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) =>
      this.logger.error('Redis error', err.stack),
    );
  }

  async onModuleInit() {
    try {
      await this.client.ping();
    } catch (err) {
      this.logger.error('Redis ping failed at startup', err as Error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
