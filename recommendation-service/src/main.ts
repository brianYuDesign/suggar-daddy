import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppDataSource } from './database/data-source';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // 初始化 TypeORM 數據庫連接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.log('✅ Database connected');
    }

    // 創建 NestJS 應用
    const app = await NestFactory.create(AppModule);

    // 全局驗證管道
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    // 啟用 CORS
    app.enableCors();

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Recommendation Service running on http://localhost:${port}`);
    logger.log(`📚 API docs: http://localhost:${port}/api`);
  } catch (err: any) {
    logger.error(`Failed to start application: ${err.message}`);
    process.exit(1);
  }
}

bootstrap();
