# E2E 測試執行指南

## 📋 目錄

- [概述](#概述)
- [快速開始](#快速開始)
- [環境設置](#環境設置)
- [執行測試](#執行測試)
- [測試組織](#測試組織)
- [最佳實踐](#最佳實踐)
- [常見問題](#常見問題)

## 概述

本專案使用 **Playwright** 進行端到端（E2E）測試。Playwright 提供可靠、快速、跨瀏覽器的測試能力。

### 測試覆蓋範圍

- ✅ 用戶認證（登入、註冊、登出）
- ✅ 用戶個人資料管理
- ✅ 內容瀏覽和互動
- ✅ 付款和訂閱流程
- ✅ 社交功能（追蹤、訊息）
- ✅ 管理後台功能

### 技術棧

- **測試框架**: Playwright ^1.58.2
- **語言**: TypeScript
- **測試模式**: Page Object Model (POM)
- **瀏覽器**: Chromium, Firefox, WebKit

## 快速開始

### 1. 安裝依賴

```bash
# 安裝 Node.js 依賴
npm install

# 安裝 Playwright 瀏覽器
npx playwright install
```

### 2. 啟動服務

```bash
# 使用 PM2 啟動所有服務
npm run pm2:start

# 或使用 Docker Compose
docker-compose up -d
```

### 3. 執行測試

```bash
# 執行所有 E2E 測試
npm run test:e2e

# 執行特定測試文件
npm run test:e2e auth.spec.ts

# 以 UI 模式執行
npm run test:e2e:ui

# 以 Headed 模式執行（顯示瀏覽器）
npm run test:e2e:headed

# Debug 模式
npm run test:e2e:debug
```

## 環境設置

### 自動設置

使用提供的設置腳本：

```bash
# 完整設置（包含瀏覽器安裝）
bash test/e2e/scripts/setup-e2e-env.sh

# 跳過瀏覽器安裝
bash test/e2e/scripts/setup-e2e-env.sh --skip-browsers

# 包含資料庫遷移和種子資料
bash test/e2e/scripts/setup-e2e-env.sh --with-migrations --with-seed
```

### 手動設置

#### 1. 設置環境變數

建立 `.env.e2e` 文件：

```env
# 應用程式 URL
E2E_BASE_URL=http://localhost:4200
E2E_ADMIN_URL=http://localhost:4300
E2E_API_URL=http://localhost:3000

# 測試用戶
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_USER_PASSWORD=TestPassword123!

# Stripe 測試金鑰
STRIPE_TEST_PUBLIC_KEY=pk_test_xxxxx
STRIPE_TEST_SECRET_KEY=sk_test_xxxxx
```

#### 2. 準備測試資料庫

```bash
# 執行遷移
npm run db:migrate

# 填充測試資料（可選）
npm run db:seed
```

#### 3. 啟動服務

```bash
# 使用 PM2
npm run pm2:start

# 檢查狀態
npm run pm2:status
```

## 執行測試

### 基本命令

```bash
# 執行所有測試
npm run test:e2e

# 執行特定測試文件
npx playwright test test/e2e/specs/user-journey/auth.spec.ts

# 執行特定測試案例
npx playwright test -g "應該可以登入"
```

### 進階選項

```bash
# 只在 Chromium 上執行
npx playwright test --project=chromium

# 執行帶有特定標籤的測試
npx playwright test --grep @critical

# 排除某些測試
npx playwright test --grep-invert @slow

# 序列執行（一次一個測試）
npx playwright test --workers=1

# 重試失敗的測試
npx playwright test --retries=2

# 更新快照
npx playwright test --update-snapshots
```

### 互動模式

```bash
# UI 模式（推薦用於開發）
npm run test:e2e:ui

# Headed 模式（顯示瀏覽器）
npm run test:e2e:headed

# Debug 模式（逐步執行）
npm run test:e2e:debug
```

### 查看報告

```bash
# 查看 HTML 報告
npm run test:e2e:report

# 或直接開啟
npx playwright show-report test/coverage/e2e-report
```

## 測試組織

### 目錄結構

```
test/e2e/
├── fixtures/           # 測試 fixtures 和擴展
│   └── base.ts         # 基礎測試配置
├── page-objects/       # Page Object Models
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── FeedPage.ts
│   ├── UserProfilePage.ts
│   ├── PaymentPage.ts
│   ├── PostDetailPage.ts
│   └── SubscriptionPage.ts
├── specs/              # 測試規格
│   ├── user-journey/   # 用戶旅程測試
│   │   ├── auth.spec.ts
│   │   ├── user-profile.spec.ts
│   │   ├── content.spec.ts
│   │   └── payment.spec.ts
│   ├── critical-paths/ # 關鍵路徑測試
│   │   ├── core-features.spec.ts
│   │   └── navigation.spec.ts
│   └── admin-flows/    # 管理後台測試
│       └── admin-login.spec.ts
├── utils/              # 測試工具
│   └── test-data-factory.ts
├── scripts/            # 設置腳本
│   └── setup-e2e-env.sh
└── global.setup.ts     # 全域設置
```

### Page Object 範例

```typescript
// LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### 測試範例

```typescript
// auth.spec.ts
import { test, expect } from '../../fixtures/base';
import { LoginPage } from '../../page-objects/LoginPage';

test.describe('用戶認證', () => {
  test('應該可以登入 @critical', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    
    // 驗證導航到主頁
    await expect(page).toHaveURL(/\/feed/);
  });
});
```

## 最佳實踐

### 1. 使用語義化選擇器

```typescript
// ✅ 好的做法
page.locator('button[aria-label="登入"]')
page.locator('input[name="email"]')
page.getByRole('button', { name: '提交' })

// ❌ 避免
page.locator('.btn-primary')
page.locator('#submit')
```

### 2. 等待策略

```typescript
// ✅ 使用內建的等待
await expect(page.locator('.message')).toBeVisible();
await page.waitForLoadState('networkidle');

// ❌ 避免硬編碼等待
await page.waitForTimeout(5000); // 不推薦
```

### 3. 測試隔離

```typescript
// ✅ 每個測試獨立
test.beforeEach(async ({ page }) => {
  // 清除狀態
  await page.goto('/');
});

// ❌ 測試之間相互依賴
test('test1', async ({ page }) => { /* ... */ });
test('test2 depends on test1', async ({ page }) => { /* ... */ });
```

### 4. 使用測試標籤

```typescript
// 標記重要測試
test('登入功能 @critical', async ({ page }) => { /* ... */ });
test('圖片上傳 @media', async ({ page }) => { /* ... */ });
test('付款流程 @payment', async ({ page }) => { /* ... */ });

// 執行時篩選
// npx playwright test --grep @critical
```

### 5. 錯誤處理

```typescript
// ✅ 優雅處理錯誤
try {
  await page.locator('.optional-element').click();
} catch {
  // 元素可能不存在，這是正常的
}

// 使用條件檢查
const isVisible = await page.locator('.popup').isVisible();
if (isVisible) {
  await page.locator('.popup .close').click();
}
```

### 6. 資料驅動測試

```typescript
const testUsers = [
  { email: 'user1@example.com', role: 'baby' },
  { email: 'user2@example.com', role: 'daddy' },
];

for (const user of testUsers) {
  test(`登入作為 ${user.role}`, async ({ page }) => {
    await loginAs(page, user.email);
    // 驗證...
  });
}
```

## 常見問題

### Q1: 測試執行很慢

**解決方案**:
- 使用 `--workers` 參數增加並行度
- 只執行必要的瀏覽器（`--project=chromium`）
- 使用 `--grep @critical` 只執行關鍵測試

```bash
npx playwright test --workers=4 --project=chromium --grep @critical
```

### Q2: 測試不穩定（Flaky）

**解決方案**:
- 避免使用 `waitForTimeout`
- 增加 `expect` 的超時時間
- 確保測試之間的隔離
- 使用 `test.fail()` 標記已知的不穩定測試

```typescript
test.fail('已知不穩定的測試', async ({ page }) => {
  // 這個測試可能失敗
});
```

### Q3: 找不到元素

**解決方案**:
- 檢查選擇器是否正確
- 確認元素是否在 iframe 中
- 使用 Playwright Inspector 檢查

```bash
npx playwright test --debug
```

### Q4: 服務未啟動

**解決方案**:

```bash
# 檢查服務狀態
npm run pm2:status

# 重啟服務
npm run pm2:restart

# 查看日誌
npm run pm2:logs
```

### Q5: 資料庫連線失敗

**解決方案**:

```bash
# 檢查 Docker 容器
docker ps

# 重啟資料庫
docker-compose restart postgres-master

# 檢查連線
docker-compose exec postgres-master pg_isready -U postgres
```

## 偵錯技巧

### 1. 使用 Playwright Inspector

```bash
npx playwright test --debug
```

### 2. 截圖和錄影

測試失敗時自動生成：
- 截圖：`test/coverage/e2e-artifacts/`
- 錄影：`test/coverage/e2e-recordings/`
- Trace：`test/coverage/e2e-artifacts/`

### 3. 查看 Trace

```bash
npx playwright show-trace test/coverage/e2e-artifacts/trace.zip
```

### 4. 慢動作執行

```typescript
test('debug test', async ({ page }) => {
  await page.setDefaultTimeout(60000);
  await page.setDefaultNavigationTimeout(60000);
  
  // 測試內容...
});
```

## CI/CD 整合

### GitHub Actions 範例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Setup environment
        run: bash test/e2e/scripts/setup-e2e-env.sh
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test/coverage/e2e-report/
```

## 效能考量

### 測試執行時間目標

- 單一測試：< 30 秒
- 完整測試套件：< 10 分鐘
- 關鍵路徑測試：< 2 分鐘

### 優化建議

1. **並行執行**: 使用多個 workers
2. **選擇性執行**: 使用標籤篩選
3. **快取依賴**: 在 CI 中快取 node_modules
4. **最小化等待**: 避免不必要的延遲
5. **測試分片**: 大型測試套件可以分片執行

## 維護指南

### 定期檢查

- ✅ 更新 Playwright 版本
- ✅ 檢查並修復 flaky 測試
- ✅ 清理舊的測試資料
- ✅ 更新 Page Objects
- ✅ 審查測試覆蓋率

### 測試命名慣例

```typescript
// 使用 "應該..." 格式
test('應該可以登入', async ({ page }) => { /* ... */ });
test('應該顯示錯誤訊息', async ({ page }) => { /* ... */ });

// 使用描述性標籤
test('付款流程 @critical @payment', async ({ page }) => { /* ... */ });
```

## 資源連結

- [Playwright 官方文檔](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Patterns](https://playwright.dev/docs/test-patterns)
- [Selectors Guide](https://playwright.dev/docs/selectors)

---

**需要協助？**
請聯繫測試團隊或在專案 issue 中提問。
