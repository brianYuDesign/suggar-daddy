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
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";
import { MatchingEventConsumer } from "./matching-event.consumer";
import { MessagingGateway } from "./messaging.gateway";
import { SubscriptionServiceClient } from "./subscription-service.client";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
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
  controllers: [AppController, MessagingController],
  providers: [
    AppService,
    MessagingService,
    MatchingEventConsumer,
    MessagingGateway,
    SubscriptionServiceClient,
  ],
})
export class AppModule {}
