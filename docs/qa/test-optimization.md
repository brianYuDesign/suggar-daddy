# E2E 測試等待優化指南

## 📊 優化摘要

### 當前狀況（優化前）
- **總計**: 146 處 `waitForTimeout` 使用
- **高優先級**: 50 處（長時間等待 >= 3s）
- **中優先級**: 89 處（中等時間等待 1-2s）
- **低優先級**: 7 處（短時間等待 < 1s）

### 影響最大的文件
1. `e2e/admin/admin-dashboard.spec.ts` - 38 處
2. `e2e/security/security-tests.spec.ts` - 19 處
3. `e2e/performance/performance-tests.spec.ts` - 17 處
4. `e2e/tests/subscription/subscribe-flow.spec.ts` - 17 處
5. `e2e/tests/matching/swipe-flow.spec.ts` - 13 處

### 優化目標
- 🎯 將 `waitForTimeout` 使用減少到 < 10 處
- ⚡ 測試執行時間減少 30%+
- 🛡️ 提高測試穩定性，減少 flaky tests
- 📈 提高測試可維護性

---

## 🚫 為什麼 `waitForTimeout` 是問題？

### 1. **不可靠**
```typescript
// ❌ 問題代碼
await page.click('button');
await page.waitForTimeout(2000); // 假設 2 秒夠用
await expect(page.locator('.result')).toBeVisible();
```

**問題**：
- 在快速機器上浪費時間（實際只需 100ms）
- 在慢速機器上失敗（實際需要 3000ms）
- CI/CD 環境可能更慢

### 2. **浪費時間**
```typescript
// 假設每個測試平均有 3 個 waitForTimeout(2000)
// 100 個測試 × 3 × 2 秒 = 600 秒 = 10 分鐘浪費
```

### 3. **掩蓋真正問題**
```typescript
// ❌ 問題被掩蓋
await page.click('submit');
await page.waitForTimeout(5000); // 為什麼需要這麼久？
// 真正問題：API 太慢、前端渲染效能差
```

---

## ✅ 智能等待策略

### 1. 等待 API 回應

**場景**：點擊按鈕後等待 API 請求完成

```typescript
// ❌ 錯誤做法
await page.click('button[type="submit"]');
await page.waitForTimeout(3000); // 猜測 API 需要 3 秒

// ✅ 正確做法
import { smartWaitForAPI } from '../utils/smart-wait';

await page.click('button[type="submit"]');
await smartWaitForAPI(page, {
  urlPattern: '/api/users',
  status: 200,
  timeout: 10000,
});

// ✅ 更好的做法：在點擊前就準備監聽
const apiPromise = smartWaitForAPI(page, { urlPattern: '/api/users' });
await page.click('button[type="submit"]');
await apiPromise; // 不會錯過請求
```

### 2. 等待元素出現

**場景**：等待動態內容載入

```typescript
// ❌ 錯誤做法
await page.click('.load-more');
await page.waitForTimeout(2000);
const items = await page.locator('.item').count();

// ✅ 正確做法
import { smartWaitForElement } from '../utils/smart-wait';

await page.click('.load-more');
await smartWaitForElement(page, {
  selector: '.item:nth-child(10)', // 等待第 10 個項目出現
  state: 'visible',
  timeout: 10000,
});
const items = await page.locator('.item').count();
```

### 3. 等待路由導航

**場景**：登入後導航到首頁

```typescript
// ❌ 錯誤做法
await page.click('button:has-text("登入")');
await page.waitForTimeout(2000);
expect(page.url()).toContain('/dashboard');

// ✅ 正確做法
import { smartWaitForNavigation } from '../utils/smart-wait';

await page.click('button:has-text("登入")');
await smartWaitForNavigation(page, /\/(dashboard|feed)/, { timeout: 10000 });
expect(page.url()).toMatch(/\/(dashboard|feed)/);
```

### 4. 等待網路閒置

**場景**：頁面載入多個資源

```typescript
// ❌ 錯誤做法
await page.goto('/dashboard');
await page.waitForTimeout(5000);

// ✅ 正確做法
import { smartWaitForNetworkIdle } from '../utils/smart-wait';

await page.goto('/dashboard');
await smartWaitForNetworkIdle(page, { timeout: 30000 });

// ✅ 更好的做法：等待特定 API
await page.goto('/dashboard');
await Promise.all([
  smartWaitForAPI(page, { urlPattern: '/api/user' }),
  smartWaitForAPI(page, { urlPattern: '/api/stats' }),
]);
```

### 5. 等待動畫完成

**場景**：等待 CSS 動畫或過渡效果

```typescript
// ❌ 錯誤做法
await page.click('.open-modal');
await page.waitForTimeout(500); // 等待動畫
await page.click('.modal button');

// ✅ 正確做法
import { smartWaitForAnimation, smartWaitForModal } from '../utils/smart-wait';

await page.click('.open-modal');
await smartWaitForModal(page, {
  modalSelector: '[role="dialog"]',
  state: 'open',
});
await page.click('.modal button');
```

### 6. 等待元素消失

**場景**：等待 Loading Spinner 消失

```typescript
// ❌ 錯誤做法
await page.click('.refresh');
await page.waitForTimeout(3000);

// ✅ 正確做法
import { waitForElementToDisappear } from '../utils/smart-wait';

await page.click('.refresh');
await waitForElementToDisappear(page, '.spinner', { timeout: 10000 });
```

### 7. 等待滾動載入

**場景**：無限滾動列表

```typescript
// ❌ 錯誤做法
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
}

// ✅ 正確做法
import { smartScrollToLoadMore } from '../utils/smart-wait';

await smartScrollToLoadMore(page, {
  maxScrolls: 5,
  itemSelector: '.list-item',
  loadingSelector: '.spinner',
});
```

### 8. 智能重試

**場景**：不穩定的操作需要重試

```typescript
// ❌ 錯誤做法
let success = false;
for (let i = 0; i < 3; i++) {
  try {
    await page.click('.unstable-button');
    await page.waitForTimeout(1000);
    success = await page.locator('.success').isVisible();
    if (success) break;
  } catch { }
}

// ✅ 正確做法
import { smartRetry } from '../utils/smart-wait';

await smartRetry(
  async () => {
    await page.click('.unstable-button');
    await expect(page.locator('.success')).toBeVisible({ timeout: 3000 });
  },
  {
    maxRetries: 3,
    retryDelay: 500,
    errorMessage: '按鈕點擊失敗',
  }
);
```

---

## 📋 優化檢查清單

### 高優先級（立即處理）

- [ ] **admin-dashboard.spec.ts** (38 處)
  - [ ] 統計卡片載入：用 `waitForElementToDisappear` 等待 skeleton
  - [ ] 表格資料載入：用 `smartWaitForAPI` 等待 API
  - [ ] 篩選操作：用 `smartWaitForElement` 等待結果
  
- [ ] **security-tests.spec.ts** (19 處)
  - [ ] XSS 測試：用 `smartWaitForElement` 等待錯誤訊息
  - [ ] 登入限流：用 `smartWaitForAPI` 等待 API 回應
  - [ ] CSRF 測試：用 `smartWaitForFormSubmit`

- [ ] **performance-tests.spec.ts** (17 處)
  - [ ] 頁面載入測試：用 `smartWaitForNetworkIdle`
  - [ ] API 回應測試：用 `smartWaitForAPI`

### 中優先級

- [ ] **subscribe-flow.spec.ts** (17 處)
  - [ ] 訂閱流程：用 `smartWaitForFormSubmit` + `smartWaitForAPI`
  - [ ] Stripe 整合：用 `smartWaitForNavigation` 等待重定向

- [ ] **swipe-flow.spec.ts** (13 處)
  - [ ] 滑動操作：用 `smartWaitForAnimation` 等待卡片動畫
  - [ ] 配對提示：用 `smartWaitForModal`

### 低優先級

- [ ] **短時間等待 (< 500ms)**：評估是否必要，可能用於動畫等待

---

## 🛠️ 遷移步驟

### 1. 準備工作

```bash
# 安裝依賴（如果需要）
npm install

# 運行掃描腳本生成報告
npx ts-node e2e/scripts/migrate-waits.ts

# 查看報告
cat e2e-wait-optimization-report.md
```

### 2. 優化單個測試文件

```bash
# 先優化一個文件驗證效果
npx ts-node e2e/scripts/migrate-waits.ts --file=e2e/tests/auth/login.spec.ts
```

**遷移範例**：

```typescript
// 1. 導入智能等待工具
import {
  smartWaitForAPI,
  smartWaitForNavigation,
  smartWaitForElement,
  waitForElementToDisappear,
} from '../utils/smart-wait';

// 2. 識別等待用途
test('用戶登入', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  
  // ❌ 移除這行
  // await page.waitForTimeout(2000);
  
  // ✅ 添加這行
  const loginPromise = smartWaitForAPI(page, { urlPattern: '/api/auth/login' });
  await page.click('button[type="submit"]');
  await loginPromise;
  
  await smartWaitForNavigation(page, '/dashboard');
});
```

### 3. 運行測試驗證

```bash
# 運行單個測試文件
npx playwright test e2e/tests/auth/login.spec.ts --headed

# 運行所有測試（確保沒有破壞）
npx playwright test

# 比較執行時間
npx playwright test --reporter=html
```

### 4. 批量優化

```bash
# 按優先級順序優化
# 1. admin-dashboard.spec.ts
# 2. security-tests.spec.ts
# 3. performance-tests.spec.ts
# ...

# 每優化一個文件，運行測試確保通過
```

---

## 📊 預期效果

### 執行時間對比（預估）

| 測試套件 | 優化前 | 優化後 | 改進 |
|---------|--------|--------|------|
| Admin Dashboard | 5min 20s | 3min 10s | -40% |
| Security Tests | 2min 45s | 1min 50s | -33% |
| Performance Tests | 3min 10s | 2min 20s | -26% |
| Subscription Flow | 2min 30s | 1min 40s | -33% |
| **總計** | **~15 分鐘** | **~10 分鐘** | **-33%** |

### 穩定性改進

- ❌ **優化前**：約 5% 的測試會偶爾失敗（timing issues）
- ✅ **優化後**：< 1% 失敗率，且失敗原因更清晰

---

## 💡 最佳實踐

### 1. 總是等待具體條件

```typescript
// ❌ 不要等待固定時間
await page.waitForTimeout(2000);

// ✅ 等待具體的條件
await page.waitForSelector('.result', { state: 'visible' });
await expect(page.locator('.result')).toBeVisible();
```

### 2. 在操作前設置監聽

```typescript
// ✅ 避免競爭條件
const responsePromise = page.waitForResponse('/api/data');
await page.click('button');
const response = await responsePromise;
```

### 3. 設置合理的超時

```typescript
// ✅ 根據操作類型設置超時
await smartWaitForAPI(page, {
  urlPattern: '/api/quick',
  timeout: 5000, // 快速 API
});

await smartWaitForAPI(page, {
  urlPattern: '/api/slow-report',
  timeout: 60000, // 慢速報表生成
});
```

### 4. 使用 Promise.race 處理多種可能

```typescript
// ✅ 等待成功或錯誤訊息
await Promise.race([
  page.waitForSelector('.success', { state: 'visible' }),
  page.waitForSelector('.error', { state: 'visible' }),
]);
```

### 5. 記錄等待時間（調試用）

```typescript
// ✅ 開發階段記錄等待時間
const start = Date.now();
await smartWaitForAPI(page, { urlPattern: '/api/users' });
console.log(`API 回應時間: ${Date.now() - start}ms`);
```

---

## 🔧 工具函數參考

### 可用的智能等待函數

| 函數 | 用途 | 範例 |
|------|------|------|
| `smartWaitForAPI` | 等待 API 回應 | `await smartWaitForAPI(page, { urlPattern: '/api/users' })` |
| `smartWaitForElement` | 等待元素出現並穩定 | `await smartWaitForElement(page, { selector: '.modal' })` |
| `smartWaitForNavigation` | 等待路由導航 | `await smartWaitForNavigation(page, '/dashboard')` |
| `smartWaitForNetworkIdle` | 等待網路閒置 | `await smartWaitForNetworkIdle(page)` |
| `smartWaitForAnimation` | 等待動畫完成 | `await smartWaitForAnimation(page, '.card')` |
| `smartWaitForModal` | 等待模態框 | `await smartWaitForModal(page, { state: 'open' })` |
| `smartWaitForFormSubmit` | 等待表單提交 | `await smartWaitForFormSubmit(page, { apiPattern: '/api/login' })` |
| `waitForElementToDisappear` | 等待元素消失 | `await waitForElementToDisappear(page, '.spinner')` |
| `smartScrollToLoadMore` | 智能滾動載入 | `await smartScrollToLoadMore(page, { maxScrolls: 5 })` |
| `smartRetry` | 智能重試 | `await smartRetry(async () => { ... })` |
| `smartWaitForCondition` | 等待自定義條件 | `await smartWaitForCondition(async () => ...)` |

完整 API 文檔請參考：`e2e/utils/smart-wait.ts`

---

## 🎓 學習資源

### Playwright 官方文檔
- [Best Practices - Auto-waiting](https://playwright.dev/docs/best-practices#auto-waiting)
- [Assertions - waitFor](https://playwright.dev/docs/test-assertions)
- [Network - waitForResponse](https://playwright.dev/docs/api/class-page#page-wait-for-response)

### 內部資源
- `e2e/utils/smart-wait.ts` - 智能等待工具實作
- `e2e/scripts/migrate-waits.ts` - 遷移腳本
- `e2e-wait-optimization-report.md` - 詳細掃描報告

---

## 📞 支援

遇到問題？

1. 查看生成的報告：`e2e-wait-optimization-report.md`
2. 閱讀智能等待工具源碼：`e2e/utils/smart-wait.ts`
3. 運行掃描腳本：`npx ts-node e2e/scripts/migrate-waits.ts`
4. 聯繫 QA 團隊獲取協助

---

## 📝 更新日誌

### 2024-01-XX - 初始版本
- ✅ 創建智能等待工具（`smart-wait.ts`）
- ✅ 更新 test-helpers 整合智能等待
- ✅ 優化 Page Objects（login.page.ts, discover.page.ts）
- ✅ 創建遷移掃描腳本
- ✅ 生成優化報告
- 📊 發現 146 處 `waitForTimeout`，優化目標 < 10 處

### 下一步計劃
- [ ] 優化 admin-dashboard.spec.ts（38 處）
- [ ] 優化 security-tests.spec.ts（19 處）
- [ ] 優化 performance-tests.spec.ts（17 處）
- [ ] 測量實際時間改進
- [ ] 更新 CI/CD 配置以利用更快的測試
