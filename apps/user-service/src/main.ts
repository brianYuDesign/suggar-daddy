/**
 * User Service - 用戶服務
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter, setupSwagger, TracingService } from '@suggar-daddy/common';
import { AppModule } from './app/app.module';
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
  // Initialize tracing BEFORE creating the app
  const tracingService = new TracingService();
  tracingService.init('user-service');

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/users';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  
  // Setup Swagger documentation
  setupSwagger(app, {
    title: 'User Service API',
    description: 'API documentation for Suggar Daddy User Service - User Profiles, Follow, Block, Report',
    version: '1.0',
    tag: 'Users',
    path: 'api/docs',
  });
  
  app.enableShutdownHooks();
  const port = process.env.USER_SERVICE_PORT || process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`User Service running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
