/**
 * Notification Service - 通知服務 (Phase 1)
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1/notifications';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  const port = process.env.PORT || 3004;
  await app.listen(port);
  Logger.log(`Notification Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
