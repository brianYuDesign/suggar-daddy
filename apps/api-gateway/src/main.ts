/**
 * API Gateway - 統一入口，代理至各微服務
 */

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const helmet = require("helmet");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require("compression");
import { AllExceptionsFilter, TracingService } from "@suggar-daddy/common";
import { AppModule } from "./app/app.module";

async function bootstrap() {
  // Initialize tracing BEFORE creating the app
  const tracingService = new TracingService();
  await tracingService.init("api-gateway");

  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Gzip compression
  app.use(compression());

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

  // CORS
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS || "http://localhost:4200,http://localhost:4300"
    ).split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.API_GATEWAY_PORT || process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`API Gateway running on: http://localhost:${port}`);
}

bootstrap();
