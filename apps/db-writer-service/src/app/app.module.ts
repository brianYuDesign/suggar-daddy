import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import {
  getDatabaseConfig,
  EnvConfigModule,
  AppConfigService,
} from "@suggar-daddy/common";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import {
  UserEntity,
  PostEntity,
  PostLikeEntity,
  PostCommentEntity,
  MediaFileEntity,
  SubscriptionEntity,
  SubscriptionTierEntity,
  TransactionEntity,
  TipEntity,
  PostPurchaseEntity,
  SwipeEntity,
  MatchEntity,
  FollowEntity,
  BookmarkEntity,
  DmPurchaseEntity,
  StoryEntity,
  StoryViewEntity,
  DiamondBalanceEntity,
  DiamondTransactionEntity,
  DiamondPurchaseEntity,
  UserBehaviorEventEntity,
} from "@suggar-daddy/database";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DbWriterService } from "./db-writer.service";
import { DbWriterConsumer } from "./db-writer.consumer";
import { DlqService } from "./dlq.service";
import { DlqController } from "./dlq.controller";
import { ConsistencyService } from "./consistency.service";
import { ConsistencyController } from "./consistency.controller";

const ALL_ENTITIES = [
  UserEntity,
  PostEntity,
  PostLikeEntity,
  PostCommentEntity,
  MediaFileEntity,
  SubscriptionEntity,
  SubscriptionTierEntity,
  TransactionEntity,
  TipEntity,
  PostPurchaseEntity,
  SwipeEntity,
  MatchEntity,
  FollowEntity,
  BookmarkEntity,
  DmPurchaseEntity,
  StoryEntity,
  StoryViewEntity,
  DiamondBalanceEntity,
  DiamondTransactionEntity,
  DiamondPurchaseEntity,
  UserBehaviorEventEntity,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    EnvConfigModule,
    TypeOrmModule.forRoot(getDatabaseConfig(ALL_ENTITIES)),
    TypeOrmModule.forFeature(ALL_ENTITIES),
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
  controllers: [AppController, DlqController, ConsistencyController],
  providers: [
    AppService,
    DbWriterService,
    DbWriterConsumer,
    DlqService,
    ConsistencyService,
  ],
})
export class AppModule {}
