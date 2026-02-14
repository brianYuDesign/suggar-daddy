# 🎭 Playwright E2E 測試整合計劃

> **生成時間**: 2026-02-14  
> **負責團隊**: QA Engineer + Frontend/Backend Developers  
> **預計完成時間**: 2 週

---

## 📊 當前狀態

### 現有 E2E 測試
```
e2e/
├── admin/                    # Admin 面板測試
│   └── admin-dashboard.spec.ts
├── fixtures/                 # 測試固件
│   ├── users.fixture.ts
│   ├── posts.fixture.ts
│   └── transactions.fixture.ts
├── matching/                 # 配對測試
├── payment/                  # 支付測試
│   └── stripe-payment.spec.ts
├── performance/              # 性能測試
│   └── performance-tests.spec.ts
├── security/                 # 安全測試
│   └── security-tests.spec.ts
├── subscription/             # 訂閱測試
│   └── subscription-flow.spec.ts
├── utils/                    # 測試工具
│   └── test-helpers.ts
├── web/                      # Web App 測試
│   └── web-app.spec.ts
└── user-journeys.spec.ts     # 用戶旅程測試
```

### Playwright 配置
- ✅ 基礎配置完成 (`playwright.config.ts`)
- ✅ 5 個測試項目（Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari）
- ✅ Web Server 自動啟動（Web App + API Gateway）
- ✅ 視頻錄製和截圖（失敗時）
- ✅ HTML 報告

---

## 🎯 目標

### 短期目標（Week 1-2）
1. ✅ 補充缺失的測試案例
2. ✅ 建立完整的 Page Object Model
3. ✅ 達成 95% 以上通過率
4. ✅ 整合到 CI/CD 流水線

### 長期目標（Month 1-3）
1. ✅ 測試覆蓋所有關鍵用戶旅程
2. ✅ 建立測試數據管理策略
3. ✅ 實現並行測試執行
4. ✅ 建立測試報告和監控

---

## 🏗️ 測試架構設計

### Page Object Model (POM)

```typescript
// e2e/pages/base.page.ts
export abstract class BasePage {
  constructor(protected page: Page) {}
  
  async navigate(path: string) {
    await this.page.goto(path);
  }
  
  async waitForLoading() {
    await this.page.waitForLoadState('networkidle');
  }
}

// e2e/pages/web/auth/login.page.ts
export class LoginPage extends BasePage {
  private emailInput = () => this.page.locator('input[name="email"]');
  private passwordInput = () => this.page.locator('input[name="password"]');
  private loginButton = () => this.page.locator('button:has-text("登入")');
  
  async login(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.loginButton().click();
    await this.waitForLoading();
  }
}

// e2e/pages/web/discover/discover.page.ts
export class DiscoverPage extends BasePage {
  private profileCard = () => this.page.locator('[data-testid="profile-card"]');
  private likeButton = () => this.page.locator('button:has-text("喜歡")');
  private passButton = () => this.page.locator('button:has-text("略過")');
  
  async swipeRight() {
    await this.likeButton().click();
  }
  
  async swipeLeft() {
    await this.passButton().click();
  }
  
  async getCurrentProfileName(): Promise<string> {
    return await this.profileCard().locator('h2').textContent() || '';
  }
}

// e2e/pages/admin/users.page.ts
export class AdminUsersPage extends BasePage {
  private usersTable = () => this.page.locator('table[data-testid="users-table"]');
  private suspendButton = (userId: string) => 
    this.page.locator(`button[data-action="suspend"][data-user-id="${userId}"]`);
  
  async suspendUser(userId: string) {
    await this.suspendButton(userId).click();
    await this.page.locator('button:has-text("確認")').click();
  }
}
```

### API Helper

```typescript
// e2e/utils/api-helper.ts
import { APIRequestContext } from '@playwright/test';

export class ApiHelper {
  constructor(private request: APIRequestContext) {}
  
  async createUser(userData: CreateUserDto) {
    const response = await this.request.post('/api/auth/register', {
      data: userData
    });
    return response.json();
  }
  
  async loginAndGetToken(email: string, password: string): Promise<string> {
    const response = await this.request.post('/api/auth/login', {
      data: { email, password }
    });
    const data = await response.json();
    return data.accessToken;
  }
  
  async createPost(token: string, postData: CreatePostDto) {
    const response = await this.request.post('/api/posts', {
      headers: { Authorization: `Bearer ${token}` },
      data: postData
    });
    return response.json();
  }
}
```

### Test Fixtures

```typescript
// e2e/fixtures/extended-test.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/web/auth/login.page';
import { DiscoverPage } from '../pages/web/discover/discover.page';
import { ApiHelper } from '../utils/api-helper';

type MyFixtures = {
  loginPage: LoginPage;
  discoverPage: DiscoverPage;
  apiHelper: ApiHelper;
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  
  discoverPage: async ({ page }, use) => {
    await use(new DiscoverPage(page));
  },
  
  apiHelper: async ({ request }, use) => {
    await use(new ApiHelper(request));
  },
  
  authenticatedPage: async ({ page, apiHelper }, use) => {
    // 使用 API 快速登入，避免每次都走 UI
    const token = await apiHelper.loginAndGetToken(
      'test@example.com',
      'password123'
    );
    
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('accessToken', token);
    }, token);
    
    await use(page);
  }
});

export { expect } from '@playwright/test';
```

---

## 📋 完整測試案例

### 1. 認證流程（Auth）

#### e2e/tests/auth/registration.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('用戶註冊流程', () => {
  test('成功註冊新用戶', async ({ page, loginPage }) => {
    await loginPage.navigate('/auth/register');
    
    const email = `test-${Date.now()}@example.com`;
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');
    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('select[name="role"]').selectOption('SUBSCRIBER');
    
    await page.locator('button:has-text("註冊")').click();
    
    // 驗證跳轉到 Dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('歡迎');
  });
  
  test('驗證必填欄位', async ({ page }) => {
    await page.goto('/auth/register');
    await page.locator('button:has-text("註冊")').click();
    
    await expect(page.locator('text=電子郵件為必填')).toBeVisible();
    await expect(page.locator('text=密碼為必填')).toBeVisible();
  });
  
  test('驗證重複 email', async ({ page, apiHelper }) => {
    // 先創建一個用戶
    const existingEmail = 'existing@example.com';
    await apiHelper.createUser({
      email: existingEmail,
      password: 'Password123!',
      name: 'Existing User',
      role: 'SUBSCRIBER'
    });
    
    // 嘗試用相同 email 註冊
    await page.goto('/auth/register');
    await page.locator('input[name="email"]').fill(existingEmail);
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('button:has-text("註冊")').click();
    
    await expect(page.locator('text=該電子郵件已被使用')).toBeVisible();
  });
});
```

#### e2e/tests/auth/login.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('用戶登入流程', () => {
  test.beforeEach(async ({ apiHelper }) => {
    // 創建測試用戶
    await apiHelper.createUser({
      email: 'login-test@example.com',
      password: 'Password123!',
      name: 'Login Test User',
      role: 'SUBSCRIBER'
    });
  });
  
  test('成功登入', async ({ page, loginPage }) => {
    await loginPage.navigate('/auth/login');
    await loginPage.login('login-test@example.com', 'Password123!');
    
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('錯誤密碼', async ({ page, loginPage }) => {
    await loginPage.navigate('/auth/login');
    await loginPage.login('login-test@example.com', 'WrongPassword');
    
    await expect(page.locator('text=帳號或密碼錯誤')).toBeVisible();
  });
  
  test('OAuth Google 登入流程', async ({ page, context }) => {
    await page.goto('/auth/login');
    
    // Mock Google OAuth
    await context.route('**/api/auth/google', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          accessToken: 'mock-token',
          user: { id: '123', email: 'test@gmail.com' }
        })
      });
    });
    
    await page.locator('button:has-text("使用 Google 登入")').click();
    
    await expect(page).toHaveURL('/dashboard');
  });
});
```

---

### 2. 配對流程（Matching）

#### e2e/tests/matching/swipe-flow.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('配對滑動流程', () => {
  test.use({ authenticatedPage: true });
  
  test('成功滑動喜歡', async ({ page, discoverPage, apiHelper }) => {
    // 創建潛在配對用戶
    const creator = await apiHelper.createUser({
      email: 'creator@example.com',
      name: '美麗創作者',
      role: 'CREATOR',
      bio: '這是我的自我介紹'
    });
    
    await discoverPage.navigate('/discover');
    
    // 等待卡片加載
    await page.waitForSelector('[data-testid="profile-card"]');
    
    const profileName = await discoverPage.getCurrentProfileName();
    expect(profileName).toBeTruthy();
    
    // 向右滑動（喜歡）
    await discoverPage.swipeRight();
    
    // 驗證提示訊息
    await expect(page.locator('text=已喜歡')).toBeVisible({ timeout: 2000 });
  });
  
  test('雙向配對成功顯示通知', async ({ page, apiHelper }) => {
    // 創建兩個用戶互相喜歡
    const user1Token = await apiHelper.loginAndGetToken('user1@example.com', 'pass');
    const user2Token = await apiHelper.loginAndGetToken('user2@example.com', 'pass');
    
    // User1 喜歡 User2
    await apiHelper.swipe(user1Token, 'user2-id', 'LIKE');
    
    // User2 喜歡 User1（觸發配對）
    await page.goto('/discover');
    await page.locator('button:has-text("喜歡")').click();
    
    // 驗證配對成功彈窗
    await expect(page.locator('[data-testid="match-modal"]')).toBeVisible();
    await expect(page.locator('text=配對成功')).toBeVisible();
  });
});
```

---

### 3. 訂閱流程（Subscription）

#### e2e/tests/subscription/subscribe-flow.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('訂閱流程', () => {
  test('查看訂閱層級列表', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/subscription/tiers');
    
    // 驗證至少有 3 個訂閱層級
    const tiers = await authenticatedPage.locator('[data-testid="tier-card"]').count();
    expect(tiers).toBeGreaterThanOrEqual(3);
    
    // 驗證價格顯示
    await expect(authenticatedPage.locator('text=/\\$\\d+/').first()).toBeVisible();
  });
  
  test('成功訂閱創作者（Mock Stripe）', async ({ page, context, apiHelper }) => {
    // Mock Stripe Checkout
    await context.route('**/api/stripe/create-subscription-session', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ sessionId: 'mock-session-id', url: '/payment/success' })
      });
    });
    
    await page.goto('/creator/creator123/subscribe');
    
    // 選擇訂閱層級
    await page.locator('[data-tier-id="basic"]').click();
    await page.locator('button:has-text("立即訂閱")').click();
    
    // 等待跳轉到成功頁面
    await expect(page).toHaveURL('/payment/success');
    await expect(page.locator('text=訂閱成功')).toBeVisible();
  });
  
  test('查看我的訂閱列表', async ({ authenticatedPage, apiHelper }) => {
    // 創建一筆訂閱記錄
    const token = await apiHelper.loginAndGetToken('subscriber@example.com', 'pass');
    await apiHelper.createSubscription(token, {
      creatorId: 'creator123',
      tierId: 'basic'
    });
    
    await authenticatedPage.goto('/subscriptions/my');
    
    // 驗證訂閱顯示
    await expect(authenticatedPage.locator('[data-testid="subscription-item"]')).toHaveCount(1);
  });
});
```

---

### 4. 打賞流程（Tipping）

#### e2e/tests/payment/tip-flow.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('打賞流程', () => {
  test('成功打賞創作者', async ({ page, apiHelper, context }) => {
    // Mock Stripe Payment Intent
    await context.route('**/api/tips/create', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'tip-123',
          clientSecret: 'mock-secret',
          amount: 500
        })
      });
    });
    
    await page.goto('/creator/creator123/profile');
    
    // 點擊打賞按鈕
    await page.locator('button:has-text("打賞")').click();
    
    // 輸入金額
    await page.locator('input[name="amount"]').fill('5');
    await page.locator('button:has-text("確認打賞")').click();
    
    // 驗證成功訊息
    await expect(page.locator('text=打賞成功')).toBeVisible();
  });
  
  test('驗證最小打賞金額', async ({ page }) => {
    await page.goto('/creator/creator123/profile');
    await page.locator('button:has-text("打賞")').click();
    
    // 輸入低於最小金額
    await page.locator('input[name="amount"]').fill('0.5');
    await page.locator('button:has-text("確認打賞")').click();
    
    await expect(page.locator('text=最小打賞金額為 $1')).toBeVisible();
  });
});
```

---

### 5. 內容發布（Content）

#### e2e/tests/content/post-creation.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('創作者發布內容', () => {
  test.use({ 
    authenticatedPage: async ({ page, apiHelper }, use) => {
      // 使用創作者帳號登入
      const token = await apiHelper.loginAndGetToken('creator@example.com', 'pass');
      await page.goto('/');
      await page.evaluate((token) => {
        localStorage.setItem('accessToken', token);
      }, token);
      await use(page);
    }
  });
  
  test('成功發布免費貼文', async ({ page }) => {
    await page.goto('/post/create');
    
    await page.locator('textarea[name="content"]').fill('這是一篇測試貼文');
    await page.locator('select[name="visibility"]').selectOption('PUBLIC');
    await page.locator('button:has-text("發布")').click();
    
    await expect(page).toHaveURL(/\/post\/.+/);
    await expect(page.locator('text=發布成功')).toBeVisible();
  });
  
  test('成功發布 PPV 貼文', async ({ page }) => {
    await page.goto('/post/create');
    
    await page.locator('textarea[name="content"]').fill('這是付費內容');
    await page.locator('input[name="isPPV"]').check();
    await page.locator('input[name="price"]').fill('10');
    await page.locator('button:has-text("發布")').click();
    
    await expect(page.locator('text=發布成功')).toBeVisible();
  });
  
  test('上傳圖片到貼文', async ({ page }) => {
    await page.goto('/post/create');
    
    // 上傳圖片
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/test-image.jpg');
    
    // 等待圖片預覽
    await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    
    await page.locator('textarea[name="content"]').fill('帶圖片的貼文');
    await page.locator('button:has-text("發布")').click();
    
    await expect(page.locator('text=發布成功')).toBeVisible();
  });
});
```

---

### 6. 管理後台（Admin）

#### e2e/tests/admin/user-management.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('管理員用戶管理', () => {
  test.use({
    authenticatedPage: async ({ page, apiHelper }, use) => {
      const adminToken = await apiHelper.loginAndGetToken('admin@example.com', 'pass');
      await page.goto('/admin');
      await page.evaluate((token) => {
        localStorage.setItem('accessToken', token);
      }, token);
      await use(page);
    }
  });
  
  test('查看用戶列表', async ({ page }) => {
    await page.goto('/admin/users');
    
    // 驗證表格存在
    await expect(page.locator('table[data-testid="users-table"]')).toBeVisible();
    
    // 驗證至少有一行數據
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });
  
  test('暫停用戶帳號', async ({ page, apiHelper }) => {
    // 創建一個測試用戶
    const testUser = await apiHelper.createUser({
      email: 'suspend-test@example.com',
      password: 'pass',
      name: 'Suspend Test',
      role: 'SUBSCRIBER'
    });
    
    await page.goto('/admin/users');
    
    // 搜尋用戶
    await page.locator('input[placeholder="搜尋用戶"]').fill('suspend-test@example.com');
    await page.locator('button:has-text("搜尋")').click();
    
    // 點擊暫停按鈕
    await page.locator(`button[data-action="suspend"]`).first().click();
    await page.locator('button:has-text("確認")').click();
    
    // 驗證狀態變更
    await expect(page.locator('text=已暫停')).toBeVisible();
  });
});
```

---

### 7. 完整用戶旅程（User Journeys）

#### e2e/tests/journeys/subscriber-journey.spec.ts
```typescript
import { test, expect } from '../../fixtures/extended-test';

test.describe('訂閱者完整旅程', () => {
  test('從註冊到訂閱創作者的完整流程', async ({ page, apiHelper, context }) => {
    // 1. 註冊新用戶
    const email = `journey-${Date.now()}@example.com`;
    await page.goto('/auth/register');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('input[name="confirmPassword"]').fill('Password123!');
    await page.locator('input[name="name"]').fill('Journey Test User');
    await page.locator('select[name="role"]').selectOption('SUBSCRIBER');
    await page.locator('button:has-text("註冊")').click();
    
    await expect(page).toHaveURL('/dashboard');
    
    // 2. 瀏覽配對頁面
    await page.goto('/discover');
    await page.waitForSelector('[data-testid="profile-card"]');
    
    // 3. 向右滑動（喜歡）
    await page.locator('button:has-text("喜歡")').click();
    
    // 4. 進入創作者個人頁面
    await page.goto('/creator/creator123/profile');
    
    // 5. 查看訂閱層級
    await page.locator('button:has-text("訂閱")').click();
    await expect(page).toHaveURL('/creator/creator123/subscribe');
    
    // 6. Mock Stripe 訂閱流程
    await context.route('**/api/stripe/create-subscription-session', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ url: '/payment/success' })
      });
    });
    
    await page.locator('[data-tier-id="basic"]').click();
    await page.locator('button:has-text("立即訂閱")').click();
    
    // 7. 驗證訂閱成功
    await expect(page).toHaveURL('/payment/success');
    
    // 8. 查看訂閱的內容
    await page.goto('/creator/creator123/posts');
    await expect(page.locator('[data-testid="post-item"]').first()).toBeVisible();
  });
});

#### e2e/tests/journeys/creator-journey.spec.ts
test.describe('創作者完整旅程', () => {
  test('從註冊到發布內容並收到打賞', async ({ page, context }) => {
    // 1. 創作者註冊
    const email = `creator-${Date.now()}@example.com`;
    await page.goto('/auth/register');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('Password123!');
    await page.locator('select[name="role"]').selectOption('CREATOR');
    await page.locator('button:has-text("註冊")').click();
    
    // 2. 完善個人資料
    await page.goto('/profile/edit');
    await page.locator('textarea[name="bio"]').fill('我是一名創作者');
    await page.locator('button:has-text("儲存")').click();
    
    // 3. 設置 Stripe Connect 帳號（Mock）
    await context.route('**/api/stripe/connect/onboard', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ url: '/stripe/success' })
      });
    });
    
    await page.goto('/wallet/setup');
    await page.locator('button:has-text("連接 Stripe")').click();
    
    // 4. 發布第一篇貼文
    await page.goto('/post/create');
    await page.locator('textarea[name="content"]').fill('這是我的第一篇貼文！');
    await page.locator('button:has-text("發布")').click();
    
    await expect(page.locator('text=發布成功')).toBeVisible();
    
    // 5. 查看錢包收益（假設有打賞）
    await page.goto('/wallet');
    await expect(page.locator('[data-testid="balance"]')).toBeVisible();
  });
});
```

---

## 🚀 執行策略

### 本地開發環境
```bash
# 1. 啟動所有服務
npm run serve:api-gateway &
npm run serve:auth-service &
npm run serve:user-service &
# ... 其他服務

# 2. 啟動前端
npm run serve:web

# 3. 執行測試
npm run e2e                    # 全部測試
npm run e2e:web                # 僅 Web App
npm run e2e:admin              # 僅 Admin
npm run e2e:journeys           # 用戶旅程
npm run e2e:headed             # 可視化模式
npm run e2e:debug              # 調試模式
```

### CI/CD 環境
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
      kafka:
        image: confluentinc/cp-kafka:7.5.0
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Build services
        run: npm run build
      
      - name: Start services
        run: |
          npm run serve:api-gateway &
          npm run serve:auth-service &
          npm run serve:web &
      
      - name: Run E2E tests
        run: npm run e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📊 測試數據管理

### 測試數據清理策略
```typescript
// e2e/utils/test-data-manager.ts
export class TestDataManager {
  private createdUsers: string[] = [];
  private createdPosts: string[] = [];
  
  async createTestUser(data: Partial<CreateUserDto>) {
    const user = await apiHelper.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Test User',
      role: 'SUBSCRIBER',
      ...data
    });
    
    this.createdUsers.push(user.id);
    return user;
  }
  
  async cleanup() {
    // 清理測試數據
    for (const userId of this.createdUsers) {
      await apiHelper.deleteUser(userId);
    }
    
    for (const postId of this.createdPosts) {
      await apiHelper.deletePost(postId);
    }
    
    this.createdUsers = [];
    this.createdPosts = [];
  }
}

// 在測試中使用
test.afterEach(async ({ testDataManager }) => {
  await testDataManager.cleanup();
});
```

---

## 🎯 成功指標

### 測試通過率
- **目標**: ≥ 95%
- **當前**: 待測量

### 測試覆蓋率
- **關鍵用戶旅程**: 100%
- **核心功能**: 90%
- **邊緣案例**: 70%

### 性能指標
- **測試執行時間**: < 15 分鐘（全套）
- **單個測試**: < 30 秒
- **並行執行**: 4 個 worker

---

## 📅 實施時間表

### Week 1
- Day 1-2: 建立 Page Object Model 架構
- Day 3: 完成認證測試
- Day 4: 完成配對測試
- Day 5: 完成訂閱測試

### Week 2
- Day 6: 完成打賞測試
- Day 7: 完成內容測試
- Day 8: 完成管理後台測試
- Day 9: 完成用戶旅程測試
- Day 10: 整合到 CI/CD + 驗收

---

## ✅ 檢查清單

- [ ] Page Object Model 架構建立
- [ ] API Helper 工具完成
- [ ] Test Fixtures 設置
- [ ] 認證流程測試（10 個案例）
- [ ] 配對流程測試（8 個案例）
- [ ] 訂閱流程測試（6 個案例）
- [ ] 打賞流程測試（5 個案例）
- [ ] 內容發布測試（8 個案例）
- [ ] 管理後台測試（12 個案例）
- [ ] 用戶旅程測試（2 個完整流程）
- [ ] CI/CD 整合
- [ ] 測試報告系統
- [ ] 測試數據清理機制

**總計**: 51+ 個測試案例

---

**預期成果**: 完整、穩定、可維護的 E2E 測試套件！🎭
