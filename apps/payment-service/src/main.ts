import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import {
  AllExceptionsFilter,
  setupSwagger,
  TracingService,
} from "@suggar-daddy/common";
const helmet = require("helmet");

async function bootstrap() {
  // Initialize tracing BEFORE creating the app
  const tracingService = new TracingService();
  await tracingService.init("payment-service");

  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const globalPrefix = "api";
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
    title: "Payment Service API",
    description: "API documentation for Suggar Daddy Payment Service",
    version: "1.0",
    tag: "Payments",
    path: "api/docs",
  });

  // Port 3007 - Payment Service
  const port = process.env.PAYMENT_SERVICE_PORT || 3007;
  await app.listen(port);
  Logger.log(
    `🚀 Payment service is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
