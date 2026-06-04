import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './routes/auth/auth.module';
import { BrandModule } from './routes/brand/brand.module';
import { CategoryModule } from './routes/category/category.module';
import { HealthModule } from './routes/health/health.module';
import { InventoryModule } from './routes/inventory/inventory.module';
import { ProductModule } from './routes/product/product.module';
import { UploadModule } from './routes/upload/upload.module';
import { UserModule } from './routes/user/user.module';
import envConfig from './shared/config';
import { PrismaService } from './shared/services/prisma.service';
import { ShareModule } from './shared/share.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: envConfig.LOG_LEVEL,
        genReqId: (req: IncomingMessage) => {
          const headerId = req.headers['x-request-id'];
          return typeof headerId === 'string' ? headerId : randomUUID();
        },
        customProps: (req, res) => ({
          reqId: (req as IncomingMessage & { id: string }).id,
          method: req.method,
          url: (req as IncomingMessage).url,
          statusCode: (res as ServerResponse).statusCode,
        }),
        customSuccessMessage: (req, res, responseTime) =>
          `${req.method} ${(req as IncomingMessage).url} ${(res as ServerResponse).statusCode} - ${responseTime}ms`,
        customErrorMessage: (req, res, err) =>
          `${req.method} ${(req as IncomingMessage).url} ${(res as ServerResponse).statusCode} - ${err.message}`,
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        transport:
          envConfig.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss.l',
                  singleLine: true,
                  ignore: 'pid,hostname,req,res,responseTime,context',
                },
              }
            : undefined,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.refreshToken',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
      },
    }),

    ShareModule,
    AuthModule,
    UserModule,
    BrandModule,
    CategoryModule,
    ProductModule,
    InventoryModule,
    UploadModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
