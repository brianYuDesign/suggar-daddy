/**
 * Auth Service - 認證服務
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter } from '@suggar-daddy/common';
import { AppModule } from './app/app.module';
const helmet = require('helmet');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/auth';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  const port = process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(`Auth Service running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
