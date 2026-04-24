import { ShareRoleRepository } from '@/shared/repositories/share-role.repo';
import { ShareModule } from '@/shared/share.module';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [ShareModule],
  controllers: [UserController],
  providers: [UserService, ShareRoleRepository, UserRepository],
  exports: [UserService],
})
export class UserModule {}
