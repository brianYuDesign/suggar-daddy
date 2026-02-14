# E2E 測試完整指南

> 本文件整合自根目錄散落的 E2E 測試相關文件，包含架構設計、實作報告、修復紀錄與執行指南。

---

## 目錄

1. [測試架構](#測試架構)
2. [Playwright 配置](#playwright-配置)
3. [Page Object Model](#page-object-model)
4. [API Helper 與 Fixtures](#api-helper-與-fixtures)
5. [測試案例總覽](#測試案例總覽)
6. [執行測試](#執行測試)
7. [CI/CD 整合](#cicd-整合)
8. [E2E 測試修復紀錄](#e2e-測試修復紀錄)
9. [後續優化建議](#後續優化建議)

---

## 測試架構

### 目錄結構

```
e2e/
├── admin/                    # Admin 面板測試
│   └── admin-dashboard.spec.ts
├── fixtures/                 # 測試固件
│   ├── users.fixture.ts
│   ├── posts.fixture.ts
│   └── transactions.fixture.ts
├── matching/                 # 配對測試
├── pages/                    # Page Object Model
│   ├── base.page.ts
│   └── web/
│       ├── auth/login.page.ts
│       ├── auth/register.page.ts
│       └── discover/discover.page.ts
├── payment/                  # 支付測試
├── performance/              # 性能測試
├── security/                 # 安全測試
├── subscription/             # 訂閱測試
├── tests/                    # 新增測試
│   ├── auth/
│   ├── matching/
│   └── subscription/
├── utils/                    # 測試工具
│   ├── api-helper.ts
│   └── test-helpers.ts
├── web/                      # Web App 測試
└── user-journeys.spec.ts     # 用戶旅程測試
```

### 測試金字塔

```
     E2E (10%)           <-- Playwright 前端 E2E
    /         \
   Integration (20%)     <-- NestJS e2e.spec.ts (supertest)
  /              \
 Unit Tests (70%)        <-- Jest 單元測試
```

### 設計原則

- **AAA 模式**：Arrange / Act / Assert
- **獨立性**：測試間無依賴，可隨機順序執行
- **描述性命名**：使用 TC-XXX 編號
- **Mock 外部依賴**：Stripe、OAuth 等均使用 Mock
- **智能等待**：避免硬編碼延遲，等待特定條件

---

## Playwright 配置

- 5 個瀏覽器：Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Web Server 自動啟動（Web App + API Gateway）
- 失敗時錄影與截圖
- HTML 報告
- 失敗重試：CI 環境 2 次
- 並行執行：本地自動，CI 1 worker
- 超時設置：預設 30 秒

### 測試環境

| 服務 | 地址 |
|------|------|
| Web App | http://localhost:4200 |
| API Gateway | http://localhost:3000 |

---

## Page Object Model

### BasePage

提供導航、等待、截圖等基礎方法。

### LoginPage

- 登入表單操作、記住我、OAuth 登入、錯誤訊息處理

### RegisterPage

- 註冊表單、角色選擇（CREATOR/SUBSCRIBER）、密碼確認、服務條款

### DiscoverPage

- 個人資料卡片、滑動操作（喜歡/略過/超級喜歡）、復原、配對彈窗

### 範例

```typescript
export class LoginPage extends BasePage {
  private emailInput = () => this.page.locator('input[name="email"]');

  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    // ...
  }
}
```

---

## API Helper 與 Fixtures

### ApiHelper (17 個方法)

`createUser`, `loginAndGetToken`, `getCurrentUser`, `createPost`, `swipe`, `createSubscription`, `getSubscriptionTiers`, `createTip`, `deleteUser`, `deletePost`, `getMatches`, `updateProfile`, `suspendUser` 等。

### Extended Test Fixtures

| Fixture | 說明 |
|---------|------|
| `loginPage` | LoginPage 實例 |
| `registerPage` | RegisterPage 實例 |
| `discoverPage` | DiscoverPage 實例 |
| `apiHelper` | ApiHelper 實例 |
| `authenticatedPage` | 已登入的訂閱者頁面 |
| `creatorPage` | 已登入的創作者頁面 |
| `adminPage` | 已登入的管理員頁面 |

### 使用範例

```typescript
import { test, expect } from '../../fixtures/extended-test';

test('已登入測試', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/profile');
  await expect(authenticatedPage.locator('h1')).toContainText('個人資料');
});
```

---

## 測試案例總覽

**總計：51 個前端 E2E 測試案例**

### 認證測試 (27 cases)

**登入流程** (15 cases) — `tests/auth/login.spec.ts`

| 編號 | 說明 |
|------|------|
| TC-001~003 | 不同角色成功登入（訂閱者/創作者/管理員） |
| TC-004~005 | 錯誤密碼、不存在 Email |
| TC-006~008 | 空白欄位、格式錯誤 |
| TC-009~015 | 記住我、導航連結、OAuth、登入限流、Session 維持 |

**註冊流程** (12 cases) — `tests/auth/registration.spec.ts`

| 編號 | 說明 |
|------|------|
| TC-001~002 | 成功註冊訂閱者/創作者 |
| TC-003~009 | 必填欄位、格式、密碼強度、重複 Email |
| TC-010~012 | 服務條款、導航連結、密碼可見性 |

### 配對測試 (12 cases) — `tests/matching/swipe-flow.spec.ts`

| 編號 | 說明 |
|------|------|
| TC-001~005 | 載入探索頁、喜歡、略過、超級喜歡、連續滑動 |
| TC-006~009 | 復原、雙向配對彈窗、無更多資料提示、個人資料詳情 |
| TC-010~012 | 手勢支援、配對列表、進入聊天 |

### 訂閱測試 (12 cases) — `tests/subscription/subscribe-flow.spec.ts`

| 編號 | 說明 |
|------|------|
| TC-001~002 | 查看層級列表、價格顯示 |
| TC-003~006 | 訂閱創作者(Mock Stripe)、我的訂閱、取消、升級 |
| TC-007~008 | 內容存取權限控制 |
| TC-009~012 | 歷史紀錄、自動續訂、到期提醒、新內容通知 |

---

## 執行測試

### 前置準備

```bash
# 安裝依賴
npm install
npx playwright install chromium

# 啟動服務（分別開兩個終端機）
nx serve web          # http://localhost:4200
nx serve api-gateway  # http://localhost:3000
```

### 測試用戶

確保資料庫中有以下測試帳號：

| Email | 密碼 | 角色 |
|-------|------|------|
| subscriber@test.com | Test1234! | SUBSCRIBER |
| creator@test.com | Test1234! | CREATOR |
| admin@test.com | Admin1234! | ADMIN |

### 執行方式

```bash
# 使用快捷腳本
./e2e-test-run.sh all          # 全部
./e2e-test-run.sh auth         # 認證
./e2e-test-run.sh matching     # 配對
./e2e-test-run.sh subscription # 訂閱
./e2e-test-run.sh ui           # UI 可視化模式
./e2e-test-run.sh report       # 查看報告

# 直接使用 Playwright
npx playwright test tests/auth
npx playwright test tests/auth/login.spec.ts:28  # 特定案例
npx playwright test --ui                          # UI 模式
npx playwright test --headed                      # 有頭模式
npx playwright test --debug                       # 調試模式
npx playwright test tests/auth --project=chromium # 指定瀏覽器
```

### 常見問題

| 問題 | 原因 | 解決 |
|------|------|------|
| 測試超時 | 服務未啟動或頁面載入慢 | 確認服務正常，調整超時設置 |
| 元素找不到 | 選擇器與實際不符 | 查看失敗截圖，更新 Page Object |
| 登入失敗 | 測試用戶不存在 | 建立上述測試帳號 |

---

## CI/CD 整合

在 `.github/workflows/e2e-tests.yml` 中設定：

1. 啟動 PostgreSQL、Redis、Kafka 服務容器
2. `npm ci` + `npx playwright install --with-deps`
3. Build 並啟動 api-gateway、auth-service、web
4. 執行 `npm run e2e`
5. 上傳 `playwright-report/` 為 artifact

---

## E2E 測試修復紀錄

### 修復前後對比

| 服務 | 修復前 | 修復後 |
|------|--------|--------|
| User Service | 25/33 (75.8%) | 33/33 (100%) |
| Content Service | 39/46 (84.8%) | 46/46 (100%) |
| Auth Service | 49/55 (89.1%) | 55/55 (100%) |
| **總計** | **212/233 (91.0%)** | **233/233 (100%)** |

### 關鍵修復項目

**User Service**
- 在 `user.controller.ts` 的 `getProfile` 添加 `@Public()` 裝飾器
- 修正測試中的 email 欄位（email 由 auth-service 管理）
- 更新 HTTP 狀態碼期望值（403 Forbidden）

**Content Service**
- 修正 supertest import（`import request from 'supertest'`）
- 修正 `OptionalJwtGuard` 的 `canActivate` 返回值處理
- 補充 Redis mock 缺少的方法（`lLen`, `lRange`, `mget`）
- 修正路由不匹配問題

**Auth Service**
- 安裝 OpenTelemetry 依賴並修正 import
- 更新 `logout` 方法測試（新增 user 參數）
- 添加 `setex` 方法到 Redis mock
- 新增 `ForgotPasswordDto`, `ResetPasswordDto`, `ChangePasswordDto`
- 更新未認證請求期望為 401

### 驗證指令

```bash
npx nx test user-service --testFile="src/app/user.e2e.spec.ts"
npx nx test content-service --testFile="src/app/content.e2e.spec.ts"
npx nx test auth-service --testFile="src/app/auth.e2e.spec.ts"
```

---

## 後續優化建議

### 短期

- 執行前端 E2E 測試並修復失敗案例
- 整合到 CI/CD 流程
- 設置測試報告監控

### 中期

- 增加打賞、內容發布、管理後台測試
- 完整用戶旅程測試（訂閱者旅程、創作者旅程）
- 優化測試執行時間

### 長期

- 達成 95%+ 測試覆蓋率
- 建立視覺回歸測試
- 建立測試數據管理系統（Test Factory）
- 實現測試效能監控

---

## 參考資源

- [Playwright 官方文檔](https://playwright.dev/)
- [E2E 測試目錄](../../e2e/README.md)
- [後端測試覆蓋率](./TEST_COVERAGE_ASSESSMENT.md)
