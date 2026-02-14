# 🚀 測試改進 2週衝刺 Roadmap

**目標**: 2週內達成 100% E2E 測試通過率，確保平台上線品質  
**開始日期**: 2026-02-14  
**結束日期**: 2026-02-28  

---

## 📊 當前狀態快照

```
後端單元測試:  ████████████████░░░░  76% (✅ 良好)
後端 E2E 測試:  ████████████████████░ 91% (212/233) ⚠️ 21個失敗
前端 Web 測試:  ████████░░░░░░░░░░░░  30% 🔴 不足
前端 Admin 測試: ██████████░░░░░░░░░░  40% ⚠️ 待改進
Playwright E2E: ████████████████░░░░  78%+ ⚠️ 路徑問題
編譯錯誤:      ████████░░░░░░░░░░░░  8個文件 🔴 阻塞

目標達成率: ████░░░░░░░░░░░░░░░░  20% → 100% (2週內)
```

---

## 🎯 Week 1: 後端測試修復 (Day 1-5)

### Day 1 Monday - 修復編譯錯誤 ⚡

**目標**: 所有測試可編譯執行 (0錯誤)

#### 上午 (4h)
```bash
# 1. 修復 Auth Service (3個文件)
cd apps/auth-service
git checkout -b fix/auth-service-tests

# OAuth Strategy 型別問題
# File: libs/auth/src/strategies/oauth-google.strategy.ts
super({
  ...config,
  passReqToCallback: false, // ✅ 添加此行
});

# 執行測試驗證
npx nx test auth-service
```

#### 下午 (4h)
```bash
# 2. 修復 Content Service (3個文件)
cd apps/content-service
git checkout -b fix/content-service-tests

# 修復 TypeORM mock 和依賴注入問題
# 執行測試驗證
npx nx test content-service

# 3. 修復 Common/UI lib (2個文件)
npx nx test common
npx nx test ui
```

#### 驗收標準
- [ ] `npx nx run-many -t test --all` 無編譯錯誤
- [ ] 所有測試文件可執行
- [ ] Git commit: "fix: resolve all TypeScript compilation errors in tests"

**預計完成**: 18:00

---

### Day 2 Tuesday - User Service E2E (8個失敗) ⚡

**目標**: User Service 100% E2E 通過 (33/33)

#### 上午 (4h) - 封鎖功能
```bash
cd apps/user-service
git checkout -b fix/user-service-e2e

# 修復測試:
# 1. POST /block/:targetId
# 2. DELETE /block/:targetId  
# 3. GET /blocked

# 檢查實際 API 端點
curl -X POST http://localhost:3001/api/users/block/2 \
  -H "Authorization: Bearer $TOKEN"

# 運行測試
npx nx test user-service --testPathPattern=user.e2e --testNamePattern="block"
```

#### 下午 (4h) - 檢舉功能
```bash
# 修復測試:
# 4. POST /report
# 5. GET /admin/reports
# 6. PUT /admin/reports/:reportId

# 運行測試
npx nx test user-service --testPathPattern=user.e2e --testNamePattern="report"
```

#### 驗收標準
- [ ] 33/33 測試通過 ✅
- [ ] Git commit: "fix: pass all User Service E2E tests"

**預計完成**: 18:00

---

### Day 3 Wednesday - Content + Auth Service E2E (13個失敗) ⚡

**目標**: Content 和 Auth Service 100% E2E 通過

#### 上午 (4h) - Content Service (7個失敗)
```bash
cd apps/content-service
git checkout -b fix/content-service-e2e

# 修復審核流程測試:
# 1. POST /moderation/queue
# 2. GET /moderation/pending
# 3-7. 權限驗證測試

npx nx test content-service --testPathPattern=content.e2e
```

#### 下午 (4h) - Auth Service (6個失敗)
```bash
cd apps/auth-service
git checkout -b fix/auth-service-e2e

# 修復密碼重置與郵件驗證:
# 1. POST /password-reset
# 2. POST /verify-email
# 3-6. 管理員權限測試

npx nx test auth-service --testPathPattern=auth.e2e
```

#### 驗收標準
- [ ] Content Service: 46/46 測試通過 ✅
- [ ] Auth Service: 55/55 測試通過 ✅
- [ ] 總計: 233/233 後端 E2E 通過 🎉

**預計完成**: 18:00

---

### Day 4 Thursday - Playwright 測試修復 ⚡

**目標**: Playwright 測試可列出並執行

#### 上午 (3h) - 修復路徑問題
```bash
cd e2e
git checkout -b fix/playwright-imports

# 修復 user-journeys.spec.ts
# 從: import { ... } from '../utils/test-helpers';
# 改為: import { ... } from './utils/test-helpers';

# 驗證可列出測試
npx playwright test --list
# 預期: 列出 343+ 測試
```

#### 下午 (3h) - 建立測試用戶與環境
```bash
# 1. 建立測試用戶
npm run seed:test-users

# 2. 啟動測試環境
npm run test:e2e:setup

# 3. 執行基礎測試
npx playwright test --project=chromium e2e/web/web-app.spec.ts --grep "@smoke"

# 4. 查看測試報告
npx playwright show-report
```

#### 驗收標準
- [ ] `npx playwright test --list` 成功列出 343+ 測試
- [ ] 至少 1 個測試套件可執行 (web-app.spec.ts)
- [ ] 測試報告可生成

**預計完成**: 18:00

---

### Day 5 Friday - Subscription Service E2E ⚡

**目標**: 訂閱功能 100% 測試覆蓋

#### 全天 (8h) - 撰寫 E2E 測試
```bash
cd apps/subscription-service
git checkout -b feat/subscription-e2e-tests

# 建立測試檔案
touch src/app/subscription.e2e.spec.ts
```

```typescript
// subscription.e2e.spec.ts 測試案例:

describe('Subscription E2E', () => {
  // 1. 建立訂閱 (4個測試)
  describe('POST /subscriptions', () => {
    it('should create monthly subscription')
    it('should create annual subscription')
    it('should reject invalid tier')
    it('should prevent duplicate subscription')
  });

  // 2. 訂閱管理 (6個測試)
  describe('Subscription Management', () => {
    it('should get subscription by id')
    it('should list user subscriptions')
    it('should extend subscription period')
    it('should upgrade subscription')
    it('should downgrade subscription')
    it('should cancel subscription')
  });

  // 3. Stripe 整合 (6個測試)
  describe('Stripe Integration', () => {
    it('should handle payment.succeeded webhook')
    it('should handle payment.failed webhook')
    it('should handle subscription.deleted webhook')
    it('should sync stripe subscription status')
    it('should create stripe customer')
    it('should attach payment method')
  });

  // 4. 訂閱狀態 (4個測試)
  describe('Subscription Status', () => {
    it('should check active subscription')
    it('should handle expired subscription')
    it('should handle trial period')
    it('should handle grace period')
  });
});
```

#### 驗收標準
- [ ] 20+ 訂閱相關測試
- [ ] 所有測試通過 ✅
- [ ] Stripe webhook 正確處理

**預計完成**: 18:00

---

### 🎉 Week 1 完成標準

```bash
# 執行完整測試驗證
npm run test:all

# 預期結果:
# ✅ 編譯錯誤: 0
# ✅ 後端單元測試: 600+ 通過
# ✅ 後端 E2E 測試: 253/253 通過 (100%)
# ✅ Playwright: 可列出測試
```

**進度**: ████████████░░░░░░░░ 60% 完成

---

## 🎯 Week 2: 前端測試與整合 (Day 6-10)

### Day 6 Monday - 前端認證測試 🎯

**目標**: 登入/註冊測試完成

#### 設定測試環境 (上午 2h)
```bash
cd apps/web
git checkout -b feat/web-unit-tests

# 安裝測試依賴
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom

# 建立測試配置
touch vitest.config.ts
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
```

#### 撰寫認證測試 (上午 2h + 下午 4h)
```bash
# 1. LoginPage 測試 (10個測試)
touch src/app/auth/login/LoginPage.spec.tsx

# 2. RegisterPage 測試 (15個測試)
touch src/app/auth/register/RegisterPage.spec.tsx

# 執行測試
npm run test
npm run test:coverage
```

#### 驗收標準
- [ ] LoginPage: 10+ 測試通過
- [ ] RegisterPage: 15+ 測試通過
- [ ] 認證頁面覆蓋率 ≥ 80%

**預計完成**: 18:00

---

### Day 7 Tuesday - 前端核心功能測試 🎯

**目標**: Feed, Profile, Discovery 測試完成

#### FeedPage 測試 (上午 4h)
```bash
# 20+ 測試案例
touch src/app/feed/FeedPage.spec.tsx

# 測試內容:
# - Feed 列表渲染
# - 貼文卡片顯示
# - 無限滾動
# - 點贊功能
# - 評論功能
# - 分享功能
# - 篩選與排序
```

#### ProfilePage + DiscoveryPage (下午 4h)
```bash
# ProfilePage: 15+ 測試
touch src/app/profile/ProfilePage.spec.tsx

# DiscoveryPage: 15+ 測試
touch src/app/discovery/DiscoveryPage.spec.tsx
```

#### 驗收標準
- [ ] FeedPage: 20+ 測試通過
- [ ] ProfilePage: 15+ 測試通過
- [ ] DiscoveryPage: 15+ 測試通過
- [ ] 總覆蓋率 ≥ 50%

**預計完成**: 18:00

---

### Day 8 Wednesday - 前端支付與錢包測試 🎯

**目標**: 支付流程測試完成，達成 70% 覆蓋率

#### PaymentPage 測試 (上午 4h)
```bash
# 20+ 測試案例
touch src/app/payment/PaymentPage.spec.tsx
touch src/app/payment/StripeForm.spec.tsx

# 測試內容:
# - Stripe Elements 渲染
# - 卡號驗證
# - 支付提交
# - 錯誤處理
# - Loading 狀態
# - 成功回調
```

#### WalletPage 測試 (下午 4h)
```bash
# 15+ 測試案例
touch src/app/wallet/WalletPage.spec.tsx
touch src/app/wallet/TransactionHistory.spec.tsx

# 執行完整測試與覆蓋率
npm run test:coverage
```

#### 驗收標準
- [ ] PaymentPage: 20+ 測試通過
- [ ] WalletPage: 15+ 測試通過
- [ ] **總覆蓋率 ≥ 70%** 🎯

**預計完成**: 18:00

---

### Day 9 Thursday - 補充服務 E2E 🎯

**目標**: Notification 和 Messaging Service E2E

#### Notification Service E2E (上午 4h)
```bash
cd apps/notification-service
git checkout -b feat/notification-e2e

touch src/app/notification.e2e.spec.ts

# 10+ 測試案例:
# - POST /notifications (發送通知)
# - GET /notifications (列表)
# - PUT /notifications/:id/read (標記已讀)
# - DELETE /notifications/:id
# - GET /notifications/unread-count
# - WebSocket 即時通知

npx nx test notification-service --testPathPattern=e2e
```

#### Messaging Service E2E (下午 4h)
```bash
cd apps/messaging-service
git checkout -b feat/messaging-e2e

touch src/app/messaging.e2e.spec.ts

# 10+ 測試案例:
# - POST /conversations (建立對話)
# - POST /messages (發送消息)
# - GET /conversations (對話列表)
# - GET /conversations/:id/messages
# - WebSocket 即時消息

npx nx test messaging-service --testPathPattern=e2e
```

#### 驗收標準
- [ ] Notification Service: 10+ 測試通過
- [ ] Messaging Service: 10+ 測試通過

**預計完成**: 18:00

---

### Day 10 Friday - 完整用戶旅程測試 🎯

**目標**: 端到端用戶旅程 100% 通過

#### 重構 Playwright 測試 (上午 2h)
```bash
cd e2e
git checkout -b feat/user-journeys

# 建立 Page Object Model
mkdir -p pages/web pages/admin
touch pages/web/LoginPage.ts
touch pages/web/ProfilePage.ts
touch pages/web/FeedPage.ts
```

#### 執行完整旅程測試 (上午 2h + 下午 4h)
```bash
# 1. 創作者旅程
npx playwright test e2e/tests/journeys/creator-journey.spec.ts

# 2. 訂閱者旅程
npx playwright test e2e/tests/journeys/subscriber-journey.spec.ts

# 3. 配對旅程
npx playwright test e2e/tests/journeys/matching-journey.spec.ts

# 4. 管理員旅程
npx playwright test e2e/tests/journeys/admin-journey.spec.ts

# 執行完整 Playwright 測試套件
npx playwright test --project=chromium

# 生成測試報告
npx playwright show-report
```

#### 最終驗證 (下午 2h)
```bash
# 執行所有測試
npm run test:all
npm run test:e2e
npm run test:coverage

# 生成完整測試報告
npm run test:report
```

#### 驗收標準
- [ ] 4 個用戶旅程測試全通過 ✅
- [ ] Playwright 測試 ≥ 95% 通過率
- [ ] 所有測試執行時間 < 10 分鐘

**預計完成**: 18:00

---

### 🎉 Week 2 完成標準

```bash
# 最終驗證
npm run test:final-check

# 預期結果:
# ✅ 後端單元測試: 76%+ 覆蓋率
# ✅ 後端 E2E 測試: 253/253 通過 (100%)
# ✅ 前端 Web 測試: 70%+ 覆蓋率
# ✅ Playwright E2E: 326+/343 通過 (95%+)
# ✅ 用戶旅程: 4/4 通過 (100%)
```

**進度**: ████████████████████ 100% 完成 🎉

---

## 📈 進度追蹤儀表板

### 每日更新 (18:00)

#### Week 1 進度

| Day | 任務 | 計劃 | 實際 | 狀態 | 備註 |
|-----|------|------|------|------|------|
| 1 | 修復編譯錯誤 | 8h | - | 🔴 | - |
| 2 | User Service E2E | 8h | - | 🔴 | - |
| 3 | Content + Auth E2E | 8h | - | 🔴 | - |
| 4 | Playwright 修復 | 6h | - | 🔴 | - |
| 5 | Subscription E2E | 8h | - | 🔴 | - |

**Week 1 總計**: 0/38h (0%)

---

#### Week 2 進度

| Day | 任務 | 計劃 | 實際 | 狀態 | 備註 |
|-----|------|------|------|------|------|
| 6 | 前端認證測試 | 8h | - | 🔴 | - |
| 7 | 前端核心功能 | 8h | - | 🔴 | - |
| 8 | 前端支付錢包 | 8h | - | 🔴 | - |
| 9 | Notification/Messaging | 8h | - | 🔴 | - |
| 10 | 用戶旅程測試 | 8h | - | 🔴 | - |

**Week 2 總計**: 0/40h (0%)

---

### 測試通過率趨勢

```
Day 1:  ░░░░░░░░░░░░░░░░░░░░  20% (編譯錯誤修復)
Day 2:  ████░░░░░░░░░░░░░░░░  35% (User Service)
Day 3:  ████████░░░░░░░░░░░░  50% (Content + Auth)
Day 4:  ██████████░░░░░░░░░░  60% (Playwright)
Day 5:  ████████████░░░░░░░░  65% (Subscription)
------- Week 1 完成 -------
Day 6:  ██████████████░░░░░░  72% (前端認證)
Day 7:  ████████████████░░░░  80% (前端核心)
Day 8:  ██████████████████░░  88% (前端支付)
Day 9:  ███████████████████░  93% (服務 E2E)
Day 10: ████████████████████ 100% (旅程測試) 🎉
```

---

## 🚨 每日檢查清單

### 每天開始前 (09:00)
- [ ] Pull 最新代碼
- [ ] 確認測試環境運行
- [ ] 檢查 CI/CD 狀態
- [ ] 回顧當日任務

### 每天結束前 (18:00)
- [ ] Commit 當日代碼
- [ ] 更新進度表
- [ ] 記錄阻礙事項
- [ ] 發送測試報告

### 每週五 (18:00)
- [ ] 週報總結
- [ ] 下週計劃調整
- [ ] 風險評估更新

---

## 🎯 快速命令參考

### 測試執行
```bash
# 後端所有測試
npm run test

# 後端 E2E 測試
npx nx test user-service --testPathPattern=e2e
npx nx test content-service --testPathPattern=e2e
npx nx test auth-service --testPathPattern=e2e
npx nx test payment-service --testPathPattern=e2e
npx nx test subscription-service --testPathPattern=e2e

# 前端測試
cd apps/web && npm run test
cd apps/admin && npm run test

# Playwright E2E
npx playwright test
npx playwright test --ui
npx playwright test --headed
npx playwright test --debug

# 覆蓋率報告
npm run test:coverage
npx playwright test --reporter=html
```

### 測試除錯
```bash
# 查看詳細日誌
npx nx test <service> --verbose

# 執行單一測試
npx nx test <service> --testNamePattern="should create user"

# 監聽模式
npx nx test <service> --watch

# Playwright debug
npx playwright test --debug e2e/web/web-app.spec.ts
```

### Git 工作流
```bash
# 開始新任務
git checkout -b fix/service-name-tests

# 提交代碼
git add .
git commit -m "fix: pass User Service E2E tests (8/8)"
git push origin fix/service-name-tests

# 建立 PR
gh pr create --title "Fix: User Service E2E Tests" --body "Fixes #123"
```

---

## 📞 緊急聯絡

### 阻礙問題升級

**Level 1 - 團隊內解決 (< 2h)**:
- 問團隊成員
- 查看文檔
- Stack Overflow

**Level 2 - Lead 協助 (2-4h)**:
- Backend Lead
- Frontend Lead
- QA Lead

**Level 3 - 架構師介入 (> 4h)**:
- Solution Architect
- CTO

### 聯絡方式
- **Slack**: #testing-sprint
- **Email**: qa-team@sugardaddy.com
- **緊急**: +886-XXX-XXXX (QA Lead)

---

## ✅ 最終驗收

### 上線前檢查 (Day 10 17:00)

```bash
#!/bin/bash
# final-check.sh

echo "🎯 執行最終驗收檢查..."

# 1. 後端測試
echo "1️⃣ 後端測試..."
npm run test
if [ $? -ne 0 ]; then
  echo "❌ 後端測試失敗"
  exit 1
fi

# 2. 前端測試
echo "2️⃣ 前端測試..."
cd apps/web && npm run test:coverage
if [ $? -ne 0 ]; then
  echo "❌ 前端測試失敗"
  exit 1
fi

# 3. Playwright 測試
echo "3️⃣ Playwright 測試..."
npx playwright test --project=chromium
if [ $? -ne 0 ]; then
  echo "❌ Playwright 測試失敗"
  exit 1
fi

# 4. 檢查覆蓋率
echo "4️⃣ 檢查覆蓋率..."
./scripts/check-coverage.sh

echo "✅ 所有測試通過！準備上線 🚀"
```

### 驗收標準

- [ ] 後端單元測試: 600+ 通過
- [ ] 後端 E2E 測試: 253/253 (100%)
- [ ] 前端 Web 測試: 覆蓋率 ≥ 70%
- [ ] Playwright E2E: ≥ 326/343 (95%)
- [ ] 用戶旅程: 4/4 (100%)
- [ ] 編譯錯誤: 0
- [ ] Flaky 測試: < 5 個
- [ ] 執行時間: < 10 分鐘

### 簽核

- [ ] QA Lead: ________________ (Date: _____)
- [ ] Backend Lead: ________________ (Date: _____)
- [ ] Frontend Lead: ________________ (Date: _____)
- [ ] Product Owner: ________________ (Date: _____)

---

**🎉 讓我們開始吧！衝刺 2 週，達成 100% 測試通過率！**

**下一步**: 執行 `git checkout -b fix/auth-service-tests` 並開始 Day 1 任務
