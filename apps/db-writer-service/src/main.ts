/**
 * DB Writer Service - 唯一寫入 PostgreSQL 的服務
 * 消費 Kafka 事件 → 寫入 DB → 同步 Redis
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3010;
  await app.listen(port);
  Logger.log(`📝 DB Writer Service running on: http://localhost:${port}`);
}

bootstrap();
