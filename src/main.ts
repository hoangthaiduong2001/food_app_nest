import { NestFactory, Reflector } from '@nestjs/core';
import 'dotenv/config';
import type { NextFunction, Request, Response } from 'express';
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

  const helmetDefault = helmet();
  const helmetForDocs = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/docs')) {
      return helmetForDocs(req, res, next);
    }
    return helmetDefault(req, res, next);
  });

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
