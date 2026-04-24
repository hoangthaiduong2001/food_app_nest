import { PrismaService } from '@/shared/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { CreateUserBodyType, CreateUserResType } from './user.model';

@Injectable()
export class UserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  create({ data }: { data: CreateUserBodyType }): Promise<CreateUserResType> {
    return this.prismaService.user.create({
      data,
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}
