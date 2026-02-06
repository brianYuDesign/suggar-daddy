/**
 * Subscription Service - 訂閱服務
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1/subscriptions';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3005;
  await app.listen(port);
  Logger.log(`💳 Subscription Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();