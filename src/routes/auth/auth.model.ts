import { UserSchema } from '@/shared/model/share-user.model';
import z from 'zod';

export const LoginBodySchema = UserSchema.pick({
  email: true,
  password: true,
}).strict();

export const LoginResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const RegisterBodySchema = UserSchema.pick({
  email: true,
  name: true,
  password: true,
  phoneNumber: true,
})
  .extend({
    confirmPassword: z.string().min(6).max(100),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const RegisterResSchema = LoginResSchema;

export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z.string().min(10),
  })
  .strict();

export const RefreshTokenResSchema = LoginResSchema;

export const LogoutResSchema = z.object({
  loggedOut: z.boolean(),
});

export const MeResSchema = z.object({
  userId: z.number(),
  username: z.string(),
  email: z.email(),
  phone: z.string(),
  address: z.string().nullable(),
  avatar: z.string().nullable(),
  roleId: z.number(),
  roleName: z.string(),
});

export const CreateApiKeyBodySchema = z
  .object({
    label: z.string().min(1).max(100),
    expiresAt: z.iso.datetime().nullable().optional(),
  })
  .strict();

export const CreateApiKeyResSchema = z.object({
  id: z.number(),
  label: z.string(),
  rawKey: z.string(),
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const ApiKeyItemSchema = z.object({
  id: z.number(),
  label: z.string(),
  expiresAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const ListApiKeyResSchema = z.array(ApiKeyItemSchema);

export const RevokeApiKeyResSchema = z.object({
  revoked: z.boolean(),
});

export type LoginBodyType = z.infer<typeof LoginBodySchema>;
export type LoginResType = z.infer<typeof LoginResSchema>;
export type RegisterBodyType = z.infer<typeof RegisterBodySchema>;
export type RegisterResType = z.infer<typeof RegisterResSchema>;
export type MeResType = z.infer<typeof MeResSchema>;
export type RefreshTokenBodyType = z.infer<typeof RefreshTokenBodySchema>;
export type RefreshTokenResType = z.infer<typeof RefreshTokenResSchema>;
export type LogoutResType = z.infer<typeof LogoutResSchema>;
export type CreateApiKeyBodyType = z.infer<typeof CreateApiKeyBodySchema>;
export type CreateApiKeyResType = z.infer<typeof CreateApiKeyResSchema>;
export type ApiKeyItemType = z.infer<typeof ApiKeyItemSchema>;
