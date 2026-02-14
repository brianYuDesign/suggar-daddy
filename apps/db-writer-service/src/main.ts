/**
 * DB Writer Service - 唯一寫入 PostgreSQL 的服務
 * 消費 Kafka 事件 → 寫入 DB → 同步 Redis
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter } from '@suggar-daddy/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  const port = process.env.DB_WRITER_SERVICE_PORT || process.env.PORT || 3010;
  await app.listen(port);
  Logger.log(`DB Writer Service running on: http://localhost:${port}`);
}

bootstrap();
