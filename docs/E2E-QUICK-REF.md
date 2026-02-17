# E2E 測試快速參考

## 🚀 快速開始

```bash
# 1. 設置環境
bash test/e2e/scripts/setup-e2e-env.sh

# 2. 執行測試
npm run test:e2e

# 3. 查看報告
npm run test:e2e:report
```

## 📝 常用命令

### 執行測試

```bash
# 所有測試
npm run test:e2e

# UI 模式（推薦）
npm run test:e2e:ui

# 顯示瀏覽器
npm run test:e2e:headed

# Debug 模式
npm run test:e2e:debug

# 特定文件
npx playwright test auth.spec.ts

# 特定測試
npx playwright test -g "應該可以登入"

# 特定標籤
npx playwright test --grep @critical

# 特定瀏覽器
npx playwright test --project=chromium
```

### 查看報告

```bash
# HTML 報告
npm run test:e2e:report

# Trace Viewer（失敗測試）
npx playwright show-trace test/coverage/e2e-artifacts/trace.zip
```

## 🏗️ 測試結構

### Page Object 範例

```typescript
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input#email');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.page.locator('input#password').fill(password);
    await this.submitButton.click();
  }
}
```

### 測試範例

```typescript
import { test, expect } from '../../fixtures/base';
import { LoginPage } from '../../page-objects/LoginPage';

test.describe('登入功能', () => {
  test('應該可以登入 @critical', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    
    await expect(page).toHaveURL(/\/feed/);
  });
});
```

## 🎯 選擇器最佳實踐

```typescript
// ✅ 推薦使用
page.getByRole('button', { name: '登入' })
page.getByLabel('Email')
page.getByPlaceholder('輸入郵箱')
page.getByTestId('submit-button')

// ✅ 語義化選擇器
page.locator('button[type="submit"]')
page.locator('input[name="email"]')
page.locator('[aria-label="關閉"]')

// ❌ 避免
page.locator('.btn-primary')
page.locator('#submit')
page.locator('div > div > button')
```

## ⏰ 等待策略

```typescript
// ✅ 自動等待（推薦）
await expect(page.locator('.message')).toBeVisible();
await expect(page.locator('.message')).toHaveText('成功');

// ✅ 等待特定狀態
await page.waitForLoadState('networkidle');
await page.waitForURL(/\/feed/);
await page.waitForResponse(resp => resp.url().includes('/api/'));

// ❌ 避免硬編碼延遲
await page.waitForTimeout(5000); // 不推薦
```

## 🏷️ 測試標籤

### 使用標籤

```typescript
test('登入功能 @critical @auth', async ({ page }) => {
  // 測試內容
});

test('圖片上傳 @media @slow', async ({ page }) => {
  // 測試內容
});
```

### 執行標籤

```bash
# 只執行關鍵測試
npx playwright test --grep @critical

# 排除慢速測試
npx playwright test --grep-invert @slow

# 多個標籤
npx playwright test --grep "@critical|@smoke"
```

## 🧪 測試資料工廠

```typescript
import { TestDataFactory } from '../utils/test-data-factory';

// 生成測試用戶
const user = TestDataFactory.generateTestUser('sugar_baby');

// 生成 Email
const email = TestDataFactory.generateEmail('test');

// 生成貼文
const post = TestDataFactory.generatePost();

// Stripe 測試卡號
const card = TestDataFactory.generateStripeTestCard('success');
```

## 🔧 Fixtures

```typescript
import { test } from '../../fixtures/base';

// 使用已認證的頁面
test('測試需要登入', async ({ authenticatedPage }) => {
  // authenticatedPage 已經登入
});

// 使用測試用戶
test('使用測試用戶', async ({ testUser }) => {
  console.log(testUser.email);
  console.log(testUser.password);
});

// 使用 API 客戶端
test('API 測試', async ({ apiClient }) => {
  const response = await apiClient.get('/api/users/me');
  expect(response.success).toBe(true);
});
```

## 🐛 Debug 技巧

### 1. Inspector

```bash
npx playwright test --debug
```

### 2. 慢動作

```typescript
test('debug 測試', async ({ page }) => {
  await page.pause(); // 暫停執行
  
  // 或設置慢動作
  await page.setDefaultTimeout(60000);
});
```

### 3. 控制台日誌

```typescript
test('查看日誌', async ({ page }) => {
  page.on('console', msg => console.log(msg.text()));
  page.on('pageerror', err => console.error(err));
  
  // 測試內容...
});
```

### 4. 截圖

```typescript
test('手動截圖', async ({ page }) => {
  await page.screenshot({ path: 'screenshot.png' });
  await page.screenshot({ path: 'fullpage.png', fullPage: true });
});
```

## 📊 斷言參考

### 頁面斷言

```typescript
await expect(page).toHaveURL('https://example.com/');
await expect(page).toHaveTitle(/Login/);
```

### 元素斷言

```typescript
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toBeChecked();
await expect(locator).toBeFocused();
```

### 文字斷言

```typescript
await expect(locator).toHaveText('Hello');
await expect(locator).toContainText('Hello');
await expect(locator).toHaveValue('input value');
```

### 屬性斷言

```typescript
await expect(locator).toHaveAttribute('href', '/login');
await expect(locator).toHaveClass(/active/);
await expect(locator).toHaveCSS('color', 'rgb(255, 0, 0)');
```

### 數量斷言

```typescript
await expect(locator).toHaveCount(5);
const count = await locator.count();
expect(count).toBeGreaterThan(0);
```

## 🔄 常見模式

### 條件操作

```typescript
// 如果元素存在則點擊
const button = page.locator('.optional-button');
if (await button.isVisible()) {
  await button.click();
}
```

### 迭代元素

```typescript
const items = page.locator('.list-item');
const count = await items.count();

for (let i = 0; i < count; i++) {
  const item = items.nth(i);
  console.log(await item.textContent());
}
```

### 等待多個條件

```typescript
await Promise.all([
  page.waitForResponse(resp => resp.url().includes('/api/')),
  page.click('button[type="submit"]'),
]);
```

### 處理對話框

```typescript
page.on('dialog', async dialog => {
  console.log(dialog.message());
  await dialog.accept();
});

await page.click('button:has-text("刪除")');
```

## 🌐 跨瀏覽器測試

```bash
# 只在 Chromium
npx playwright test --project=chromium

# 只在 Firefox
npx playwright test --project=firefox

# 只在 WebKit (Safari)
npx playwright test --project=webkit

# 手機瀏覽器
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari
```

## 📱 響應式測試

```typescript
test('手機視圖', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  
  // iPhone 13
  await page.setViewportSize({ width: 390, height: 844 });
});

test('平板視圖', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
});
```

## 🚦 測試隔離

```typescript
test.beforeEach(async ({ page }) => {
  // 每個測試前執行
  await page.goto('/');
});

test.afterEach(async ({ page, context }) => {
  // 每個測試後清理
  await page.close();
});
```

## ⚡ 效能優化

```bash
# 增加並行度
npx playwright test --workers=4

# 序列執行（避免資源競爭）
npx playwright test --workers=1

# 只失敗時記錄 trace
# 已在 playwright.config.ts 配置
```

## 🎬 錄影和截圖

### 自動（失敗時）

配置在 `playwright.config.ts`:
```typescript
use: {
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

### 手動

```typescript
test('手動錄影', async ({ page }, testInfo) => {
  // 截圖
  await testInfo.attach('screenshot', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
```

## 📁 目錄結構

```
test/e2e/
├── fixtures/              # 測試 fixtures
│   └── base.ts
├── page-objects/          # Page Object Models
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── FeedPage.ts
│   ├── UserProfilePage.ts
│   ├── PaymentPage.ts
│   ├── PostDetailPage.ts
│   └── SubscriptionPage.ts
├── specs/                 # 測試規格
│   ├── user-journey/
│   ├── critical-paths/
│   └── admin-flows/
├── utils/                 # 工具函數
│   └── test-data-factory.ts
├── scripts/               # 設置腳本
│   └── setup-e2e-env.sh
└── global.setup.ts        # 全域設置
```

## 🆘 常見問題

### 元素找不到

```typescript
// 增加超時
await page.locator('.element').waitFor({ timeout: 30000 });

// 使用更寬鬆的選擇器
await page.locator('text=登入').click();
```

### 測試不穩定

```bash
# 重試失敗的測試
npx playwright test --retries=2

# 序列執行避免競爭
npx playwright test --workers=1
```

### 服務未啟動

```bash
# 檢查狀態
npm run pm2:status

# 重啟
npm run pm2:restart

# 查看日誌
npm run pm2:logs
```

## 📚 更多資源

- [完整指南](./E2E-TEST-GUIDE.md)
- [覆蓋範圍](./E2E-TEST-COVERAGE.md)
- [Playwright 文檔](https://playwright.dev/)

---

**提示**: 使用 `npm run test:e2e:ui` 開始測試最直觀！
