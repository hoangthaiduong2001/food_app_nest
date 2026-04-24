import { RoleName } from '@/shared/constants/role.constant';
import { ShareRoleRepository } from '@/shared/repositories/share-role.repo';
import { HashingService } from '@/shared/services/hashing.service';
import { handlePrismaError } from '@/shared/utils/prisma-error.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CreateUserBodyType } from './user.model';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly shareRoleRepository: ShareRoleRepository,
  ) {}

  private async verifyRole({ roleNameAgent, roleIdTarget }) {
    if (roleNameAgent === RoleName.Admin) {
      return true;
    } else {
      const adminRoleId = await this.shareRoleRepository.getAdminRoleId();

      if (roleIdTarget === adminRoleId) {
        throw new ForbiddenException(
          'You do not have permission to perform this action on the admin role',
        );
      }

      return true;
    }
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
      const user = await this.userRepository.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      });
      return user;
    } catch (error) {
      handlePrismaError(error);
    }
  }
}
