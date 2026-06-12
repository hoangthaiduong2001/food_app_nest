import { RoleSchema } from '@/shared/model/share-role.model';
import { UserSchema } from '@/shared/model/share-user.model';
import {
  isoDateTime,
  isoDateTimeNullable,
} from '@/shared/model/transform.helper';
import z from 'zod';

const UserResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  role: RoleSchema.pick({ id: true, name: true }),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTimeNullable,
});

// GET /user
export const GetUsersQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(10),
  search: z.string().optional(),
});

export const GetUsersResSchema = z.object({
  data: z.array(UserResSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

// GET /user/:id
export const GetUserResSchema = UserResSchema;

// POST /user
export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  name: true,
  phoneNumber: true,
  status: true,
  password: true,
  roleId: true,
}).strict();

export const CreateUserResSchema = UserResSchema;

// PUT /user/:id
export const UpdateUserBodySchema = UserSchema.pick({
  name: true,
  phoneNumber: true,
  status: true,
  roleId: true,
  avatar: true,
})
  .partial()
  .strict();

export const UpdateUserResSchema = UserResSchema;

export type GetUsersQueryType = z.infer<typeof GetUsersQuerySchema>;
export type CreateUserBodyType = z.infer<typeof CreateUserBodySchema>;
export type CreateUserResType = z.infer<typeof CreateUserResSchema>;
export type UpdateUserBodyType = z.infer<typeof UpdateUserBodySchema>;
