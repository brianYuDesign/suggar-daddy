/**
 * API Gateway - 統一入口，代理至各微服務
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🌐 API Gateway running on: http://localhost:${port}`);
}

bootstrap();
