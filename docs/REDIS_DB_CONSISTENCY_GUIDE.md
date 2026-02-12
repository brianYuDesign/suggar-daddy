# Redis ↔ DB 數據一致性策略

## 概述

本文檔描述 Redis 與 PostgreSQL 之間的數據一致性保證機制。該系統提供自動檢測、修復和監控功能，確保緩存數據與資料庫數據保持同步。

## 目錄

- [背景與動機](#背景與動機)
- [架構設計](#架構設計)
- [核心功能](#核心功能)
- [使用指南](#使用指南)
- [API 文檔](#api-文檔)
- [最佳實踐](#最佳實踐)
- [監控與告警](#監控與告警)
- [故障排查](#故障排查)

---

## 背景與動機

### 為什麼需要一致性檢查？

在使用 Redis 作為 PostgreSQL 的緩存層時，可能出現以下數據不一致情況：

1. **Redis 有但 DB 沒有**（孤立緩存）
   - 原因：DB 寫入失敗但 Redis 已更新
   - 影響：讀取到不存在的數據，可能導致業務錯誤

2. **DB 有但 Redis 沒有**（緩存缺失）
   - 原因：緩存過期、Redis 重啟、手動 DB 操作
   - 影響：緩存穿透，增加 DB 壓力

3. **數據不匹配**（髒數據）
   - 原因：並發更新、部分更新失敗、Redis 與 DB 操作未在同一事務中
   - 影響：用戶看到過時或錯誤的數據

### 解決方案

本系統提供三個層次的保障：

1. **定期掃描**：每天凌晨自動檢查所有實體
2. **手動觸發**：管理員可隨時執行檢查
3. **自動修復**：以 DB 為準自動修復不一致數據

---

## 架構設計

### 組件結構

```
libs/common/src/lib/
├── data-consistency.service.ts          # 核心檢查邏輯
├── data-consistency-scheduler.service.ts # 定期任務調度
├── data-consistency.controller.ts        # Admin API
└── data-consistency.module.ts            # NestJS 模組
```

### 數據流

```
┌──────────────┐       ┌──────────────┐
│  PostgreSQL  │       │    Redis     │
└──────┬───────┘       └──────┬───────┘
       │                      │
       │                      │
       └──────┐     ┌─────────┘
              │     │
              ▼     ▼
       ┌──────────────────┐
       │ ConsistencyCheck │
       │    Service       │
       └─────────┬────────┘
                 │
                 ▼
       ┌──────────────────┐
       │   Inconsistency  │
       │     Report       │
       └─────────┬────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
  ┌─────────┐        ┌─────────┐
  │  Alert  │        │ Auto Fix│
  └─────────┘        └─────────┘
```

---

## 核心功能

### 1. 數據檢查

**支持的不一致類型**：

| 類型 | 說明 | 修復策略 |
|------|------|---------|
| `REDIS_ONLY` | Redis 有但 DB 沒有 | 刪除 Redis 中的孤立數據 |
| `DB_ONLY` | DB 有但 Redis 沒有 | 從 DB 同步到 Redis |
| `DATA_MISMATCH` | 數據不匹配 | 用 DB 數據覆蓋 Redis |

**檢查方法**：

1. 從 DB 加載所有實體
2. 從 Redis 掃描所有相關 key（使用 SCAN，避免阻塞）
3. 逐一比較數據
4. 記錄不一致情況

### 2. 自動修復

**修復原則**：**以 DB 為唯一真實來源（Single Source of Truth）**

- Redis 被視為 DB 的衍生數據（緩存）
- 所有不一致情況均以 DB 數據為準
- 修復操作只影響 Redis，不修改 DB

**修復流程**：

```typescript
switch (inconsistencyType) {
  case 'REDIS_ONLY':
    // 刪除 Redis 中的孤立數據
    await redis.del(`user:${userId}`);
    break;
    
  case 'DB_ONLY':
    // 從 DB 同步到 Redis
    await redis.set(`user:${userId}`, JSON.stringify(dbUser));
    break;
    
  case 'DATA_MISMATCH':
    // 用 DB 數據覆蓋 Redis
    await redis.set(`user:${userId}`, JSON.stringify(dbUser));
    break;
}
```

### 3. 定期調度

**預設調度時間**：每天凌晨 3:00 AM（可自定義）

**選擇凌晨的原因**：
- 系統負載較低
- 用戶活動較少
- 可接受短暫的性能影響

**自定義 Cron 表達式**：

```typescript
scheduler.registerScheduledCheck({
  config: { /* ... */ },
  cronExpression: '0 2 * * *', // 凌晨 2 點
});
```

---

## 使用指南

### 步驟 1：導入模組

在需要數據一致性檢查的 service 中導入 `DataConsistencyModule`：

```typescript
// 例如：apps/user-service/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { DataConsistencyModule } from '@suggar-daddy/common';

@Module({
  imports: [
    DataConsistencyModule, // 導入一致性模組
    // ... 其他模組
  ],
})
export class AppModule {}
```

### 步驟 2：註冊檢查任務

在 Service 的 `onModuleInit` 中註冊需要檢查的實體：

```typescript
// 例如：apps/user-service/src/app/user.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataConsistencyScheduler } from '@suggar-daddy/common';
import { User } from './entities/user.entity';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    private readonly scheduler: DataConsistencyScheduler,
  ) {}

  onModuleInit() {
    // 註冊 User 實體的一致性檢查
    this.scheduler.registerScheduledCheck({
      config: {
        entityName: 'User',
        redisKeyPrefix: 'user:',
        entityClass: User,
        idField: 'id', // 預設為 'id'
        fieldsToCompare: ['username', 'email', 'profileData'], // 可選，預設比較所有欄位
        autoFix: true, // 啟用自動修復
      },
      cronExpression: '0 3 * * *', // 可選，預設為凌晨 3 點
      enabled: true, // 可選，預設為 true
    });
  }
}
```

### 步驟 3：批量註冊多個實體

如果需要檢查多個實體，可以批量註冊：

```typescript
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';

onModuleInit() {
  this.scheduler.registerMultipleChecks([
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
        entityName: 'Post',
        redisKeyPrefix: 'post:',
        entityClass: Post,
        autoFix: true,
      },
    },
    {
      config: {
        entityName: 'Comment',
        redisKeyPrefix: 'comment:',
        entityClass: Comment,
        fieldsToCompare: ['content', 'authorId', 'postId'], // 只比較這些欄位
        autoFix: false, // 手動修復
      },
    },
  ]);
}
```

### 步驟 4：配置告警

設置不一致數量超過閾值時的告警：

```typescript
onModuleInit() {
  // 設置告警閾值為 50 條
  this.scheduler.setAlertThreshold(50);
  
  // 註冊檢查任務...
}
```

---

## API 文檔

### 1. 獲取所有不一致記錄

**端點**：`GET /admin/data-consistency/inconsistencies`

**查詢參數**：
- `entityType` (可選)：過濾實體類型（例如：User）
- `type` (可選)：過濾不一致類型（REDIS_ONLY / DB_ONLY / DATA_MISMATCH）
- `fixed` (可選)：過濾是否已修復（true / false）

**示例請求**：
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/admin/data-consistency/inconsistencies?entityType=User&fixed=false"
```

**示例響應**：
```json
{
  "total": 3,
  "records": [
    {
      "entityType": "User",
      "entityId": "123",
      "type": "DATA_MISMATCH",
      "redisValue": { "username": "old_name", "email": "old@example.com" },
      "dbValue": { "username": "new_name", "email": "new@example.com" },
      "detectedAt": "2026-02-12T15:30:00.000Z",
      "fixed": false
    }
  ]
}
```

### 2. 獲取統計信息

**端點**：`GET /admin/data-consistency/statistics`

**示例請求**：
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/admin/data-consistency/statistics"
```

**示例響應**：
```json
{
  "total": 15,
  "fixed": 12,
  "pending": 3,
  "byType": {
    "REDIS_ONLY": 5,
    "DB_ONLY": 8,
    "DATA_MISMATCH": 2
  },
  "lastCheckTime": "2026-02-12T03:00:00.000Z"
}
```

### 3. 手動觸發所有檢查

**端點**：`POST /admin/data-consistency/check`

**示例請求**：
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/admin/data-consistency/check"
```

**示例響應**：
```json
{
  "success": true,
  "message": "一致性檢查完成",
  "total": 15,
  "fixed": 12,
  "pending": 3,
  "details": {
    "REDIS_ONLY": 5,
    "DB_ONLY": 8,
    "DATA_MISMATCH": 2
  }
}
```

### 4. 手動觸發特定實體檢查

**端點**：`POST /admin/data-consistency/check/:entityName`

**路徑參數**：
- `entityName`：實體名稱（例如：User, Post）

**示例請求**：
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/admin/data-consistency/check/User"
```

**示例響應**：
```json
{
  "success": true,
  "message": "User 檢查完成",
  "entityName": "User",
  "inconsistenciesFound": 5,
  "fixed": 5
}
```

### 5. 獲取調度任務列表

**端點**：`GET /admin/data-consistency/scheduled-checks`

**示例響應**：
```json
[
  {
    "entityName": "User",
    "enabled": true,
    "cronExpression": "0 3 * * *"
  },
  {
    "entityName": "Post",
    "enabled": true,
    "cronExpression": "0 3 * * *"
  }
]
```

### 6. 啟用/禁用調度任務

**端點**：`POST /admin/data-consistency/scheduled-checks/:entityName/toggle`

**查詢參數**：
- `enabled`：true / false

**示例請求**：
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/admin/data-consistency/scheduled-checks/User/toggle?enabled=false"
```

### 7. 設置告警閾值

**端點**：`POST /admin/data-consistency/alert-threshold`

**查詢參數**：
- `threshold`：閾值數字

**示例請求**：
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/admin/data-consistency/alert-threshold?threshold=100"
```

### 8. 清除不一致記錄

**端點**：`POST /admin/data-consistency/clear`

**示例請求**：
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/admin/data-consistency/clear"
```

### 9. 健康檢查

**端點**：`GET /admin/data-consistency/health`

**示例響應**：
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T15:30:00.000Z",
  "lastCheckTime": "2026-02-12T03:00:00.000Z",
  "scheduledChecks": 5
}
```

---

## 最佳實踐

### 1. 選擇合適的檢查時間

**推薦**：
- 選擇系統負載最低的時段（通常為凌晨 2-4 點）
- 避免與備份、日誌歸檔等其他定期任務衝突
- 考慮時區差異（如果服務全球部署）

**示例**：
```typescript
// 美國東部時間凌晨 3 點
cronExpression: '0 3 * * *',

// 每週日凌晨 2 點（減少檢查頻率）
cronExpression: '0 2 * * 0',
```

### 2. 謹慎使用自動修復

**建議**：
- **生產環境初期**：先設置 `autoFix: false`，手動檢查不一致原因
- **穩定運行後**：開啟 `autoFix: true`，但保留詳細日誌
- **關鍵數據**：謹慎使用自動修復，優先人工審核

**示例（階段性策略）**：
```typescript
const isProduction = process.env.NODE_ENV === 'production';
const hasRunStable = process.env.STABLE_AFTER_DAYS > 30;

this.scheduler.registerScheduledCheck({
  config: {
    entityName: 'User',
    redisKeyPrefix: 'user:',
    entityClass: User,
    autoFix: isProduction && hasRunStable, // 生產環境且穩定運行 30 天後才自動修復
  },
});
```

### 3. 限制檢查範圍

**問題**：
- 全量檢查可能耗時較長
- 某些欄位（如 `updatedAt`）總是不一致

**解決方案**：
```typescript
this.scheduler.registerScheduledCheck({
  config: {
    entityName: 'User',
    redisKeyPrefix: 'user:',
    entityClass: User,
    // 只比較關鍵業務欄位，忽略時間戳
    fieldsToCompare: ['username', 'email', 'status', 'profileData'],
  },
});
```

### 4. 設置合理的告警閾值

**建議**：
- 根據實體總數設置百分比閾值（例如：0.1% 或 1%）
- 小系統：10-50 條
- 中型系統：50-200 條
- 大型系統：200-1000 條

**示例**：
```typescript
// 假設有 10,000 個用戶，設置 0.5% 的閾值
const totalUsers = 10000;
const thresholdPercent = 0.005;
this.scheduler.setAlertThreshold(Math.ceil(totalUsers * thresholdPercent)); // 50
```

### 5. 整合日誌和監控

**推薦工具**：
- **日誌**：Winston, Pino（已集成到 NestJS）
- **監控**：Prometheus + Grafana
- **告警**：Slack, PagerDuty, Email

**示例（整合 Slack 告警）**：
```typescript
// 在 DataConsistencyScheduler 中添加
private async sendSlackAlert(stats: any): Promise<void> {
  await this.httpService.post(process.env.SLACK_WEBHOOK_URL, {
    text: `⚠️ 數據一致性告警！`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `發現 *${stats.pending}* 條數據不一致\n` +
                `- REDIS_ONLY: ${stats.byType.REDIS_ONLY}\n` +
                `- DB_ONLY: ${stats.byType.DB_ONLY}\n` +
                `- DATA_MISMATCH: ${stats.byType.DATA_MISMATCH}`,
        },
      },
    ],
  }).toPromise();
}
```

### 6. 定期清理歷史記錄

**問題**：
- 不一致記錄會一直累積在記憶體中
- 可能導致記憶體洩漏

**解決方案**：
```typescript
// 每次檢查前清除上次的記錄
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async runScheduledChecks(): Promise<void> {
  this.consistencyService.clearInconsistencies(); // 清除舊記錄
  await this.executeAllChecks();
}
```

---

## 監控與告警

### 關鍵指標

| 指標 | 說明 | 告警條件 |
|------|------|---------|
| `total_inconsistencies` | 總不一致數量 | > threshold |
| `pending_fixes` | 待修復數量 | > threshold |
| `fix_success_rate` | 修復成功率 | < 95% |
| `check_duration` | 檢查耗時 | > 5 分鐘 |
| `redis_only_count` | Redis 孤立數據 | > 10% |
| `db_only_count` | 緩存缺失 | > 30% |

### Prometheus 指標（示例）

```typescript
// 在 DataConsistencyService 中添加 Prometheus 指標
import { Counter, Histogram } from 'prom-client';

private readonly inconsistencyCounter = new Counter({
  name: 'data_consistency_inconsistencies_total',
  help: 'Total number of inconsistencies detected',
  labelNames: ['entity_type', 'inconsistency_type'],
});

private readonly checkDuration = new Histogram({
  name: 'data_consistency_check_duration_seconds',
  help: 'Duration of consistency checks',
  labelNames: ['entity_type'],
});

// 在檢查結束時記錄
foundInconsistencies.forEach(i => {
  this.inconsistencyCounter.inc({
    entity_type: i.entityType,
    inconsistency_type: i.type,
  });
});
```

### Grafana 儀表板（示例查詢）

```promql
# 不一致總數（按類型）
sum by (inconsistency_type) (data_consistency_inconsistencies_total)

# 檢查耗時（99 分位數）
histogram_quantile(0.99, rate(data_consistency_check_duration_seconds_bucket[5m]))

# 修復成功率
sum(rate(data_consistency_fixes_success_total[5m])) /
sum(rate(data_consistency_fixes_total[5m]))
```

---

## 故障排查

### 問題 1：檢查耗時過長

**症狀**：
- 一致性檢查運行超過 10 分鐘
- 影響系統性能

**可能原因**：
1. Redis SCAN 操作緩慢（key 數量過多）
2. DB 查詢未優化（缺少索引）
3. 網絡延遲（Redis 與 DB 在不同機房）

**解決方案**：

**方案 1：分批檢查**
```typescript
// 分多次檢查，每次檢查一部分數據
const batchSize = 1000;
const offset = 0;

const dbEntities = await repository.find({
  skip: offset,
  take: batchSize,
});
```

**方案 2：添加索引**
```sql
-- 確保 ID 欄位有索引
CREATE INDEX idx_user_id ON users(id);
```

**方案 3：調整 SCAN 參數**
```typescript
// 增加每次 SCAN 的 COUNT 值
const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 1000); // 從 100 增加到 1000
```

### 問題 2：大量 REDIS_ONLY 不一致

**症狀**：
- 檢測到大量 Redis 有但 DB 沒有的情況

**可能原因**：
1. DB 寫入失敗但未回滾 Redis
2. 手動刪除了 DB 數據但未清理 Redis
3. 分散式事務未正確處理

**解決方案**：

**方案 1：優化寫入邏輯（確保事務一致性）**
```typescript
async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. 更新 DB
    const user = await queryRunner.manager.save(User, data);

    // 2. 更新 Redis
    await this.redis.set(`user:${userId}`, JSON.stringify(user));

    // 3. 提交事務
    await queryRunner.commitTransaction();
    return user;
  } catch (error) {
    // 4. 失敗時回滾（包括 Redis）
    await queryRunner.rollbackTransaction();
    await this.redis.del(`user:${userId}`); // 清理 Redis
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

**方案 2：實現緩存失效機制**
```typescript
// 設置 TTL，避免永久孤立數據
await this.redis.set(`user:${userId}`, JSON.stringify(user), 'EX', 3600); // 1 小時過期
```

### 問題 3：大量 DATA_MISMATCH 不一致

**症狀**：
- 數據不匹配的情況頻繁出現

**可能原因**：
1. 並發更新導致競態條件
2. 某些欄位在 Redis 和 DB 中格式不同（例如：Date 序列化）
3. 部分更新未同步到 Redis

**解決方案**：

**方案 1：統一數據格式**
```typescript
// 在比較前標準化數據
private normalizeValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
```

**方案 2：使用分散式鎖防止並發衝突**
```typescript
async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
  const lockKey = `lock:user:${userId}`;
  const lockValue = uuidv4();

  try {
    // 獲取鎖（NX = Not eXists, PX = 過期時間毫秒）
    const acquired = await this.redis.set(lockKey, lockValue, 'NX', 'PX', 5000);
    if (!acquired) {
      throw new Error('無法獲取鎖，請稍後重試');
    }

    // 執行更新邏輯
    const user = await this.updateUserInternal(userId, data);

    return user;
  } finally {
    // 釋放鎖（只有持鎖者才能釋放）
    const currentValue = await this.redis.get(lockKey);
    if (currentValue === lockValue) {
      await this.redis.del(lockKey);
    }
  }
}
```

**方案 3：忽略特定欄位**
```typescript
// 忽略總是不一致的欄位（如 updatedAt）
this.scheduler.registerScheduledCheck({
  config: {
    entityName: 'User',
    redisKeyPrefix: 'user:',
    entityClass: User,
    fieldsToCompare: ['username', 'email', 'status'], // 不包含 updatedAt
  },
});
```

### 問題 4：自動修復失敗

**症狀**：
- 檢測到不一致但修復失敗
- `fixed: false` 數量持續增加

**可能原因**：
1. Redis 連接問題
2. 數據格式不正確（JSON 序列化失敗）
3. 權限不足

**解決方案**：

**方案 1：添加重試機制**
```typescript
async fixInconsistency(
  inconsistency: InconsistencyRecord,
  config: ConsistencyCheckConfig
): Promise<boolean> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // 執行修復邏輯
      await this.performFix(inconsistency, config);
      return true;
    } catch (error) {
      retries++;
      this.logger.warn(`修復失敗（第 ${retries} 次重試）:`, error);
      await this.sleep(1000 * retries); // 指數退避
    }
  }

  this.logger.error(`修復失敗（已達最大重試次數）`);
  return false;
}

private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**方案 2：檢查數據格式**
```typescript
// 在修復前驗證數據
if (inconsistency.dbValue) {
  try {
    JSON.stringify(inconsistency.dbValue); // 測試是否可序列化
  } catch {
    this.logger.error(`無法序列化 DB 數據:`, inconsistency.dbValue);
    return false;
  }
}
```

**方案 3：記錄失敗原因**
```typescript
// 在 InconsistencyRecord 中添加失敗原因欄位
export interface InconsistencyRecord {
  // ... 其他欄位
  fixed: boolean;
  fixedAt?: Date;
  fixError?: string; // 記錄修復失敗的原因
}
```

---

## 附錄：配置示例

### 完整示例（User Service）

```typescript
// apps/user-service/src/app/user.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataConsistencyScheduler } from '@suggar-daddy/common';
import { User } from './entities/user.entity';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly scheduler: DataConsistencyScheduler,
  ) {}

  onModuleInit() {
    this.logger.log('初始化數據一致性檢查...');

    // 設置告警閾值
    this.scheduler.setAlertThreshold(50);

    // 註冊 User 實體檢查
    this.scheduler.registerScheduledCheck({
      config: {
        entityName: 'User',
        redisKeyPrefix: 'user:',
        entityClass: User,
        idField: 'id',
        fieldsToCompare: [
          'username',
          'email',
          'status',
          'profileData',
          'subscription',
        ],
        autoFix: process.env.NODE_ENV === 'production', // 生產環境自動修復
      },
      cronExpression: '0 3 * * *', // 每天凌晨 3 點
      enabled: true,
    });

    this.logger.log('數據一致性檢查已啟用');
  }
}
```

---

## 總結

本系統提供了完整的 Redis ↔ DB 數據一致性保障方案，包括：

✅ **自動檢測**：定期掃描 Redis 和 DB 的數據差異  
✅ **智能修復**：以 DB 為準自動修復不一致數據  
✅ **靈活配置**：支持自定義檢查時間、欄位、修復策略  
✅ **監控告警**：提供詳細的統計信息和告警機制  
✅ **管理介面**：Admin API 支持手動觸發和查看詳情  

**建議使用流程**：
1. 在測試環境先運行，關閉自動修復
2. 分析不一致原因，優化寫入邏輯
3. 生產環境啟用，開啟自動修復
4. 持續監控，定期查看統計信息

如有問題或建議，請聯繫技術團隊。
