import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { RedisModule } from "@suggar-daddy/redis";
import { EnvConfigModule, CircuitBreakerModule } from "@suggar-daddy/common";
import { ProxyController } from "./proxy.controller";
import { ProxyService } from "./proxy.service";
import { AppController } from "./app.controller";
import { RequestLoggerMiddleware } from "./request-logger.middleware";
import { ThrottlerBehindProxyGuard } from "./guards/throttler-behind-proxy.guard";
import { createThrottlerOptions } from "./throttler.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    EnvConfigModule,
    RedisModule.forRoot(),
    // 暫時禁用以便測試登入
    // CircuitBreakerModule,
    // Throttler Module with Redis Storage
    // ThrottlerModule.forRoot(createThrottlerOptions()),
  ],
  controllers: [AppController, ProxyController],
  providers: [
    ProxyService,
    // 全局應用 Throttler Guard - 暫時禁用
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerBehindProxyGuard,
    // },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 只保留 Request Logger，移除舊的 RateLimitMiddleware
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
