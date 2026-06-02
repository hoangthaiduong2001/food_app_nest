import { toISO } from '@/shared/model/transform.helper';
import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateUserBodyType, CreateUserResType } from './user.model';

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create({
    data,
  }: {
    data: CreateUserBodyType;
  }): Promise<CreateUserResType> {
    const user = await this.prismaService.user.create({
      data,
      omit: { password: true, totpSecret: true },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...user,
      createdAt: toISO(user.createdAt),
      updatedAt: toISO(user.updatedAt),
      deletedAt: toISO(user.deletedAt),
    };
  }
}
