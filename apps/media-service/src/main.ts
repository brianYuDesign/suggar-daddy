/**
 * Media Service - 媒體服務
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1/media';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3008;
  await app.listen(port);
  Logger.log(`🎬 Media Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();