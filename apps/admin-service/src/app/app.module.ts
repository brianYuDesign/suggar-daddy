/**
 * Admin Service 主模組
 * 整合所有管理功能模組：用戶管理、內容審核、支付統計、系統監控、數據分析
 * 新增：聊天室管理、超級管理員管理
 */

import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  getDatabaseConfig,
  EnvConfigModule,
  AppConfigService,
  StripeModule as CommonStripeModule,
} from "@suggar-daddy/common";
import { AuthModule } from "@suggar-daddy/auth";
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
  AuditLogEntity,
  DiamondBalanceEntity,
  DiamondTransactionEntity,
  DiamondPurchaseEntity,
} from "@suggar-daddy/database";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserManagementController } from "./user-management.controller";
import { UserManagementService } from "./user-management.service";
import { ContentModerationController } from "./content-moderation.controller";
import { ContentModerationService } from "./content-moderation.service";
import { PaymentStatsController } from "./payment-stats.controller";
import { PaymentStatsService } from "./payment-stats.service";
import { SystemMonitorController } from "./system-monitor.controller";
import { SystemMonitorService } from "./system-monitor.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { WithdrawalManagementController } from "./withdrawal-management.controller";
import { WithdrawalManagementService } from "./withdrawal-management.service";
import { SubscriptionManagementController } from "./subscription-management.controller";
import { SubscriptionManagementService } from "./subscription-management.service";
import { TransactionManagementController } from "./transaction-management.controller";
import { TransactionManagementService } from "./transaction-management.service";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import { DiamondManagementController } from "./diamond-management.controller";
import { DiamondManagementService } from "./diamond-management.service";
import { ChatManagementController } from "./chat-management.controller";
import { ChatManagementService } from "./chat-management.service";
import { SuperAdminController } from "./super-admin.controller";
import { SuperAdminService } from "./super-admin.service";

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
  AuditLogEntity,
  DiamondBalanceEntity,
  DiamondTransactionEntity,
  DiamondPurchaseEntity,
];

@Module({
  imports: [
    // 全域設定
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    EnvConfigModule,

    // 資料庫連線（直接讀取，admin-service 擁有唯讀查詢權限）
    TypeOrmModule.forRoot(getDatabaseConfig(ALL_ENTITIES)),
    TypeOrmModule.forFeature(ALL_ENTITIES),

    // Redis 快取
    RedisModule.forRoot(),

    // Kafka 事件發送（用於內容審核動作）
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),

    // Stripe 支付
    CommonStripeModule,

    // JWT 認證
    AuthModule,
  ],
  controllers: [
    AppController,
    UserManagementController,
    ContentModerationController,
    PaymentStatsController,
    SystemMonitorController,
    AnalyticsController,
    WithdrawalManagementController,
    SubscriptionManagementController,
    TransactionManagementController,
    AuditLogController,
    DiamondManagementController,
    ChatManagementController,
    SuperAdminController,
  ],
  providers: [
    AppService,
    AuditLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    UserManagementService,
    ContentModerationService,
    PaymentStatsService,
    SystemMonitorService,
    AnalyticsService,
    WithdrawalManagementService,
    SubscriptionManagementService,
    TransactionManagementService,
    DiamondManagementService,
    ChatManagementService,
    SuperAdminService,
  ],
})
export class AppModule {}
