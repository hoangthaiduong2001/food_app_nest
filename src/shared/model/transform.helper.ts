import z from 'zod';

export const isoDateTime = z.iso.datetime();

export const isoDateTimeNullable = z.iso.datetime().nullable();

export function toISO(date: Date): string;

export function toISO(date: Date | null): string | null;

export function toISO(date: Date | null): string | null {
  return date === null ? null : date.toISOString();
}
