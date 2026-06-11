import { CACHE_KEY_METADATA, CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  protected override isRequestCacheable(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      method: string;
      headers: Record<string, string | undefined>;
    }>();

    if (req.headers['authorization']) return false;

    return req.method === 'GET';
  }

  protected override trackBy(context: ExecutionContext): string | undefined {
    const customKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    if (customKey) return customKey;

    const req = context.switchToHttp().getRequest<{
      url: string;
    }>();
    return req.url;
  }
}
