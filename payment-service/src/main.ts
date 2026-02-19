import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './services/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 獲取配置
  const configService = app.get(ConfigService);
  const port = configService.getAppPort();

  // 全局驗證管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors();

  // 啟動
  await app.listen(port);
  console.log(`Payment Service listening on port ${port}`);
}

bootstrap();
