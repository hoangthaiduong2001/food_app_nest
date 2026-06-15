import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { SellerRepository } from './seller.repository';

export const SELLER_KEY = 'seller';

// Timestamp lệch quá 5 phút → reject (chống replay attack)
const MAX_DRIFT_MS = 5 * 60 * 1000;

/**
 * Seller gửi 3 header mỗi request:
 *   X-Api-Key:   <apiKey>          — public identifier
 *   X-Timestamp: <unix-ms>         — chống replay
 *   X-Signature: HMAC-SHA256(secretKey, "<timestamp>:<METHOD>:<path>")
 *
 * secretKey được lưu trong DB dưới dạng SHA-256(rawSecret) để có thể
 * tính lại HMAC phía server mà không cần bcrypt (one-way hash không dùng được với HMAC).
 * rawSecret chỉ được trả về 1 lần khi register — sau đó không thể xem lại.
 */
@Injectable()
export class SellerApiKeyGuard implements CanActivate {
  constructor(private readonly sellerRepository: SellerRepository) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const apiKey = req.headers['x-api-key'] as string | undefined;
    const timestamp = req.headers['x-timestamp'] as string | undefined;
    const signature = req.headers['x-signature'] as string | undefined;

    if (!apiKey || !timestamp || !signature) {
      throw new UnauthorizedException({
        message: 'Missing seller auth headers: X-Api-Key, X-Timestamp, X-Signature',
      });
    }

    const ts = Number(timestamp);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > MAX_DRIFT_MS) {
      throw new UnauthorizedException({ message: 'Timestamp expired or invalid' });
    }

    const seller = await this.sellerRepository.findByApiKey(apiKey);
    if (!seller) {
      throw new UnauthorizedException({ message: 'Invalid API key or seller not approved' });
    }

    const payload = `${timestamp}:${req.method.toUpperCase()}:${req.path}`;
    // secretKeyHash lưu raw secret key (xem lý do ở seller.service.ts)
    const expected = createHmac('sha256', seller.secretKeyHash).update(payload).digest('hex');

    let valid = false;
    try {
      valid = timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      valid = false;
    }

    if (!valid) {
      throw new UnauthorizedException({ message: 'Invalid signature' });
    }

    (req as any)[SELLER_KEY] = seller;
    return true;
  }
}
