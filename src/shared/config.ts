import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import z from 'zod';

config({
  path: '.env',
});

if (!fs.existsSync(path.resolve('.env'))) {
  console.log('Not found .env file.');
  process.exit(1);
}

const configSchema = z.object({
  DATABASE_URL: z.string(),
  ACCESS_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRES_IN: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_EXPIRES_IN: z.string(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  // Stripe (test mode)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // AWS SES (email)
  SES_REGION: z.string().default('ap-southeast-1'),
  SES_ACCESS_KEY: z.string().optional(),
  SES_SECRET_KEY: z.string().optional(),
  SES_FROM_EMAIL: z.string().default('noreply@example.com'),
  //   PAYMENT_API_KEY: z.string(),
  //   ADMIN_NAME: z.string(),
  //   ADMIN_EMAIL: z.string(),
  //   ADMIN_PASSWORD: z.string(),
  //   ADMIN_PHONE_NUMBER: z.string(),
  //   OPT_EXPIRES_IN: z.string(),
  //   RESEND_API_KEY: z.string(),
  //   GOOGLE_CLIENT_ID: z.string(),
  //   GOOGLE_CLIENT_SECRET: z.string(),
  //   GOOGLE_REDIRECT_URI: z.string(),
  //   GOOGLE_CLIENT_REDIRECT_URI: z.string(),
  //   PREFIX_STATIC_ENPOINT: z.string(),
  //   REDIS_URL: z.string(),
});

const configServer = configSchema.safeParse(process.env);

if (configServer.error) {
  console.log('Invalid environment variables', configServer.error);
  process.exit(1);
}

const envConfig = configServer.data;

export default envConfig;
