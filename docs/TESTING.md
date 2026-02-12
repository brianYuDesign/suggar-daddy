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
| **payment-service** | `PostPurchaseService`、`TipService`、`WalletService` | PPV 建立/重複購買防呆、findByBuyer/findOne；打賞建立、findByFrom/To（分頁格式）、findOne；錢包服務 |
| **subscription-service** | `SubscriptionService` | create、findOne、extendPeriod、cancel |
| **content-service** | `PostService`、`ModerationService` | create、findOne、findOneWithAccess（創作者/PPV 解鎖/鎖定/無 viewerId）；內容審核 |
| **db-writer-service** | `DbWriterService` | handleUserCreated、handlePostCreated；必填欄位缺失不寫入 |

### Admin E2E 測試

- `scripts/admin-browser-test.mjs` — Puppeteer 瀏覽器自動化測試
- `scripts/admin-e2e-test.mjs` — Admin 端到端測試腳本
- `scripts/screenshots/` — 測試截圖（登入、Dashboard、用戶管理、內容審核等）

## 如何執行

在專案根目錄：

```bash
# 執行所有 Nx 專案的 test target
nx run-many -t test --all

# 僅執行單一專案
nx test auth-service
nx test common

# CI 檢查（lint + test）
bash scripts/ci-check.sh
```

## 撰寫新測試

- 放在與被測檔案同目錄、檔名 `*.spec.ts` 或 `*.test.ts`。
- libs 與 apps 皆使用根目錄的 `jest.preset.js`；各專案的 `jest.config.ts` 會設定 `displayName`、`coverageDirectory` 與 `moduleNameMapper`（apps 需解析 `@suggar-daddy/*`）。
- 測試環境變數時請在 `beforeEach` 還原，避免影響其他用例。
- 對 Redis、Kafka、TypeORM 等依賴使用 Jest mock，不連真實服務。

## 尚未覆蓋

- 各 app 的 controller 層整合測試
- Stripe / Kafka 的整合測試（需 mock 或 test 環境）
- 前端元件測試（web / admin）
