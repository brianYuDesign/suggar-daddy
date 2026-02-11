import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import { JwtStrategy } from "@suggar-daddy/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";
import { MatchingEventConsumer } from "./matching-event.consumer";
import { MessagingGateway } from "./messaging.gateway";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    }),
    RedisModule.forRoot(),
    KafkaModule.forRoot({
      clientId: "messaging-service",
      brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
      groupId: "messaging-service-group",
    }),
  ],
  controllers: [AppController, MessagingController],
  providers: [AppService, MessagingService, MatchingEventConsumer, MessagingGateway, JwtStrategy],
})
export class AppModule {}