import z from 'zod';
import { HTTPMethod } from '../constants/method.constant';

export const PermissionSchema = z.object({
  id: z.number(),
  name: z.string().max(500),
  description: z.string(),
  path: z.string().max(500),
  module: z.string().max(500),
  method: z.enum([
    HTTPMethod.GET,
    HTTPMethod.POST,
    HTTPMethod.PATCH,
    HTTPMethod.DELETE,
    HTTPMethod.PUT,
    HTTPMethod.HEAD,
    HTTPMethod.OPTIONS,
  ]),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PermissionType = z.infer<typeof PermissionSchema>;
