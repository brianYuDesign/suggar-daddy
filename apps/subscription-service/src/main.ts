import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { setupSwagger } from '@suggar-daddy/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

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
    title: 'Subscription Service API',
    description: 'API documentation for Suggar Daddy Subscription Service',
    version: '1.0',
    tag: 'Subscriptions',
    path: 'api/docs',
  });

  const port = process.env.PORT || 3009;
  await app.listen(port);
  Logger.log(
    `🚀 Subscription service is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();