import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import { JwtStrategy } from "@suggar-daddy/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { MatchingEventConsumer } from "./matching-event.consumer";
import { FcmService } from "./fcm.service";
import { DeviceTokenController } from "./device-token.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-jwt-secret-key",
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    }),
    RedisModule.forRoot(),
    KafkaModule.forRoot({
      clientId: "notification-service",
      brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
      groupId: "notification-service-group",
    }),
  ],
  controllers: [AppController, NotificationController, DeviceTokenController],
  providers: [AppService, NotificationService, MatchingEventConsumer, FcmService, JwtStrategy],
})
export class AppModule {}