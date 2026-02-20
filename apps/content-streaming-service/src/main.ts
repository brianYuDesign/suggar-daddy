import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = configService.getPort();
  await app.listen(port);

  console.log(`🚀 Content-Streaming Service listening on port ${port}`);
  console.log(`📝 Environment: ${configService.getNodeEnv()}`);
  console.log(`🎥 S3 Bucket: ${configService.getS3().bucket}`);
  console.log(`🌐 Cloudflare Domain: ${configService.getCloudflare().domain}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to bootstrap application:', err);
  process.exit(1);
});
