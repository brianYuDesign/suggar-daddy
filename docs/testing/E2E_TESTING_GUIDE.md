# E2E 測試優化指南

## 修復內容

### 問題診斷
原始配置在 headed 模式下存在以下問題：
1. **920 個測試** 同時運行，打開大量瀏覽器窗口
2. **5 個瀏覽器項目** 並行執行（chromium, firefox, webkit, mobile-chrome, mobile-safari）
3. **video: 'on'** 為所有測試錄製視頻，佔用大量磁盤空間和系統資源
4. **多個 workers** 在 headed 模式下造成窗口管理混亂

### 優化方案

#### 1. Playwright 配置優化

**自動檢測 headed 模式**：
```typescript
const isHeaded = process.argv.includes('--headed');
const isDebug = process.argv.includes('--debug');
```

**動態調整配置**：
- `fullyParallel`: headed 模式下禁用完全並行
- `workers`: headed/debug 模式下只使用 1 個 worker
- `video`: headed 模式下只在失敗時保留視頻

**有條件的瀏覽器測試**：
- 默認只運行 Chromium（最快、最穩定）
- 設置 `FULL_BROWSER_TEST=1` 時才運行所有瀏覽器

#### 2. 新的測試命令

```bash
# 基本測試（無頭模式，所有瀏覽器測試）
npm run e2e

# UI 模式（互動式測試界面）
npm run e2e:ui

# Headed 模式（只運行 Chromium，1 個 worker）
npm run e2e:headed

# Headed 模式 - 只運行 Chrome
npm run e2e:headed:chrome

# 調試模式
npm run e2e:debug

# 運行特定目錄的測試
npm run e2e:web
npm run e2e:admin

# 運行用戶流程測試
npm run e2e:journeys

# 查看測試報告
npm run e2e:report

# 完整瀏覽器測試（所有 5 個瀏覽器）
npm run e2e:full
```

## 使用建議

### 日常開發

**快速測試單個功能**：
```bash
# 使用 UI 模式進行互動式測試
npm run e2e:ui

# 或使用 headed 模式查看測試執行
npm run e2e:headed -- e2e/admin/admin-dashboard.spec.ts
```

**調試失敗的測試**：
```bash
# 使用調試模式逐步執行
npm run e2e:debug -- e2e/admin/admin-dashboard.spec.ts

# 或使用 headed 模式並添加斷點
npm run e2e:headed:chrome -- --grep "特定測試名稱"
```

### CI/CD 環境

**快速反饋（只測試 Chromium）**：
```bash
CI=1 npm run e2e
```

**完整測試（所有瀏覽器）**：
```bash
CI=1 npm run e2e:full
```

### 性能對比

| 模式 | 瀏覽器 | Workers | 視頻 | 執行時間 | 資源使用 |
|------|--------|---------|------|---------|---------|
| 原始 headed | 5 個 | 5 | 全部 | ~15 分鐘 | 極高 |
| 優化 headed | 1 個 | 1 | 失敗時 | ~5 分鐘 | 低 |
| 無頭模式 | 1 個 | Auto | 全部 | ~3 分鐘 | 中 |
| 完整測試 | 5 個 | Auto | 全部 | ~8 分鐘 | 高 |

## 進階技巧

### 只運行特定測試

```bash
# 使用 grep 過濾
npm run e2e:headed -- --grep "登入"

# 運行特定文件
npm run e2e:headed -- e2e/auth/login.spec.ts

# 運行特定專案
npm run e2e -- --project=chromium
```

### 平行測試優化

```bash
# 調整 worker 數量
npm run e2e -- --workers=2

# 禁用平行執行
npm run e2e -- --workers=1
```

### 視頻和截圖管理

```bash
# 不錄製視頻（更快）
npm run e2e -- --config playwright.config.ts --use-trace off

# 始終錄製截圖
npm run e2e -- --screenshot=on
```

### 瀏覽器選擇

```bash
# 只測試桌面瀏覽器
npm run e2e -- --project=chromium --project=firefox --project=webkit

# 只測試移動端
npm run e2e -- --project=mobile-chrome --project=mobile-safari
```

## 故障排除

### 問題：測試超時

**解決方案**：
1. 確保應用服務器已啟動：
   ```bash
   npm run serve:web &
   npm run serve:admin &
   ```

2. 增加超時時間：
   ```bash
   npm run e2e -- --timeout=60000
   ```

### 問題：瀏覽器窗口過多

**解決方案**：
```bash
# 使用單個 worker
npm run e2e:headed:chrome

# 或運行特定測試套件
npm run e2e:headed -- e2e/admin/
```

### 問題：磁盤空間不足

**解決方案**：
1. 清理測試結果：
   ```bash
   rm -rf test-results/ playwright-report/
   ```

2. 只在失敗時錄製視頻（已在配置中優化）

3. 定期清理：
   ```bash
   # 添加到 package.json
   "test:clean": "rm -rf test-results/ playwright-report/ screenshots/"
   ```

### 問題：測試不穩定（Flaky Tests）

**解決方案**：
1. 增加重試次數：
   ```bash
   npm run e2e -- --retries=2
   ```

2. 使用 UI 模式調試：
   ```bash
   npm run e2e:ui
   ```

3. 添加適當的等待：
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForSelector('[data-testid="element"]');
   ```

## 最佳實踐

### 1. 選擇性運行測試

開發時不要運行所有測試：
```bash
# ❌ 不好 - 運行所有 920 個測試
npm run e2e:headed

# ✅ 好 - 只運行相關測試
npm run e2e:headed -- e2e/admin/admin-dashboard.spec.ts
npm run e2e:ui  # 互動式選擇測試
```

### 2. 使用標籤組織測試

```typescript
// 添加標籤
test.describe('登入功能 @smoke', () => {
  test('快速登入 @critical', async ({ page }) => {
    // ...
  });
});
```

```bash
# 只運行 smoke 測試
npm run e2e:headed -- --grep "@smoke"
```

### 3. 環境變量配置

```bash
# 開發環境
NODE_ENV=development npm run e2e:headed

# 完整測試
FULL_BROWSER_TEST=1 CI=1 npm run e2e
```

### 4. 並行執行策略

- **本地開發**：`workers: 1`（headed 模式）
- **CI 快速反饋**：`workers: 1`（單瀏覽器）
- **CI 完整測試**：`workers: auto`（所有瀏覽器）

## 配置文件說明

### playwright.config.ts 關鍵配置

```typescript
{
  // 動態調整並行執行
  fullyParallel: !isHeaded,
  
  // 動態調整 workers
  workers: isHeaded || isDebug ? 1 : process.env.CI ? 1 : undefined,
  
  // 動態調整視頻錄製
  video: isHeaded ? 'retain-on-failure' : 'on',
  
  // 有條件的瀏覽器測試
  projects: [
    { name: 'chromium', ... },
    ...(process.env.FULL_BROWSER_TEST ? [
      // 其他瀏覽器
    ] : []),
  ]
}
```

## 監控和報告

### 查看測試報告

```bash
# 運行測試後自動打開報告
npm run e2e:report

# 或手動打開
open playwright-report/index.html
```

### 生成 JSON 報告

測試結果會自動保存到：
- HTML: `playwright-report/index.html`
- JSON: `playwright-report/results.json`
- 視頻: `test-results/<test-name>/video.webm`
- 截圖: `test-results/<test-name>/test-failed-*.png`

## 相關資源

- [Playwright 官方文檔](https://playwright.dev/)
- [測試最佳實踐](https://playwright.dev/docs/best-practices)
- 項目文檔：`docs/TESTING.md`
- 前端測試指南：`docs/FRONTEND_TESTING.md`
