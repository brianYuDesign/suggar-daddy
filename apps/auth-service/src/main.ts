/**
 * Auth Service - 認證服務
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1/auth';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(`🔐 Auth Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
