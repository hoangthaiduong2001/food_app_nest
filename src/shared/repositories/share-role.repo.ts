import { Injectable } from '@nestjs/common';
import { RoleName } from '../constants/role.constant';
import { RoleType } from '../model/share-role.model';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ShareRoleRepository {
  private clientRoleId: number | null = null;
  private adminRoleId: number | null = null;

  constructor(private readonly prismaService: PrismaService) {}

  private async getRole(roleName: string) {
    const role: RoleType = await this.prismaService.$queryRaw<
      RoleType[]
    >`SELECT * FROM "Role" WHERE name = ${roleName} AND "deletedAt" IS NULL LIMIT 1;`.then(
      (res) => {
        if (res.length === 0) {
          throw new Error('Client role not found');
        }
        return res[0];
      },
    );
    return role;
  }

  async getClientRoleId() {
    if (this.clientRoleId !== null) {
      return this.clientRoleId;
    }
    const role = await this.getRole(RoleName.Client);
    this.clientRoleId = role.id;
    return this.clientRoleId;
  }

  async getAdminRoleId() {
    if (this.adminRoleId !== null) {
      return this.adminRoleId;
    }
    const role = await this.getRole(RoleName.Admin);
    this.adminRoleId = role.id;
    return this.adminRoleId;
  }

  async isRoleActiveById(roleId: number): Promise<boolean> {
    const role = await this.prismaService.role.findFirst({
      where: {
        id: roleId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return role !== null;
  }
}
