import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  EnvConfigModule,
  AppConfigService,
  getDatabaseConfig,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
import { ModerationModule } from "@suggar-daddy/moderation";
import {
  ConversationEntity,
  MessageEntity,
} from "@suggar-daddy/entities";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";
import { MatchingEventConsumer } from "./matching-event.consumer";
import { MessagingGateway } from "./messaging.gateway";
import { SubscriptionServiceClient } from "./subscription-service.client";

/**
 * [F-001/W-001] 新增 TypeORM 連線供 PostgreSQL 回退讀取使用。
 * messaging-service 的主要讀寫仍透過 Redis，
 * 但當 Redis key 不存在或斷路器打開時，改從 PostgreSQL 讀取。
 */
const MESSAGING_ENTITIES = [ConversationEntity, MessageEntity];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    EnvConfigModule,
    AuthModule,
    RedisModule.forRoot(),
    TypeOrmModule.forRoot(getDatabaseConfig(MESSAGING_ENTITIES)),
    TypeOrmModule.forFeature(MESSAGING_ENTITIES),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
    ModerationModule.forRoot(),
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
