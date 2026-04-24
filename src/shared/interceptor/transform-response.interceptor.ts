import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SUCCESS_MESSAGE_KEY } from '../decorator/success-message.decorator';
import { ApiSuccessResponse } from '../types/response.type';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T | null>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T | null>> {
    if (context.getType() !== 'http') {
      return next.handle() as Observable<ApiSuccessResponse<T | null>>;
    }

    const http = context.switchToHttp();
    const response = http.getResponse<{ statusCode: number }>();

    const successMessage =
      this.reflector.getAllAndOverride<string>(SUCCESS_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Success';

    return next.handle().pipe(
      map((data) => ({
        type: 'success' as const,
        message: successMessage,
        data: data ?? null,
        statusCode: response.statusCode,
      })),
    );
  }
}
