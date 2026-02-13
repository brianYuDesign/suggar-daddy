/**
 * Auth Service - 認證服務
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AllExceptionsFilter, setupSwagger } from '@suggar-daddy/common';
import { AppModule } from './app/app.module';
const helmet = require('helmet');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api/auth';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  
  // Setup Swagger documentation
  setupSwagger(app, {
    title: 'Auth Service API',
    description: 'API documentation for Suggar Daddy Authentication Service - Register, Login, Password Management',
    version: '1.0',
    tag: 'Authentication',
    path: 'api/docs',
  });
  
  app.enableShutdownHooks();
  const port = process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(`Auth Service running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
