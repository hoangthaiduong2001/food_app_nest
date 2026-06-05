import { RedisService } from '@/shared/services/redis.service';
import { Injectable } from '@nestjs/common';

const CART_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class CartRepository {
  constructor(private readonly redisService: RedisService) {}

  private key(userId: number): string {
    return `cart:${userId}`;
  }

  async addItem(
    userId: number,
    variantId: number,
    quantity: number,
  ): Promise<number> {
    const key = this.key(userId);

    const newQty = await this.redisService.client.hincrby(
      key,
      String(variantId),
      quantity,
    );
    await this.redisService.client.expire(key, CART_TTL_SECONDS);
    return newQty;
  }

  async setItem(
    userId: number,
    variantId: number,
    quantity: number,
  ): Promise<void> {
    const key = this.key(userId);
    await this.redisService.client.hset(key, String(variantId), quantity);
    await this.redisService.client.expire(key, CART_TTL_SECONDS);
  }

  async removeItem(userId: number, variantId: number): Promise<void> {
    await this.redisService.client.hdel(this.key(userId), String(variantId));
  }

  async clear(userId: number): Promise<void> {
    await this.redisService.client.del(this.key(userId));
  }

  async getAll(userId: number): Promise<Map<number, number>> {
    const raw = await this.redisService.client.hgetall(this.key(userId));
    const map = new Map<number, number>();
    for (const [variantId, qty] of Object.entries(raw)) {
      map.set(Number(variantId), Number(qty));
    }
    return map;
  }

  async getQuantity(userId: number, variantId: number): Promise<number | null> {
    const v = await this.redisService.client.hget(
      this.key(userId),
      String(variantId),
    );
    return v === null ? null : Number(v);
  }
}
