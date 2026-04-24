import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { capitalizeFirstLetter } from './format.util';

export function handlePrismaError(error: unknown): never {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const raw = error.meta?.target;
        let fields: string[] = Array.isArray(raw)
          ? raw
          : typeof raw === 'string'
            ? [raw]
            : [];

        if (fields.length === 0 && error.message) {
          const match = error.message.match(
            /Unique constraint failed on the fields: \([`"](.+?)[`"]\)/,
          );
          if (match) {
            fields = match[1]
              .split(/[`"]\s*,\s*[`"]/g)
              .map((f) => f.replace(/^[`"]|[`"]$/g, ''));
          }
        }

        const field = fields[0] ?? 'unknown';
        throw new ConflictException({
          message: `${capitalizeFirstLetter(field)} already exists`,
          path: field,
        });
      }

      case 'P2003': {
        const field = (error.meta?.field_name as string) ?? 'unknown';
        throw new BadRequestException({
          message: `Related record not found for field: ${field}`,
          path: field,
        });
      }
    }
  }

  throw error;
}
