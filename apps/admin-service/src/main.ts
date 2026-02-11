/**
 * Admin Service - 後台管理服務
 * 提供用戶管理、內容審核、支付統計、系統監控、數據分析等功能
 * 僅限 ADMIN 角色存取
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全域路由前綴
  app.setGlobalPrefix('api/v1/admin');

  // 啟用 CORS（開發階段）
  app.enableCors();

  const port = process.env.PORT || 3011;
  await app.listen(port);
  Logger.log('Admin Service running on: http://localhost:' + port + '/api/v1/admin');
}

bootstrap();
