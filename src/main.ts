import { NestFactory, Reflector } from '@nestjs/core';
import 'dotenv/config';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import envConfig from './shared/config';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './shared/interceptor/transform-response.interceptor';
import { zodValidationPipe } from './shared/pipes/zod-validation.pipe';
import { setupSwagger } from './shared/swagger/setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Security headers — set sớm để áp dụng cho mọi response, kể cả error
  app.use(helmet());

  // CORS allowlist từ env. credentials=true cho phép Authorization header + cookies
  const corsOrigins = envConfig.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const reflector = app.get(Reflector);
  app.useGlobalPipes(zodValidationPipe);
  app.useGlobalInterceptors(new TransformResponseInterceptor(reflector));
  app.useGlobalFilters(new AllExceptionsFilter());

  setupSwagger(app);

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  const logger = app.get(Logger);
  logger.log(`Application listening on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
  logger.log(`CORS allowed origins: ${corsOrigins.join(', ')}`);
}
bootstrap();
