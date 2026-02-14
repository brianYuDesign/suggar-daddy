# 🧪 測試執行快速參考指南

快速查找並執行各種測試的命令手冊。

---

## 🚀 一鍵執行命令

### 執行所有測試
```bash
# 所有後端 + 前端單元測試
npm run test

# 所有測試 + 覆蓋率報告
npm run test:coverage

# 所有 E2E 測試
npm run test:e2e

# Playwright E2E 測試
npx playwright test
```

---

## 🎯 後端服務測試

### API Gateway
```bash
# 單元測試
npx nx test api-gateway

# E2E 測試
npx nx test api-gateway --testPathPattern=api-gateway.e2e

# 監聽模式
npx nx test api-gateway --watch

# 覆蓋率
npx nx test api-gateway --coverage
```

### Auth Service
```bash
# 所有測試
npx nx test auth-service

# 單元測試
npx nx test auth-service --testPathPattern="auth.service.spec"

# E2E 測試
npx nx test auth-service --testPathPattern="auth.e2e"

# 特定測試案例
npx nx test auth-service --testNamePattern="should register user"
```

### User Service
```bash
# E2E 測試
npx nx test user-service --testPathPattern=user.e2e

# 只測試封鎖功能
npx nx test user-service --testPathPattern=user.e2e --testNamePattern="block"

# 只測試檢舉功能
npx nx test user-service --testPathPattern=user.e2e --testNamePattern="report"
```

### Content Service
```bash
# E2E 測試
npx nx test content-service --testPathPattern=content.e2e

# 審核相關測試
npx nx test content-service --testPathPattern=content.e2e --testNamePattern="moderation"
```

### Payment Service
```bash
# E2E 測試
npx nx test payment-service --testPathPattern=payment.e2e

# Tip 相關測試
npx nx test payment-service --testNamePattern="tip"

# Stripe webhook 測試
npx nx test payment-service --testNamePattern="webhook"
```

### Subscription Service
```bash
# E2E 測試
npx nx test subscription-service --testPathPattern=subscription.e2e

# 訂閱建立測試
npx nx test subscription-service --testNamePattern="create subscription"
```

### Admin Service
```bash
# 所有測試 (96個，100%通過)
npx nx test admin-service

# 審計日誌測試
npx nx test admin-service --testPathPattern="audit-log"

# 用戶管理測試
npx nx test admin-service --testPathPattern="user-management"
```

### Notification Service
```bash
# 單元測試
npx nx test notification-service

# E2E 測試 (待建立)
npx nx test notification-service --testPathPattern=notification.e2e
```

### Messaging Service
```bash
# 單元測試
npx nx test messaging-service

# E2E 測試 (待建立)
npx nx test messaging-service --testPathPattern=messaging.e2e
```

---

## 🌐 前端應用測試

### Web App
```bash
cd apps/web

# 所有測試
npm run test

# 監聽模式
npm run test:watch

# 覆蓋率
npm run test:coverage

# UI 模式
npm run test:ui

# 特定檔案
npm run test LoginPage.spec.tsx

# 特定測試案例
npm run test -- --testNamePattern="should login successfully"
```

### Admin App
```bash
cd apps/admin

# 所有測試
npm run test

# 覆蓋率
npm run test:coverage
```

---

## 🎭 Playwright E2E 測試

### 基本執行
```bash
# 執行所有測試
npx playwright test

# 僅 Chromium
npx playwright test --project=chromium

# 僅 Firefox
npx playwright test --project=firefox

# 僅 WebKit (Safari)
npx playwright test --project=webkit

# 手機測試
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari
```

### UI 模式 (推薦)
```bash
# 啟動 UI 模式
npx playwright test --ui

# 特點:
# - 可視化測試執行
# - 即時除錯
# - 時間旅行除錯
# - 網路請求檢查
```

### 特定測試檔案
```bash
# Web App 測試
npx playwright test e2e/web/web-app.spec.ts

# Admin Dashboard 測試
npx playwright test e2e/admin/admin-dashboard.spec.ts

# 支付流程測試
npx playwright test e2e/payment/stripe-payment.spec.ts

# 訂閱流程測試
npx playwright test e2e/subscription/subscription-flow.spec.ts

# 安全性測試
npx playwright test e2e/security/security-tests.spec.ts

# 效能測試
npx playwright test e2e/performance/performance-tests.spec.ts

# 用戶旅程測試
npx playwright test e2e/user-journeys.spec.ts
```

### 特定測試案例
```bash
# 使用測試名稱篩選
npx playwright test --grep "should login"

# 排除特定測試
npx playwright test --grep-invert "should logout"

# 使用標籤篩選
npx playwright test --grep "@smoke"
npx playwright test --grep "@critical"
```

### Debug 模式
```bash
# 開啟瀏覽器視窗
npx playwright test --headed

# Debug 模式 (暫停執行)
npx playwright test --debug

# Debug 特定測試
npx playwright test --debug e2e/web/web-app.spec.ts

# 慢速執行 (方便觀察)
npx playwright test --headed --slow-mo=1000
```

### 測試報告
```bash
# 生成 HTML 報告
npx playwright test --reporter=html

# 查看報告
npx playwright show-report

# 查看追蹤記錄
npx playwright show-trace test-results/creator-full-journey.zip
```

### 並行執行
```bash
# 4 個 worker 並行
npx playwright test --workers=4

# 單一 worker (順序執行)
npx playwright test --workers=1

# CI 環境 (預設 1 worker)
CI=true npx playwright test
```

### 重試機制
```bash
# 失敗自動重試 2 次
npx playwright test --retries=2

# CI 環境自動重試
CI=true npx playwright test
```

---

## 📊 覆蓋率報告

### 後端覆蓋率
```bash
# 執行所有測試並生成覆蓋率
npm run test:coverage

# 查看 HTML 報告
open coverage/lcov-report/index.html
```

### 前端覆蓋率
```bash
cd apps/web
npm run test:coverage

# 查看報告
open coverage/index.html
```

### 覆蓋率閾值檢查
```bash
# 檢查是否達到目標覆蓋率
./scripts/check-coverage.sh

# 預期閾值:
# - 後端: 80%
# - 前端 Web: 70%
# - 前端 Admin: 70%
```

---

## 🐛 除錯技巧

### 後端測試除錯

#### 查看詳細日誌
```bash
npx nx test <service> --verbose
```

#### 執行單一測試
```bash
npx nx test <service> --testNamePattern="should create user"
```

#### 監聽模式 (自動重新執行)
```bash
npx nx test <service> --watch
```

#### 使用 Node Debugger
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand

# 然後在 Chrome 開啟: chrome://inspect
```

### 前端測試除錯

#### Vitest UI
```bash
cd apps/web
npm run test:ui

# 在瀏覽器中開啟 UI
```

#### Debug 單一測試
```typescript
// 在測試中添加 debugger
it('should login', () => {
  debugger; // ← 執行到這裡會暫停
  // ...
});
```

### Playwright 除錯

#### Playwright Inspector
```bash
npx playwright test --debug
```

#### 截圖與錄影
```bash
# 失敗時自動截圖
npx playwright test --screenshot=only-on-failure

# 總是截圖
npx playwright test --screenshot=on

# 失敗時錄影
npx playwright test --video=retain-on-failure
```

#### Trace Viewer
```bash
# 失敗時自動追蹤
npx playwright test --trace=on-first-retry

# 查看追蹤
npx playwright show-trace test-results/trace.zip
```

---

## 🔧 常見問題排查

### 問題: 測試編譯失敗
```bash
# 清除快取
npx nx reset

# 重新安裝依賴
rm -rf node_modules package-lock.json
npm install

# 檢查 TypeScript 配置
npx tsc --noEmit
```

### 問題: 測試超時
```typescript
// 增加超時時間
describe('My Test', () => {
  jest.setTimeout(30000); // 30 秒

  it('long running test', async () => {
    // ...
  });
});
```

```typescript
// Playwright 超時
test('my test', async ({ page }) => {
  test.setTimeout(60000); // 60 秒
});
```

### 問題: 測試資料庫連線失敗
```bash
# 檢查資料庫是否運行
docker ps | grep postgres

# 重啟資料庫
docker-compose restart postgres

# 檢查環境變數
echo $DATABASE_URL
```

### 問題: Playwright 測試找不到元素
```typescript
// 增加等待時間
await page.waitForSelector('[data-testid="login-button"]', {
  timeout: 10000, // 10 秒
});

// 使用更寬鬆的選擇器
await page.waitForSelector('button:has-text("登入"), [type="submit"]');

// 等待網路閒置
await page.waitForLoadState('networkidle');
```

### 問題: 測試 Flaky (不穩定)
```typescript
// 使用 waitFor 而非固定延遲
// ❌ 錯誤
await page.waitForTimeout(1000);

// ✅ 正確
await page.waitForSelector('[data-testid="result"]');

// 使用重試
await expect(async () => {
  const text = await page.textContent('.status');
  expect(text).toBe('Success');
}).toPass({
  timeout: 5000,
});
```

---

## 📦 測試資料準備

### 建立測試用戶
```bash
# 執行 seed script
npm run seed:test-users

# 或手動建立
node scripts/create-test-users.js
```

### 重置測試資料庫
```bash
# 開發環境
npm run db:reset:test

# Docker 環境
docker-compose exec postgres psql -U postgres -d sugardaddy_test -c "TRUNCATE users CASCADE"
```

### 使用 Fixtures
```typescript
// e2e/fixtures/users.fixture.ts
export const TEST_USERS = {
  creator: {
    email: 'creator@test.com',
    password: 'Test1234!',
  },
  subscriber: {
    email: 'subscriber@test.com',
    password: 'Test1234!',
  },
  admin: {
    email: 'admin@test.com',
    password: 'Admin1234!',
  },
};
```

---

## 🔄 CI/CD 測試

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 本地執行 CI 測試
```bash
# 模擬 CI 環境
CI=true npm run test

# CI 模式的 Playwright
CI=true npx playwright test --workers=1 --retries=2
```

---

## 📝 測試撰寫最佳實踐

### 單元測試範例
```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'password123',
        role: 'sugar_daddy',
      };

      jest.spyOn(repository, 'save').mockResolvedValue({
        id: '1',
        ...userData,
      } as User);

      const result = await service.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining(userData)
      );
    });

    it('should throw error if email exists', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue({} as User);

      await expect(
        service.createUser({ email: 'existing@test.com' })
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

### E2E 測試範例
```typescript
// user.e2e.spec.ts
describe('User E2E', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 登入獲取 token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/users/me', () => {
    it('should return current user', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
    });
  });
});
```

### Playwright 測試範例
```typescript
// login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginPage.login('user@test.com', 'password123');
    
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await loginPage.login('user@test.com', 'wrongpassword');
    
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Invalid credentials');
  });

  test('should validate email format', async ({ page }) => {
    await loginPage.emailInput.fill('invalid-email');
    await loginPage.submitButton.click();
    
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });
});
```

---

## 🎯 測試優先級

### P0 - Blocker (必須通過)
```bash
# 認證流程
npx nx test auth-service --testPathPattern=e2e

# 支付流程
npx nx test payment-service --testPathPattern=e2e

# 訂閱流程
npx nx test subscription-service --testPathPattern=e2e

# 核心用戶功能
npx nx test user-service --testPathPattern=e2e
```

### P1 - Critical (強烈建議)
```bash
# 內容管理
npx nx test content-service --testPathPattern=e2e

# 通知系統
npx nx test notification-service --testPathPattern=e2e

# 消息系統
npx nx test messaging-service --testPathPattern=e2e
```

### P2 - High (可選)
```bash
# 效能測試
npx playwright test e2e/performance/

# 安全性測試
npx playwright test e2e/security/
```

---

## 🚀 快速開始檢查清單

### 第一次執行測試
- [ ] 安裝依賴: `npm install`
- [ ] 安裝 Playwright: `npx playwright install`
- [ ] 建立測試資料庫: `npm run db:create:test`
- [ ] 執行遷移: `npm run db:migrate:test`
- [ ] 建立測試用戶: `npm run seed:test-users`
- [ ] 執行測試: `npm run test`

### 每日測試流程
- [ ] Pull 最新代碼: `git pull`
- [ ] 安裝依賴 (如有更新): `npm install`
- [ ] 執行測試: `npm run test`
- [ ] 檢查覆蓋率: `npm run test:coverage`
- [ ] Commit 代碼: `git commit`

---

## 📞 需要幫助？

- **文檔**: [docs/TESTING.md](../TESTING.md)
- **測試策略**: [docs/testing/PRE_LAUNCH_TEST_STRATEGY.md](./PRE_LAUNCH_TEST_STRATEGY.md)
- **2週計劃**: [docs/testing/2_WEEK_SPRINT_ROADMAP.md](./2_WEEK_SPRINT_ROADMAP.md)
- **Slack**: #testing-sprint
- **QA Lead**: qa-lead@sugardaddy.com

---

**最後更新**: 2026-02-14  
**維護者**: QA Team
