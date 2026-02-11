/**
 * Admin Service - 後台管理服務
 * 提供用戶管理、內容審核、支付統計、系統監控、數據分析等功能
 * 僅限 ADMIN 角色存取
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
/* eslint-disable @typescript-eslint/no-var-requires */
const helmet = require('helmet');
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全域路由前綴
  app.setGlobalPrefix('api/v1/admin');

  // Security headers
  app.use(helmet());

  // Input validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // 啟用 CORS（限制來源）
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:4300').split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3011;
  await app.listen(port);
  Logger.log(`Admin Service running on: http://localhost:${port}/api/v1/admin`);
}

bootstrap();
