import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export const ApiSuccess = <TModel extends Type<unknown>>(
  model: TModel,
  options: { description?: string; isArray?: boolean } = {},
) => {
  const dataSchema = options.isArray
    ? { type: 'array' as const, items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: options.description ?? 'Success',
      schema: {
        properties: {
          type: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Success' },
          data: dataSchema,
          statusCode: { type: 'number', example: 200 },
        },
        required: ['type', 'message', 'data', 'statusCode'],
      },
    }),
  );
};

export const ApiError = (
  statusCode: number,
  description: string,
  exampleMessage?: string,
) =>
  applyDecorators(
    ApiResponse({
      status: statusCode,
      description,
      schema: {
        properties: {
          type: { type: 'string', example: 'error' },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: exampleMessage ?? description,
              },
              path: { type: 'string', example: 'email', nullable: true },
            },
            required: ['message'],
          },
          statusCode: { type: 'number', example: statusCode },
        },
        required: ['type', 'error', 'statusCode'],
      },
    }),
  );
