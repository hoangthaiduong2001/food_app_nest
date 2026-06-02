import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import { ZodError } from 'zod';

const ZodValidationPipeClass = createZodValidationPipe({
  // strictSchemaDeclaration: true ép MỌI param phải có Zod DTO, kể cả param từ
  // custom decorator (vd @CurrentUser()). Tắt để param không-Zod pass thẳng;
  // các route có @Body()/@Query() với Zod DTO vẫn validate đầy đủ vì pipe
  // tự nhận diện class kế thừa createZodDto.
  strictSchemaDeclaration: false,
  createValidationException: (error) => {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const path = firstIssue?.path?.join('.') ?? '';
      const invalidTypeIssue = firstIssue as {
        code?: string;
        expected?: string;
        received?: string;
      };
      const isMissingValue =
        invalidTypeIssue?.code === 'invalid_type' &&
        invalidTypeIssue?.received === 'undefined';

      const message = (() => {
        if (!path) return firstIssue?.message ?? 'Validation error';

        if (isMissingValue) {
          return `${path[0].toUpperCase()}${path.slice(1)} required`;
        }

        if (invalidTypeIssue?.code === 'invalid_type') {
          if (invalidTypeIssue.expected === 'number') {
            return `${path[0].toUpperCase()}${path.slice(1)} must be a number`;
          }
        }

        return firstIssue?.message ?? 'Validation error';
      })();

      return new BadRequestException({ message, path });
    }

    return new BadRequestException({
      message: 'Validation error',
      path: '',
    });
  },
});

export const zodValidationPipe = new ZodValidationPipeClass();
