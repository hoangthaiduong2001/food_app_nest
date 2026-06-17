import envConfig from '@/shared/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';

export function buildRedisOptions(url: string): RedisOptions {
  const parsed = new URL(url);
  const isTls = parsed.protocol === 'rediss:';
  const options: RedisOptions = {
    host: parsed.hostname,
    port: parseInt(parsed.port || (isTls ? '6380' : '6379'), 10),
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    tls: isTls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
  if (parsed.username) options.username = parsed.username;
  return options;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor() {
    this.client = new Redis(buildRedisOptions(envConfig.REDIS_URL));

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
