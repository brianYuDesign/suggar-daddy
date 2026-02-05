/**
 * Matching Service - 配對服務 (Phase 1)
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1/matching';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3003;
  await app.listen(port);
  Logger.log(`💕 Matching Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
