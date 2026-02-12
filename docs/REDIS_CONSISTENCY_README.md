# Redis ↔ DB 數據一致性系統

## 概述

本系統提供 Redis 與 PostgreSQL 之間的數據一致性保證機制，確保緩存數據與資料庫數據保持同步。

## 檔案結構

### 核心程式碼

```
libs/common/src/lib/
├── data-consistency.service.ts          # 核心一致性檢查邏輯 (380 行)
├── data-consistency-scheduler.service.ts # 定期任務調度 (180 行)
├── data-consistency.controller.ts        # Admin API 接口 (175 行)
├── data-consistency.module.ts            # NestJS 模組 (60 行)
└── data-consistency.service.spec.ts     # 單元測試 (380 行)
```

### 文檔

```
docs/
├── REDIS_DB_CONSISTENCY_GUIDE.md               # 完整使用指南 (900+ 行)
└── REDIS_CONSISTENCY_INTEGRATION_EXAMPLE.md    # 集成示例 (350+ 行)
```

## 核心功能

### 1. 數據檢查

**支持的不一致類型**：

- **REDIS_ONLY**：Redis 有但 DB 沒有（孤立緩存）
  - 修復策略：刪除 Redis 中的孤立數據
- **DB_ONLY**：DB 有但 Redis 沒有（緩存缺失）
  - 修復策略：從 DB 同步到 Redis
- **DATA_MISMATCH**：數據不匹配（髒數據）
  - 修復策略：用 DB 數據覆蓋 Redis

### 2. 自動修復

**修復原則**：以 DB 為唯一真實來源（Single Source of Truth）

- Redis 被視為 DB 的衍生數據（緩存）
- 所有不一致情況均以 DB 數據為準
- 修復操作只影響 Redis，不修改 DB

### 3. 定期調度

**預設調度時間**：每天凌晨 3:00 AM（可自定義）

**支持的配置**：
- 自定義 Cron 表達式
- 啟用/禁用特定實體檢查
- 自動修復開關
- 欄位級別比較（可選擇性忽略特定欄位）

### 4. Admin API

**提供的接口**：

| 端點 | 方法 | 說明 |
|------|------|------|
| `/admin/data-consistency/inconsistencies` | GET | 獲取所有不一致記錄（支持過濾） |
| `/admin/data-consistency/statistics` | GET | 獲取統計信息 |
| `/admin/data-consistency/check` | POST | 手動觸發所有檢查 |
| `/admin/data-consistency/check/:entityName` | POST | 手動觸發特定實體檢查 |
| `/admin/data-consistency/scheduled-checks` | GET | 獲取調度任務列表 |
| `/admin/data-consistency/scheduled-checks/:entityName/toggle` | POST | 啟用/禁用調度任務 |
| `/admin/data-consistency/alert-threshold` | POST | 設置告警閾值 |
| `/admin/data-consistency/clear` | POST | 清除不一致記錄 |
| `/admin/data-consistency/health` | GET | 健康檢查 |

## 快速上手

### 步驟 1：導入模組

```typescript
// app.module.ts
import { DataConsistencyModule } from '@suggar-daddy/common';

@Module({
  imports: [
    DataConsistencyModule,
    // ... 其他模組
  ],
})
export class AppModule {}
```

### 步驟 2：註冊檢查任務

```typescript
// user.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataConsistencyScheduler } from '@suggar-daddy/common';
import { User } from './entities/user.entity';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    private readonly scheduler: DataConsistencyScheduler,
  ) {}

  onModuleInit() {
    this.scheduler.registerScheduledCheck({
      config: {
        entityName: 'User',
        redisKeyPrefix: 'user:',
        entityClass: User,
        autoFix: true,
      },
    });
  }
}
```

### 步驟 3：手動觸發檢查

```bash
# 觸發所有檢查
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/admin/data-consistency/check

# 查看統計
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/admin/data-consistency/statistics
```

## 配置選項

### ConsistencyCheckConfig

| 屬性 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `entityName` | string | ✅ | 實體類型名稱（例如：User, Post） |
| `redisKeyPrefix` | string | ✅ | Redis key 前綴（例如：user:, post:） |
| `entityClass` | any | ✅ | TypeORM 實體類 |
| `idField` | string | ❌ | 唯一標識符欄位名稱（預設：id） |
| `fieldsToCompare` | string[] | ❌ | 需要比較的欄位列表（為空則比較所有欄位） |
| `autoFix` | boolean | ❌ | 是否啟用自動修復（預設：false） |

### ScheduledCheckConfig

| 屬性 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `config` | ConsistencyCheckConfig | ✅ | 檢查配置 |
| `cronExpression` | string | ❌ | Cron 表達式（預設：每天凌晨 3 點） |
| `enabled` | boolean | ❌ | 是否啟用（預設：true） |

## 監控與告警

### 關鍵指標

| 指標 | 說明 | 告警條件 |
|------|------|---------|
| `total_inconsistencies` | 總不一致數量 | > threshold |
| `pending_fixes` | 待修復數量 | > threshold |
| `fix_success_rate` | 修復成功率 | < 95% |
| `check_duration` | 檢查耗時 | > 5 分鐘 |

### 設置告警閾值

```typescript
this.scheduler.setAlertThreshold(50); // 超過 50 條不一致則告警
```

## 最佳實踐

### 1. 選擇合適的檢查時間

- 選擇系統負載最低的時段（通常為凌晨 2-4 點）
- 避免與備份、日誌歸檔等其他定期任務衝突

### 2. 謹慎使用自動修復

- 生產環境初期：先設置 `autoFix: false`，手動檢查不一致原因
- 穩定運行後：開啟 `autoFix: true`，但保留詳細日誌
- 關鍵數據：謹慎使用自動修復，優先人工審核

### 3. 限制檢查範圍

```typescript
// 只比較關鍵業務欄位，忽略時間戳
fieldsToCompare: ['username', 'email', 'status', 'profileData'],
```

### 4. 定期清理歷史記錄

```typescript
// 每次檢查前清除舊記錄
this.consistencyService.clearInconsistencies();
```

## 架構設計

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

### 比較邏輯

1. **從 DB 加載所有實體**
2. **從 Redis 掃描所有 key**（使用 SCAN，避免阻塞）
3. **逐一比較數據**：
   - 檢查 Redis 有但 DB 沒有（REDIS_ONLY）
   - 檢查 DB 有但 Redis 沒有（DB_ONLY）
   - 比較數據是否匹配（DATA_MISMATCH）
4. **記錄不一致情況**
5. **執行自動修復**（如果啟用）

## 測試

### 運行單元測試

```bash
npx nx test common
```

### 測試覆蓋範圍

- ✅ 檢測 REDIS_ONLY 不一致
- ✅ 檢測 DB_ONLY 不一致
- ✅ 檢測 DATA_MISMATCH 不一致
- ✅ 自動修復功能
- ✅ 統計信息計算
- ✅ 忽略 createdAt/updatedAt 欄位

## 依賴項

### 前置條件

- ✅ NestJS（v10+）
- ✅ TypeORM（v0.3+）
- ✅ PostgreSQL
- ✅ Redis
- ✅ @nestjs/schedule

### 安裝

```bash
npm install @nestjs/schedule
```

## 故障排查

### 問題 1：檢查耗時過長

**解決方案**：
- 分批檢查（使用 offset 和 limit）
- 增加 SCAN COUNT 參數
- 添加 DB 索引

### 問題 2：大量 REDIS_ONLY 不一致

**解決方案**：
- 優化寫入邏輯（確保事務一致性）
- 實現緩存失效機制（設置 TTL）

### 問題 3：大量 DATA_MISMATCH 不一致

**解決方案**：
- 統一數據格式（Date 序列化）
- 使用分散式鎖防止並發衝突
- 忽略特定欄位（如 updatedAt）

## 文檔

### 完整指南

詳見 [`docs/REDIS_DB_CONSISTENCY_GUIDE.md`](./REDIS_DB_CONSISTENCY_GUIDE.md)

**內容包括**：
- 背景與動機
- 架構設計
- 核心功能
- 使用指南
- API 文檔
- 最佳實踐
- 監控與告警
- 故障排查

### 集成示例

詳見 [`docs/REDIS_CONSISTENCY_INTEGRATION_EXAMPLE.md`](./REDIS_CONSISTENCY_INTEGRATION_EXAMPLE.md)

**內容包括**：
- 步驟 1：更新 app.module.ts
- 步驟 2：更新 user.service.ts
- 步驟 3：環境變數配置
- 步驟 4：使用 Admin API
- 進階配置：多實體檢查
- 監控與告警集成

## 貢獻

如有問題或建議，請聯繫技術團隊或提交 Issue。

## 授權

本系統為 Suggar Daddy 專案的一部分，遵循專案授權條款。
