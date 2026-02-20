/**
 * Skill Service - 技能服務
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  AllExceptionsFilter,
  setupSwagger,
  TracingService,
} from '@suggar-daddy/common';
import { AppModule } from './app/app.module';
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
  // Initialize tracing BEFORE creating the app
  const tracingService = new TracingService();
  await tracingService.init('skill-service');

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/skills';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger documentation
  setupSwagger(app, {
    title: 'Skill Service API',
    description:
      'API documentation for Suggar Daddy Skill Service - User Skills, Skill Requests, Admin Management',
    version: '1.0',
    tag: 'Skills',
    path: 'api/docs',
  });

  app.enableShutdownHooks();
  const port = process.env.SKILL_SERVICE_PORT || process.env.PORT || 3013;
  await app.listen(port);
  Logger.log(
    `Skill Service running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
