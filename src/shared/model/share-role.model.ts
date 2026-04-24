import z from 'zod';
import { PermissionSchema } from './share-permission.model';

export const RoleSchema = z.object({
  id: z.number(),
  name: z.string().max(500),
  description: z.string(),
  isActive: z.boolean().default(true),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RolePermissionType = RoleSchema.extend({
  permission: z.array(PermissionSchema),
});

export type RoleType = z.infer<typeof RoleSchema>;
export type RolePermissionType = z.infer<typeof PermissionSchema>;
