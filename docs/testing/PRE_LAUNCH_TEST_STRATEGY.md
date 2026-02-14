### P2 - High (建議在上線後盡快補充)

| 編號 | 測試缺口 | 影響範圍 | 風險等級 | 預估時間 |
|------|---------|---------|---------|---------|
| 12 | Redis 快取一致性測試 | 效能與資料一致性 | 🟢 Low | 2天 |
| 13 | 壓力測試 (K6/JMeter) | 系統容量 | 🟢 Low | 3天 |
| 14 | 安全性測試 (OWASP ZAP) | 安全漏洞 | 🟡 Medium | 3天 |
| 15 | 可訪問性測試 (axe-core) | 無障礙訪問 | 🟢 Low | 2天 |

---

## 📋 上線前必須通過的測試清單

### 核心功能測試 (100% 必須通過)

#### 🔐 認證與授權
- [ ] 用戶註冊 (郵箱驗證、密碼強度)
- [ ] 用戶登入 (憑證驗證、JWT 發放)
- [ ] Token 刷新 (refresh token 機制)
- [ ] 登出 (token 撤銷)
- [ ] 密碼重置 (郵件發送、驗證)
- [ ] 角色權限控制 (Sugar Daddy/Baby/Admin)
- [ ] OAuth 登入 (Google/Facebook)

#### 👤 用戶管理
- [ ] 個人檔案 CRUD
- [ ] 用戶卡片推薦
- [ ] 封鎖用戶
- [ ] 解除封鎖
- [ ] 檢舉用戶
- [ ] 管理員處理檢舉

#### 📝 內容管理
- [ ] 貼文建立 (文字、圖片、PPV)
- [ ] 貼文編輯
- [ ] 貼文刪除
- [ ] 貼文列表 (分頁、篩選)
- [ ] 貼文權限控制 (public/subscribers/ppv)
- [ ] 內容審核提交
- [ ] 管理員審核 (批准/拒絕)

#### 💰 支付流程
- [ ] Stripe 支付初始化
- [ ] 信用卡付款
- [ ] 打賞創作者
- [ ] PPV 內容購買
- [ ] 訂閱建立 (月度/年度)
- [ ] 訂閱續期
- [ ] 訂閱取消
- [ ] Webhook 處理 (payment.succeeded/failed)
- [ ] 交易記錄查詢
- [ ] 錢包餘額管理
- [ ] 提現申請
- [ ] 管理員審批提現

#### 💕 配對系統
- [ ] 卡片滑動 (like/pass)
- [ ] 配對成功通知
- [ ] 配對列表查詢
- [ ] 取消配對

#### 💬 消息系統
- [ ] 對話建立
- [ ] 發送消息
- [ ] 接收消息
- [ ] 消息列表
- [ ] 對話列表
- [ ] 未讀消息計數

#### 🔔 通知系統
- [ ] 通知發送
- [ ] 通知列表
- [ ] 標記已讀
- [ ] 批量標記已讀
- [ ] 即時通知推送

#### 🛡️ 管理功能
- [ ] 儀表板數據統計
- [ ] 用戶管理 (列表/搜尋/停用/啟用)
- [ ] 內容審核佇列
- [ ] 檢舉處理
- [ ] 支付分析
- [ ] 提現管理
- [ ] 審計日誌
- [ ] 系統設定

### 非功能性測試 (建議通過)

#### ⚡ 效能測試
- [ ] 首頁載入時間 < 3秒
- [ ] API 響應時間 < 500ms (P95)
- [ ] Feed 滾動載入 < 1秒
- [ ] 搜尋響應 < 1秒
- [ ] 支付流程完成 < 5秒

#### 🔒 安全測試
- [ ] XSS 攻擊防護
- [ ] CSRF Token 驗證
- [ ] SQL Injection 防護
- [ ] 檔案上傳安全檢查
- [ ] Rate Limiting (登入: 5次/5分鐘)
- [ ] 敏感資料加密 (密碼、支付資訊)
- [ ] JWT Token 安全 (簽名、過期)

#### 🌐 相容性測試
- [ ] Chrome (最新版)
- [ ] Firefox (最新版)
- [ ] Safari (最新版)
- [ ] Edge (最新版)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

#### ♿ 可訪問性測試
- [ ] WCAG 2.1 Level AA 合規
- [ ] 鍵盤導航
- [ ] 螢幕閱讀器支援
- [ ] 色彩對比度

---

## 🏗️ Playwright E2E 測試架構設計

### 整體架構

```
e2e/
├── fixtures/                    # 測試數據固件
│   ├── users.fixture.ts         # 用戶測試數據
│   ├── posts.fixture.ts         # 貼文測試數據
│   ├── payments.fixture.ts      # 支付測試數據
│   └── subscriptions.fixture.ts # 訂閱測試數據
│
├── utils/                       # 測試工具
│   ├── test-helpers.ts          # 通用輔助函數
│   ├── auth-helpers.ts          # 認證輔助函數
│   ├── api-helpers.ts           # API 請求輔助
│   └── screenshot-helpers.ts    # 截圖輔助
│
├── pages/                       # Page Object Model
│   ├── web/
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── FeedPage.ts
│   │   ├── ProfilePage.ts
│   │   ├── WalletPage.ts
│   │   └── MessagesPage.ts
│   └── admin/
│       ├── DashboardPage.ts
│       ├── UsersPage.ts
│       └── ModerationPage.ts
│
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── register.spec.ts
│   │   └── password-reset.spec.ts
│   │
│   ├── user/
│   │   ├── profile.spec.ts
│   │   ├── feed.spec.ts
│   │   └── discovery.spec.ts
│   │
│   ├── payment/
│   │   ├── stripe-payment.spec.ts      # ✅ 已存在
│   │   ├── tip-flow.spec.ts
│   │   └── wallet-withdrawal.spec.ts
│   │
│   ├── subscription/
│   │   └── subscription-flow.spec.ts    # ✅ 已存在
│   │
│   ├── content/
│   │   ├── post-creation.spec.ts
│   │   ├── ppv-purchase.spec.ts
│   │   └── moderation.spec.ts
│   │
│   ├── matching/
│   │   ├── swipe-flow.spec.ts
│   │   └── chat-initiation.spec.ts
│   │
│   ├── messaging/
│   │   └── conversation.spec.ts
│   │
│   ├── admin/
│   │   └── admin-dashboard.spec.ts      # ✅ 已存在
│   │
│   ├── security/
│   │   └── security-tests.spec.ts       # ✅ 已存在
│   │
│   ├── performance/
│   │   └── performance-tests.spec.ts    # ✅ 已存在
│   │
│   └── journeys/
│       ├── creator-journey.spec.ts
│       ├── subscriber-journey.spec.ts
│       └── admin-journey.spec.ts
│
└── config/
    ├── environments.ts          # 環境配置
    └── test-data.ts             # 測試常量
```

### Page Object Model 設計範例

#### LoginPage.ts
```typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.rememberMeCheckbox = page.locator('input[name="rememberMe"]');
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginWithRememberMe(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.rememberMeCheckbox.check();
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async waitForRedirect() {
    await this.page.waitForURL(/\/(feed|dashboard)/);
  }
}
```

#### ProfilePage.ts
```typescript
import { Page, Locator } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly bioTextarea: Locator;
  readonly avatarUpload: Locator;
  readonly saveButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('input[name="name"]');
    this.bioTextarea = page.locator('textarea[name="bio"]');
    this.avatarUpload = page.locator('input[type="file"][name="avatar"]');
    this.saveButton = page.locator('button:has-text("儲存")');
    this.successToast = page.locator('[data-testid="toast-success"]');
  }

  async goto() {
    await this.page.goto('/profile');
  }

  async updateProfile(data: { name?: string; bio?: string }) {
    if (data.name) {
      await this.nameInput.fill(data.name);
    }
    if (data.bio) {
      await this.bioTextarea.fill(data.bio);
    }
    await this.saveButton.click();
  }

  async uploadAvatar(filePath: string) {
    await this.avatarUpload.setInputFiles(filePath);
  }

  async waitForSuccess() {
    await this.successToast.waitFor({ state: 'visible' });
  }
}
```

### 測試範例

#### 完整用戶旅程測試

```typescript
// tests/journeys/creator-journey.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/web/LoginPage';
import { ProfilePage } from '../../pages/web/ProfilePage';
import { PostCreationPage } from '../../pages/web/PostCreationPage';
import { WalletPage } from '../../pages/web/WalletPage';
import { TEST_USERS } from '../../fixtures/users.fixture';

test.describe('創作者完整工作流程', () => {
  test('從註冊到發布內容並獲得收益', async ({ page, context }) => {
    // 啟用追蹤
    await context.tracing.start({ 
      screenshots: true, 
      snapshots: true,
      sources: true,
    });

    // 1. 登入
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.creator.email,
      TEST_USERS.creator.password
    );
    await loginPage.waitForRedirect();
    
    // 驗證登入成功
    await expect(page).toHaveURL(/\/feed/);

    // 2. 完善個人檔案
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.updateProfile({
      name: '測試創作者',
      bio: '這是我的個人簡介',
    });
    await profilePage.waitForSuccess();

    // 3. 建立訂閱方案
    await page.goto('/subscription/tiers/create');
    await page.fill('input[name="name"]', 'Gold會員');
    await page.fill('input[name="price"]', '9.99');
    await page.fill('textarea[name="description"]', '專屬內容訪問');
    await page.click('button:has-text("建立方案")');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // 4. 發布付費內容
    const postPage = new PostCreationPage(page);
    await postPage.goto();
    await postPage.createPost({
      title: '付費限定內容',
      content: '這是訂閱者專屬內容',
      visibility: 'subscribers',
      price: 4.99,
    });
    await postPage.waitForSuccess();

    // 5. 查看錢包
    const walletPage = new WalletPage(page);
    await walletPage.goto();
    const balance = await walletPage.getBalance();
    expect(parseFloat(balance)).toBeGreaterThanOrEqual(0);

    // 6. 查看收益
    await walletPage.goToEarnings();
    const earnings = await walletPage.getEarningsData();
    expect(earnings).toBeDefined();

    // 停止追蹤
    await context.tracing.stop({ 
      path: 'test-results/creator-full-journey.zip' 
    });
  });
});
```

#### 支付流程測試

```typescript
// tests/payment/tip-flow.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/web/LoginPage';
import { ProfilePage } from '../../pages/web/ProfilePage';
import { PaymentPage } from '../../pages/web/PaymentPage';
import { TEST_USERS, TEST_STRIPE_CARDS } from '../../fixtures/payments.fixture';

test.describe('打賞流程測試', () => {
  test.beforeEach(async ({ page }) => {
    // 登入用戶
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.subscriber.email,
      TEST_USERS.subscriber.password
    );
    await loginPage.waitForRedirect();
  });

  test('成功打賞創作者', async ({ page }) => {
    // 1. 前往創作者檔案
    await page.goto('/user/1'); // 創作者 ID

    // 2. 點擊打賞按鈕
    await page.click('button:has-text("打賞")');

    // 3. 輸入金額
    await page.fill('input[name="amount"]', '10.00');

    // 4. 選擇支付方式
    await page.click('[data-testid="payment-method-card"]');

    // 5. 輸入信用卡資訊 (Stripe Test Card)
    const paymentPage = new PaymentPage(page);
    await paymentPage.fillStripeCard(TEST_STRIPE_CARDS.valid);

    // 6. 確認支付
    await paymentPage.submit();

    // 7. 驗證成功
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('text=打賞成功')).toBeVisible();

    // 8. 驗證交易記錄
    await page.goto('/wallet/history');
    await expect(page.locator('text=打賞')).toBeVisible();
    await expect(page.locator('text=$10.00')).toBeVisible();
  });

  test('支付失敗處理', async ({ page }) => {
    await page.goto('/user/1');
    await page.click('button:has-text("打賞")');
    await page.fill('input[name="amount"]', '10.00');
    await page.click('[data-testid="payment-method-card"]');

    // 使用失效的測試卡
    const paymentPage = new PaymentPage(page);
    await paymentPage.fillStripeCard(TEST_STRIPE_CARDS.declined);
    await paymentPage.submit();

    // 驗證錯誤訊息
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('text=支付失敗')).toBeVisible();
  });

  test('金額驗證', async ({ page }) => {
    await page.goto('/user/1');
    await page.click('button:has-text("打賞")');

    // 測試負數
    await page.fill('input[name="amount"]', '-10');
    await expect(page.locator('text=金額必須大於 0')).toBeVisible();

    // 測試零
    await page.fill('input[name="amount"]', '0');
    await expect(page.locator('text=金額必須大於 0')).toBeVisible();

    // 測試過大金額
    await page.fill('input[name="amount"]', '100000');
    await expect(page.locator('text=金額超過限制')).toBeVisible();
  });
});
```

---

## 📅 測試執行順序和優先級

### Week 1: 緊急修復 (Day 1-5)

#### Day 1: 修復編譯錯誤 ⚡ P0
**責任人**: Backend Team  
**目標**: 所有測試可編譯執行

**任務**:
1. ✅ 修復 Auth Service 測試編譯錯誤 (3個文件)
   - OAuth Strategy 型別問題
   - 路徑導入問題
   - 測試簽名問題

2. ✅ 修復 Content Service 測試編譯錯誤 (3個文件)
   - 依賴注入問題
   - TypeORM mock 問題

3. ✅ 修復 Common/UI lib 測試錯誤 (2個文件)
   - RolesGuard 測試
   - Button 元件測試

**驗證**:
```bash
npx nx run-many -t test --all
# 預期: 0 編譯錯誤
```

**預估時間**: 6-8 小時

---

#### Day 2-3: 修復失敗的 E2E 測試 ⚡ P0
**責任人**: Backend Team + QA  
**目標**: 100% E2E 測試通過率

**User Service (8個失敗)**:
- [ ] 封鎖功能測試
- [ ] 檢舉功能測試
- [ ] 管理員檢舉管理測試

**Content Service (7個失敗)**:
- [ ] 審核佇列測試
- [ ] 審核流程測試
- [ ] 權限驗證測試

**Auth Service (6個失敗)**:
- [ ] 密碼重置測試
- [ ] 郵件驗證測試
- [ ] 管理員權限測試

**驗證**:
```bash
npx nx test user-service --testPathPattern=user.e2e
npx nx test content-service --testPathPattern=content.e2e
npx nx test auth-service --testPathPattern=auth.e2e
# 預期: 233/233 通過 ✅
```

**預估時間**: 12-16 小時

---

#### Day 4: 修復 Playwright 測試 ⚡ P0
**責任人**: Frontend Team + QA  
**目標**: Playwright 測試可執行

**任務**:
1. ✅ 修復 `user-journeys.spec.ts` 路徑問題
   ```typescript
   // 修改前
   import { ... } from '../utils/test-helpers';
   
   // 修改後
   import { ... } from './utils/test-helpers';
   ```

2. ✅ 建立測試用戶
   ```sql
   INSERT INTO users (...) VALUES (...);
   ```

3. ✅ 確認所有 Playwright 測試可列出
   ```bash
   npx playwright test --list
   # 預期: 343+ 測試可列出
   ```

4. ✅ 執行基礎測試驗證
   ```bash
   npx playwright test --project=chromium e2e/web/web-app.spec.ts
   ```

**預估時間**: 4-6 小時

---

#### Day 5: 補充 Subscription Service E2E ⚡ P0
**責任人**: Backend Team  
**目標**: 訂閱功能 100% 測試覆蓋

**測試案例** (20個):
- [ ] 建立訂閱 (月度/年度)
- [ ] 訂閱續期
- [ ] 訂閱取消
- [ ] 訂閱升級/降級
- [ ] Stripe webhook 整合
- [ ] 訂閱狀態查詢
- [ ] 試用期處理
- [ ] 優惠券應用
- [ ] 錯誤處理

**測試檔案**: `apps/subscription-service/src/app/subscription.e2e.spec.ts`

**驗證**:
```bash
npx nx test subscription-service --testPathPattern=e2e
# 預期: 20+ 測試全通過 ✅
```

**預估時間**: 8-10 小時

---

### Week 2: 前端與整合測試 (Day 6-10)

#### Day 6-8: 前端 Web App 測試 🎯 P0
**責任人**: Frontend Team + QA  
**目標**: Web App 測試覆蓋率從 30% 提升至 70%

**優先測試**:
1. **認證頁面** (Day 6上午)
   - `LoginPage.spec.tsx`
   - `RegisterPage.spec.tsx`

2. **核心功能** (Day 6下午 + Day 7)
   - `FeedPage.spec.tsx`
   - `ProfilePage.spec.tsx`
   - `DiscoveryPage.spec.tsx`

3. **支付與錢包** (Day 8)
   - `PaymentPage.spec.tsx`
   - `WalletPage.spec.tsx`
   - `SubscriptionPage.spec.tsx`

**測試框架**: Vitest + React Testing Library

**配置**:
```bash
cd apps/web
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**驗證**:
```bash
npx nx test web --coverage
# 預期覆蓋率: ≥ 70%
```

**預估時間**: 20-24 小時

---

#### Day 9: 補充關鍵服務 E2E 🎯 P1
**責任人**: Backend Team  
**目標**: Notification 和 Messaging Service E2E 測試

**Notification Service E2E** (10個測試):
- [ ] 通知發送
- [ ] 通知列表
- [ ] 標記已讀
- [ ] 批量操作
- [ ] 即時通知 (WebSocket)

**Messaging Service E2E** (10個測試):
- [ ] 對話建立
- [ ] 發送消息
- [ ] 消息列表
- [ ] 對話列表
- [ ] 即時消息 (WebSocket)

**驗證**:
```bash
npx nx test notification-service --testPathPattern=e2e
npx nx test messaging-service --testPathPattern=e2e
# 預期: 20+ 測試全通過 ✅
```

**預估時間**: 8-10 小時

---

#### Day 10: 完整用戶旅程測試 🎯 P1
**責任人**: QA Engineer  
**目標**: 端到端用戶旅程 100% 通過

**測試場景**:
1. **創作者旅程**:
   - 註冊 → 登入 → 建立訂閱方案 → 發布內容 → 收到訂閱 → 查看收益

2. **訂閱者旅程**:
   - 註冊 → 登入 → 探索創作者 → 訂閱 → 查看內容 → 打賞

3. **配對旅程**:
   - 登入 → 瀏覽卡片 → 滑動配對 → 建立對話 → 發送消息

4. **管理員旅程**:
   - 登入後台 → 查看儀表板 → 處理檢舉 → 審核內容 → 審批提現

**執行**:
```bash
npx playwright test e2e/tests/journeys/
# 預期: 所有旅程測試通過 ✅
```

**預估時間**: 6-8 小時

---

## ⏱️ 時間表總覽 (2週衝刺)

### 第一週 (Day 1-5): 基礎修復

| 日期 | 任務 | 負責人 | 優先級 | 狀態 | 時數 |
|------|------|--------|--------|------|------|
| Day 1 | 修復所有編譯錯誤 | Backend | P0 | 🔴 待開始 | 8h |
| Day 2-3 | 修復 21 個失敗的 E2E 測試 | Backend + QA | P0 | 🔴 待開始 | 16h |
| Day 4 | 修復 Playwright 測試路徑問題 | Frontend + QA | P0 | 🔴 待開始 | 6h |
| Day 5 | Subscription Service E2E | Backend | P0 | 🔴 待開始 | 10h |

**第一週目標**: ✅ 所有後端測試 100% 通過  
**總工時**: 40 小時  
**達成標準**: 後端 E2E 測試 253/253 通過 (100%)

---

### 第二週 (Day 6-10): 前端與整合

| 日期 | 任務 | 負責人 | 優先級 | 狀態 | 時數 |
|------|------|--------|--------|------|------|
| Day 6-8 | Web App 測試 (30%→70%) | Frontend + QA | P0 | 🔴 待開始 | 24h |
| Day 9 | Notification/Messaging E2E | Backend | P1 | 🔴 待開始 | 10h |
| Day 10 | 完整用戶旅程測試 | QA | P1 | 🔴 待開始 | 8h |

**第二週目標**: ✅ 前端測試覆蓋率 ≥ 70%, ✅ 端到端旅程 100% 通過  
**總工時**: 42 小時  
**達成標準**: 
- Web App 覆蓋率 ≥ 70%
- Playwright 測試 ≥ 95% 通過率
- 4 個完整用戶旅程全通過

---

## 📈 成功指標 (KPI)

### 量化指標

```typescript
interface TestingKPIs {
  // 覆蓋率目標
  coverage: {
    backend: '>= 80%',          // 當前: 76%
    frontendWeb: '>= 70%',      // 當前: 30%
    frontendAdmin: '>= 70%',    // 當前: 40%
    overall: '>= 75%',          // 當前: ~60%
  },
  
  // 測試通過率
  passRate: {
    backendUnit: '100%',        // 當前: ~85%
    backendE2E: '100%',         // 當前: 91%
    playwrightE2E: '>= 95%',    // 當前: 未知
  },
  
  // 測試數量
  quantity: {
    backendE2E: '>= 253',       // 當前: 233, 目標: +20
    frontendUnit: '>= 150',     // 當前: ~40, 目標: +110
    playwrightE2E: '>= 343',    // 當前: 343 ✅
    totalTests: '>= 800',       // 當前: ~600
  },
  
  // 品質指標
  quality: {
    compilationErrors: '0',     // 當前: 8 個文件
    flakyTests: '< 5',          // 未測量
    executionTime: '< 10 min',  // 當前: 未測量
  },
}
```

### 定性指標

- ✅ 所有核心功能有測試保護
- ✅ 支付流程 100% 測試覆蓋
- ✅ 認證流程 100% 測試覆蓋
- ✅ 跨服務整合測試完整
- ✅ 端到端用戶旅程可執行

---

## 🚨 風險管理

### 高風險項目

| 風險 | 影響 | 機率 | 緩解措施 | 負責人 |
|------|------|------|---------|--------|
| 編譯錯誤修復困難 | 阻塞所有測試 | 中 | 及早開始，架構師協助 | Backend Lead |
| E2E 測試失敗原因不明 | 延誤上線 | 高 | 逐一調試，記錄問題 | QA + Backend |
| 前端測試覆蓋率不足 | 用戶體驗風險 | 高 | 優先核心功能，延後次要功能 | Frontend Lead |
| Playwright 環境問題 | 無法執行 E2E | 中 | 預先設定環境，製作 Docker 鏡像 | DevOps |
| 時間不足 | 無法完成所有測試 | 高 | 嚴格按優先級，P2 任務可延後 | QA Lead |

### 應變計劃

**如果第一週進度落後**:
1. 增加人力 (3人 → 5人)
2. 延長工作時間 (加班)
3. 降低覆蓋率目標 (70% → 60%)

**如果 E2E 測試無法修復**:
1. 暫時跳過該測試
2. 手動測試替代
3. 上線後立即修復

**如果前端測試時間不足**:
1. 專注 P0 功能 (登入、支付)
2. 延後 P2 功能測試
3. 上線後持續補充

---

## 📞 團隊協作

### 角色與職責

| 角色 | 負責人 | 職責 |
|------|--------|------|
| **QA Lead** | QA Engineer | 整體策略、進度追蹤、風險管理 |
| **Backend Lead** | Senior Backend Dev | 後端測試指導、架構問題解決 |
| **Frontend Lead** | Senior Frontend Dev | 前端測試指導、框架選型 |
| **DevOps** | DevOps Engineer | CI/CD 建設、測試環境維護 |
| **Product Owner** | PM | 需求確認、優先級調整 |

### 溝通機制

**Daily Standup (每天 10:00)**:
- 昨日完成
- 今日計劃
- 阻礙事項

**週中檢查點 (Day 3, Day 8)**:
- 進度回顧
- 風險評估
- 計劃調整

**測試報告 (每天 18:00)**:
- 自動發送測試結果
- 標記失敗測試
- 趨勢分析

---

## ✅ 驗收標準

### Must Have (必須達成)

- [x] 所有測試可編譯執行 (0 TypeScript 錯誤) ✅ Day 1
- [ ] 後端 E2E 測試 100% 通過 (253/253) ⏳ Day 5
- [ ] 前端 Web App 覆蓋率 ≥ 60% ⏳ Day 8
- [ ] Playwright 測試可執行 ⏳ Day 4
- [ ] 支付流程 100% 測試覆蓋 ⏳ Day 5
- [ ] 認證流程 100% 測試覆蓋 ⏳ Day 3
- [ ] 訂閱流程 100% 測試覆蓋 ⏳ Day 5

### Should Have (強烈建議)

- [ ] 前端 Web App 覆蓋率 ≥ 70% ⏳ Day 8
- [ ] Playwright 測試 ≥ 95% 通過率 ⏳ Day 10
- [ ] Notification/Messaging Service E2E ⏳ Day 9
- [ ] 完整用戶旅程測試通過 ⏳ Day 10
- [ ] Admin App 覆蓋率 ≥ 60%

### Nice to Have (可選)

- [ ] Admin App 覆蓋率 ≥ 70%
- [ ] Kafka 事件流整合測試
- [ ] Redis 快取一致性測試
- [ ] 壓力測試基準
- [ ] 安全性測試報告

---

## 📚 參考資源

### 測試文檔
- [TESTING.md](../TESTING.md) - 當前測試狀態
- [TEST_ACTION_PLAN.md](../TEST_ACTION_PLAN.md) - 8週測試計劃
- [TEST_BEST_PRACTICES.md](../TEST_BEST_PRACTICES.md) - 測試最佳實踐

### 技術文檔
- [Jest 官方文件](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Playwright](https://playwright.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

### 內部工具
- Playwright UI: `npx playwright test --ui`
- 測試報告: `playwright-report/index.html`
- 覆蓋率報告: `coverage/lcov-report/index.html`

---

**文件版本**: v1.0  
**建立日期**: 2026-02-14  
**負責人**: QA Engineer  
**下次更新**: 2026-02-17 (3天後)

**批准**:
- [ ] QA Lead
- [ ] Backend Lead
- [ ] Frontend Lead
- [ ] Product Owner
