import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './routes/auth/auth.module';
import { UserModule } from './routes/user/user.module';
import { PrismaService } from './shared/services/prisma.service';
import { ShareModule } from './shared/share.module';

@Module({
  imports: [ShareModule, AuthModule, UserModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
