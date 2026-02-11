/**
 * Admin Service 主模組
 * 整合所有管理功能模組：用戶管理、內容審核、支付統計、系統監控、數據分析
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { getDatabaseConfig, JwtStrategy } from '@suggar-daddy/common';
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
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { ContentModerationController } from './content-moderation.controller';
import { ContentModerationService } from './content-moderation.service';
import { PaymentStatsController } from './payment-stats.controller';
import { PaymentStatsService } from './payment-stats.service';
import { SystemMonitorController } from './system-monitor.controller';
import { SystemMonitorService } from './system-monitor.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

/** 所有資料庫實體 */
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
    // 全域設定
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // 資料庫連線（直接讀取，admin-service 擁有唯讀查詢權限）
    TypeOrmModule.forRoot(getDatabaseConfig(ALL_ENTITIES)),
    TypeOrmModule.forFeature(ALL_ENTITIES),

    // Redis 快取
    RedisModule.forRoot(),

    // Kafka 事件發送（用於內容審核動作）
    KafkaModule.forRoot({
      clientId: 'admin-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: 'admin-service-group',
    }),

    // JWT 認證
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'your-jwt-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    AppController,
    UserManagementController,
    ContentModerationController,
    PaymentStatsController,
    SystemMonitorController,
    AnalyticsController,
  ],
  providers: [
    AppService,
    JwtStrategy,
    UserManagementService,
    ContentModerationService,
    PaymentStatsService,
    SystemMonitorService,
    AnalyticsService,
  ],
})
export class AppModule {}
