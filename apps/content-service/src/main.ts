import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter, setupSwagger } from '@suggar-daddy/common';
const helmet = require('helmet');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Global error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger documentation
  setupSwagger(app, {
    title: 'Content Service API',
    description: 'API documentation for Suggar Daddy Content Service',
    version: '1.0',
    tag: 'Content',
    path: 'api/docs',
  });

  const port = process.env['PORT'] || 3006;
  await app.listen(port);
  Logger.log(
    `🚀 Content service is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();