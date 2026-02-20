import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3003;
  await app.listen(port);

  console.log(`✅ Subscription Service running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start service:', err);
  process.exit(1);
});
