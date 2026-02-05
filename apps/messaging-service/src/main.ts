/**
 * Messaging Service - 即時訊息服務 (Phase 1)
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1/messaging';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3005;
  await app.listen(port);
  Logger.log(
    `💬 Messaging Service running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
