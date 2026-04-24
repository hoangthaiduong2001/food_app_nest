import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HashingService } from './services/hashing.service';
import { PrismaService } from './services/prisma.service';
import { TokenService } from './services/token.service';

@Global()
@Module({
  providers: [PrismaService, HashingService, TokenService],
  exports: [PrismaService, HashingService, TokenService],
  imports: [JwtModule],
})
export class ShareModule {}
