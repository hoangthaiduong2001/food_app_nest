import { RedisService } from '@/shared/services/redis.service';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

const DEFAULT_TTL_MS = 10_000;

/**
 * Distributed Lock qua Redis (SET NX + TTL).
 *
 * Khác Idempotency:
 *  - Idempotency: chống RETRY cùng 1 request (theo key client gửi).
 *  - Distributed lock: chống 2 request KHÁC NHAU thao tác cùng resource đồng thời
 *    (vd 1 user checkout từ 2 tab → 2 idempotency-key khác nhau nhưng cùng userId).
 *
 * Cơ chế:
 *  - acquire: SET lock:{key} {token} NX EX → chỉ 1 process chiếm được.
 *  - release: chỉ xoá nếu token khớp (tránh xoá nhầm lock của process khác
 *    đã chiếm sau khi lock cũ hết hạn) → dùng Lua script atomic.
 */
@Injectable()
export class DistributedLockService {
  constructor(private readonly redisService: RedisService) {}

  private key(resource: string): string {
    return `lock:${resource}`;
  }

  /**
   * Chiếm lock. Trả về token nếu thành công, null nếu resource đang bị lock.
   */
  async acquire(
    resource: string,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redisService.client.set(
      this.key(resource),
      token,
      'PX',
      ttlMs,
      'NX',
    );
    return result === 'OK' ? token : null;
  }

  /**
   * Nhả lock — chỉ xoá nếu token khớp (an toàn với TTL expiry).
   */
  async release(resource: string, token: string): Promise<void> {
    // Lua: chỉ DEL nếu value == token → atomic compare-and-delete
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redisService.client.eval(lua, 1, this.key(resource), token);
  }

  /**
   * Helper: chạy fn trong lock. Tự acquire + release.
   * Throw nếu không chiếm được lock (resource đang bận).
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttlMs = DEFAULT_TTL_MS,
  ): Promise<T> {
    const token = await this.acquire(resource, ttlMs);
    if (!token) {
      throw new LockBusyError(resource);
    }
    try {
      return await fn();
    } finally {
      await this.release(resource, token);
    }
  }
}

/** Ném khi resource đang bị lock bởi request khác. */
export class LockBusyError extends Error {
  constructor(public readonly resource: string) {
    super(`Resource is locked: ${resource}`);
    this.name = 'LockBusyError';
  }
}
