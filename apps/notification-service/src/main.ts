/**
 * Notification Service - 通知服務 (Phase 1)
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter, setupSwagger } from '@suggar-daddy/common';
import { AppModule } from './app/app.module';
const helmet = require('helmet');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/notifications';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  
  // Setup Swagger documentation
  setupSwagger(app, {
    title: 'Notification Service API',
    description: 'API documentation for Suggar Daddy Notification Service - Push Notifications, Device Tokens',
    version: '1.0',
    tag: 'Notifications',
    path: 'api/docs',
  });
  
  app.enableShutdownHooks();
  const port = process.env.PORT || 3004;
  await app.listen(port);
  Logger.log(`Notification Service running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
