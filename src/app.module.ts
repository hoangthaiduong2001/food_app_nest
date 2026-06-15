import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ActivityLogModule } from './routes/activity-log/activity-log.module';
import { AuthModule } from './routes/auth/auth.module';
import { BrandModule } from './routes/brand/brand.module';
import { CartModule } from './routes/cart/cart.module';
import { CategoryModule } from './routes/category/category.module';
import { EmailModule } from './routes/email/email.module';
import { GatewayModule } from './routes/gateway/gateway.module';
import { GraphqlModule } from './routes/graphql/graphql.module';
import { HealthModule } from './routes/health/health.module';
import { InventoryModule } from './routes/inventory/inventory.module';
import { InventoryJobModule } from './routes/inventory-job/inventory-job.module';
import { NotificationModule } from './routes/notification/notification.module';
import { OrderModule } from './routes/order/order.module';
import { PaymentModule } from './routes/payment/payment.module';
import { ProductModule } from './routes/product/product.module';
import { ChatModule } from './routes/chat/chat.module';
import { ReportModule } from './routes/report/report.module';
import { UploadModule } from './routes/upload/upload.module';
import { SellerModule } from './routes/seller/seller.module';
import { UserModule } from './routes/user/user.module';
import { WalletModule } from './routes/wallet/wallet.module';
import envConfig from './shared/config';
import { PubSubModule } from './shared/pubsub.module';
import { PrismaService } from './shared/services/prisma.service';
import { ShareModule } from './shared/share.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
      subscriptions: { 'graphql-ws': true },
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        ttl: envConfig.CACHE_TTL_SECONDS * 1000,
        store: 'memory',
      }),
    }),
    ...(envConfig.MONGODB_URI
      ? [MongooseModule.forRoot(envConfig.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })]
      : []),
    PubSubModule,
    GraphqlModule,
    GatewayModule,
    NotificationModule,
    ActivityLogModule,
    ShareModule,
    AuthModule,
    UserModule,
    BrandModule,
    CategoryModule,
    ProductModule,
    InventoryModule,
    UploadModule,
    CartModule,
    OrderModule,
    WalletModule,
    PaymentModule,
    EmailModule,
    InventoryJobModule,
    ReportModule,
    HealthModule,
    SellerModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
