# E2E 測試快速開始指南

## 🚀 快速開始（5 分鐘）

### 1. 啟動服務

```bash
# 終端 1: 啟動後端服務
npm run dev

# 終端 2: 啟動前端應用
npm run serve:web

# （可選）終端 3: 啟動管理後台
npm run serve:admin
```

### 2. 執行測試

```bash
# 執行完整測試套件（含錄影）
bash scripts/e2e/run-full-test.sh

# 或使用 npm script
npm run e2e
```

### 3. 查看結果

```bash
# 開啟 HTML 報告
npx playwright show-report

# 查看錄影檔案
ls test-results/*/video.webm

# 查看截圖
ls screenshots/*.png
```

## 📦 已配置的測試套件

### ✅ 用戶流程測試
- **authentication.spec.ts** - 註冊、登入、登出（7 個測試）
- **profile.spec.ts** - 個人資料管理（13 個測試）

### ✅ 內容流程測試
- **post-creation.spec.ts** - 貼文創建與編輯（9 個測試）
- **post-interaction.spec.ts** - 動態牆互動（16 個測試）

### ✅ 支付流程測試
- **subscription.spec.ts** - 訂閱、打賞、購買（17 個測試）

### ✅ 錢包流程測試
- **wallet.spec.ts** - 錢包管理與提款（18 個測試）

### ✅ 管理後台測試
- **admin-management.spec.ts** - 用戶與提款管理（14 個測試）

**總計: 94+ 個 E2E 測試案例**

## 🎥 錄影功能

### 配置說明

```typescript
video: {
  mode: 'on',                      // 全程錄影
  size: { width: 1280, height: 720 }  // 720p 解析度
}
```

### 錄影輸出

- **位置**: `test-results/[test-name]/video.webm`
- **格式**: WebM (H.264)
- **解析度**: 1280x720
- **大小**: 約 1-5 MB/分鐘

### 查看錄影

```bash
# macOS
open test-results/*/video.webm

# Linux
xdg-open test-results/*/video.webm

# 或使用 VLC、瀏覽器播放
```

## 📊 測試報告

### HTML 報告內容

- ✅ 測試執行統計（通過/失敗/跳過）
- ✅ 每個測試的詳細步驟
- ✅ 失敗測試的錯誤堆疊
- ✅ 截圖和錄影連結
- ✅ 執行時間分析
- ✅ 測試重試記錄

### 報告格式

- **HTML**: `playwright-report/index.html`
- **JSON**: `playwright-report/results.json`
- **JUnit**: `playwright-report/junit.xml`

## 🎯 執行特定測試

### 按流程執行

```bash
# 用戶流程
npx playwright test e2e/user-flows/

# 內容流程
npx playwright test e2e/content-flows/

# 支付流程
npx playwright test e2e/payment-flows/

# 錢包流程
npx playwright test e2e/wallet-flows/

# 管理後台
npx playwright test e2e/admin-flows/ --project=admin
```

### 按文件執行

```bash
# 認證測試
npx playwright test e2e/user-flows/authentication.spec.ts

# 貼文創建測試
npx playwright test e2e/content-flows/post-creation.spec.ts

# 訂閱測試
npx playwright test e2e/payment-flows/subscription.spec.ts
```

### 按測試名稱執行

```bash
# 執行包含 "登入" 的測試
npx playwright test -g "登入"

# 執行包含 "創建貼文" 的測試
npx playwright test -g "創建貼文"
```

## 🐛 Debug 模式

### UI 模式（推薦）

```bash
# 啟動 Playwright UI
npm run e2e:ui

# 或
npx playwright test --ui
```

功能：
- 🎯 點選測試案例執行
- 👀 即時查看測試執行
- 🔍 檢查每個步驟的狀態
- 📸 查看截圖和 DOM
- ⏯️ 暫停/繼續執行

### Debug 模式

```bash
# 逐步執行測試
npx playwright test --debug

# Debug 特定測試
npx playwright test e2e/user-flows/authentication.spec.ts --debug
```

### Headed 模式（顯示瀏覽器）

```bash
# 顯示瀏覽器視窗
npm run e2e:headed

# 或
npx playwright test --headed
```

## 📈 測試覆蓋範圍

### 功能覆蓋

| 功能模組 | 測試數量 | 覆蓋率 |
|---------|---------|--------|
| 認證流程 | 7 | 95% |
| 個人資料 | 13 | 90% |
| 貼文創建 | 9 | 85% |
| 貼文互動 | 16 | 90% |
| 訂閱支付 | 17 | 80% |
| 錢包管理 | 18 | 85% |
| 管理後台 | 14 | 75% |
| **總計** | **94+** | **86%** |

### 用戶角色覆蓋

- ✅ **Subscriber** (探索者) - 35 個測試
- ✅ **Creator** (創作者) - 40 個測試
- ✅ **Admin** (管理員) - 14 個測試
- ✅ **Unauthenticated** (未登入) - 5 個測試

### 瀏覽器覆蓋

- ✅ **Chromium** (預設)
- ⚠️ **Firefox** (可選，設定 `FULL_BROWSER_TEST=1`)
- ⚠️ **Safari** (可選，設定 `FULL_BROWSER_TEST=1`)
- ⚠️ **Mobile Chrome** (可選)
- ⚠️ **Mobile Safari** (可選)

## 🔧 常用命令

```bash
# 執行所有測試
npm run e2e

# UI 模式
npm run e2e:ui

# Headed 模式
npm run e2e:headed

# Debug 模式
npm run e2e:debug

# 只執行 Web 測試
npm run e2e:web

# 只執行管理後台測試
npm run e2e:admin

# 查看報告
npm run e2e:report

# 執行完整測試腳本
bash scripts/e2e/run-full-test.sh
```

## 📝 測試開發模板

### 基本測試結構

```typescript
import { test, expect } from '@playwright/test';
import { takeScreenshot } from '../utils/test-helpers';

test.describe('功能名稱', () => {
  // 設定測試用戶
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠執行某個操作', async ({ page }) => {
    test.setTimeout(90000);

    // 1. 導航
    await page.goto('/path');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '01-initial-state');

    // 2. 操作
    const button = page.locator('button:has-text("按鈕")');
    await button.click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '02-after-click');

    // 3. 驗證
    await expect(page.locator('text=成功')).toBeVisible();
    await takeScreenshot(page, '03-success');
  });
});
```

## 🎓 學習資源

- 📖 [完整指南](./E2E-TEST-GUIDE.md) - 詳細的測試指南
- 🌐 [Playwright 文檔](https://playwright.dev/)
- 💡 [測試最佳實踐](https://playwright.dev/docs/best-practices)
- 🔍 [選擇器指南](https://playwright.dev/docs/selectors)
- 🎥 [錄影和追蹤](https://playwright.dev/docs/videos)

## ⚠️ 注意事項

1. **服務必須運行**: 確保 Web 和 API 服務已啟動
2. **Redis 必須可用**: 認證測試需要 Redis
3. **Port 不衝突**: 確保 4200、3000、4300 端口可用
4. **測試數據**: 測試使用獨立的測試用戶，不影響生產數據
5. **錄影空間**: 全程錄影會佔用較多磁碟空間（約 100-500 MB）

## 🎉 開始測試！

```bash
# 一鍵執行完整測試
bash scripts/e2e/run-full-test.sh
```

測試完成後，查看：
- 📊 HTML 報告
- 🎥 錄影檔案
- 📸 截圖檔案

祝測試順利！ 🚀
