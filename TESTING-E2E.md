# 🧪 E2E 測試快速上手指南

## 一、前置準備

### 1.1 檢查環境
```bash
# 確認 Node.js 版本 (需要 20.x)
node --version

# 確認 Playwright 已安裝
npx playwright --version
```

### 1.2 安裝瀏覽器（首次執行）
```bash
npx playwright install chromium firefox webkit
```

## 二、啟動服務

### 方式一：使用設置腳本（推薦）
```bash
npm run test:e2e:setup
```

### 方式二：手動啟動
```bash
# 1. 啟動 Docker 服務
docker-compose up -d postgres-master redis-master

# 2. 啟動應用服務
npm run pm2:start

# 3. 檢查服務狀態
npm run pm2:status
```

## 三、執行測試

### 3.1 基本執行
```bash
# 執行所有測試
npm run test:e2e

# 只執行關鍵測試（推薦用於快速檢查）
npm run test:e2e:critical

# 只執行認證測試
npm run test:e2e:auth
```

### 3.2 互動模式（開發推薦）
```bash
# UI 模式 - 可視化測試執行器
npm run test:e2e:ui

# Headed 模式 - 顯示瀏覽器
npm run test:e2e:headed

# Debug 模式 - 逐步執行
npm run test:e2e:debug
```

### 3.3 查看報告
```bash
# 查看 HTML 測試報告
npm run test:e2e:report
```

## 四、測試結構說明

### 4.1 目錄結構
```
test/e2e/
├── page-objects/    # 頁面物件模型
├── specs/           # 測試用例
├── fixtures/        # 測試 fixtures
├── utils/           # 工具函數
└── scripts/         # 設置腳本
```

### 4.2 可用的 Page Objects
- `LoginPage` - 登入頁面
- `RegisterPage` - 註冊頁面
- `FeedPage` - 動態 Feed
- `UserProfilePage` - 用戶資料
- `PaymentPage` - 付款頁面
- `PostDetailPage` - 貼文詳情
- `SubscriptionPage` - 訂閱管理

### 4.3 測試標籤
- `@critical` - 關鍵功能
- `@auth` - 認證相關
- `@payment` - 付款相關
- `@social` - 社交功能
- `@media` - 多媒體
- `@validation` - 表單驗證

## 五、撰寫測試範例

### 5.1 基本測試
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

### 5.2 使用測試資料工廠
```typescript
import { TestDataFactory } from '../utils/test-data-factory';

test('註冊新用戶', async ({ page }) => {
  // 生成測試用戶
  const user = TestDataFactory.generateTestUser('sugar_baby');
  
  // 使用生成的資料進行註冊
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  await registerPage.register(user);
});
```

### 5.3 使用已認證的頁面
```typescript
test('需要登入的測試', async ({ authenticatedPage }) => {
  // authenticatedPage 已經登入
  await authenticatedPage.goto('/profile');
  
  // 執行需要認證的操作
});
```

## 六、常見問題排除

### 6.1 服務未啟動
```bash
# 檢查服務狀態
npm run pm2:status

# 重啟所有服務
npm run pm2:restart

# 查看日誌
npm run pm2:logs
```

### 6.2 測試找不到元素
```bash
# 使用 debug 模式檢查
npx playwright test --debug <test-file>

# 或使用 UI 模式
npm run test:e2e:ui
```

### 6.3 測試不穩定
```bash
# 重試失敗的測試
npx playwright test --retries=2

# 序列執行（避免資源競爭）
npx playwright test --workers=1
```

### 6.4 瀏覽器未安裝
```bash
# 重新安裝瀏覽器
npx playwright install --with-deps
```

## 七、進階用法

### 7.1 執行特定測試
```bash
# 執行特定文件
npx playwright test auth.spec.ts

# 執行特定測試案例
npx playwright test -g "應該可以登入"

# 使用標籤篩選
npx playwright test --grep @critical

# 排除某些測試
npx playwright test --grep-invert @slow
```

### 7.2 多瀏覽器測試
```bash
# 只在 Chromium
npm run test:e2e:chromium

# 只在 Firefox
npm run test:e2e:firefox

# 只在 WebKit (Safari)
npm run test:e2e:webkit

# 手機瀏覽器
npm run test:e2e:mobile
```

### 7.3 並行執行
```bash
# 使用 4 個 workers
npx playwright test --workers=4

# 序列執行
npx playwright test --workers=1
```

## 八、詳細文檔

更多詳細資訊請查看：

📖 **完整指南**: `docs/E2E-TEST-GUIDE.md`
📊 **測試覆蓋範圍**: `docs/E2E-TEST-COVERAGE.md`
⚡ **快速參考**: `docs/E2E-QUICK-REF.md`
📋 **完成報告**: `E2E-TEST-SETUP-COMPLETE.md`

## 九、測試規範

### 9.1 命名慣例
- 測試描述使用「應該...」格式
- 使用中文描述測試目的
- 添加適當的標籤

### 9.2 最佳實踐
- ✅ 使用 Page Object Model
- ✅ 使用語義化選擇器
- ✅ 避免硬編碼等待
- ✅ 保持測試獨立
- ✅ 使用測試資料工廠

### 9.3 避免事項
- ❌ 不要使用 CSS class 選擇器
- ❌ 不要使用 `waitForTimeout`
- ❌ 不要讓測試相互依賴
- ❌ 不要在測試中硬編碼資料

## 十、持續整合 (CI)

測試已配置為在以下情況自動執行：
- Pull Request 提交時
- Merge 到 main 分支時

## 需要幫助？

- 📧 聯繫 QA 團隊: qa-team@example.com
- 🐛 提交 Issue: GitHub Issues
- 📖 查看文檔: docs/ 目錄

---

**最後更新**: 2025-02-17
**Playwright 版本**: 1.58.2
