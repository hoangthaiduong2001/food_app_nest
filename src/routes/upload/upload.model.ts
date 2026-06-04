import z from 'zod';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const PresignUploadBodySchema = z
  .object({
    filename: z.string().min(1).max(255),
    contentType: z.enum(ALLOWED_CONTENT_TYPES),
  })
  .strict();

export const PresignUploadResSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  publicUrl: z.string().url(),
  expiresIn: z.number(),
});

export type PresignUploadBodyType = z.infer<typeof PresignUploadBodySchema>;
export type PresignUploadResType = z.infer<typeof PresignUploadResSchema>;
