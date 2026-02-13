import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { MatchingEventConsumer } from "./matching-event.consumer";
import { SocialEventConsumer } from "./social-event.consumer";
import { FcmService } from "./fcm.service";
import { DeviceTokenController } from "./device-token.controller";
import { NotificationGateway } from "./notification.gateway";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EnvConfigModule,
    AuthModule,
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
<<<<<<< HEAD
  providers: [
    AppService,
    NotificationService,
    MatchingEventConsumer,
    SocialEventConsumer,
    FcmService,
  ],
=======
  providers: [AppService, NotificationService, MatchingEventConsumer, FcmService, NotificationGateway, JwtStrategy],
>>>>>>> a0fdce05c026d8e1406983e3732cd83732cce969
})
export class AppModule {}
