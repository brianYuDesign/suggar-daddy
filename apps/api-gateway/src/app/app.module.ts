import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@suggar-daddy/redis";
import { EnvConfigModule } from "@suggar-daddy/common";
import { ProxyController } from "./proxy.controller";
import { ProxyService } from "./proxy.service";
import { AppController } from "./app.controller";
import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RequestLoggerMiddleware } from "./request-logger.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    EnvConfigModule,
    RedisModule.forRoot(),
  ],
  controllers: [AppController, ProxyController],
  providers: [ProxyService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware, RateLimitMiddleware).forRoutes("*");
  }
}
