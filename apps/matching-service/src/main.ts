/**
 * Matching Service - 配對服務 (Phase 1)
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter } from '@suggar-daddy/common';
import { AppModule } from './app/app.module';
const helmet = require('helmet');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/matching';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  const port = process.env.PORT || 3003;
  await app.listen(port);
  Logger.log(`Matching Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
