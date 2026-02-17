# E2E 測試配置與執行指南

## 📋 總覽

本專案已配置完整的 Playwright E2E 測試環境，涵蓋所有主要業務流程，並啟用錄影功能用於測試結果分析和演示。

## 🎯 測試覆蓋範圍

### 1. 用戶流程測試 (`e2e/user-flows/`)

#### **authentication.spec.ts** - 認證流程
- ✅ 用戶註冊
- ✅ 用戶登入（Subscriber、Creator）
- ✅ 錯誤密碼處理
- ✅ 用戶登出
- ✅ 未登入重定向
- ✅ 忘記密碼功能

#### **profile.spec.ts** - 個人資料管理
- ✅ 查看個人資料
- ✅ 編輯個人資料
- ✅ 上傳個人頭像
- ✅ 查看個人統計
- ✅ 設定隱私選項
- ✅ 創作者統計查看
- ✅ 訂閱方案設定
- ✅ 創作者貼文列表

### 2. 內容流程測試 (`e2e/content-flows/`)

#### **post-creation.spec.ts** - 貼文創建
- ✅ 創建免費貼文
- ✅ 創建付費貼文
- ✅ 上傳圖片到貼文
- ✅ 必填欄位驗證
- ✅ 儲存草稿
- ✅ 預覽貼文
- ✅ 取消貼文創建
- ✅ 編輯已發布貼文

#### **post-interaction.spec.ts** - 動態牆互動
- ✅ 瀏覽動態牆
- ✅ 滾動載入更多貼文
- ✅ 搜尋用戶
- ✅ 點讚貼文
- ✅ 取消點讚
- ✅ 查看貼文詳情
- ✅ 發表評論
- ✅ 分享貼文
- ✅ 舉報不當內容
- ✅ 查看創作者檔案
- ✅ 查看付費內容鎖定狀態

### 3. 訂閱與支付流程 (`e2e/payment-flows/`)

#### **subscription.spec.ts** - 訂閱與支付
- ✅ 查看訂閱方案頁面
- ✅ 查看創作者訂閱方案
- ✅ 點擊訂閱按鈕
- ✅ 選擇訂閱方案
- ✅ 查看訂閱管理
- ✅ 取消訂閱
- ✅ 打賞按鈕
- ✅ 打開打賞對話框
- ✅ 選擇打賞金額
- ✅ 輸入自訂打賞金額
- ✅ 查看付費內容
- ✅ 解鎖付費內容
- ✅ 顯示付費內容價格

### 4. 錢包流程測試 (`e2e/wallet-flows/`)

#### **wallet.spec.ts** - 錢包與提款
- ✅ 查看錢包頁面（創作者）
- ✅ 查看餘額資訊
- ✅ 查看交易記錄
- ✅ 篩選交易記錄
- ✅ 搜尋交易記錄
- ✅ 查看交易詳情
- ✅ 訪問提款頁面
- ✅ 查看可提款金額
- ✅ 填寫提款表單
- ✅ 驗證最小提款金額
- ✅ 驗證超過可用餘額
- ✅ 查看提款歷史
- ✅ 顯示提款狀態
- ✅ 訂閱者查看錢包
- ✅ 訂閱者查看訂閱支出

### 5. 管理後台測試 (`e2e/admin-flows/`)

#### **admin-management.spec.ts** - 管理後台
- ✅ 訪問管理後台
- ✅ 查看用戶列表
- ✅ 搜尋用戶
- ✅ 查看用戶詳情
- ✅ 禁用用戶帳號
- ✅ 啟用用戶帳號
- ✅ 篩選用戶類型
- ✅ 查看提款申請列表
- ✅ 查看待審核提款
- ✅ 查看提款申請詳情
- ✅ 批准提款申請
- ✅ 拒絕提款申請
- ✅ 顯示提款統計資料

## 🎥 錄影配置

### Playwright 配置 (`playwright.config.ts`)

```typescript
use: {
  baseURL: 'http://127.0.0.1:4200',
  trace: 'retain-on-failure',      // 失敗時保留追蹤
  screenshot: 'only-on-failure',    // 失敗時自動截圖
  video: {
    mode: isHeaded ? 'retain-on-failure' : 'on',  // 全程錄影
    size: { width: 1280, height: 720 },           // 720p 視頻
  },
  actionTimeout: 15000,              // 操作超時 15 秒
  navigationTimeout: 30000,          // 導航超時 30 秒
}
```

### 錄影模式說明

- **`video: 'on'`** - 所有測試全程錄影（用於演示和分析）
- **`video: 'retain-on-failure'`** - 僅保留失敗測試的錄影（節省空間）
- **`video: 'off'`** - 不錄影

### 視頻輸出

- **位置**: `test-results/`
- **格式**: WebM
- **解析度**: 1280x720
- **包含內容**: 完整測試執行過程

## 🚀 執行測試

### 前置準備

1. **啟動測試服務**
```bash
# 啟動後端服務
npm run dev

# 或啟動核心服務
npm run dev:core

# 啟動前端應用
npm run serve:web

# （可選）啟動管理後台
npm run serve:admin
```

2. **確認服務運行**
```bash
# 檢查 Web 應用
curl http://127.0.0.1:4200

# 檢查 API Gateway
curl http://127.0.0.1:3000/health

# 檢查 Admin 應用
curl http://127.0.0.1:4300
```

### 執行完整測試套件

```bash
# 使用腳本執行完整測試
bash scripts/e2e/run-full-test.sh

# 或手動執行
npm run e2e
```

### 執行特定測試

```bash
# 執行認證流程測試
npx playwright test e2e/user-flows/authentication.spec.ts

# 執行內容創建測試
npx playwright test e2e/content-flows/post-creation.spec.ts

# 執行訂閱流程測試
npx playwright test e2e/payment-flows/subscription.spec.ts

# 執行錢包流程測試
npx playwright test e2e/wallet-flows/wallet.spec.ts

# 執行管理後台測試
npx playwright test e2e/admin-flows/admin-management.spec.ts --project=admin
```

### 執行模式

```bash
# UI 模式（可視化調試）
npm run e2e:ui

# Headed 模式（顯示瀏覽器）
npm run e2e:headed

# Debug 模式（逐步執行）
npm run e2e:debug

# 指定瀏覽器
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📊 查看測試結果

### HTML 報告

```bash
# 自動開啟 HTML 報告
npx playwright show-report

# 或手動開啟
open playwright-report/index.html
```

HTML 報告包含：
- 測試執行統計
- 測試步驟詳情
- 失敗測試的錯誤訊息
- 截圖和錄影連結
- 執行時間分析

### 錄影檔案

錄影檔案保存在 `test-results/` 目錄，按測試用例組織：

```
test-results/
├── user-flows-authentication-chromium/
│   └── video.webm
├── content-flows-post-creation-chromium/
│   └── video.webm
└── payment-flows-subscription-chromium/
    └── video.webm
```

### 截圖檔案

截圖檔案保存在 `screenshots/` 目錄，包含時間戳：

```
screenshots/
├── 01-register-page-2024-02-17T10-30-15.png
├── 02-login-page-2024-02-17T10-30-20.png
└── 03-feed-page-2024-02-17T10-30-25.png
```

### JSON 報告

```bash
# 查看 JSON 格式的測試結果
cat playwright-report/results.json | jq
```

### JUnit 報告

```bash
# JUnit XML 格式（CI/CD 集成）
cat playwright-report/junit.xml
```

## 🔧 測試開發

### 測試結構

```typescript
test.describe('功能模組', () => {
  // 設定測試用戶
  test.use({ storageState: 'e2e/.auth/subscriber.json' });

  test('應該能夠執行某個操作', async ({ page }) => {
    test.setTimeout(90000); // 設定超時

    // 1. 導航到頁面
    await page.goto('/path');
    await page.waitForLoadState('networkidle');
    
    // 2. 截圖記錄
    await takeScreenshot(page, 'step-name');

    // 3. 執行操作
    const button = page.locator('button:has-text("按鈕")');
    await button.click();

    // 4. 驗證結果
    await expect(page.locator('text=成功')).toBeVisible();
    
    // 5. 截圖記錄結果
    await takeScreenshot(page, 'step-result');
  });
});
```

### 最佳實踐

1. **使用語義化選擇器**
```typescript
// ✅ 好的做法
page.locator('button:has-text("登入")')
page.locator('[data-testid="submit-button"]')
page.locator('input[name="email"]')

// ❌ 避免
page.locator('.btn-primary')
page.locator('#button-123')
```

2. **適當的等待策略**
```typescript
// ✅ 等待網路閒置
await page.waitForLoadState('networkidle');

// ✅ 等待特定元素
await page.waitForSelector('[data-testid="post-card"]', { timeout: 5000 });

// ✅ 智能等待
await element.waitFor({ state: 'visible', timeout: 5000 });

// ❌ 避免固定延遲
await page.waitForTimeout(5000); // 僅在必要時使用
```

3. **錯誤處理**
```typescript
// ✅ 使用可選鏈和條件判斷
const hasButton = await button.isVisible({ timeout: 3000 }).catch(() => false);
if (hasButton) {
  await button.click();
} else {
  test.skip(true, '功能尚未實作');
}
```

4. **截圖記錄**
```typescript
// 在關鍵步驟截圖
await takeScreenshot(page, '01-initial-state');
await takeScreenshot(page, '02-after-action');
await takeScreenshot(page, '03-final-result', { fullPage: true });
```

## 📈 CI/CD 集成

### GitHub Actions 範例

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start services
        run: |
          npm run dev &
          npm run serve:web &
          sleep 30
      
      - name: Run E2E tests
        run: npm run e2e
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
      
      - name: Upload videos
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-videos
          path: test-results/
```

## 🐛 故障排除

### 常見問題

1. **測試服務未運行**
```bash
# 錯誤: Connection refused
# 解決: 確保服務已啟動
npm run dev
npm run serve:web
```

2. **認證過期**
```bash
# 錯誤: Auth expired
# 解決: 重新生成認證狀態
npx playwright test e2e/auth.setup.ts
```

3. **Redis 連線失敗**
```bash
# 錯誤: Redis connection failed
# 解決: 啟動 Redis 服務
docker-compose up redis -d
```

4. **Port 衝突**
```bash
# 錯誤: Port already in use
# 解決: 關閉佔用的進程或更改 Port
lsof -ti:4200 | xargs kill -9
```

### Debug 技巧

1. **啟用 Playwright Inspector**
```bash
npx playwright test --debug
```

2. **查看測試錄影**
```bash
# 在瀏覽器中播放
open test-results/*/video.webm
```

3. **查看追蹤檔案**
```bash
npx playwright show-trace test-results/trace.zip
```

4. **增加日誌輸出**
```typescript
test('測試名稱', async ({ page }) => {
  page.on('console', msg => console.log('Browser:', msg.text()));
  page.on('pageerror', err => console.error('Error:', err));
});
```

## 📝 維護指南

### 定期更新

1. **更新 Playwright**
```bash
npm install -D @playwright/test@latest
npx playwright install
```

2. **更新測試數據**
```bash
# 重新生成測試用戶
node scripts/seed-redis-test-users.js
```

3. **清理舊的測試結果**
```bash
rm -rf test-results/* playwright-report/* screenshots/*
```

### 測試覆蓋率分析

定期檢查測試覆蓋率，確保關鍵功能都有測試：

```bash
# 生成覆蓋率報告
npx playwright test --reporter=html

# 查看未覆蓋的功能
# 添加新的測試案例
```

## 🎯 下一步

1. **增加測試案例**
   - 添加更多邊界條件測試
   - 增加錯誤場景測試
   - 添加效能測試

2. **優化測試穩定性**
   - 減少 flaky tests
   - 改善等待策略
   - 增加重試機制

3. **增強報告**
   - 添加自定義報告格式
   - 整合測試分析工具
   - 自動化報告分發

4. **CI/CD 整合**
   - 設定自動化測試流程
   - 配置測試失敗通知
   - 整合測試報告到 PR

## 📚 參考資源

- [Playwright 官方文檔](https://playwright.dev/)
- [測試最佳實踐](https://playwright.dev/docs/best-practices)
- [CI/CD 集成指南](https://playwright.dev/docs/ci)
- [測試選擇器](https://playwright.dev/docs/selectors)
- [錄影和追蹤](https://playwright.dev/docs/videos)

---

**測試配置完成！** 🎉

執行 `bash scripts/e2e/run-full-test.sh` 開始測試！
