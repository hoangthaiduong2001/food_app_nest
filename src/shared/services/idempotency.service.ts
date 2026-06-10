import { RedisService } from '@/shared/services/redis.service';
import { Injectable } from '@nestjs/common';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/**
 * Idempotency: đảm bảo 1 request (theo key) chỉ xử lý 1 lần.
 * Dùng cho checkout — chống double-click / client retry tạo order trùng.
 *
 * Cơ chế:
 *  - reserve(key): SET NX (set nếu chưa tồn tại). Trả false nếu key đã có.
 *  - saveResult(key, result): lưu response để trả lại nếu request lặp.
 *  - getResult(key): lấy response đã lưu.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly redisService: RedisService) {}

  private key(scope: string, idempotencyKey: string): string {
    return `idem:${scope}:${idempotencyKey}`;
  }

  /**
   * Cố "chiếm chỗ" key. Trả true nếu chiếm được (request mới),
   * false nếu key đã tồn tại (request lặp lại).
   */
  async reserve(scope: string, idempotencyKey: string): Promise<boolean> {
    const result = await this.redisService.client.set(
      this.key(scope, idempotencyKey),
      'PROCESSING',
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
      'NX', // chỉ set nếu chưa tồn tại
    );
    return result === 'OK';
  }

  /** Lưu kết quả (JSON) để request lặp sau lấy lại. */
  async saveResult<T>(
    scope: string,
    idempotencyKey: string,
    result: T,
  ): Promise<void> {
    await this.redisService.client.set(
      this.key(scope, idempotencyKey),
      JSON.stringify({ status: 'DONE', result }),
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
    );
  }

  /**
   * Lấy kết quả đã lưu.
   * - null: chưa có key (request mới hoàn toàn)
   * - { processing: true }: đang xử lý (request đang chạy song song)
   * - { result }: đã xong, trả lại result cũ
   */
  async getResult<T>(
    scope: string,
    idempotencyKey: string,
  ): Promise<{ processing: boolean; result?: T } | null> {
    const raw = await this.redisService.client.get(
      this.key(scope, idempotencyKey),
    );
    if (raw === null) return null;
    if (raw === 'PROCESSING') return { processing: true };
    try {
      const parsed = JSON.parse(raw) as { status: string; result: T };
      return { processing: false, result: parsed.result };
    } catch {
      return { processing: true };
    }
  }

  /** Xoá key (dùng khi xử lý fail → cho phép retry). */
  async release(scope: string, idempotencyKey: string): Promise<void> {
    await this.redisService.client.del(this.key(scope, idempotencyKey));
  }
}
