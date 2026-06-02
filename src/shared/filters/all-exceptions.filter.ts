import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../types/response.type';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorData: Record<string, unknown> = {
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'string') {
        errorData = { message: errorResponse };
      } else {
        const raw = errorResponse as Record<string, unknown>;
        const rawMessage = raw.message;

        errorData = {
          ...raw,
          message:
            typeof rawMessage === 'string'
              ? rawMessage
              : Array.isArray(rawMessage)
                ? 'Validation error'
                : 'Error',
        };
      }
    } else if (exception instanceof Error) {
      errorData = { message: exception.message };
    }

    const payload: ApiErrorResponse<Record<string, unknown>> = {
      type: 'error',
      error: errorData,
      statusCode,
    };

    response.status(statusCode).json(payload);
  }
}
