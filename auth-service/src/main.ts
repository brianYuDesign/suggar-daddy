import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS'),
    credentials: configService.get('CORS_CREDENTIALS') === 'true',
  });

  const port = configService.get('PORT') || 3002;

  await app.listen(port);
  logger.log(`Authentication Service running on port ${port}`);
  logger.log(`Environment: ${configService.get('NODE_ENV')}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
