/**
 * User Service 數據一致性集成示例
 * 
 * ⚠️ 注意：此示例假設已集成 TypeORM 和 PostgreSQL
 * 
 * 使用前請確保：
 * 1. 已安裝 @nestjs/typeorm 和 typeorm
 * 2. 已在 AppModule 中配置 TypeOrmModule
 * 3. User Entity 已正確定義
 * 
 * 集成步驟：
 * 1. 在 app.module.ts 中導入 DataConsistencyModule 和 TypeOrmModule
 * 2. 在 user.service.ts 中實現 OnModuleInit
 * 3. 註冊 User 實體的一致性檢查任務
 */

// ============================================
// 步驟 1：更新 app.module.ts
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import {
  JwtAuthGuard,
  RolesGuard,
  EnvConfigModule,
  AppConfigService,
  DataConsistencyModule, // 導入一致性模組
} from '@suggar-daddy/common';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from './auth/auth.module';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EnvConfigModule,
    // 配置 TypeORM（連接 PostgreSQL）
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        host: config.databaseHost,
        port: config.databasePort,
        username: config.databaseUsername,
        password: config.databasePassword,
        database: config.databaseName,
        entities: [User],
        synchronize: false, // 生產環境應設為 false
      }),
    }),
    // 導入 User Repository
    TypeOrmModule.forFeature([User]),
    // 啟用定期任務（用於一致性檢查）
    ScheduleModule.forRoot(),
    // 導入數據一致性模組
    DataConsistencyModule,
    // 其他模組
    RedisModule.forRoot(),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
    AuthModule,
  ],
  controllers: [AppController, UserController],
  providers: [
    AppService,
    UserService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

// ============================================
// 步驟 2：更新 user.service.ts
// ============================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { DataConsistencyScheduler } from '@suggar-daddy/common';
import { User } from './entities/user.entity';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);
  private readonly USER_PREFIX = 'user:';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly consistencyScheduler: DataConsistencyScheduler, // 注入調度器
  ) {}

  /**
   * 模組初始化時註冊數據一致性檢查
   */
  onModuleInit() {
    this.logger.log('初始化 User Service 數據一致性檢查...');

    // 設置告警閾值（假設有 10,000 用戶，設置 0.5% 的閾值）
    this.consistencyScheduler.setAlertThreshold(50);

    // 註冊 User 實體的一致性檢查
    this.consistencyScheduler.registerScheduledCheck({
      config: {
        // 實體名稱
        entityName: 'User',
        
        // Redis key 前綴
        redisKeyPrefix: this.USER_PREFIX,
        
        // TypeORM 實體類
        entityClass: User,
        
        // 唯一標識符欄位（預設為 'id'）
        idField: 'id',
        
        // 需要比較的欄位（不包含 createdAt, updatedAt）
        fieldsToCompare: [
          'email',
          'displayName',
          'role',
          'passwordHash',
        ],
        
        // 啟用自動修復（生產環境）
        autoFix: process.env.NODE_ENV === 'production',
      },
      
      // Cron 表達式（每天凌晨 3 點）
      cronExpression: '0 3 * * *',
      
      // 是否啟用
      enabled: true,
    });

    this.logger.log('✅ User 數據一致性檢查已啟用');
  }

  // ... 其他業務邏輯
}

// ============================================
// 步驟 3：環境變數配置（.env）
// ============================================

/*
# PostgreSQL 配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=suggar_daddy
DATABASE_PASSWORD=your_password
DATABASE_NAME=suggar_daddy_db

# 其他配置
NODE_ENV=production
*/

// ============================================
// 步驟 4：使用 Admin API 手動觸發檢查
// ============================================

/*
# 1. 手動觸發所有實體檢查
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/admin/data-consistency/check

# 2. 手動觸發 User 實體檢查
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/admin/data-consistency/check/User

# 3. 查看不一致記錄
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/admin/data-consistency/inconsistencies?entityType=User&fixed=false

# 4. 查看統計信息
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/admin/data-consistency/statistics

# 5. 查看調度任務列表
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/admin/data-consistency/scheduled-checks
*/

// ============================================
// 進階配置：多實體檢查
// ============================================

/*
如果你的 service 管理多個實體，可以批量註冊：

onModuleInit() {
  this.consistencyScheduler.registerMultipleChecks([
    {
      config: {
        entityName: 'User',
        redisKeyPrefix: 'user:',
        entityClass: User,
        autoFix: true,
      },
    },
    {
      config: {
        entityName: 'Profile',
        redisKeyPrefix: 'profile:',
        entityClass: Profile,
        fieldsToCompare: ['bio', 'avatarUrl', 'preferences'],
        autoFix: true,
      },
    },
    {
      config: {
        entityName: 'Subscription',
        redisKeyPrefix: 'subscription:',
        entityClass: Subscription,
        fieldsToCompare: ['tier', 'status', 'expiresAt'],
        autoFix: false, // 訂閱數據較敏感，先不自動修復
      },
    },
  ]);
}
*/

// ============================================
// 監控與告警集成（可選）
// ============================================

/*
可以將一致性統計信息暴露為 Prometheus 指標：

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Counter, Gauge } from 'prom-client';
import { DataConsistencyService } from '@suggar-daddy/common';

@Injectable()
export class ConsistencyMetricsService {
  private readonly inconsistencyGauge = new Gauge({
    name: 'data_consistency_inconsistencies',
    help: 'Number of data inconsistencies',
    labelNames: ['type'],
  });

  constructor(private readonly consistencyService: DataConsistencyService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  updateMetrics() {
    const stats = this.consistencyService.getStatistics();
    
    this.inconsistencyGauge.set(
      { type: 'REDIS_ONLY' },
      stats.byType.REDIS_ONLY
    );
    this.inconsistencyGauge.set(
      { type: 'DB_ONLY' },
      stats.byType.DB_ONLY
    );
    this.inconsistencyGauge.set(
      { type: 'DATA_MISMATCH' },
      stats.byType.DATA_MISMATCH
    );
  }
}
*/
