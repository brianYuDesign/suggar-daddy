# Sugar Daddy 測試完整指南

> **Tech Lead 審核通過** | 版本 1.0 | 2025-02-17

## 目錄

- [1. 測試願景與目標](#1-測試願景與目標)
- [2. 測試金字塔策略](#2-測試金字塔策略)
- [3. 測試類型與職責](#3-測試類型與職責)
- [4. 測試環境架構](#4-測試環境架構)
- [5. 測試工具鏈](#5-測試工具鏈)
- [6. 測試開發流程](#6-測試開發流程)
- [7. 測試數據管理](#7-測試數據管理)
- [8. CI/CD 整合](#8-cicd-整合)
- [9. 故障排查指南](#9-故障排查指南)
- [10. 最佳實踐](#10-最佳實踐)

---

## 1. 測試願景與目標

### 1.1 測試願景

建立一個**可靠、高效、易維護**的測試體系，確保：
- ✅ 每次代碼變更都能快速驗證
- ✅ 關鍵業務流程 100% 有測試保護
- ✅ 生產環境錯誤率 < 0.1%
- ✅ 開發者信心指數 > 90%

### 1.2 測試目標

| 指標 | 目標值 | 當前值 | 狀態 |
|------|--------|--------|------|
| 單元測試覆蓋率 | 80% | 60% | 🟡 進行中 |
| 整合測試覆蓋率 | 70% | 30% | 🟡 進行中 |
| E2E 關鍵路徑覆蓋 | 100% | 40% | 🟡 進行中 |
| 測試執行時間 | < 10 分鐘 | 8 分鐘 | ✅ 達標 |
| 測試穩定性 | > 98% | 95% | 🟡 改善中 |
| 回歸錯誤率 | < 2% | 5% | 🔴 需改善 |

### 1.3 品質標準

#### 關鍵功能（必須 100% 測試）
- 🔐 **認證授權**：登入、註冊、OAuth、Token 管理
- 💳 **支付流程**：充值、交易、退款、錢包
- 📊 **訂閱系統**：訂閱、續訂、取消、升降級
- 🔒 **安全機制**：XSS 防護、CSRF、Rate Limiting

#### 重要功能（目標 80%+）
- 👤 用戶管理、個人資料
- 📝 內容管理、動態發布
- 💬 訊息系統、通知
- 🎯 配對系統

#### 一般功能（目標 60%+）
- 📱 UI 組件
- 🛠️ 工具函數
- 📄 靜態頁面

---

## 2. 測試金字塔策略

```
           /\          E2E Tests (5%)
          /  \         ├─ 關鍵用戶旅程
         /    \        └─ 跨系統整合
        /------\       
       /        \      Integration Tests (25%)
      /          \     ├─ API 整合
     /            \    ├─ 資料庫整合
    /--------------\   └─ 微服務協作
   /                \  
  /                  \ Unit Tests (70%)
 /____________________\├─ 業務邏輯
                       ├─ 服務層
                       └─ UI 組件
```

### 2.1 測試分層原則

#### 單元測試（70%）- 快速反饋層
**目的**：驗證最小可測試單元的正確性

**特點**：
- ⚡ 極快執行（< 1ms per test）
- 🔒 完全隔離（所有依賴都 mock）
- 📦 高度聚焦（一次只測一件事）

**覆蓋範圍**：
- ✅ Service 業務邏輯
- ✅ Utility 工具函數
- ✅ Validator 驗證器
- ✅ Transformer 轉換器
- ✅ UI 組件（React Testing Library）

**適用場景**：
```typescript
// ✅ 好的單元測試範例
describe('WalletService.calculateBalance', () => {
  it('should sum all completed transactions', () => {
    const service = new WalletService(mockTransactionRepo);
    const balance = service.calculateBalance([
      { amount: 100, status: 'completed' },
      { amount: 50, status: 'completed' },
      { amount: 30, status: 'pending' }, // 不計入
    ]);
    expect(balance).toBe(150);
  });
});
```

#### 整合測試（25%）- 協作驗證層
**目的**：驗證多個模組協作是否正確

**特點**：
- 🐢 中等速度（1-5s per test）
- 🔗 部分真實依賴（資料庫、Redis、Kafka）
- 🎯 關注交互點

**覆蓋範圍**：
- ✅ API 端點測試（Supertest）
- ✅ 資料庫操作（真實 DB）
- ✅ 緩存邏輯（真實 Redis）
- ✅ 訊息佇列（真實 Kafka）
- ✅ 微服務間通訊

**適用場景**：
```typescript
// ✅ 好的整合測試範例
describe('POST /api/payments/charge', () => {
  it('should create transaction and update wallet in DB', async () => {
    const response = await request(app)
      .post('/api/payments/charge')
      .send({ userId: 1, amount: 100 });
    
    expect(response.status).toBe(201);
    
    // 驗證資料庫真實寫入
    const wallet = await walletRepo.findOne({ userId: 1 });
    expect(wallet.balance).toBe(100);
    
    const transaction = await transactionRepo.findOne(response.body.id);
    expect(transaction.status).toBe('completed');
  });
});
```

#### E2E 測試（5%）- 用戶體驗層
**目的**：驗證完整用戶流程的正確性

**特點**：
- 🐌 較慢執行（10-60s per test）
- 🌐 真實環境（瀏覽器、完整後端）
- 👤 用戶視角

**覆蓋範圍**：
- ✅ 關鍵用戶旅程（註冊→認證→支付→使用）
- ✅ 跨頁面流程
- ✅ 多瀏覽器兼容性
- ✅ 響應式設計驗證

**適用場景**：
```typescript
// ✅ 好的 E2E 測試範例
test('Creator subscription purchase flow', async ({ page }) => {
  // 1. 登入
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'subscriber@test.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="submit"]');
  
  // 2. 瀏覽創作者
  await page.goto('/creators/jane-doe');
  await page.click('[data-testid="subscribe-button"]');
  
  // 3. 選擇訂閱方案
  await page.click('[data-testid="premium-plan"]');
  
  // 4. 完成支付
  await page.fill('[data-testid="card-number"]', '4242424242424242');
  await page.click('[data-testid="pay-button"]');
  
  // 5. 驗證成功
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active');
});
```

---

## 3. 測試類型與職責

### 3.1 單元測試（Unit Tests）

#### 文件命名規範
```
src/
├── services/
│   ├── wallet.service.ts
│   └── wallet.service.spec.ts      ✅ 與源文件同目錄
├── utils/
│   ├── date.helper.ts
│   └── date.helper.spec.ts
└── components/
    ├── Button.tsx
    └── Button.spec.tsx              ✅ UI 組件測試
```

#### 測試結構模板
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let mockTransactionRepo: jest.Mocked<TransactionRepository>;
  
  beforeEach(async () => {
    // Arrange: 建立測試環境
    mockTransactionRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as any;
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: TransactionRepository, useValue: mockTransactionRepo },
      ],
    }).compile();
    
    service = module.get<WalletService>(WalletService);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('deposit', () => {
    it('should increase wallet balance when transaction succeeds', async () => {
      // Arrange
      const userId = 1;
      const amount = 100;
      mockTransactionRepo.save.mockResolvedValue({ id: 1, amount, status: 'completed' });
      
      // Act
      const result = await service.deposit(userId, amount);
      
      // Assert
      expect(result.balance).toBe(100);
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId, amount })
      );
    });
    
    it('should throw error when amount is negative', async () => {
      // Act & Assert
      await expect(service.deposit(1, -100)).rejects.toThrow('Amount must be positive');
    });
  });
});
```

#### UI 組件測試模板
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

### 3.2 整合測試（Integration Tests）

#### 文件命名規範
```
src/
└── app/
    ├── payment.service.ts
    └── payment.integration.spec.ts   ✅ 加上 .integration 後綴

test/
└── integration/
    └── scenarios/
        ├── auth-flow.integration.spec.ts
        ├── payment-flow.integration.spec.ts
        └── subscription-flow.integration.spec.ts
```

#### API 整合測試模板
```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('Payment API Integration', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleRef.createNestApplication();
    await app.init();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('POST /api/payments/charge', () => {
    it('should process payment and return transaction ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payments/charge')
        .set('Authorization', 'Bearer valid-token')
        .send({
          userId: 1,
          amount: 1000,
          currency: 'USD',
        })
        .expect(201);
      
      expect(response.body).toMatchObject({
        id: expect.any(Number),
        status: 'completed',
        amount: 1000,
      });
    });
    
    it('should return 401 when token is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/payments/charge')
        .set('Authorization', 'Bearer invalid-token')
        .send({ userId: 1, amount: 1000 })
        .expect(401);
    });
  });
});
```

### 3.3 E2E 測試（End-to-End Tests）

#### 目錄結構
```
test/e2e/
├── fixtures/                     # 測試數據
│   ├── users.json
│   └── subscriptions.json
├── page-objects/                 # Page Object Models
│   ├── auth.page.ts
│   ├── payment.page.ts
│   └── subscription.page.ts
├── utils/                        # 測試工具
│   ├── api-helper.ts
│   └── test-helpers.ts
└── specs/                        # 測試規格
    ├── user-journey/
    │   ├── auth.spec.ts
    │   ├── subscription-purchase.spec.ts
    │   └── content-consumption.spec.ts
    ├── admin-flows/
    │   └── user-management.spec.ts
    └── critical-paths/
        ├── payment-flow.spec.ts
        └── creator-earnings.spec.ts
```

#### Page Object Pattern
```typescript
// page-objects/subscription.page.ts
import { Page, Locator } from '@playwright/test';

export class SubscriptionPage {
  readonly page: Page;
  readonly premiumPlanButton: Locator;
  readonly paymentForm: Locator;
  readonly successMessage: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.premiumPlanButton = page.locator('[data-testid="premium-plan"]');
    this.paymentForm = page.locator('[data-testid="payment-form"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
  }
  
  async selectPremiumPlan() {
    await this.premiumPlanButton.click();
  }
  
  async fillPaymentDetails(cardNumber: string, expiry: string, cvv: string) {
    await this.paymentForm.locator('[data-testid="card-number"]').fill(cardNumber);
    await this.paymentForm.locator('[data-testid="expiry"]').fill(expiry);
    await this.paymentForm.locator('[data-testid="cvv"]').fill(cvv);
  }
  
  async submitPayment() {
    await this.paymentForm.locator('[data-testid="submit"]').click();
  }
  
  async waitForSuccess() {
    await this.successMessage.waitFor({ state: 'visible' });
  }
}
```

#### E2E 測試模板
```typescript
import { test, expect } from '@playwright/test';
import { SubscriptionPage } from '../page-objects/subscription.page';

test.describe('Subscription Purchase Flow', () => {
  let subscriptionPage: SubscriptionPage;
  
  test.beforeEach(async ({ page }) => {
    subscriptionPage = new SubscriptionPage(page);
    
    // 登入
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'subscriber@test.com');
    await page.fill('[data-testid="password"]', 'Test1234!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/feed');
  });
  
  test('should successfully purchase premium subscription', async ({ page }) => {
    // 導航到創作者頁面
    await page.goto('/creators/jane-doe');
    
    // 點擊訂閱按鈕
    await page.click('[data-testid="subscribe-button"]');
    
    // 選擇方案
    await subscriptionPage.selectPremiumPlan();
    
    // 填寫支付資訊
    await subscriptionPage.fillPaymentDetails(
      '4242424242424242',
      '12/25',
      '123'
    );
    
    // 提交支付
    await subscriptionPage.submitPayment();
    
    // 驗證成功
    await subscriptionPage.waitForSuccess();
    await expect(page.locator('[data-testid="subscription-status"]'))
      .toContainText('Active');
  });
  
  test('should show error for invalid card', async ({ page }) => {
    await page.goto('/creators/jane-doe');
    await page.click('[data-testid="subscribe-button"]');
    await subscriptionPage.selectPremiumPlan();
    
    await subscriptionPage.fillPaymentDetails(
      '4000000000000002', // 會被拒絕的卡號
      '12/25',
      '123'
    );
    
    await subscriptionPage.submitPayment();
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Card declined');
  });
});
```

---

## 4. 測試環境架構

### 4.1 本地開發環境

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  # 測試資料庫（隔離的 schema）
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: suggar_daddy_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5433:5432"  # 不同端口避免衝突
    tmpfs:
      - /var/lib/postgresql/data  # 使用內存，加快測試速度
  
  # 測試 Redis
  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    tmpfs:
      - /data
  
  # 測試 Kafka
  kafka-test:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper-test:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9093
    ports:
      - "9093:9093"
```

### 4.2 CI 環境

```yaml
# .github/workflows/ci.yml
test-unit:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci
    - run: npm run test:unit
    - uses: codecov/codecov-action@v3  # 上傳覆蓋率

test-integration:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15-alpine
      env:
        POSTGRES_PASSWORD: postgres
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
      ports:
        - 5432:5432
    redis:
      image: redis:7-alpine
      options: >-
        --health-cmd "redis-cli ping"
      ports:
        - 6379:6379
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run test:integration

test-e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: docker-compose up -d
    - run: npm run test:e2e
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: test/coverage/e2e-report/
```

### 4.3 測試數據隔離策略

#### 策略一：Database Isolation（推薦）
```typescript
// 每個測試使用獨立的 schema
beforeEach(async () => {
  const schemaName = `test_${Date.now()}`;
  await connection.query(`CREATE SCHEMA ${schemaName}`);
  await connection.query(`SET search_path TO ${schemaName}`);
  await runMigrations(connection);
});

afterEach(async () => {
  await connection.query(`DROP SCHEMA ${schemaName} CASCADE`);
});
```

#### 策略二：Transaction Rollback
```typescript
// 每個測試在交易中執行，結束後回滾
beforeEach(async () => {
  await connection.query('BEGIN');
});

afterEach(async () => {
  await connection.query('ROLLBACK');
});
```

#### 策略三：Fixture 清理
```typescript
// 使用固定的測試數據，每次測試後清理
afterEach(async () => {
  await userRepo.delete({ email: { $like: '%@test.com' } });
  await transactionRepo.delete({ createdAt: { $gte: testStartTime } });
});
```

---

## 5. 測試工具鏈

### 5.1 核心工具

| 工具 | 用途 | 版本 | 配置文件 |
|------|------|------|----------|
| **Jest** | 單元測試 & 整合測試 | 30.0.2 | `jest.*.config.ts` |
| **Playwright** | E2E 測試 | 1.58.2 | `playwright.config.ts` |
| **Testing Library** | UI 組件測試 | 16.3.2 | N/A |
| **Supertest** | API 測試 | 7.2.2 | N/A |
| **ts-jest** | TypeScript 支援 | 29.4.0 | N/A |

### 5.2 輔助工具

#### Mock & Stub
```typescript
// Jest Mock
jest.mock('@suggar-daddy/redis', () => ({
  RedisService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// Sinon Stub（當需要更精細的控制時）
import * as sinon from 'sinon';
const stub = sinon.stub(stripeService, 'charge').resolves({ id: 'ch_123' });
```

#### Test Factories
```typescript
// test/utils/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.number.int(),
      email: faker.internet.email(),
      username: faker.internet.userName(),
      type: 'subscriber',
      ...overrides,
    };
  }
  
  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// 使用
const user = UserFactory.create({ type: 'creator' });
const users = UserFactory.createMany(10);
```

#### Custom Matchers
```typescript
// test/utils/custom-matchers.ts
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },
});

// 使用
expect('test@example.com').toBeValidEmail();
```

---

## 6. 測試開發流程

### 6.1 TDD（Test-Driven Development）工作流

```
1. 寫測試（Red）
   ↓
2. 讓測試通過（Green）
   ↓
3. 重構代碼（Refactor）
   ↓
   回到步驟 1
```

#### 實踐範例
```typescript
// Step 1: 寫失敗的測試
describe('calculateSubscriptionPrice', () => {
  it('should apply 20% discount for annual plan', () => {
    const result = calculateSubscriptionPrice('annual', 100);
    expect(result).toBe(80);  // 這會失敗，因為函數還沒實現
  });
});

// Step 2: 實現最簡代碼讓測試通過
function calculateSubscriptionPrice(plan: string, basePrice: number): number {
  if (plan === 'annual') {
    return basePrice * 0.8;
  }
  return basePrice;
}

// Step 3: 添加更多測試案例，然後重構
describe('calculateSubscriptionPrice', () => {
  it.each([
    ['annual', 100, 80],
    ['monthly', 100, 100],
    ['quarterly', 100, 90],
  ])('should calculate %s plan price correctly', (plan, base, expected) => {
    expect(calculateSubscriptionPrice(plan, base)).toBe(expected);
  });
});

// Refactor: 使用配置驅動
const DISCOUNT_RATES = {
  annual: 0.2,
  quarterly: 0.1,
  monthly: 0,
};

function calculateSubscriptionPrice(plan: string, basePrice: number): number {
  const discount = DISCOUNT_RATES[plan] || 0;
  return basePrice * (1 - discount);
}
```

### 6.2 測試驅動的代碼審查

#### Pull Request Checklist
```markdown
## PR Checklist

### 測試要求
- [ ] 所有新功能都有單元測試
- [ ] 關鍵業務邏輯有整合測試
- [ ] 測試覆蓋率沒有下降
- [ ] 所有測試都通過
- [ ] 沒有被跳過的測試（除非有充分理由）

### 測試品質
- [ ] 測試命名清晰描述行為
- [ ] 使用 AAA 模式（Arrange-Act-Assert）
- [ ] 沒有過度 mock（避免測試變得脆弱）
- [ ] 測試獨立性（可以單獨執行）
- [ ] 測試穩定性（不會隨機失敗）

### 邊界條件
- [ ] 測試正常情況（Happy Path）
- [ ] 測試錯誤處理
- [ ] 測試邊界值
- [ ] 測試異常輸入
```

---

## 7. 測試數據管理

### 7.1 Fixtures 管理

```typescript
// test/fixtures/users.ts
export const testUsers = {
  subscriber: {
    email: 'subscriber@test.com',
    password: 'Test1234!',
    type: 'subscriber',
  },
  creator: {
    email: 'creator@test.com',
    password: 'Test1234!',
    type: 'creator',
    creatorProfile: {
      displayName: 'Jane Doe',
      bio: 'Test creator',
    },
  },
  admin: {
    email: 'admin@test.com',
    password: 'Test1234!',
    type: 'admin',
  },
};

// 使用
import { testUsers } from '../fixtures/users';

it('should login subscriber', async () => {
  await authService.login(
    testUsers.subscriber.email,
    testUsers.subscriber.password
  );
});
```

### 7.2 動態數據生成

```typescript
// test/utils/data-builder.ts
export class SubscriptionBuilder {
  private data: Partial<Subscription> = {
    status: 'active',
    plan: 'premium',
  };
  
  withStatus(status: SubscriptionStatus) {
    this.data.status = status;
    return this;
  }
  
  withPlan(plan: SubscriptionPlan) {
    this.data.plan = plan;
    return this;
  }
  
  expired() {
    this.data.endDate = new Date(Date.now() - 86400000);
    return this;
  }
  
  build(): Subscription {
    return {
      id: faker.number.int(),
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      ...this.data,
    } as Subscription;
  }
}

// 使用
const expiredSubscription = new SubscriptionBuilder()
  .withPlan('basic')
  .expired()
  .build();
```

### 7.3 測試數據清理

```typescript
// test/utils/test-cleanup.ts
export class TestCleanup {
  private cleanupTasks: Array<() => Promise<void>> = [];
  
  addCleanup(task: () => Promise<void>) {
    this.cleanupTasks.push(task);
  }
  
  async cleanup() {
    for (const task of this.cleanupTasks.reverse()) {
      await task();
    }
    this.cleanupTasks = [];
  }
}

// 使用
const cleanup = new TestCleanup();

afterEach(async () => {
  await cleanup.cleanup();
});

it('should create user', async () => {
  const user = await userService.create({ email: 'test@example.com' });
  cleanup.addCleanup(() => userService.delete(user.id));
  
  // 測試邏輯...
});
```

---

## 8. CI/CD 整合

詳見 [CI-CD-TESTING.md](./CI-CD-TESTING.md)

### 8.1 測試階段

```
開發階段  →  Pre-commit  →  PR 檢查  →  Merge 後  →  部署前
   ↓            ↓            ↓          ↓          ↓
手動測試    Unit Tests    All Tests   E2E Tests  Smoke Tests
           Lint         Coverage     Integration  Health Check
```

### 8.2 測試報告

- **覆蓋率報告**：Codecov / SonarQube
- **測試結果**：GitHub Actions Summary
- **性能報告**：Playwright Trace Viewer
- **視覺回歸**：Percy / Chromatic

---

## 9. 故障排查指南

### 9.1 常見問題

#### 問題 1：測試隨機失敗（Flaky Tests）

**症狀**：
```
✓ Test passes (Run 1)
✗ Test fails (Run 2)
✓ Test passes (Run 3)
```

**可能原因**：
1. **異步時間問題**
   ```typescript
   // ❌ 不好：固定等待時間
   await sleep(1000);
   
   // ✅ 好：等待特定條件
   await waitFor(() => expect(element).toBeVisible(), { timeout: 5000 });
   ```

2. **測試間相互影響**
   ```typescript
   // ❌ 不好：共享狀態
   let sharedUser;
   
   beforeEach(() => {
     sharedUser = { id: 1 }; // 可能被修改
   });
   
   // ✅ 好：每次創建新實例
   beforeEach(() => {
     sharedUser = createFreshUser();
   });
   ```

3. **日期時間依賴**
   ```typescript
   // ❌ 不好：依賴當前時間
   const now = new Date();
   
   // ✅ 好：使用固定時間
   jest.useFakeTimers();
   jest.setSystemTime(new Date('2024-01-01'));
   ```

#### 問題 2：測試太慢

**診斷**：
```bash
# 找出慢測試
npm run test:unit -- --verbose --testTimeout=1000
```

**優化策略**：
1. **減少 mock 設置開銷**
   ```typescript
   // ❌ 每次測試都建立完整模組
   beforeEach(async () => {
     const module = await Test.createTestingModule({ ... }).compile();
   });
   
   // ✅ 複用模組
   let module: TestingModule;
   beforeAll(async () => {
     module = await Test.createTestingModule({ ... }).compile();
   });
   ```

2. **並行執行**
   ```bash
   # Jest 預設並行，確保沒有被關閉
   npm test -- --maxWorkers=50%
   ```

3. **跳過不必要的測試**
   ```typescript
   // 使用 test.skip 暫時跳過
   test.skip('slow integration test', () => { ... });
   ```

#### 問題 3：Module Resolution 錯誤

**症狀**：
```
Cannot find module '@suggar-daddy/common'
```

**解決方案**：
```typescript
// jest.config.ts
moduleNameMapper: {
  '^@suggar-daddy/(.*)$': '<rootDir>/libs/$1/src/index.ts',
},

// 或者在 tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@suggar-daddy/*": ["libs/*/src"]
    }
  }
}
```

---

## 10. 最佳實踐

### 10.1 測試命名

```typescript
// ❌ 不好：不清楚測試什麼
it('test1', () => { ... });
it('should work', () => { ... });

// ✅ 好：清楚描述行為
it('should return 401 when token is expired', () => { ... });
it('should send email notification after successful payment', () => { ... });

// ✅ 更好：使用模板
describe('UserService.register', () => {
  describe('when email is already taken', () => {
    it('should throw EmailAlreadyExistsError', () => { ... });
  });
  
  describe('when password is too weak', () => {
    it('should throw WeakPasswordError', () => { ... });
  });
  
  describe('when input is valid', () => {
    it('should create user in database', () => { ... });
    it('should send verification email', () => { ... });
    it('should return user with generated ID', () => { ... });
  });
});
```

### 10.2 AAA 模式（Arrange-Act-Assert）

```typescript
it('should calculate total price with tax', () => {
  // Arrange: 準備測試數據
  const items = [
    { name: 'Item 1', price: 100 },
    { name: 'Item 2', price: 200 },
  ];
  const taxRate = 0.1;
  const calculator = new PriceCalculator();
  
  // Act: 執行被測試的操作
  const total = calculator.calculateTotal(items, taxRate);
  
  // Assert: 驗證結果
  expect(total).toBe(330); // (100 + 200) * 1.1
});
```

### 10.3 測試獨立性

```typescript
// ❌ 不好：測試間有依賴
describe('User CRUD', () => {
  let userId;
  
  it('should create user', async () => {
    const user = await userService.create({ ... });
    userId = user.id; // 後續測試依賴這個
  });
  
  it('should update user', async () => {
    await userService.update(userId, { ... }); // 依賴前一個測試
  });
});

// ✅ 好：每個測試獨立
describe('User CRUD', () => {
  let testUser;
  
  beforeEach(async () => {
    testUser = await userService.create({ ... }); // 每次都創建
  });
  
  afterEach(async () => {
    await userService.delete(testUser.id); // 每次都清理
  });
  
  it('should create user', async () => {
    expect(testUser.id).toBeDefined();
  });
  
  it('should update user', async () => {
    await userService.update(testUser.id, { name: 'New Name' });
    const updated = await userService.findById(testUser.id);
    expect(updated.name).toBe('New Name');
  });
});
```

### 10.4 避免過度 Mock

```typescript
// ❌ 不好：mock 太多，測試變得脆弱
it('should process payment', async () => {
  mockStripe.customers.create = jest.fn().mockResolvedValue({ id: 'cus_123' });
  mockStripe.paymentIntents.create = jest.fn().mockResolvedValue({ id: 'pi_123' });
  mockStripe.paymentIntents.confirm = jest.fn().mockResolvedValue({ status: 'succeeded' });
  mockDatabase.transaction.save = jest.fn();
  mockEmailService.send = jest.fn();
  mockKafka.publish = jest.fn();
  
  // 這個測試變得很脆弱，實現細節改變就會失敗
});

// ✅ 好：只 mock 外部依賴，使用真實的業務邏輯
it('should process payment', async () => {
  // 只 mock 外部服務
  mockStripe.charge = jest.fn().mockResolvedValue({ id: 'ch_123', status: 'succeeded' });
  
  // 使用真實的 PaymentService，只隔離外部依賴
  const result = await paymentService.processPayment({
    userId: 1,
    amount: 1000,
  });
  
  expect(result.status).toBe('completed');
  expect(mockStripe.charge).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 1000 })
  );
});
```

### 10.5 測試邊界條件

```typescript
describe('validateAge', () => {
  it.each([
    [17, false, 'below minimum'],
    [18, true, 'at minimum boundary'],
    [25, true, 'normal case'],
    [120, true, 'at maximum boundary'],
    [121, false, 'above maximum'],
    [-1, false, 'negative'],
    [0, false, 'zero'],
    [null, false, 'null'],
    [undefined, false, 'undefined'],
    ['18', false, 'string instead of number'],
  ])('should return %s for age %s (%s)', (age, expected, scenario) => {
    expect(validateAge(age)).toBe(expected);
  });
});
```

---

## 附錄

### A. 快速參考

#### 執行測試
```bash
# 所有測試
npm test

# 單元測試
npm run test:unit
npm run test:unit:watch        # Watch 模式
npm run test:unit:coverage     # 帶覆蓋率

# 整合測試
npm run test:integration

# UI 測試
npm run test:ui

# E2E 測試
npm run test:e2e
npm run test:e2e:ui            # UI 模式
npm run test:e2e:debug         # Debug 模式

# 特定文件
npm test -- user.service.spec.ts

# 特定測試
npm test -- -t "should create user"
```

#### Debug 測試
```bash
# Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### B. 參考資源

- [Jest 官方文檔](https://jestjs.io/docs/getting-started)
- [Playwright 官方文檔](https://playwright.dev/)
- [Testing Library 官方文檔](https://testing-library.com/)
- [NestJS 測試文檔](https://docs.nestjs.com/fundamentals/testing)
- [React Testing 最佳實踐](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### C. 團隊協議

1. **所有 PR 必須包含測試**
2. **測試覆蓋率不得下降**
3. **關鍵功能必須有 E2E 測試**
4. **測試失敗不能 merge**
5. **定期審查和重構測試**

---

**版本歷史**：
- v1.0 (2025-02-17): 初版發布 by Tech Lead
