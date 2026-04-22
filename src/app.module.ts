import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ShareModule } from './shared/share.module';
import { AuthModule } from './routes/auth/auth.module';

@Module({
  imports: [ShareModule, AuthModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
