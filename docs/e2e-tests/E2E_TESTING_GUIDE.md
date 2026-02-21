# E2E & Integration Testing Suite - 完整指南

## 📋 目錄

1. [快速開始](#快速開始)
2. [架構概述](#架構概述)
3. [編寫 E2E 測試](#編寫-e2e-測試)
4. [編寫 API 測試](#編寫-api-測試)
5. [測試數據管理](#測試數據管理)
6. [CI/CD 集成](#cicd-集成)
7. [最佳實踐](#最佳實踐)
8. [常見問題](#常見問題)

---

## 快速開始

### 安裝依賴

```bash
cd e2e-tests
npm install
```

### 設置環境變數

```bash
cp .env.example .env
# 編輯 .env 填入你的本地 URL
```

### 運行所有測試

```bash
# 運行 E2E 測試
npm run test:e2e

# 運行 API 測試
npm run test:api

# 運行所有測試
npm run test:all

# 以 UI 模式運行（可視化）
npm run test:e2e:ui

# 在有頭瀏覽器中運行（看到瀏覽器操作）
npm run test:e2e:headed

# 調試模式
npm run test:e2e:debug
```

### 查看測試報告

```bash
npm run report
```

---

## 架構概述

```
e2e-tests/
├── tests/
│   ├── fixtures.ts              # 共享 fixtures 和测试数据
│   ├── jest.setup.ts            # Jest 初始化
│   ├── auth.spec.ts             # 認證 E2E 測試
│   ├── content-viewing.spec.ts  # 內容觀看 E2E 測試
│   ├── creator-management.spec.ts  # 創作者管理 E2E 測試
│   ├── payment.spec.ts          # 支付流程 E2E 測試
│   └── api.spec.ts              # API 集成測試
├── playwright.config.ts         # Playwright 配置
├── jest.config.js               # Jest 配置
├── package.json                 # 依賴管理
└── README.md                    # 本文檔
```

### 測試框架選型

- **E2E 測試**: Playwright
  - 支持多瀏覽器（Chrome、Firefox、Safari）
  - 支持移動設備模擬
  - 強大的調試工具
  - 快速執行

- **API 測試**: Jest + Supertest
  - 輕量級
  - 快速反饋
  - 與 NestJS 完美集成

---

## 編寫 E2E 測試

### 基本結構

```typescript
import { test, expect, generateTestUser } from './fixtures';

test.describe('@critical 測試套件名稱', () => {
  test('應該執行某個操作', async ({ authenticatedPage: page }) => {
    // Arrange - 準備測試數據
    const user = generateTestUser();
    
    // Act - 執行操作
    await page.goto('/dashboard');
    
    // Assert - 驗證結果
    await expect(page.locator('[data-testid="user-name"]')).toContainText(user.name);
  });
});
```

### 可用的 Fixtures

```typescript
// 已認證的用戶頁面（查看者）
test('should work', async ({ authenticatedPage: page }) => {
  // page 已登入查看者賬戶
});

// 創作者認證頁面
test('should work', async ({ creatorAuthPage: page }) => {
  // page 已登入創作者賬戶
});

// 未認證的客人頁面
test('should work', async ({ guestPage: page }) => {
  // page 沒有登入
});
```

### 測試標籤

```typescript
// 關鍵業務流程
test('@critical 用戶註冊流程', async () => {});

// 性能測試
test('@performance 首頁加載時間', async () => {});

// 只在特定瀏覽器上運行
test.skip('@webkit 僅限 Safari', async () => {});

// 臨時跳過
test.skip('待實現的功能', async () => {});
```

### 常見操作

```typescript
// 導航
await page.goto('/path');
await page.goBack();
await page.reload();

// 與元素互動
await page.fill('input[name="email"]', 'test@example.com');
await page.click('button:has-text("Submit")');
await page.check('input[type="checkbox"]');
await page.selectOption('select', 'value');

// 等待
await page.waitForNavigation();
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="loader"]', { state: 'hidden' });
await page.waitForTimeout(1000);

// 驗證
await expect(page).toHaveTitle('Expected Title');
await expect(locator).toBeVisible();
await expect(locator).toContainText('text');
await expect(locator).toHaveCount(5);

// 獲取信息
const text = await page.textContent('[data-testid="element"]');
const value = await page.inputValue('input[name="field"]');
const count = await page.locator('[data-testid="item"]').count();

// 上傳文件
await page.locator('input[type="file"]').setInputFiles('./fixtures/file.pdf');

// 截圖與視頻
await page.screenshot({ path: 'screenshot.png' });
```

### 高級技巧

#### 使用 Test Context

```typescript
test.describe('Suite with context', () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // 自定義配置
    });
  });

  test('test with context', async () => {
    const page = await context.newPage();
    // ... test code
  });

  test.afterAll(async () => {
    await context.close();
  });
});
```

#### 並行執行

```typescript
// 並行運行這些測試
test.describe.parallel('並行測試', () => {
  test('test 1', async () => {});
  test('test 2', async () => {});
});
```

#### 條件執行

```typescript
test('only on CI', () => {
  test.skip(process.env.CI !== 'true', 'Skip on local');
  // ... test code
});
```

---

## 編寫 API 測試

### 基本結構

```typescript
import supertest from 'supertest';
import { API_BASE_URLS, USERS } from './fixtures';

const api = supertest(API_BASE_URLS.auth);

describe('Auth API', () => {
  test('should register user', async () => {
    const response = await api
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!@#',
        name: 'Test User',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
  });
});
```

### API 測試技巧

```typescript
// 設置請求頭
await api
  .get('/protected')
  .set('Authorization', `Bearer ${token}`)
  .set('Accept', 'application/json');

// 發送 JSON 數據
await api.post('/users').send({
  email: 'test@example.com',
  password: 'password123'
});

// 發送表單數據
await api.post('/upload').field('name', 'value').attach('file', 'path/to/file');

// 查詢字符串
await api.get('/users?page=1&limit=10&sort=name');

// 驗證響應
expect(response.status).toBe(200);
expect(response.body).toHaveProperty('id');
expect(response.headers['content-type']).toMatch(/json/);

// 快照測試
expect(response.body).toMatchSnapshot();

// 性能測試
expect(response.duration).toBeLessThan(200); // ms
```

---

## 測試數據管理

### 使用 Fixtures Factory

```typescript
import { generateTestUser, generateTestContent } from './fixtures';

test('should work with test data', async () => {
  const user = generateTestUser({
    name: 'Custom Name',
    email: 'custom@example.com'
  });

  const content = generateTestContent({
    category: 'Sports',
    price: 19.99
  });

  // ... 使用測試數據
});
```

### 保存測試數據（用於調試）

```typescript
import { saveTestData } from './fixtures';

test('should save debug info', async () => {
  const result = { /* ... */ };
  saveTestData('test-name', result);
  // 保存到 test-results/test-name-data.json
});
```

### 共享測試數據

```typescript
// fixtures.ts
export const USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!@#',
  },
  creator: {
    email: 'creator@example.com',
    password: 'Creator123!@#',
  },
};

// 在測試中使用
test('should login', async () => {
  const { creator } = USERS;
  // ... 使用預定義用戶
});
```

---

## CI/CD 集成

### GitHub Actions 工作流

工作流文件位置: `.github/workflows/e2e-tests.yml`

#### 工作流特性

- ✅ 並行執行 E2E 和 API 測試
- ✅ 使用 Docker 服務（PostgreSQL、Redis）
- ✅ 自動上傳測試報告
- ✅ PR 評論中顯示測試結果
- ✅ 失敗時重試

#### 本地模擬 CI

```bash
# 使用 act 本地運行 GitHub Actions
act -j e2e-tests

# 或指定操作系統
act -j e2e-tests -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest
```

#### 環境變數

CI 環境中自動設置:

```
CI=true
BASE_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:3001/api
PAYMENT_SERVICE_URL=http://localhost:3002/api
CONTENT_SERVICE_URL=http://localhost:3003/api
RECOMMENDATION_SERVICE_URL=http://localhost:3004/api
```

---

## 最佳實踐

### ✅ 測試編寫最佳實踐

#### 1. 使用有意義的測試名稱

```typescript
// ❌ 不好
test('test login', async () => {});

// ✅ 好
test('should successfully login with valid credentials and redirect to dashboard', async () => {});
```

#### 2. 單一責任原則

```typescript
// ❌ 不好 - 測試太多東西
test('should register and login and view content', async () => {
  // 50 行代碼
});

// ✅ 好 - 單一責任
test('should successfully register new user', async () => {
  // 15 行代碼
});
```

#### 3. 使用 Page Object Model（可選但推薦）

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForNavigation();
  }

  async getErrorMessage() {
    return this.page.textContent('[role="alert"]');
  }
}

// 在測試中使用
test('should show error for invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'wrong');
  const error = await loginPage.getErrorMessage();
  expect(error).toContain('Invalid');
});
```

#### 4. 使用描述性的 data-testid

```html
<!-- ❌ 不好 -->
<button class="btn">Login</button>

<!-- ✅ 好 -->
<button data-testid="login-submit-button">Login</button>
```

#### 5. 避免等待時間（使用條件等待）

```typescript
// ❌ 不好
await page.waitForTimeout(5000);
await page.goto('/next-page');

// ✅ 好
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="page-loaded"]');
```

#### 6. 測試邊界情況和錯誤場景

```typescript
test.describe('邊界值測試', () => {
  test('should handle empty input', async () => {});
  test('should handle very long input', async () => {});
  test('should handle special characters', async () => {});
  test('should handle SQL injection attempts', async () => {});
});
```

### ✅ API 測試最佳實踐

#### 1. 使用 beforeAll/afterAll

```typescript
describe('API Suite', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // 登入一次，所有測試共享 token
    const res = await api.post('/auth/login').send(USERS.viewer);
    authToken = res.body.accessToken;
    userId = res.body.user.id;
  });

  test('test 1', async () => {
    // 使用 authToken
  });

  test('test 2', async () => {
    // 使用 authToken
  });
});
```

#### 2. 測試 Happy Path 和 Error Cases

```typescript
describe('POST /users', () => {
  test('happy path: should create user with valid data', async () => {});
  test('error case: should reject invalid email', async () => {});
  test('error case: should reject duplicate email', async () => {});
  test('error case: should reject weak password', async () => {});
});
```

#### 3. 驗證響應結構

```typescript
test('should have correct response structure', async () => {
  const response = await api.get('/users/1');
  
  expect(response.body).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      email: expect.any(String),
      createdAt: expect.any(String),
    })
  );
});
```

### 測試性能基準

- E2E 測試: 每個測試 < 30 秒
- API 測試: 每個測試 < 5 秒
- 整體測試套件: < 15 分鐘

---

## 常見問題

### Q1: 測試超時怎麼辦？

```typescript
// 增加超時時間
test('slow test', async () => {
  // ... code
}, { timeout: 60000 }); // 60 秒

// 或在配置中全局設置
// playwright.config.ts
export default defineConfig({
  timeout: 30 * 1000,
});
```

### Q2: 如何調試失敗的測試？

```bash
# 使用調試模式
npm run test:e2e:debug

# 或使用 UI 模式
npm run test:e2e:ui

# 或查看視頻（自動錄製失敗的測試）
# 視頻保存在 playwright-report/
```

### Q3: 如何在本地運行特定測試？

```bash
# 運行特定文件
npx playwright test tests/auth.spec.ts

# 運行特定測試
npx playwright test -g "should login"

# 運行帶特定標籤的測試
npx playwright test --grep "@critical"

# 運行特定瀏覽器
npx playwright test --project=chromium
```

### Q4: 如何跳過某個測試？

```typescript
// 臨時跳過
test.skip('work in progress', async () => {});

// 跳過整個套件
test.describe.skip('Not ready', () => {});

// 條件跳過
test.skip(process.env.CI === 'true', 'Skip on CI');
```

### Q5: 如何處理隨機測試失敗（flaky tests）？

```typescript
// 使用內置重試
test.describe('Potentially flaky', () => {
  test.describe.configure({ retries: 2 });
  
  test('might fail', async () => {
    // 如果失敗，會自動重試 2 次
  });
});
```

### Q6: 如何測試文件上傳？

```typescript
test('should upload file', async ({ page }) => {
  await page.goto('/upload');
  
  // 設置文件輸入
  await page.locator('input[type="file"]').setInputFiles([
    {
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('file content'),
    }
  ]);
  
  await page.click('button:has-text("Upload")');
  await expect(page.locator('[data-testid="success"]')).toBeVisible();
});
```

### Q7: 如何測試 WebSocket 連接？

```typescript
test('should handle WebSocket', async ({ page }) => {
  // 等待 WebSocket 連接
  const wsPromise = page.waitForEvent('websocket');
  await page.goto('/live');
  
  const ws = await wsPromise;
  expect(ws.url()).toContain('/live');
});
```

### Q8: 報告格式問題怎麼辦？

```bash
# 查看 HTML 報告
npm run report

# 轉換為其他格式（在配置中修改 reporter）
# reporter: ['html', 'json', 'junit', 'list']
```

---

## 資源

- [Playwright 文檔](https://playwright.dev)
- [Jest 文檔](https://jestjs.io)
- [Supertest 文檔](https://github.com/visionmedia/supertest)
- [NestJS 測試文檔](https://docs.nestjs.com/fundamentals/testing)

---

## 支持

如有問題，請提交 Issue 或聯繫 QA 團隊。
