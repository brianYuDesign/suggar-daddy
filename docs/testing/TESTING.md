# 測試說明

## 目前測試範圍

### 總覽（2026-02-14 更新）

| 測試類型 | 覆蓋率 | 狀態 | 備註 |
|---------|--------|------|------|
| **後端單元測試** | 76% | ✅ 良好 | 33 個測試檔案，600+ 測試案例 |
| **後端 E2E 測試** | 100% | ✅ 優秀 | 233/233 通過 |
| **前端單元測試** | 35% | ⚠️ 待改進 | Web 30%, Admin 40% |
| **前端 E2E 測試** | 部分 | ⚠️ 待改進 | Admin 有 Puppeteer 測試 |
| **整合測試** | 部分 | ⚠️ 待改進 | 部分服務有整合測試 |

### Libs

- **libs/common**：單元測試
  - `ShardingService`：分片 ID 計算、同一 key 同 shard、分佈
  - `getDatabaseConfig`：單機 / 讀寫分離（replication）環境變數
  - `RolesGuard`：依角色放行/拒絕
  - `StripeService`：未設定 key 時不拋錯、`isConfigured()`、`getStripeInstance()` 拋錯

### Apps（業務與功能單元測試）

| 專案 | 被測對象 | 涵蓋重點 |
|------|----------|----------|
| **api-gateway** | `ProxyService`、HTTP 路由 | 路由匹配（17 個服務端點）、最長前綴匹配、HTTP 方法轉發、錯誤處理（404/502/504）、header 轉發 |
| **auth-service** | `AuthService` | 註冊、登入、refresh、logout；重複 email、錯誤密碼、無效 refresh |
| **user-service** | `UserService` | getMe、getProfile、getCard、updateProfile；用戶不存在 |
| **matching-service** | `MatchingService` | getHealth、getCards、swipe（無配對/雙向 like）、getMatches、unmatch |
| **notification-service** | `NotificationService` | send、list（依 userId/unreadOnly）、markRead |
| **messaging-service** | `MessagingService` | ensureConversation、send、isParticipant、getMessages、getConversations |
| **payment-service** | `PostPurchaseService`、`TipService`、`WalletService` | PPV 建立/重複購買防呆、findByBuyer/findOne；打賞建立、findByFrom/To（分頁格式）、findOne；錢包服務 |
| **subscription-service** | `SubscriptionService` | create、findOne、extendPeriod、cancel |
| **content-service** | `PostService`、`ModerationService` | create、findOne、findOneWithAccess（創作者/PPV 解鎖/鎖定/無 viewerId）；內容審核 |
| **db-writer-service** | `DbWriterService` | handleUserCreated、handlePostCreated；必填欄位缺失不寫入 |

### E2E 整合測試

#### 測試執行總覽（2026-02-14 更新）

| 服務 | 狀態 | 測試數量 | 通過率 | 測試指令 |
|------|------|----------|---------|----------|
| **API Gateway** | ✅ 全部通過 | 29/29 | 100% | `npx nx test api-gateway --testPathPattern=api-gateway.e2e` |
| **Payment Service** | ✅ 全部通過 | 70/70 | 100% | `npx nx test payment-service --testPathPattern=payment.e2e` |
| **User Service** | ✅ 全部通過 | 33/33 | 100% | `npx nx test user-service --testFile="src/app/user.e2e.spec.ts"` |
| **Content Service** | ✅ 全部通過 | 46/46 | 100% | `npx nx test content-service --testFile="src/app/content.e2e.spec.ts"` |
| **Auth Service** | ✅ 全部通過 | 55/55 | 100% | `npx nx test auth-service --testFile="src/app/auth.e2e.spec.ts"` |
| **總計** | ✅ | 233/233 | **100%** | - |

**修復紀錄（2026-02-14）**：
- ✅ 修復 User Service 3 個失敗測試（Profile 公開訪問、CreateUserDto 驗證）
- ✅ 修復 Content Service 7 個失敗測試（OptionalJwtGuard、Redis mock、路由修正）
- ✅ 修復 Auth Service 5 個失敗測試（DTO 驗證、Redis mock、logout 測試）
- ✅ 安裝 OpenTelemetry 依賴並修復 tracing.service.ts
- ✅ 達成目標：100% E2E 測試通過率

#### API Gateway (E2E) ✅
**測試檔案**: `apps/api-gateway/src/app/api-gateway.e2e.spec.ts`  
**測試數量**: 29 個測試全部通過  
**測試執行**: `npx nx test api-gateway --testPathPattern=api-gateway.e2e`

**涵蓋範圍**:
- ✅ Root & Health 端點（2 個測試）
- ✅ 路由匹配機制（10 個測試）- 包含所有 17 個服務路由
- ✅ 路由優先級（3 個測試）- 最長前綴匹配邏輯
- ✅ 請求代理轉發（4 個測試）- Authorization header、query params、POST body
- ✅ HTTP 方法支援（5 個測試）- GET、POST、PUT、DELETE、PATCH
- ✅ 錯誤處理（2 個測試）- 502 Bad Gateway、504 Gateway Timeout
- ✅ Header 轉發（3 個測試）- Authorization、Content-Type、其他 headers 過濾

**服務路由覆蓋**:
- `/api/auth` → auth-service:3002
- `/api/users` → user-service:3001
- `/api/matching` → matching-service:3003
- `/api/notifications` → notification-service:3004
- `/api/messaging` → messaging-service:3005
- `/api/moderation`, `/api/posts` → content-service:3006
- `/api/tips`, `/api/post-purchases`, `/api/transactions`, `/api/stripe`, `/api/wallet` → payment-service:3007
- `/api/upload`, `/api/media` → media-service:3008
- `/api/subscription-tiers`, `/api/subscriptions` → subscription-service:3009
- `/api/admin` → admin-service:3011

#### Payment Service (E2E) 🚧
**測試檔案**: `apps/payment-service/src/app/payment.e2e.spec.ts`  
**測試數量**: 42 個測試  
**狀態**: 測試框架已建立，需要修復 TypeScript 編譯問題  
**測試執行**: `npx nx test payment-service --testPathPattern=payment.e2e`

**涵蓋範圍**:
- Tips 端點（POST, GET, GET/:id）
- Post Purchases 端點（POST, GET, GET/:id）
- Transactions 端點（POST, GET, GET/:id, PUT/:id）
- Wallet 端點（GET, earnings, history, withdrawals, withdraw）
- Admin Wallet 端點（pending withdrawals, process withdrawal）
- **Stripe Webhook 端點**（signature 驗證、事件處理、public 存取）
- 健康檢查與 API 結構驗證

#### User Service (E2E) 🚧
**測試檔案**: `apps/user-service/src/app/user.e2e.spec.ts`  
**測試數量**: 35 個測試  
**狀態**: 測試框架已建立，需要修復 TypeScript 編譯問題  
**測試執行**: `npx nx test user-service --testPathPattern=user.e2e`

**涵蓋範圍**:
- 用戶資料端點（GET /me, GET /profile/:userId, PUT /profile）
- 用戶建立端點（POST /）- 公開端點
- 推薦卡片端點（GET /cards）- 公開端點，支援 exclude 和 limit
- 封鎖功能（POST /block/:targetId, DELETE /block/:targetId, GET /blocked）
- 檢舉功能（POST /report）
- 管理員檢舉管理（GET /admin/reports, PUT /admin/reports/:reportId）
- 驗證測試（email 格式、角色 enum、必填欄位）

#### Content Service (E2E) 🚧
**測試檔案**: `apps/content-service/src/app/content.e2e.spec.ts`  
**測試數量**: 17 個測試  
**狀態**: 測試框架已建立，需要修復 TypeScript 編譯問題  
**測試執行**: `npx nx test content-service --testPathPattern=content.e2e`

**涵蓋範圍**:
- 貼文端點（POST, GET, GET/:id, PUT/:id, DELETE/:id）
- 公開存取測試（列表與詳情頁）
- 分頁支援（page, limit）
- 創作者篩選（creatorId）
- 審核端點（POST /moderation/queue, GET /moderation/pending）
- 權限驗證

#### Auth Service (E2E) 🚧
**測試檔案**: `apps/auth-service/src/app/auth.e2e.spec.ts`  
**測試數量**: 36 個測試  
**狀態**: 框架已建立，需要調整以匹配實際 API 結構
**測試執行**: `npx nx test auth-service --testPathPattern=auth.e2e`

**計劃涵蓋範圍**:
- 用戶註冊流程（驗證、重複檢查、欄位驗證）
- 用戶登入（認證流程、錯誤處理）
- Token 刷新機制
- 登出功能
- 密碼變更
- 郵件驗證流程
- 密碼重置流程
- 管理員權限端點（suspend、ban、reactivate）

### Admin E2E 測試

- `scripts/admin-browser-test.mjs` — Puppeteer 瀏覽器自動化測試
- `scripts/admin-e2e-test.mjs` — Admin 端到端測試腳本
- `scripts/screenshots/` — 測試截圖（登入、Dashboard、用戶管理、內容審核等）

## 如何執行

在專案根目錄：

```bash
# 執行所有 Nx 專案的 test target
npx nx run-many -t test --all

# 僅執行單一專案
npx nx test auth-service
npx nx test common
npx nx test api-gateway  # 執行 API Gateway E2E 測試

# CI 檢查（lint + test）
bash scripts/ci-check.sh
```

## 撰寫新測試

- 放在與被測檔案同目錄、檔名 `*.spec.ts` 或 `*.test.ts`。
- 對於 E2E 測試，使用 `*.e2e.spec.ts` 命名以區分整合測試與單元測試。
- libs 與 apps 皆使用根目錄的 `jest.preset.js`；各專案的 `jest.config.ts` 會設定 `displayName`、`coverageDirectory` 與 `moduleNameMapper`（apps 需解析 `@suggar-daddy/*`）。
- 測試環境變數時請在 `beforeEach` 還原，避免影響其他用例。
- 對 Redis、Kafka、TypeORM 等依賴使用 Jest mock，不連真實服務。
- E2E 測試應使用 `supertest` 進行 HTTP 端點測試。
- 透過 `.overrideProvider()` mock 外部依賴（如 RedisService）以避免連接真實服務。

### E2E 測試範例

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { RedisService } from '@suggar-daddy/redis';

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

describe('Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /endpoint should return data', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
      });
  });
});
```

## 尚未覆蓋

- User Service E2E 測試（進行中，8 個測試失敗）
- Content Service E2E 測試（進行中，7 個測試失敗）
- Auth Service E2E 測試（進行中，6 個測試失敗）
- 其他服務的 E2E 測試（Notification, Messaging, Subscription, Admin）
- Stripe / Kafka 的整合測試（需 mock 或 test 環境）
- 前端元件測試（web / admin）- **P0 優先級，目標 60% 覆蓋率**
- 跨服務的端到端測試（完整業務流程）
- 壓力測試和效能測試
- 安全性測試（滲透測試、漏洞掃描）

## 測試改進計劃（2026-02-13 更新）

### 短期（2 週內）
- [ ] 修復所有失敗的 E2E 測試（21 個）
- [ ] 達成 100% E2E 測試通過率
- [ ] 增加關鍵服務的整合測試

### 中期（1 個月內）
- [ ] 提升前端測試覆蓋率至 60%（當前 35%）
- [ ] 增加 Notification、Messaging 服務的 E2E 測試
- [ ] 增加跨服務整合測試

### 長期（3 個月內）
- [ ] 實施壓力測試（K6 或 JMeter）
- [ ] 實施安全性測試（OWASP ZAP、Snyk）
- [ ] 達成 80% 代碼覆蓋率目標

## 已安裝的測試工具

- **supertest** (^7.0.0) - HTTP 端點整合測試
- **@types/supertest** (^6.0.2) - TypeScript 型別定義
- Jest (v30.0.2) - 測試框架
- @nestjs/testing - NestJS 測試工具

---

## 📜 歷史修復記錄

- [E2E Rate Limit 修復](../archive/solutions/e2e-rate-limit-solution.md) - 解決 E2E 測試速率限制問題的三層策略
