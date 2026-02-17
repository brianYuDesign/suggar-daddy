# Test Directory

Sugar Daddy 專案測試套件統一目錄。

## 📁 目錄結構

```
test/
├── integration/           # 跨服務整合測試
│   ├── fixtures/         # 測試數據 fixtures
│   ├── helpers/          # 測試輔助函數
│   └── scenarios/        # 整合測試場景
│       ├── auth-flow.integration.spec.ts
│       ├── payment-flow.integration.spec.ts
│       └── subscription-flow.integration.spec.ts
│
├── e2e/                  # 端對端用戶流程測試 (Playwright)
│   ├── fixtures/         # E2E 測試數據
│   ├── page-objects/     # Page Object Models
│   │   ├── auth.page.ts
│   │   ├── feed.page.ts
│   │   └── payment.page.ts
│   └── specs/            # E2E 測試規格
│       ├── user-journey/ # 用戶旅程測試
│       ├── admin-flows/  # 管理後台流程
│       └── critical-paths/ # 關鍵路徑測試
│
├── config/               # 測試配置
│   ├── jest/            # Jest 分層配置
│   │   ├── jest.unit.config.ts
│   │   ├── jest.integration.config.ts
│   │   └── jest.ui.config.ts
│   ├── playwright/      # Playwright 配置
│   │   └── playwright.config.ts (→ 實際在 root)
│   └── test-environment/ # 測試環境設置
│       ├── setup-test-db.ts
│       └── teardown.ts
│
├── utils/                # 測試工具庫
│   ├── test-server.ts    # 測試伺服器管理
│   ├── mock-factories/   # Mock 數據工廠
│   │   ├── user.factory.ts
│   │   ├── post.factory.ts
│   │   └── transaction.factory.ts
│   ├── api-client.ts     # 測試 API client
│   └── assertions.ts     # 自定義斷言
│
└── coverage/             # 覆蓋率報告輸出
    ├── unit/
    ├── integration/
    ├── ui/
    └── merged/           # 合併覆蓋率報告
```

## 🧪 測試類型

### 1. Unit Tests (*.spec.ts)
- **位置**: 與源碼同目錄 (`apps/*/src/**/*.spec.ts`, `libs/*/src/**/*.spec.ts`)
- **工具**: Jest + ts-jest
- **執行**: `npm run test:unit`
- **特點**: 快速、隔離、完全 mock 外部依賴

### 2. Integration Tests (*.integration.spec.ts)
- **位置**: `test/integration/scenarios/` 或與服務同目錄
- **工具**: Jest + Supertest
- **執行**: `npm run test:integration`
- **特點**: 使用真實 Docker 服務、測試跨服務協作

### 3. UI Tests (*.spec.tsx)
- **位置**: 與組件同目錄 (`apps/{web,admin}/app/**/*.spec.tsx`)
- **工具**: Jest + React Testing Library
- **執行**: `npm run test:ui`
- **特點**: 測試組件渲染、交互、狀態

### 4. E2E Tests (*.spec.ts in test/e2e/)
- **位置**: `test/e2e/specs/`
- **工具**: Playwright
- **執行**: `npm run test:e2e`
- **特點**: 完整用戶流程、瀏覽器自動化

## 🚀 快速開始

```bash
# 1. 啟動測試環境
npm run test:env:start

# 2. 執行測試
npm run test:unit              # 單元測試（快速）
npm run test:integration       # 整合測試（中速）
npm run test:ui                # UI 測試
npm run test:e2e               # E2E 測試（完整）

# 3. 查看覆蓋率
npm run test:coverage
open test/coverage/merged/index.html

# 4. 停止測試環境
npm run test:env:stop
```

## 📝 測試規範

### 命名規範
- Unit test: `*.spec.ts` (例: `user.service.spec.ts`)
- Integration test: `*.integration.spec.ts` (例: `auth-api.integration.spec.ts`)
- UI test: `*.spec.tsx` (例: `Button.spec.tsx`)
- E2E test: `*.spec.ts` in `test/e2e/` (例: `creator-onboarding.spec.ts`)

### 測試結構
```typescript
describe('Feature/Component/Service', () => {
  describe('Method/Function', () => {
    it('should do something when condition', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### 覆蓋率目標
- **重要功能**: 80%+ (認證、支付、訂閱等)
- **一般功能**: 60%+
- **關鍵流程**: 100% E2E 覆蓋

## 📚 參考文檔

- [測試完整指南](../docs/qa/TESTING-GUIDE.md)
- [Unit Testing 規範](../docs/qa/UNIT-TESTING.md)
- [Integration Testing 規範](../docs/qa/INTEGRATION-TESTING.md)
- [UI Testing 規範](../docs/qa/UI-TESTING.md)
- [E2E Testing 規範](../docs/qa/E2E-TESTING.md)
