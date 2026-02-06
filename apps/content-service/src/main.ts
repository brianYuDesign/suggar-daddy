/**
 * Content Service - 內容服務
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api/v1/content';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3006;
  await app.listen(port);
  Logger.log(`📝 Content Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();