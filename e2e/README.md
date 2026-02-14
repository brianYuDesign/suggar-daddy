# Playwright E2E 測試

自動化端對端測試套件，包含完整的截圖和錄影功能。

## ⭐ 最新更新 (2026-02-14)

**新增 110+ 個測試案例！**測試覆蓋率提升至 78%+

### 🆕 新增測試模組
- ✅ **支付流程測試** (`payment/stripe-payment.spec.ts`) - 20+ 測試
- ✅ **訂閱管理測試** (`subscription/subscription-flow.spec.ts`) - 30+ 測試  
- ✅ **安全性測試** (`security/security-tests.spec.ts`) - 35+ 測試
- ✅ **效能測試** (`performance/performance-tests.spec.ts`) - 25+ 測試
- ✅ **測試數據 Fixtures** (`fixtures/`) - 結構化測試數據

### 📊 測試統計
- **總測試數**: 343+ 個 (↑ 47%)
- **測試文件**: 7 個
- **測試代碼**: 2156+ 行 (↑ 296%)
- **覆蓋率**: 78%+
- **目標通過率**: 95%+

### 🚀 快速運行新測試
```bash
# 運行所有新測試
npx playwright test e2e/payment e2e/subscription e2e/security e2e/performance

# 或使用診斷腳本
./scripts/test-diagnostics.sh
```

查看完整更新：
- [E2E 測試改進計劃](../E2E-TEST-IMPROVEMENT-PLAN.md)
- [E2E 測試執行報告](../E2E-TEST-EXECUTION-REPORT.md)

---

## 📋 測試覆蓋範圍

### Web App (用戶前端) - 70+ 測試
- ✅ 註冊與登入流程
- ✅ 內容動態牆 (Feed)
- ✅ 探索與配對功能
- ✅ 消息與通知系統
- ✅ 個人檔案管理
- ✅ 錢包與交易功能
- ✅ 內容創作流程
- ✅ 響應式設計（手機/平板/桌面）

### Admin Dashboard (管理後台) - 50+ 測試
- ✅ 管理員登入
- ✅ 儀表板總覽
- ✅ 用戶管理（列表/搜尋/篩選/詳情）
- ✅ 支付與營收分析
- ✅ 訂閱管理
- ✅ 交易記錄
- ✅ 提現管理與審批
- ✅ 內容審核與舉報處理
- ✅ 高級分析
- ✅ 審計日誌
- ✅ 系統設定

### ⭐ 支付流程測試 (新增) - 20+ 測試
- ✅ Stripe 支付整合
- ✅ 支付金額驗證（最小/最大）
- ✅ 支付失敗處理與重試
- ✅ 支付歷史記錄查詢
- ✅ 支付收據下載
- ✅ 退款申請與處理
- ✅ 支付安全性測試

### ⭐ 訂閱管理測試 (新增) - 30+ 測試
- ✅ 創建訂閱（月度/年度）
- ✅ 訂閱升級（Basic → Premium）
- ✅ 訂閱降級（Premium → Basic）
- ✅ 訂閱取消與重新訂閱
- ✅ 免費試用期管理
- ✅ 自動續費開關
- ✅ 訂閱錯誤處理

### ⭐ 安全性測試 (新增) - 35+ 測試
- ✅ 認證與授權（JWT、權限）
- ✅ XSS 攻擊防護
- ✅ CSRF Token 驗證
- ✅ SQL Injection 防護
- ✅ 檔案上傳安全
- ✅ Rate Limiting（登入、API）
- ✅ 敏感資料保護
- ✅ Session 管理
- ✅ Content Security Policy

### ⭐ 效能測試 (新增) - 25+ 測試
- ✅ 頁面載入時間基準
- ✅ API 響應時間測試
- ✅ 資源載入優化驗證
- ✅ 無限滾動效能
- ✅ 互動響應時間
- ✅ 記憶體洩漏檢測
- ✅ 並發用戶測試
- ✅ 快取效能驗證

### 完整用戶旅程 - 15+ 測試
- ✅ 創作者完整工作流程（登入→發布→管理→收益）
- ✅ 探索者完整工作流程（登入→探索→配對→消費）
- ✅ 管理員完整工作流程（全功能巡檢）
- ✅ 跨瀏覽器相容性測試
- ✅ 效能基準測試

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
npx playwright install
```

### 2. 啟動開發伺服器
在執行測試前，需要啟動以下服務：

**終端機 1 - 用戶前端:**
```bash
npm run serve:web
```

**終端機 2 - 管理後台:**
```bash
npm run serve:admin
```

**終端機 3 - API Gateway:**
```bash
npm run serve:api-gateway
```

或使用配置自動啟動（Playwright 會自動啟動 web 和 api-gateway）。

### 3. 執行測試

**執行所有測試:**
```bash
npx playwright test
```

**執行特定測試檔案:**
```bash
npx playwright test e2e/web/web-app.spec.ts
npx playwright test e2e/admin/admin-dashboard.spec.ts
npx playwright test e2e/user-journeys.spec.ts
```

**使用 UI 模式 (推薦):**
```bash
npx playwright test --ui
```

**查看測試報告:**
```bash
npx playwright show-report
```

**僅在 Chromium 執行:**
```bash
npx playwright test --project=chromium
```

**執行並自動打開瀏覽器:**
```bash
npx playwright test --headed
```

**Debug 模式:**
```bash
npx playwright test --debug
```

## 📸 截圖與錄影

### 自動截圖
所有測試都會在關鍵步驟自動截圖，儲存位置：
```
screenshots/
  ├── homepage-2026-02-14T04-45-00.png
  ├── login-page-2026-02-14T04-45-05.png
  └── ...
```

### 自動錄影
失敗的測試會自動錄影，儲存位置：
```
test-results/
  ├── feed-flow.zip
  ├── creator-full-journey.zip
  └── ...
```

使用 Playwright Trace Viewer 查看：
```bash
npx playwright show-trace test-results/creator-full-journey.zip
```

### 測試報告
HTML 測試報告位於：
```
playwright-report/
  ├── index.html
  └── ...
```

## 🧪 測試配置

### 測試用戶憑證
在 `e2e/utils/test-helpers.ts` 中定義：

```typescript
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

⚠️ **注意**: 請確保這些測試帳號已在資料庫中建立。

### 瀏覽器配置
測試會在以下環境執行：
- ✅ Chromium (桌面版 Chrome)
- ✅ Firefox (桌面版 Firefox)
- ✅ WebKit (桌面版 Safari)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

## 📦 目錄結構

```
e2e/
├── web/
│   └── web-app.spec.ts          # Web 前端測試 (70+ 測試)
├── admin/
│   └── admin-dashboard.spec.ts  # Admin 後台測試 (50+ 測試)
├── payment/                     # ⭐ 新增
│   └── stripe-payment.spec.ts   # 支付流程測試 (20+ 測試)
├── subscription/                # ⭐ 新增
│   └── subscription-flow.spec.ts # 訂閱管理測試 (30+ 測試)
├── security/                    # ⭐ 新增
│   └── security-tests.spec.ts   # 安全性測試 (35+ 測試)
├── performance/                 # ⭐ 新增
│   └── performance-tests.spec.ts # 效能測試 (25+ 測試)
├── fixtures/                    # ⭐ 新增
│   ├── users.fixture.ts         # 用戶測試數據
│   ├── posts.fixture.ts         # 貼文測試數據
│   └── transactions.fixture.ts  # 交易測試數據
├── utils/
│   └── test-helpers.ts          # 共用測試工具
├── user-journeys.spec.ts        # 完整用戶旅程測試 (15+ 測試)
└── README.md                    # 本文件

screenshots/                      # 截圖輸出
test-results/                     # 錄影與追蹤輸出
playwright-report/                # HTML 測試報告
playwright.config.ts              # Playwright 配置
scripts/
└── test-diagnostics.sh          # ⭐ 測試診斷工具（新增）
```

## 🎯 最佳實踐

### 1. 使用 data-testid 屬性
在 React/Next.js 元件中添加：
```tsx
<button data-testid="login-button">登入</button>
```

### 2. 等待元素載入
```typescript
await page.waitForSelector('[data-testid="post-card"]');
```

### 3. 使用有意義的截圖名稱
```typescript
await takeScreenshot(page, 'user-profile-after-edit');
```

### 4. 追蹤關鍵流程
```typescript
await context.tracing.start({ screenshots: true, snapshots: true });
// ... 執行操作
await context.tracing.stop({ path: 'test-results/flow.zip' });
```

## 🐛 故障排除

### 測試失敗
1. 確認所有服務都已啟動
2. 檢查測試用戶是否存在於資料庫
3. 查看 `test-results/` 中的錄影和追蹤檔案
4. 使用 `--headed` 模式查看實際瀏覽器操作

### 超時錯誤
增加超時時間：
```typescript
test.setTimeout(60000); // 60秒
```

### 元素找不到
使用更寬鬆的選擇器：
```typescript
await page.waitForSelector('button:has-text("登入"), [type="submit"]');
```

## 📊 CI/CD 整合

在 GitHub Actions 或其他 CI 系統中執行：

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## 🔗 參考資源

- [Playwright 官方文檔](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Test Generator](https://playwright.dev/docs/codegen)

## ⚡ 進階功能

### 使用 Codegen 生成測試
```bash
npx playwright codegen http://localhost:4200
```

### 執行特定標籤測試
```typescript
test('my test @smoke', async ({ page }) => {
  // ...
});
```

```bash
npx playwright test --grep @smoke
```

### 並行執行
```bash
npx playwright test --workers=4
```

### 生成覆蓋率報告
結合 Istanbul 進行程式碼覆蓋率分析。

---

**維護**: 當新增功能時，請更新相應的測試檔案並執行完整測試套件。
