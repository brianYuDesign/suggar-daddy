import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getDatabaseConfig } from '@suggar-daddy/common';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
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
} from '@suggar-daddy/database';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbWriterService } from './db-writer.service';
import { DbWriterConsumer } from './db-writer.consumer';
import { DlqService } from './dlq.service';
import { DlqController } from './dlq.controller';
import { ConsistencyService } from './consistency.service';
import { ConsistencyController } from './consistency.controller';

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
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot(getDatabaseConfig(ALL_ENTITIES)),
    TypeOrmModule.forFeature(ALL_ENTITIES),
    RedisModule.forRoot(),
    KafkaModule.forRoot({
      clientId: 'db-writer-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: 'db-writer-service-group',
    }),
  ],
  controllers: [AppController, DlqController, ConsistencyController],
  providers: [AppService, DbWriterService, DbWriterConsumer, DlqService, ConsistencyService],
})
export class AppModule {}
