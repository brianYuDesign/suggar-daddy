/**
 * Admin Service - 後台管理服務
 * 提供用戶管理、內容審核、支付統計、系統監控、數據分析等功能
 * 僅限 ADMIN 角色存取
 */

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require("helmet");
import {
  AllExceptionsFilter,
  setupSwagger,
  TracingService,
} from "@suggar-daddy/common";
import { AppModule } from "./app/app.module";

async function bootstrap() {
  // Initialize tracing BEFORE creating the app
  const tracingService = new TracingService();
  await tracingService.init("admin-service");

  const app = await NestFactory.create(AppModule);

  // 全域路由前綴
  app.setGlobalPrefix("api/admin");

  // Security headers
  app.use(helmet());

  // Global error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 啟用 CORS（限制來源）
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:4300").split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Setup Swagger documentation
  setupSwagger(app, {
    title: "Admin Service API",
    description:
      "API documentation for Suggar Daddy Admin Service - User Management, Content Moderation, Analytics, System Monitoring",
    version: "1.0",
    tag: "Admin",
    path: "api/docs",
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.ADMIN_SERVICE_PORT || process.env.PORT || 3011;
  await app.listen(port);
  Logger.log(`Admin Service running on: http://localhost:${port}/api/admin`);
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
