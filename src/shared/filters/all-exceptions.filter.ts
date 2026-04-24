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

    let message = 'Internal server error';
    let errorData: unknown = null;

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'string') {
        message = errorResponse;
        errorData = { detail: errorResponse };
      } else {
        const errorObject = errorResponse as Record<string, unknown>;

        if (typeof errorObject.message === 'string') {
          message = errorObject.message;
        } else if (Array.isArray(errorObject.message)) {
          message = 'Validation error';
        }

        errorData = errorObject;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorData = { detail: exception.message };
    }

    const payload: ApiErrorResponse<unknown> = {
      type: 'error',
      message,
      error: errorData,
      statusCode,
    };

    response.status(statusCode).json(payload);
  }
}
