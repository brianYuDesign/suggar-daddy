import { Module, OnModuleInit } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RedisModule } from "@suggar-daddy/redis";
import { DataConsistencyService } from "./data-consistency.service";
import { DataConsistencyScheduler } from "./data-consistency-scheduler.service";
import { DataConsistencyController } from "./data-consistency.controller";

/**
 * 數據一致性模組
 *
 * 提供 Redis ↔ DB 數據一致性檢查和自動修復功能
 *
 * 功能：
 * - 定期或手動檢查數據一致性
 * - 自動修復不一致的數據
 * - 提供 Admin API 進行管理
 * - 監控和告警
 *
 * 使用方法：
 * 1. 在需要的 service 中導入此模組
 * 2. 注入 DataConsistencyScheduler
 * 3. 在 onModuleInit 中註冊需要檢查的實體
 *
 * @example
 * ```typescript
 * export class UserService implements OnModuleInit {
 *   constructor(
 *     private readonly scheduler: DataConsistencyScheduler,
 *   ) {}
 *
 *   onModuleInit() {
 *     this.scheduler.registerScheduledCheck({
 *       config: {
 *         entityName: 'User',
 *         redisKeyPrefix: 'user:',
 *         entityClass: User,
 *         autoFix: true,
 *       },
 *     });
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    ScheduleModule.forRoot(), // 啟用定期任務
    RedisModule,
    TypeOrmModule, // 根據需要導入具體的 Repository
  ],
  providers: [DataConsistencyService, DataConsistencyScheduler],
  controllers: [DataConsistencyController],
  exports: [DataConsistencyService, DataConsistencyScheduler],
})
export class DataConsistencyModule {}
