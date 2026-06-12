import { toISO } from '@/shared/model/transform.helper';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CreateUserBodyType,
  CreateUserResType,
  GetUsersQueryType,
  UpdateUserBodyType,
} from './user.model';

const userSelect = {
  id: true,
  email: true,
  name: true,
  phoneNumber: true,
  avatar: true,
  status: true,
  roleId: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  role: { select: { id: true, name: true } },
} as const;

function toResType(user: {
  id: number;
  email: string;
  name: string;
  phoneNumber: string;
  avatar: string | null;
  status: string;
  roleId: number;
  createdById: number | null;
  updatedById: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  role: { id: number; name: string };
}): CreateUserResType {
  return {
    ...user,
    status: user.status as CreateUserResType['status'],
    createdAt: toISO(user.createdAt),
    updatedAt: toISO(user.updatedAt),
    deletedAt: toISO(user.deletedAt),
  };
}

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findMany({
    page,
    limit,
    search,
  }: GetUsersQueryType): Promise<{ data: CreateUserResType[]; total: number }> {
    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phoneNumber: { contains: search } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        select: userSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return { data: users.map(toResType), total };
  }

  async findById(id: number): Promise<CreateUserResType | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id, deletedAt: null },
      select: userSelect,
    });
    return user ? toResType(user) : null;
  }

  async create({ data }: { data: CreateUserBodyType }): Promise<CreateUserResType> {
    const user = await this.prismaService.user.create({
      data,
      select: userSelect,
    });
    return toResType(user);
  }

  async update({
    id,
    data,
  }: {
    id: number;
    data: UpdateUserBodyType;
  }): Promise<CreateUserResType | null> {
    const exists = await this.prismaService.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return null;

    const user = await this.prismaService.user.update({
      where: { id },
      data,
      select: userSelect,
    });
    return toResType(user);
  }

  async softDelete(id: number): Promise<boolean> {
    const exists = await this.prismaService.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!exists) return false;

    await this.prismaService.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}
