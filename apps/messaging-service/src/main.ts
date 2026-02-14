/**
 * Messaging Service - 即時訊息服務 (Phase 1)
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter, setupSwagger, TracingService } from '@suggar-daddy/common';
import { AppModule } from './app/app.module';
const helmet = require('helmet');

async function bootstrap() {
  // Initialize tracing BEFORE creating the app
  const tracingService = new TracingService();
  tracingService.init('messaging-service');

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/messaging';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  
  // Setup Swagger documentation
  setupSwagger(app, {
    title: 'Messaging Service API',
    description: 'API documentation for Suggar Daddy Messaging Service - Private Messages, Conversations, DM',
    version: '1.0',
    tag: 'Messaging',
    path: 'api/docs',
  });
  
  app.enableShutdownHooks();
  const port = process.env.MESSAGING_SERVICE_PORT || process.env.PORT || 3005;
  await app.listen(port);
  Logger.log(`Messaging Service running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
