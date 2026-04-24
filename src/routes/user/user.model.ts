import { RoleSchema } from '@/shared/model/share-role.model';
import { UserSchema } from '@/shared/model/share-user.model';
import z from 'zod';

export const GetUserResSchema = z.object({
  // data: z.array()
});

export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  name: true,
  phoneNumber: true,
  status: true,
  password: true,
  roleId: true,
}).strict();

export const CreateUserResSchema = UserSchema.omit({
  password: true,
  totpSecret: true,
}).extend({ role: RoleSchema.pick({ id: true, name: true }) });

export type CreateUserBodyType = z.infer<typeof CreateUserBodySchema>;
export type CreateUserResType = z.infer<typeof CreateUserResSchema>;
