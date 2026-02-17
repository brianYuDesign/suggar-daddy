# Sugar Daddy 測試標準與最佳實踐

> **Tech Lead 審核制定** | 版本 1.0 | 2025-02-17

## 目錄

- [1. 測試原則](#1-測試原則)
- [2. 命名規範](#2-命名規範)
- [3. 測試結構標準](#3-測試結構標準)
- [4. 覆蓋率標準](#4-覆蓋率標準)
- [5. Mock 與 Stub 策略](#5-mock-與-stub-策略)
- [6. 斷言標準](#6-斷言標準)
- [7. 測試數據管理](#7-測試數據管理)
- [8. 性能標準](#8-性能標準)
- [9. 代碼審查標準](#9-代碼審查標準)
- [10. 反模式與陷阱](#10-反模式與陷阱)

---

## 1. 測試原則

### 1.1 FIRST 原則

測試應該遵循 **FIRST** 原則：

#### Fast（快速）
```typescript
// ✅ 好：單元測試應該 < 10ms
it('should calculate total', () => {
  const result = calculator.sum([1, 2, 3]);
  expect(result).toBe(6);
}); // 執行時間: 3ms

// ❌ 避免：測試中包含不必要的延遲
it('should process order', async () => {
  await sleep(1000); // 不必要的等待
  const result = await orderService.process(order);
  expect(result).toBe('processed');
});
```

**標準**：
- 單元測試：< 100ms
- 整合測試：< 5s
- E2E 測試：< 60s

#### Independent（獨立）
```typescript
// ✅ 好：每個測試獨立
describe('UserService', () => {
  beforeEach(() => {
    userRepo = new InMemoryUserRepository(); // 每次創建新實例
  });
  
  it('should create user', () => {
    const user = userRepo.save({ name: 'Alice' });
    expect(user.id).toBeDefined();
  });
  
  it('should find user by id', () => {
    const user = userRepo.save({ name: 'Bob' }); // 不依賴前一個測試
    const found = userRepo.findById(user.id);
    expect(found.name).toBe('Bob');
  });
});

// ❌ 避免：測試間有依賴
describe('UserService', () => {
  let userId; // 共享狀態
  
  it('should create user', () => {
    const user = userRepo.save({ name: 'Alice' });
    userId = user.id; // 後續測試依賴這個
  });
  
  it('should find user', () => {
    const found = userRepo.findById(userId); // 依賴前一個測試
    expect(found).toBeDefined();
  });
});
```

#### Repeatable（可重複）
```typescript
// ✅ 好：使用固定的測試數據
it('should format date correctly', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  
  const formatted = formatDate(new Date());
  expect(formatted).toBe('2024-01-15');
  
  jest.useRealTimers();
});

// ❌ 避免：依賴當前時間
it('should format date correctly', () => {
  const formatted = formatDate(new Date()); // 每次執行結果不同
  expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/); // 太寬鬆的斷言
});
```

#### Self-Validating（自我驗證）
```typescript
// ✅ 好：自動驗證結果
it('should return sorted array', () => {
  const result = sort([3, 1, 2]);
  expect(result).toEqual([1, 2, 3]); // 明確的斷言
});

// ❌ 避免：需要手動檢查
it('should return sorted array', () => {
  const result = sort([3, 1, 2]);
  console.log(result); // 需要手動查看 console
});
```

#### Timely（及時）
```typescript
// ✅ 好：開發功能時就寫測試（TDD）
// 1. 先寫測試
describe('DiscountCalculator', () => {
  it('should apply 20% discount for VIP users', () => {
    const calculator = new DiscountCalculator();
    const price = calculator.calculate(100, { vip: true });
    expect(price).toBe(80);
  });
});

// 2. 實現功能讓測試通過
class DiscountCalculator {
  calculate(basePrice: number, user: { vip: boolean }): number {
    return user.vip ? basePrice * 0.8 : basePrice;
  }
}

// ❌ 避免：功能完成後才補測試（容易遺漏邊界條件）
```

---

## 2. 命名規範

### 2.1 測試文件命名

```
✅ 正確命名：
src/services/payment.service.ts
src/services/payment.service.spec.ts          # 單元測試
src/services/payment.integration.spec.ts      # 整合測試

src/components/Button.tsx
src/components/Button.spec.tsx                # UI 組件測試

test/e2e/specs/payment-flow.spec.ts           # E2E 測試

❌ 錯誤命名：
payment.test.ts                                # 應該用 .spec.ts
payment-spec.ts                                # 缺少副檔名
payment.spec.integration.ts                    # 順序錯誤
```

### 2.2 測試套件命名

```typescript
// ✅ 好：清晰的層級結構
describe('PaymentService', () => {
  describe('processPayment', () => {
    describe('when payment succeeds', () => {
      it('should create transaction record', () => { ... });
      it('should update wallet balance', () => { ... });
      it('should emit payment.success event', () => { ... });
    });
    
    describe('when payment fails', () => {
      it('should throw PaymentFailedError', () => { ... });
      it('should not create transaction record', () => { ... });
      it('should emit payment.failed event', () => { ... });
    });
    
    describe('when amount is invalid', () => {
      it('should throw InvalidAmountError', () => { ... });
    });
  });
});

// ❌ 避免：扁平結構，難以閱讀
describe('PaymentService', () => {
  it('test1', () => { ... });
  it('test2', () => { ... });
  it('should work', () => { ... });
});
```

### 2.3 測試用例命名

#### 推薦模式

**模式 1：Should + 動作 + 條件**
```typescript
it('should return 200 when user is authenticated', () => { ... });
it('should throw error when email is invalid', () => { ... });
it('should update balance when payment succeeds', () => { ... });
```

**模式 2：Given-When-Then**
```typescript
it('given expired subscription, when user tries to access, then should redirect to payment', () => { ... });

// 或者拆分為 describe 層級
describe('given expired subscription', () => {
  describe('when user tries to access premium content', () => {
    it('then should redirect to payment page', () => { ... });
  });
});
```

**模式 3：動作 + 預期結果**
```typescript
it('creates user with hashed password', () => { ... });
it('sends welcome email after registration', () => { ... });
it('returns 404 for non-existent user', () => { ... });
```

#### 具體範例

```typescript
// ✅ 優秀命名
describe('SubscriptionService.cancel', () => {
  it('should set status to cancelled and save to database', () => { ... });
  it('should refund remaining balance to wallet', () => { ... });
  it('should send cancellation email to user', () => { ... });
  it('should emit subscription.cancelled event', () => { ... });
  it('should throw NotFoundError when subscription does not exist', () => { ... });
  it('should throw AlreadyCancelledError when subscription is already cancelled', () => { ... });
});

// ❌ 不好的命名
describe('SubscriptionService.cancel', () => {
  it('test cancel', () => { ... });
  it('should work', () => { ... });
  it('cancel subscription', () => { ... }); // 缺少具體行為
  it('test1', () => { ... }); // 完全不知道測什麼
});
```

---

## 3. 測試結構標準

### 3.1 AAA 模式（Arrange-Act-Assert）

```typescript
it('should calculate discount for VIP users', () => {
  // Arrange: 準備測試數據和依賴
  const user = { id: 1, type: 'vip' };
  const basePrice = 100;
  const calculator = new PriceCalculator();
  
  // Act: 執行被測試的操作
  const finalPrice = calculator.calculate(user, basePrice);
  
  // Assert: 驗證結果
  expect(finalPrice).toBe(80);
});
```

#### 複雜場景的 AAA

```typescript
it('should process refund and update all related records', async () => {
  // Arrange
  const userId = 1;
  const transactionId = 'txn_123';
  const originalAmount = 1000;
  
  // 準備 mocks
  mockStripeService.refund.mockResolvedValue({ 
    id: 'refund_123', 
    status: 'succeeded' 
  });
  
  mockWalletRepo.findOne.mockResolvedValue({ 
    userId, 
    balance: 500 
  });
  
  // 準備測試服務
  const refundService = new RefundService(
    mockStripeService,
    mockWalletRepo,
    mockTransactionRepo,
    mockEventEmitter
  );
  
  // Act
  const result = await refundService.processRefund(transactionId, originalAmount);
  
  // Assert
  expect(result.status).toBe('refunded');
  expect(mockStripeService.refund).toHaveBeenCalledWith(transactionId, originalAmount);
  expect(mockWalletRepo.update).toHaveBeenCalledWith(
    userId,
    expect.objectContaining({ balance: 1500 }) // 500 + 1000
  );
  expect(mockEventEmitter.emit).toHaveBeenCalledWith(
    'refund.completed',
    expect.objectContaining({ transactionId, amount: originalAmount })
  );
});
```

### 3.2 Setup 與 Teardown

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  
  // ✅ 使用 beforeEach 確保測試獨立
  beforeEach(() => {
    mockUserRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    mockEmailService = {
      send: jest.fn(),
    } as any;
    
    service = new UserService(mockUserRepo, mockEmailService);
  });
  
  // ✅ 使用 afterEach 清理
  afterEach(() => {
    jest.clearAllMocks(); // 清除 mock 調用記錄
  });
  
  // ✅ 使用 beforeAll/afterAll 處理昂貴的設置
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  it('should create user', async () => {
    mockUserRepo.save.mockResolvedValue({ id: 1, email: 'test@example.com' });
    
    const user = await service.createUser({ email: 'test@example.com' });
    
    expect(user.id).toBe(1);
    expect(mockEmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );
  });
});
```

### 3.3 測試組織模式

#### 模式 1：按功能分組

```typescript
describe('PaymentService', () => {
  describe('charge', () => {
    it('should charge card successfully', () => { ... });
    it('should handle declined card', () => { ... });
  });
  
  describe('refund', () => {
    it('should process full refund', () => { ... });
    it('should process partial refund', () => { ... });
  });
  
  describe('getTransactionHistory', () => {
    it('should return paginated results', () => { ... });
    it('should filter by date range', () => { ... });
  });
});
```

#### 模式 2：按場景分組

```typescript
describe('User Registration Flow', () => {
  describe('successful registration', () => {
    it('should create user account', () => { ... });
    it('should send verification email', () => { ... });
    it('should return user with token', () => { ... });
  });
  
  describe('registration with existing email', () => {
    it('should return 409 conflict', () => { ... });
    it('should not create duplicate account', () => { ... });
  });
  
  describe('registration with invalid data', () => {
    it('should reject weak password', () => { ... });
    it('should reject invalid email format', () => { ... });
  });
});
```

---

## 4. 覆蓋率標準

### 4.1 覆蓋率目標

```typescript
// jest.config.ts
coverageThreshold: {
  global: {
    branches: 80,      // 分支覆蓋率
    functions: 80,     // 函數覆蓋率
    lines: 80,         // 行覆蓋率
    statements: 80,    // 語句覆蓋率
  },
  
  // 關鍵模組要求更高
  './apps/payment-service/**/*.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
  
  './apps/auth-service/**/*.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### 4.2 覆蓋率解讀

#### 行覆蓋率（Line Coverage）

```typescript
function calculatePrice(quantity: number, unitPrice: number): number {
  const subtotal = quantity * unitPrice;  // Line 1
  const tax = subtotal * 0.1;             // Line 2
  return subtotal + tax;                   // Line 3
}

// ✅ 測試覆蓋了所有行（100%）
it('should calculate price with tax', () => {
  expect(calculatePrice(2, 100)).toBe(220);
});
```

#### 分支覆蓋率（Branch Coverage）

```typescript
function getDiscount(user: User): number {
  if (user.isPremium) {        // Branch 1: true/false
    return 0.2;
  } else if (user.isVIP) {     // Branch 2: true/false
    return 0.1;
  }
  return 0;
}

// ✅ 覆蓋所有分支（100%）
describe('getDiscount', () => {
  it('should return 20% for premium users', () => {
    expect(getDiscount({ isPremium: true })).toBe(0.2);  // Branch 1: true
  });
  
  it('should return 10% for VIP users', () => {
    expect(getDiscount({ isVIP: true })).toBe(0.1);      // Branch 2: true
  });
  
  it('should return 0% for regular users', () => {
    expect(getDiscount({})).toBe(0);                      // Both false
  });
});

// ❌ 只覆蓋部分分支（66%）
it('should give discount', () => {
  expect(getDiscount({ isPremium: true })).toBe(0.2);
  // 缺少 isVIP=true 和 兩者都 false 的測試
});
```

#### 函數覆蓋率（Function Coverage）

```typescript
class Calculator {
  add(a: number, b: number): number {    // Function 1
    return a + b;
  }
  
  subtract(a: number, b: number): number { // Function 2
    return a - b;
  }
  
  multiply(a: number, b: number): number { // Function 3
    return a * b;
  }
}

// ✅ 覆蓋所有函數（100%）
describe('Calculator', () => {
  it('should add numbers', () => {
    expect(new Calculator().add(1, 2)).toBe(3);
  });
  
  it('should subtract numbers', () => {
    expect(new Calculator().subtract(5, 3)).toBe(2);
  });
  
  it('should multiply numbers', () => {
    expect(new Calculator().multiply(2, 3)).toBe(6);
  });
});

// ❌ 只覆蓋部分函數（33%）
describe('Calculator', () => {
  it('should add numbers', () => {
    expect(new Calculator().add(1, 2)).toBe(3);
  });
  // 缺少 subtract 和 multiply 的測試
});
```

### 4.3 不追求 100% 覆蓋率

```typescript
// ✅ 合理：關注重要邏輯
class PaymentService {
  async processPayment(amount: number): Promise<Payment> {
    // 重要邏輯 - 必須測試
    if (amount <= 0) {
      throw new InvalidAmountError();
    }
    
    // 業務邏輯 - 必須測試
    const result = await this.stripe.charge(amount);
    
    // Logging - 可以不測試
    this.logger.info(`Payment processed: ${result.id}`);
    
    return result;
  }
}

// ❌ 不合理：為了 100% 而測試無意義的代碼
it('should log payment info', () => {
  const logSpy = jest.spyOn(logger, 'info');
  service.processPayment(100);
  expect(logSpy).toHaveBeenCalled(); // 測試 logging 沒有太大價值
});
```

---

## 5. Mock 與 Stub 策略

### 5.1 何時 Mock

```typescript
// ✅ 應該 Mock：外部服務
class PaymentService {
  constructor(
    private stripe: StripeService,     // Mock：第三方 API
    private emailService: EmailService, // Mock：外部服務
    private kafkaProducer: KafkaProducer, // Mock：訊息佇列
  ) {}
  
  async charge(amount: number) {
    const result = await this.stripe.charge(amount);
    await this.emailService.send({ ... });
    await this.kafkaProducer.publish('payment.completed', { ... });
    return result;
  }
}

// 測試
it('should charge via Stripe and send email', async () => {
  const mockStripe = { charge: jest.fn().mockResolvedValue({ id: 'ch_123' }) };
  const mockEmail = { send: jest.fn() };
  const mockKafka = { publish: jest.fn() };
  
  const service = new PaymentService(mockStripe, mockEmail, mockKafka);
  await service.charge(100);
  
  expect(mockStripe.charge).toHaveBeenCalledWith(100);
  expect(mockEmail.send).toHaveBeenCalled();
});
```

```typescript
// ❌ 不應該 Mock：內部邏輯
class PriceCalculator {
  calculate(items: Item[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
  }
}

// ❌ 不好：Mock 內部邏輯
it('should calculate total', () => {
  const mockCalculator = { 
    calculate: jest.fn().mockReturnValue(300) 
  };
  expect(mockCalculator.calculate(items)).toBe(300);
  // 這個測試沒有意義，只是測試 mock 本身
});

// ✅ 好：測試真實邏輯
it('should calculate total', () => {
  const calculator = new PriceCalculator();
  const items = [
    { price: 100 },
    { price: 200 },
  ];
  expect(calculator.calculate(items)).toBe(300);
});
```

### 5.2 Mock 層級策略

```
Layer 1: 絕對要 Mock
├─ 第三方 API（Stripe, SendGrid, AWS S3）
├─ 檔案系統操作
├─ 網路請求
└─ 時間相關（Date.now(), setTimeout）

Layer 2: 建議 Mock
├─ 資料庫（單元測試中）
├─ 快取（Redis）
├─ 訊息佇列（Kafka, RabbitMQ）
└─ 外部微服務

Layer 3: 不要 Mock
├─ 業務邏輯
├─ 計算函數
├─ 驗證器
└─ 轉換器
```

### 5.3 Mock 實現範例

#### 方式 1：jest.fn()

```typescript
const mockUserRepo = {
  save: jest.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
  findOne: jest.fn().mockResolvedValue(null),
};
```

#### 方式 2：jest.spyOn()

```typescript
// 監視真實對象的方法
const emailService = new EmailService();
const sendSpy = jest.spyOn(emailService, 'send').mockResolvedValue(true);

await service.processOrder(order);

expect(sendSpy).toHaveBeenCalledWith(
  expect.objectContaining({ to: order.userEmail })
);

sendSpy.mockRestore(); // 恢復原始實現
```

#### 方式 3：jest.mock()

```typescript
// 模擬整個模組
jest.mock('@suggar-daddy/redis', () => ({
  RedisService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));
```

#### 方式 4：使用 Testing Library

```typescript
// 使用測試專用的實現
class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];
  
  async save(user: User): Promise<User> {
    const newUser = { ...user, id: this.users.length + 1 };
    this.users.push(newUser);
    return newUser;
  }
  
  async findOne(id: number): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }
}
```

---

## 6. 斷言標準

### 6.1 斷言最佳實踐

```typescript
// ✅ 好：精確斷言
expect(user.email).toBe('test@example.com');
expect(user.age).toBe(25);
expect(user.isActive).toBe(true);

// ❌ 避免：過於寬鬆
expect(user.email).toBeTruthy(); // 任何 truthy 值都通過
expect(user).toBeDefined();       // 只確認不是 undefined
```

```typescript
// ✅ 好：具體的錯誤檢查
await expect(service.createUser({ email: 'invalid' }))
  .rejects
  .toThrow(InvalidEmailError);

// ❌ 避免：只檢查拋出錯誤
await expect(service.createUser({ email: 'invalid' }))
  .rejects
  .toThrow(); // 任何錯誤都通過
```

### 6.2 常用 Matchers

#### 基本比較
```typescript
expect(value).toBe(expected);           // === 比較
expect(value).toEqual(expected);        // 深度比較對象
expect(value).not.toBe(unexpected);     // 否定
```

#### 數字
```typescript
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3.5);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3, 2);     // 浮點數比較（精度 2）
```

#### 字串
```typescript
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');
expect(str).toHaveLength(10);
```

#### 陣列
```typescript
expect(array).toContain(item);
expect(array).toContainEqual({ id: 1 });
expect(array).toHaveLength(3);
expect(array).toEqual(expect.arrayContaining([1, 2])); // 包含元素
```

#### 對象
```typescript
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('nested.key', 'value');
expect(obj).toMatchObject({ key: 'value' });  // 部分匹配
expect(obj).toEqual(expect.objectContaining({ key: 'value' }));
```

#### 異步
```typescript
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);
```

#### 自定義 Matchers
```typescript
expect.extend({
  toBeValidEmail(received: string) {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received);
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
    };
  },
  
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});

// 使用
expect('test@example.com').toBeValidEmail();
expect(15).toBeWithinRange(10, 20);
```

---

## 7. 測試數據管理

### 7.1 測試數據原則

```typescript
// ✅ 好：使用有意義的測試數據
const testUser = {
  email: 'subscriber@test.com',    // 清楚表明是測試用戶
  password: 'Test1234!',            // 符合密碼規則
  type: 'subscriber',
  createdAt: new Date('2024-01-01'),
};

// ❌ 避免：使用無意義的數據
const testUser = {
  email: 'a@b.c',                   // 不夠真實
  password: '123',                   // 可能不符合規則
  type: 'x',
  createdAt: new Date(),             // 不穩定
};
```

### 7.2 Fixture 管理

```typescript
// test/fixtures/users.fixture.ts
export const fixtures = {
  users: {
    subscriber: {
      id: 1,
      email: 'subscriber@test.com',
      password: '$2b$10$...',  // 預先 hash
      type: 'subscriber',
    },
    creator: {
      id: 2,
      email: 'creator@test.com',
      password: '$2b$10$...',
      type: 'creator',
      creatorProfile: {
        displayName: 'Jane Doe',
        bio: 'Test creator profile',
      },
    },
  },
  
  subscriptions: {
    active: {
      id: 1,
      userId: 1,
      creatorId: 2,
      plan: 'premium',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-01'),
    },
  },
};

// 使用
import { fixtures } from '../fixtures/users.fixture';

it('should allow active subscriber to access content', () => {
  const user = fixtures.users.subscriber;
  const subscription = fixtures.subscriptions.active;
  // ...
});
```

### 7.3 Factory Pattern

```typescript
// test/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export class UserFactory {
  private defaults: Partial<User> = {
    type: 'subscriber',
    isActive: true,
    createdAt: new Date(),
  };
  
  create(overrides?: Partial<User>): User {
    return {
      id: faker.number.int({ min: 1, max: 1000000 }),
      email: faker.internet.email(),
      username: faker.internet.userName(),
      ...this.defaults,
      ...overrides,
    };
  }
  
  createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  asCreator(): UserFactory {
    this.defaults.type = 'creator';
    return this;
  }
  
  asAdmin(): UserFactory {
    this.defaults.type = 'admin';
    return this;
  }
  
  inactive(): UserFactory {
    this.defaults.isActive = false;
    return this;
  }
}

// 使用
const userFactory = new UserFactory();

const subscriber = userFactory.create();
const creator = userFactory.asCreator().create({ displayName: 'Jane' });
const inactiveUser = userFactory.inactive().create();
const users = userFactory.createMany(10);
```

### 7.4 Builder Pattern

```typescript
// test/builders/subscription.builder.ts
export class SubscriptionBuilder {
  private data: Partial<Subscription> = {
    plan: 'basic',
    status: 'active',
    startDate: new Date(),
  };
  
  withPlan(plan: SubscriptionPlan): this {
    this.data.plan = plan;
    return this;
  }
  
  withStatus(status: SubscriptionStatus): this {
    this.data.status = status;
    return this;
  }
  
  expired(): this {
    this.data.status = 'expired';
    this.data.endDate = new Date(Date.now() - 86400000);
    return this;
  }
  
  cancelled(): this {
    this.data.status = 'cancelled';
    this.data.cancelledAt = new Date();
    return this;
  }
  
  build(): Subscription {
    return {
      id: faker.number.int(),
      userId: faker.number.int(),
      creatorId: faker.number.int(),
      ...this.data,
      startDate: this.data.startDate || new Date(),
      endDate: this.data.endDate || new Date(Date.now() + 30 * 86400000),
    } as Subscription;
  }
}

// 使用
const expiredPremiumSub = new SubscriptionBuilder()
  .withPlan('premium')
  .expired()
  .build();

const cancelledBasicSub = new SubscriptionBuilder()
  .withPlan('basic')
  .cancelled()
  .build();
```

---

## 8. 性能標準

### 8.1 執行時間目標

```typescript
// jest.config.ts
testTimeout: 10000,  // 全局超時：10 秒

// 個別測試設置超時
it('long running test', async () => {
  // 測試邏輯
}, 30000); // 30 秒超時
```

### 8.2 性能優化策略

#### 策略 1：並行執行

```bash
# Jest 預設並行執行
npm test -- --maxWorkers=4

# 整合測試序列執行（避免資料競爭）
npm run test:integration -- --runInBand
```

#### 策略 2：共享設置

```typescript
// ❌ 慢：每次測試都建立模組
describe('UserService', () => {
  let service: UserService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, ...],
    }).compile();
    service = module.get(UserService);
  });
  
  it('test 1', () => { ... }); // 建立模組：500ms
  it('test 2', () => { ... }); // 建立模組：500ms
});

// ✅ 快：共享模組實例
describe('UserService', () => {
  let service: UserService;
  
  beforeAll(async () => {  // 只建立一次
    const module = await Test.createTestingModule({
      providers: [UserService, ...],
    }).compile();
    service = module.get(UserService);
  });
  
  beforeEach(() => {
    // 只重置 mock
    jest.clearAllMocks();
  });
  
  it('test 1', () => { ... }); // 建立模組：0ms
  it('test 2', () => { ... }); // 建立模組：0ms
});
```

#### 策略 3：跳過慢測試

```typescript
// 標記慢測試
describe('Slow Integration Tests', () => {
  it.skip('expensive test', async () => {
    // 在 CI 中跳過
  });
  
  // 或使用環境變數
  (process.env.SKIP_SLOW_TESTS ? it.skip : it)('slow test', () => {
    // ...
  });
});
```

---

## 9. 代碼審查標準

### 9.1 PR 測試要求

```markdown
## Pull Request Checklist

### 必須項（⛔ Blocking）
- [ ] 所有新代碼都有測試
- [ ] 所有測試都通過（npm test）
- [ ] 測試覆蓋率不低於原有水平
- [ ] 沒有被跳過的測試（it.skip, describe.skip）
- [ ] 沒有 console.log 或 debug 代碼

### 品質項（⚠️ Should Fix）
- [ ] 測試命名清晰描述行為
- [ ] 使用 AAA 模式（Arrange-Act-Assert）
- [ ] Mock 適度（不過度 mock）
- [ ] 測試獨立（可以單獨執行）
- [ ] 邊界條件有測試

### 建議項（💡 Nice to Have）
- [ ] 使用 test.each 處理多組測試數據
- [ ] 使用 describe 組織測試結構
- [ ] 添加測試文檔註釋
```

### 9.2 審查檢查點

#### 檢查點 1：測試完整性
```typescript
// ✅ 好：覆蓋正常和異常情況
describe('divide', () => {
  it('should divide two numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  it('should handle decimal results', () => {
    expect(divide(5, 2)).toBe(2.5);
  });
  
  it('should throw error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});

// ❌ 不好：只測試 happy path
describe('divide', () => {
  it('should divide two numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  // 缺少錯誤處理測試
});
```

#### 檢查點 2：測試品質
```typescript
// ✅ 好：測試真實行為
it('should send email after user registration', async () => {
  const mockEmailService = { send: jest.fn() };
  const service = new UserService(mockUserRepo, mockEmailService);
  
  await service.register({ email: 'test@example.com' });
  
  expect(mockEmailService.send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'test@example.com',
      template: 'welcome',
    })
  );
});

// ❌ 不好：測試實現細節
it('should call emailService.send', async () => {
  const mockEmailService = { send: jest.fn() };
  const service = new UserService(mockUserRepo, mockEmailService);
  
  await service.register({ email: 'test@example.com' });
  
  expect(mockEmailService.send).toHaveBeenCalled(); // 太寬鬆
});
```

---

## 10. 反模式與陷阱

### 10.1 常見反模式

#### 反模式 1：測試實現而非行為

```typescript
// ❌ 不好：測試實現細節
it('should call calculateDiscount method', () => {
  const spy = jest.spyOn(service, 'calculateDiscount');
  service.processOrder(order);
  expect(spy).toHaveBeenCalled(); // 測試實現
});

// ✅ 好：測試行為和結果
it('should apply 10% discount to order', () => {
  const order = { items: [{ price: 100 }] };
  const result = service.processOrder(order);
  expect(result.total).toBe(90); // 測試結果
});
```

#### 反模式 2：測試過於脆弱

```typescript
// ❌ 不好：對實現細節過度依賴
it('should update user', async () => {
  await service.updateUser(1, { name: 'New Name' });
  
  // 檢查內部調用順序和參數
  expect(mockRepo.findOne).toHaveBeenCalledBefore(mockRepo.update);
  expect(mockCache.invalidate).toHaveBeenCalledAfter(mockRepo.update);
  expect(mockRepo.update).toHaveBeenCalledWith(
    1,
    expect.objectContaining({ name: 'New Name' })
  );
  // 這個測試很容易因為重構而失敗
});

// ✅ 好：只驗證重要結果
it('should update user and return updated data', async () => {
  const result = await service.updateUser(1, { name: 'New Name' });
  
  expect(result.name).toBe('New Name');
  // 可選：驗證副作用
  expect(mockCache.invalidate).toHaveBeenCalledWith('user:1');
});
```

#### 反模式 3：過度 Mock

```typescript
// ❌ 不好：Mock 所有東西
it('should calculate total price', () => {
  const mockCalculator = {
    add: jest.fn((a, b) => a + b),
    multiply: jest.fn((a, b) => a * b),
  };
  
  const service = new OrderService(mockCalculator);
  const result = service.calculateTotal([{ price: 100, quantity: 2 }]);
  
  expect(result).toBe(200);
  // 這個測試毫無價值，只是測試 mock
});

// ✅ 好：使用真實邏輯
it('should calculate total price', () => {
  const calculator = new Calculator(); // 真實實例
  const service = new OrderService(calculator);
  
  const result = service.calculateTotal([
    { price: 100, quantity: 2 },
    { price: 50, quantity: 3 },
  ]);
  
  expect(result).toBe(350); // 測試真實計算
});
```

#### 反模式 4：測試間相互依賴

```typescript
// ❌ 不好：測試順序依賴
describe('User CRUD', () => {
  let userId;
  
  it('should create user', async () => {
    const user = await service.create({ name: 'Alice' });
    userId = user.id; // 後續測試依賴這個
  });
  
  it('should update user', async () => {
    await service.update(userId, { name: 'Bob' }); // 依賴前一個測試
  });
  
  it('should delete user', async () => {
    await service.delete(userId); // 依賴前面的測試
  });
});

// ✅ 好：每個測試獨立
describe('User CRUD', () => {
  let testUser;
  
  beforeEach(async () => {
    testUser = await service.create({ name: 'Alice' });
  });
  
  afterEach(async () => {
    await service.delete(testUser.id);
  });
  
  it('should create user', () => {
    expect(testUser.id).toBeDefined();
  });
  
  it('should update user', async () => {
    const updated = await service.update(testUser.id, { name: 'Bob' });
    expect(updated.name).toBe('Bob');
  });
  
  it('should delete user', async () => {
    await service.delete(testUser.id);
    await expect(service.findById(testUser.id)).resolves.toBeNull();
  });
});
```

### 10.2 測試維護陷阱

#### 陷阱 1：硬編碼的時間

```typescript
// ❌ 不好：依賴當前時間
it('should expire after 24 hours', () => {
  const token = generateToken();
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  expect(token.expiresAt).toEqual(expiryTime); // 可能因為毫秒差異失敗
});

// ✅ 好：使用固定時間
it('should expire after 24 hours', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  
  const token = generateToken();
  
  expect(token.expiresAt).toEqual(new Date('2024-01-02T00:00:00Z'));
  
  jest.useRealTimers();
});
```

#### 陷阱 2：隨機數據

```typescript
// ❌ 不好：使用隨機數據
it('should validate email', () => {
  const email = faker.internet.email(); // 每次不同
  expect(validateEmail(email)).toBe(true);
  // 如果隨機生成了無效 email 就會失敗
});

// ✅ 好：使用固定測試數據
it('should validate email', () => {
  const validEmails = [
    'test@example.com',
    'user+tag@domain.co.uk',
    'name.lastname@company.org',
  ];
  
  validEmails.forEach(email => {
    expect(validateEmail(email)).toBe(true);
  });
});
```

---

## 附錄 A：快速檢查清單

### 撰寫測試時

- [ ] 測試命名清晰描述行為
- [ ] 使用 AAA 模式組織測試
- [ ] 每個測試只驗證一件事
- [ ] 測試獨立，可以單獨執行
- [ ] 覆蓋正常和異常情況
- [ ] 包含邊界值測試
- [ ] Mock 適度，不過度 mock
- [ ] 斷言具體，不過於寬鬆
- [ ] 沒有硬編碼的時間或隨機數據
- [ ] 沒有 console.log 或 debug 代碼

### 審查測試時

- [ ] 測試通過且穩定
- [ ] 測試覆蓋率沒有下降
- [ ] 沒有被跳過的測試
- [ ] 測試名稱有意義
- [ ] 測試結構清晰
- [ ] 沒有測試實現細節
- [ ] Mock 使用合理
- [ ] 測試數據有意義
- [ ] 性能可接受
- [ ] 文檔完整

---

## 附錄 B：測試重構指南

### 何時重構測試

1. **測試經常失敗但代碼正確**
   - 可能是測試太脆弱，依賴實現細節

2. **測試難以理解**
   - 需要重組結構，添加註釋

3. **測試執行太慢**
   - 需要優化 mock，減少不必要的設置

4. **代碼重構導致大量測試失敗**
   - 測試耦合度太高，需要提高抽象層次

### 重構步驟

```typescript
// 1. 原始測試（難維護）
it('should process order', async () => {
  const db = await createTestDB();
  const user = await db.users.insert({ email: 'test@example.com' });
  const product = await db.products.insert({ price: 100 });
  const order = await db.orders.insert({ userId: user.id, productId: product.id });
  
  const result = await service.processOrder(order.id);
  
  expect(result.status).toBe('completed');
  await db.close();
});

// 2. 重構：提取測試數據準備
beforeEach(async () => {
  testData = await setupTestData();
});

it('should process order', async () => {
  const result = await service.processOrder(testData.order.id);
  expect(result.status).toBe('completed');
});

// 3. 重構：使用 Factory
it('should process order', async () => {
  const order = await OrderFactory.create();
  const result = await service.processOrder(order.id);
  expect(result.status).toBe('completed');
});
```

---

**制定者**: Tech Lead  
**版本**: 1.0  
**最後更新**: 2025-02-17  
**審核週期**: 每季度
