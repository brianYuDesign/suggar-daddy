import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  JwtStrategy,
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
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
    EnvConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn },
      }),
    }),
    RedisModule.forRoot(),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AppController, NotificationController, DeviceTokenController],
  providers: [
    AppService,
    NotificationService,
    MatchingEventConsumer,
    FcmService,
    JwtStrategy,
  ],
})
export class AppModule {}
