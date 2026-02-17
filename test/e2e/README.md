# E2E 測試套件

完整的端到端測試套件，使用 Playwright 進行瀏覽器自動化測試。

## 🚀 快速開始

```bash
# 1. 設置環境
npm run test:e2e:setup

# 2. 執行測試
npm run test:e2e

# 3. 查看報告
npm run test:e2e:report
```

## 📁 目錄結構

```
test/e2e/
├── fixtures/              # 測試 fixtures 和擴展
│   └── base.ts            # 自定義 fixtures (authenticatedPage, testUser, apiClient)
├── page-objects/          # Page Object Models
│   ├── LoginPage.ts       # 登入頁面
│   ├── RegisterPage.ts    # 註冊頁面
│   ├── FeedPage.ts        # Feed 動態頁面
│   ├── UserProfilePage.ts # 用戶個人資料頁面
│   ├── PaymentPage.ts     # 付款頁面
│   ├── PostDetailPage.ts  # 貼文詳情頁面
│   └── SubscriptionPage.ts # 訂閱管理頁面
├── specs/                 # 測試規格
│   ├── user-journey/      # 用戶旅程測試
│   │   ├── auth.spec.ts   # 認證測試 ✅
│   │   ├── user-profile.spec.ts # 用戶資料測試 🟡
│   │   ├── content.spec.ts # 內容功能測試 🟡
│   │   └── payment.spec.ts # 付款功能測試 🟡
│   ├── critical-paths/    # 關鍵路徑測試
│   │   ├── core-features.spec.ts
│   │   └── navigation.spec.ts
│   └── admin-flows/       # 管理後台測試
│       └── admin-login.spec.ts
├── utils/                 # 測試工具
│   └── test-data-factory.ts # 測試資料生成工具
├── scripts/               # 設置腳本
│   └── setup-e2e-env.sh   # 環境設置腳本
├── global.setup.ts        # 全域設置
└── README.md              # 本文件
```

## 📝 常用命令

### 執行測試

```bash
# 所有測試
npm run test:e2e

# UI 模式（推薦開發使用）
npm run test:e2e:ui

# 顯示瀏覽器
npm run test:e2e:headed

# Debug 模式
npm run test:e2e:debug

# 只執行關鍵測試
npm run test:e2e:critical

# 只執行認證測試
npm run test:e2e:auth

# 只執行付款測試
npm run test:e2e:payment
```

### 特定瀏覽器

```bash
# Chromium (Chrome/Edge)
npm run test:e2e:chromium

# Firefox
npm run test:e2e:firefox

# WebKit (Safari)
npm run test:e2e:webkit

# Mobile Chrome
npm run test:e2e:mobile
```

### 進階用法

```bash
# 執行特定文件
npx playwright test auth.spec.ts

# 執行特定測試
npx playwright test -g "應該可以登入"

# 使用標籤篩選
npx playwright test --grep @critical

# 排除某些測試
npx playwright test --grep-invert @slow

# 序列執行
npx playwright test --workers=1

# 重試失敗的測試
npx playwright test --retries=2
```

## 🎯 測試標籤

- `@critical` - 關鍵功能測試
- `@auth` - 認證相關
- `@payment` - 付款相關
- `@social` - 社交功能
- `@media` - 多媒體功能
- `@validation` - 表單驗證
- `@security` - 安全性測試
- `@responsive` - 響應式測試

## 📚 文檔

完整文檔位於 `docs/` 目錄：

- **[E2E-TEST-GUIDE.md](../../docs/E2E-TEST-GUIDE.md)** - 完整測試指南
- **[E2E-TEST-COVERAGE.md](../../docs/E2E-TEST-COVERAGE.md)** - 測試覆蓋範圍
- **[E2E-QUICK-REF.md](../../docs/E2E-QUICK-REF.md)** - 快速參考手冊

## 📊 測試統計

| 類別 | 測試數量 | 覆蓋率 | 狀態 |
|------|----------|--------|------|
| 用戶認證 | 12 | 90% | ✅ |
| 用戶功能 | 15 | 75% | 🟡 |
| 內容功能 | 20 | 70% | 🟡 |
| 付款功能 | 18 | 60% | 🟡 |
| **總計** | **65** | **65%** | 🟡 |

## 🛠️ Page Object 使用範例

```typescript
import { test, expect } from '../fixtures/base';
import { LoginPage } from '../page-objects/LoginPage';

test('登入測試', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');
  
  await expect(page).toHaveURL(/\/feed/);
});
```

## 🧪 測試資料工廠使用

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

## 🔧 自定義 Fixtures

```typescript
import { test } from '../fixtures/base';

// 使用已認證的頁面
test('需要登入的測試', async ({ authenticatedPage }) => {
  // authenticatedPage 已經登入
  await authenticatedPage.goto('/profile');
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

### 1. Playwright Inspector

```bash
npx playwright test --debug
```

### 2. 查看 Trace

```bash
npx playwright show-trace test/coverage/e2e-artifacts/trace.zip
```

### 3. 慢動作執行

```typescript
test('debug 測試', async ({ page }) => {
  await page.pause(); // 暫停執行
});
```

## 🎥 測試錄影和截圖

測試失敗時自動生成：

- **截圖**: `test/coverage/e2e-artifacts/`
- **錄影**: `test/coverage/e2e-recordings/`
- **Trace**: `test/coverage/e2e-artifacts/`

## 🔄 CI/CD 整合

測試已配置為在以下情況自動執行：

- Pull Request 提交時
- Merge 到 main 分支時

配置文件：`.github/workflows/e2e-tests.yml`

## 🆘 常見問題

### Q: 測試執行失敗，找不到元素

```bash
# 使用 debug 模式檢查
npx playwright test --debug

# 增加超時時間
# 在 playwright.config.ts 中調整 timeout
```

### Q: 服務未啟動

```bash
# 檢查服務狀態
npm run pm2:status

# 重啟服務
npm run pm2:restart

# 查看日誌
npm run pm2:logs
```

### Q: 測試不穩定 (Flaky)

```bash
# 重試失敗的測試
npx playwright test --retries=2

# 序列執行避免競爭
npx playwright test --workers=1
```

## 📞 聯繫支援

- **文檔**: 查看 [完整指南](../../docs/E2E-TEST-GUIDE.md)
- **問題**: 在 GitHub Issues 提問
- **QA 團隊**: qa-team@example.com

---

**最後更新**: 2025-02-17
**Playwright 版本**: 1.58.2
