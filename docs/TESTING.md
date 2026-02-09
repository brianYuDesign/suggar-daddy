# 測試說明

## 目前測試範圍

### Libs

- **libs/common**：單元測試
  - `ShardingService`：分片 ID 計算、同一 key 同 shard、分佈
  - `getDatabaseConfig`：單機 / 讀寫分離（replication）環境變數
  - `RolesGuard`：依角色放行/拒絕
  - `StripeService`：未設定 key 時不拋錯、`isConfigured()`、`getStripeInstance()` 拋錯

### Apps（業務與功能單元測試）

| 專案 | 被測對象 | 涵蓋重點 |
|------|----------|----------|
| **auth-service** | `AuthService` | 註冊、登入、refresh、logout；重複 email、錯誤密碼、無效 refresh |
| **user-service** | `UserService` | getMe、getProfile、getCard、updateProfile；用戶不存在 |
| **matching-service** | `MatchingService` | getHealth、getCards、swipe（無配對/雙向 like）、getMatches、unmatch |
| **notification-service** | `NotificationService` | send、list（依 userId/unreadOnly）、markRead |
| **messaging-service** | `MessagingService` | ensureConversation、send、isParticipant、getMessages、getConversations |
| **payment-service** | `PostPurchaseService`、`TipService` | PPV 建立/重複購買防呆、findByBuyer/findOne；打賞建立、findByFrom/To、findOne |
| **subscription-service** | `SubscriptionService` | create、findOne、extendPeriod、cancel |
| **content-service** | `PostService` | create、findOne、findOneWithAccess（創作者/PPV 解鎖/鎖定/無 viewerId） |
| **db-writer-service** | `DbWriterService` | handleUserCreated、handlePostCreated；必填欄位缺失不寫入 |

## 如何執行

在專案根目錄：

```bash
# 執行所有 Nx 專案的 test target
nx run-many -t test --all

# 僅執行單一專案
nx run auth-service:test
nx run common:test

# 僅執行 common lib（在 lib 目錄下直接跑 Jest）
cd libs/common && npx jest --config jest.config.ts
```

CI 腳本 `scripts/ci-check.sh` 會依設定執行 lint 與 test。

## 撰寫新測試

- 放在與被測檔案同目錄、檔名 `*.spec.ts` 或 `*.test.ts`。
- libs 與 apps 皆使用根目錄的 `jest.preset.js`；各專案的 `jest.config.ts` 會設定 `displayName`、`coverageDirectory` 與 `moduleNameMapper`（apps 需解析 `@suggar-daddy/*`）。
- 測試環境變數時請在 `beforeEach` 還原，避免影響其他用例。
- 對 Redis、Kafka、TypeORM 等依賴使用 Jest mock，不連真實服務。

## 尚未覆蓋

- 各 app 的 controller 層整合測試
- E2E
- Stripe / Kafka 的整合測試（需 mock 或 test 環境）
- **media-service**：尚未加入 Nx 專案圖，可補 `project.json` + Jest + `MediaService` / `MediaUploadService` 單元測試
