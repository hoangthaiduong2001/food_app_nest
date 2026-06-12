import { RoleName } from '@/shared/constants/role.constant';
import { ShareRoleRepository } from '@/shared/repositories/share-role.repo';
import { HashingService } from '@/shared/services/hashing.service';
import { handlePrismaError } from '@/shared/utils/prisma-error.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateUserBodyType,
  GetUsersQueryType,
  UpdateUserBodyType,
} from './user.model';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly shareRoleRepository: ShareRoleRepository,
  ) {}

  private async verifyRole({
    roleNameAgent,
    roleIdTarget,
  }: {
    roleNameAgent: string;
    roleIdTarget: number;
  }): Promise<void> {
    if (roleNameAgent === RoleName.Admin) return;

    const adminRoleId = await this.shareRoleRepository.getAdminRoleId();
    if (roleIdTarget === adminRoleId) {
      throw new ForbiddenException(
        'You do not have permission to perform this action on the admin role',
      );
    }
  }

  async list(query: GetUsersQueryType) {
    const { data, total } = await this.userRepository.findMany(query);
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getById(id: number) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create({ data }: { data: CreateUserBodyType }) {
    try {
      const roleExists = await this.shareRoleRepository.isRoleActiveById(
        data.roleId,
      );
      if (!roleExists) {
        throw new BadRequestException({
          message: 'RoleId does not exist',
          path: 'roleId',
        });
      }

      const hashedPassword = await this.hashingService.hash(data.password);
      return await this.userRepository.create({
        data: { ...data, password: hashedPassword },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async update({
    id,
    data,
    roleNameAgent,
  }: {
    id: number;
    data: UpdateUserBodyType;
    roleNameAgent: string;
  }) {
    try {
      if (data.roleId !== undefined) {
        const roleExists = await this.shareRoleRepository.isRoleActiveById(
          data.roleId,
        );
        if (!roleExists) {
          throw new BadRequestException({
            message: 'RoleId does not exist',
            path: 'roleId',
          });
        }
        await this.verifyRole({ roleNameAgent, roleIdTarget: data.roleId });
      }

      const user = await this.userRepository.update({ id, data });
      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async delete(id: number) {
    const deleted = await this.userRepository.softDelete(id);
    if (!deleted) throw new NotFoundException('User not found');
  }
}
