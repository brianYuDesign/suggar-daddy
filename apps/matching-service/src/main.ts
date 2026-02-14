/**
 * Matching Service - 配對服務 (Phase 1)
 * Port: 3003
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter, setupSwagger, TracingService } from '@suggar-daddy/common';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  // Initialize tracing BEFORE creating the app
  const tracingService = new TracingService();
  tracingService.init('matching-service');

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/matching';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  
  // Setup Swagger documentation
  setupSwagger(app, {
    title: 'Matching Service API',
    description: 'API documentation for Suggar Daddy Matching Service - Swipe, Match, Cards with Geo-filtering',
    version: '1.0',
    tag: 'Matching',
    path: 'api/docs',
  });
  
  app.enableShutdownHooks();
  const port = process.env.MATCHING_SERVICE_PORT || process.env.PORT || 3003;
  await app.listen(port);
  Logger.log(`Matching Service running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
