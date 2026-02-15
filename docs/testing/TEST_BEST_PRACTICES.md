# 測試最佳實踐與範例

本文件提供 Sugar Daddy 專案的測試最佳實踐和實用範例，幫助團隊撰寫高品質的測試代碼。

---

## 📚 目錄

1. [測試原則](#測試原則)
2. [單元測試範例](#單元測試範例)
3. [E2E 測試範例](#e2e-測試範例)
4. [前端測試範例](#前端測試範例)
5. [Mock 策略](#mock-策略)
6. [測試資料工廠](#測試資料工廠)
7. [常見問題與解決方案](#常見問題與解決方案)

---

## 測試原則

### 1. AAA 模式（Arrange-Act-Assert）

```typescript
describe('UserService', () => {
  it('should create user successfully', async () => {
    // ✅ Arrange - 準備測試資料和環境
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      role: 'sugar_baby' as const,
      displayName: 'Test User',
    };
    mockRedis.get.mockResolvedValue(null); // 郵箱不存在
    
    // ✅ Act - 執行被測試的操作
    const result = await service.register(userData);
    
    // ✅ Assert - 驗證結果
    expect(result).toHaveProperty('userId');
    expect(result.email).toBe('test@example.com');
    expect(mockKafka.sendEvent).toHaveBeenCalledWith(
      'user.created',
      expect.objectContaining({ email: 'test@example.com' })
    );
  });
});
```

### 2. 測試命名規範

```typescript
// ✅ 好的命名 - 清楚描述測試的內容和預期結果
describe('POST /api/tips', () => {
  it('should create tip and update wallet balance when payment succeeds', async () => {});
  it('should reject tip with negative amount', async () => {});
  it('should prevent duplicate tips with same idempotency key', async () => {});
});

// ❌ 壞的命名 - 不清楚測試什麼
describe('Tips', () => {
  it('works', async () => {});
  it('test 1', async () => {});
  it('edge case', async () => {});
});
```

### 3. 一個測試只測一件事

```typescript
// ✅ 好的測試 - 專注於單一行為
it('should reject login with incorrect password', async () => {
  const result = await authService.login('user@example.com', 'WrongPassword');
  
  expect(result.success).toBe(false);
  expect(result.error).toBe('Invalid credentials');
});

it('should reject login with non-existent email', async () => {
  const result = await authService.login('nonexistent@example.com', 'Password123');
  
  expect(result.success).toBe(false);
  expect(result.error).toBe('User not found');
});

// ❌ 壞的測試 - 測試太多東西
it('should handle various login errors', async () => {
  // 測試錯誤密碼
  const result1 = await authService.login('user@example.com', 'WrongPassword');
  expect(result1.success).toBe(false);
  
  // 測試不存在的用戶
  const result2 = await authService.login('nonexistent@example.com', 'Password123');
  expect(result2.success).toBe(false);
  
  // 測試停用帳號
  const result3 = await authService.login('suspended@example.com', 'Password123');
  expect(result3.success).toBe(false);
});
```

### 4. 測試應該獨立且可重複

```typescript
// ✅ 好的測試 - 每個測試獨立，不依賴其他測試
describe('PostService', () => {
  beforeEach(() => {
    // 每個測試前重置 mock
    jest.clearAllMocks();
  });
  
  it('should create post', async () => {
    const post = await service.createPost({ /* ... */ });
    expect(post).toBeDefined();
  });
  
  it('should delete post', async () => {
    // 不依賴前一個測試創建的 post
    const postId = 'test-post-id';
    await service.deletePost(postId);
    expect(mockRedis.del).toHaveBeenCalledWith(`post:${postId}`);
  });
});

// ❌ 壞的測試 - 測試之間有依賴
describe('PostService', () => {
  let createdPostId: string; // ❌ 共享狀態
  
  it('should create post', async () => {
    const post = await service.createPost({ /* ... */ });
    createdPostId = post.id; // ❌ 保存狀態供下個測試使用
  });
  
  it('should delete post', async () => {
    // ❌ 依賴前一個測試
    await service.deletePost(createdPostId);
  });
});
```

---

## 單元測試範例

### Service 層測試

```typescript
// apps/payment-service/src/app/tip.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TipService } from './tip.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { StripeService } from '@suggar-daddy/common';

describe('TipService', () => {
  let service: TipService;
  let redisService: jest.Mocked<RedisService>;
  let kafkaService: jest.Mocked<KafkaProducerService>;
  let stripeService: jest.Mocked<StripeService>;

  beforeEach(async () => {
    // 創建 mock 服務
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    const mockKafka = {
      sendEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockStripe = {
      createPaymentIntent: jest.fn(),
      getStripeInstance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipService,
        { provide: RedisService, useValue: mockRedis },
        { provide: KafkaProducerService, useValue: mockKafka },
        { provide: StripeService, useValue: mockStripe },
      ],
    }).compile();

    service = module.get<TipService>(TipService);
    redisService = module.get(RedisService);
    kafkaService = module.get(KafkaProducerService);
    stripeService = module.get(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTip', () => {
    const tipData = {
      fromUserId: 'user-123',
      toUserId: 'creator-456',
      amount: 10,
      currency: 'USD',
      message: 'Great content!',
    };

    it('should create tip successfully', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null); // 沒有重複
      stripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'secret_test',
        status: 'requires_payment_method',
      });

      // Act
      const result = await service.createTip(tipData);

      // Assert
      expect(result).toMatchObject({
        id: expect.any(String),
        fromUserId: 'user-123',
        toUserId: 'creator-456',
        amount: 10,
        paymentIntentId: 'pi_test123',
      });

      // 驗證 Redis 冪等 key
      expect(redisService.setex).toHaveBeenCalledWith(
        expect.stringContaining('tip:idempotency'),
        expect.any(Number),
        expect.any(String)
      );

      // 驗證 Kafka 事件
      expect(kafkaService.sendEvent).toHaveBeenCalledWith(
        'tip.created',
        expect.objectContaining({
          fromUserId: 'user-123',
          toUserId: 'creator-456',
          amount: 10,
        })
      );
    });

    it('should reject duplicate tip with same idempotency key', async () => {
      // Arrange
      const existingTip = { id: 'tip-789', status: 'completed' };
      redisService.get.mockResolvedValue(JSON.stringify(existingTip));

      // Act & Assert
      await expect(
        service.createTip({ ...tipData, idempotencyKey: 'same-key' })
      ).rejects.toThrow('Duplicate tip detected');

      // 不應該調用 Stripe
      expect(stripeService.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('should reject tip with negative amount', async () => {
      // Act & Assert
      await expect(
        service.createTip({ ...tipData, amount: -10 })
      ).rejects.toThrow('Amount must be positive');
    });

    it('should reject tip to self', async () => {
      // Act & Assert
      await expect(
        service.createTip({ ...tipData, toUserId: 'user-123' })
      ).rejects.toThrow('Cannot tip yourself');
    });
  });

  describe('getTipById', () => {
    it('should return tip from Redis', async () => {
      // Arrange
      const tipData = {
        id: 'tip-123',
        fromUserId: 'user-123',
        toUserId: 'creator-456',
        amount: 10,
      };
      redisService.get.mockResolvedValue(JSON.stringify(tipData));

      // Act
      const result = await service.getTipById('tip-123');

      // Assert
      expect(result).toEqual(tipData);
      expect(redisService.get).toHaveBeenCalledWith('tip:tip-123');
    });

    it('should return null for non-existent tip', async () => {
      // Arrange
      redisService.get.mockResolvedValue(null);

      // Act
      const result = await service.getTipById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

### Controller 層測試

```typescript
// apps/payment-service/src/app/tip.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TipController } from './tip.controller';
import { TipService } from './tip.service';

describe('TipController', () => {
  let controller: TipController;
  let service: jest.Mocked<TipService>;

  beforeEach(async () => {
    const mockService = {
      createTip: jest.fn(),
      getTipById: jest.fn(),
      getTipsByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TipController],
      providers: [
        { provide: TipService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<TipController>(TipController);
    service = module.get(TipService);
  });

  describe('POST /tips', () => {
    it('should create tip and return 201', async () => {
      // Arrange
      const createTipDto = {
        toUserId: 'creator-456',
        amount: 10,
        currency: 'USD',
        message: 'Great!',
      };
      const currentUser = { userId: 'user-123', email: 'user@example.com' };
      const createdTip = {
        id: 'tip-123',
        fromUserId: 'user-123',
        ...createTipDto,
        createdAt: new Date(),
      };

      service.createTip.mockResolvedValue(createdTip);

      // Act
      const result = await controller.createTip(createTipDto, currentUser);

      // Assert
      expect(result).toEqual({
        success: true,
        data: createdTip,
      });
      expect(service.createTip).toHaveBeenCalledWith({
        fromUserId: 'user-123',
        ...createTipDto,
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const createTipDto = {
        toUserId: 'creator-456',
        amount: 10,
        currency: 'USD',
      };
      const currentUser = { userId: 'user-123' };
      
      service.createTip.mockRejectedValue(new Error('Stripe error'));

      // Act & Assert
      await expect(
        controller.createTip(createTipDto, currentUser)
      ).rejects.toThrow('Stripe error');
    });
  });
});
```

---

## E2E 測試範例

### API E2E 測試

```typescript
// apps/payment-service/src/app/payment.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { StripeService } from '@suggar-daddy/common';

describe('Payment Service (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  // Mock 外部服務
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  const mockKafka = {
    sendEvent: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  };

  const mockStripe = {
    createPaymentIntent: jest.fn(),
    constructWebhookEvent: jest.fn(),
    getStripeInstance: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .overrideProvider(KafkaProducerService)
      .useValue(mockKafka)
      .overrideProvider(StripeService)
      .useValue(mockStripe)
      .compile();

    app = moduleFixture.createNestApplication();
    
    // 啟用驗證管道
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }));
    
    await app.init();

    // 生成測試用 JWT token
    authToken = generateTestToken({ userId: 'user-123', email: 'user@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /tips', () => {
    it('should create tip successfully with valid auth', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null); // 無重複
      mockStripe.createPaymentIntent.mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'secret_test',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toUserId: 'creator-456',
          amount: 10,
          currency: 'USD',
          message: 'Great content!',
        })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          fromUserId: 'user-123',
          toUserId: 'creator-456',
          amount: 10,
          currency: 'USD',
          message: 'Great content!',
          paymentIntentId: 'pi_test123',
        },
      });

      // 驗證 Kafka 事件發送
      expect(mockKafka.sendEvent).toHaveBeenCalledWith(
        'tip.created',
        expect.objectContaining({
          fromUserId: 'user-123',
          toUserId: 'creator-456',
          amount: 10,
        })
      );
    });

    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/tips')
        .send({
          toUserId: 'creator-456',
          amount: 10,
          currency: 'USD',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Unauthorized'),
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少 toUserId
          amount: 10,
          currency: 'USD',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('validation'),
      });
    });

    it('should reject negative amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toUserId: 'creator-456',
          amount: -10,
          currency: 'USD',
        })
        .expect(400);

      expect(response.body.message).toContain('must be positive');
    });

    it('should handle duplicate request with idempotency key', async () => {
      // Arrange - 第一次請求成功
      mockRedis.get.mockResolvedValueOnce(null);
      mockStripe.createPaymentIntent.mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'secret_test',
      });

      const tipData = {
        toUserId: 'creator-456',
        amount: 10,
        currency: 'USD',
      };

      // 第一次請求
      const response1 = await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'unique-key-123')
        .send(tipData)
        .expect(201);

      const tipId = response1.body.data.id;

      // Arrange - 第二次請求（重複）
      mockRedis.get.mockResolvedValueOnce(JSON.stringify({ id: tipId }));

      // 第二次請求（相同 idempotency key）
      const response2 = await request(app.getHttpServer())
        .post('/tips')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'unique-key-123')
        .send(tipData)
        .expect(200); // 返回已存在的資源

      // Assert - 返回相同的 tip
      expect(response2.body.data.id).toBe(tipId);
      
      // Stripe 只被調用一次
      expect(mockStripe.createPaymentIntent).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /tips/:id', () => {
    it('should return tip details', async () => {
      // Arrange
      const tipData = {
        id: 'tip-123',
        fromUserId: 'user-123',
        toUserId: 'creator-456',
        amount: 10,
        currency: 'USD',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(tipData));

      // Act
      const response = await request(app.getHttpServer())
        .get('/tips/tip-123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: tipData,
      });
    });

    it('should return 404 for non-existent tip', async () => {
      // Arrange
      mockRedis.get.mockResolvedValue(null);

      // Act
      const response = await request(app.getHttpServer())
        .get('/tips/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found'),
      });
    });
  });

  describe('GET /tips', () => {
    it('should return paginated tips for current user', async () => {
      // Arrange
      const tips = [
        { id: 'tip-1', fromUserId: 'user-123', amount: 10 },
        { id: 'tip-2', fromUserId: 'user-123', amount: 20 },
      ];
      mockRedis.get.mockImplementation((key) => {
        if (key.includes('tips:user:user-123')) {
          return Promise.resolve(JSON.stringify(tips));
        }
        return Promise.resolve(null);
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/tips')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: tips,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
        },
      });
    });

    it('should support filtering by direction', async () => {
      const response = await request(app.getHttpServer())
        .get('/tips')
        .query({ direction: 'sent', page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Stripe Webhook', () => {
    it('should process payment_intent.succeeded webhook', async () => {
      // Arrange
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 1000,
            currency: 'usd',
            metadata: {
              tipId: 'tip-123',
              fromUserId: 'user-123',
              toUserId: 'creator-456',
            },
          },
        },
      };

      mockStripe.constructWebhookEvent.mockReturnValue(webhookPayload);
      mockRedis.get.mockResolvedValue(JSON.stringify({
        id: 'tip-123',
        status: 'pending',
      }));

      const signature = 'test-signature';

      // Act
      const response = await request(app.getHttpServer())
        .post('/stripe/webhook')
        .set('stripe-signature', signature)
        .send(webhookPayload)
        .expect(200);

      // Assert
      expect(response.body).toEqual({ received: true });
      
      // 驗證錢包更新
      expect(mockKafka.sendEvent).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          tipId: 'tip-123',
          amount: 1000,
        })
      );
    });

    it('should reject webhook with invalid signature', async () => {
      // Arrange
      mockStripe.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/stripe/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send({ type: 'payment_intent.succeeded' })
        .expect(400);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid signature'),
      });
    });
  });
});

// Helper function
function generateTestToken(payload: any): string {
  // 實際實作應該使用真實的 JWT 簽名
  return `test-token-${JSON.stringify(payload)}`;
}
```

---

## 前端測試範例

### React Component 測試（Vitest + Testing Library）

```typescript
// apps/web/src/components/LoginForm.spec.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from './LoginForm';
import { useAuth } from '../hooks/useAuth';

// Mock useAuth hook
vi.mock('../hooks/useAuth');

describe('LoginForm', () => {
  const mockLogin = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
    });
  });

  it('should render login form correctly', () => {
    render(<LoginForm />);

    // 驗證表單元素存在
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByText(/remember me/i)).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // 輸入無效的郵箱
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    
    // 點擊登入按鈕
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // 驗證錯誤訊息
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });

    // 不應該調用 login
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // 不輸入任何內容，直接點擊登入
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // 驗證錯誤訊息
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login with correct data when form is valid', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    
    render(<LoginForm />);

    // 填寫表單
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'Password123!');

    // 點擊記住我
    const rememberCheckbox = screen.getByRole('checkbox', { name: /remember me/i });
    await user.click(rememberCheckbox);

    // 提交表單
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // 驗證 login 被正確調用
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
        rememberMe: true,
      });
    });
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    
    // Mock loading state
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
    });

    render(<LoginForm />);

    // 驗證 loading 狀態
    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid credentials';
    
    (useAuth as any).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: errorMessage,
    });

    render(<LoginForm />);

    // 驗證錯誤訊息顯示
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // 初始狀態：密碼隱藏
    expect(passwordInput.type).toBe('password');

    // 點擊顯示密碼
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // 再次點擊隱藏密碼
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('should navigate to forgot password page', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('should navigate to registration page', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const signUpLink = screen.getByRole('link', { name: /sign up/i });
    
    expect(signUpLink).toHaveAttribute('href', '/register');
  });
});
```

### Playwright E2E 測試

```typescript
// apps/web/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // 填寫登入表單
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'Password123!');
    
    // 點擊登入按鈕
    await page.click('button[type="submit"]');

    // 等待導航到 dashboard
    await expect(page).toHaveURL('/dashboard');

    // 驗證登入成功的指標
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'WrongPassword');
    
    await page.click('button[type="submit"]');

    // 應該停留在登入頁面
    await expect(page).toHaveURL('/login');

    // 驗證錯誤訊息
    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials');
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', 'Password123!');
    
    await page.click('button[type="submit"]');

    // 驗證前端驗證錯誤
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('[name="password"]');
    const toggleButton = page.locator('[aria-label="Show password"]');

    // 初始狀態：type="password"
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 點擊顯示密碼
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // 再次點擊隱藏密碼
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should persist login with "Remember Me"', async ({ page, context }) => {
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'Password123!');
    
    // 勾選記住我
    await page.check('[name="rememberMe"]');
    
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 關閉並重新開啟瀏覽器
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');

    // 應該仍然保持登入狀態
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.locator('text=Welcome')).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.click('text=Forgot password?');
    
    await expect(page).toHaveURL('/forgot-password');
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.click('text=Sign up');
    
    await expect(page).toHaveURL('/register');
  });

  test('should handle rate limiting', async ({ page }) => {
    // 嘗試多次登入失敗
    for (let i = 0; i < 5; i++) {
      await page.fill('[name="email"]', 'user@example.com');
      await page.fill('[name="password"]', 'WrongPassword');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // 第6次應該被阻止
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText('Too many attempts');
  });
});
```

---

## Mock 策略

### Redis Service Mock

```typescript
// libs/testing/src/mocks/redis.mock.ts
export const createMockRedisService = () => ({
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  zrem: jest.fn(),
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
});
```

### Kafka Service Mock

```typescript
// libs/testing/src/mocks/kafka.mock.ts
export const createMockKafkaProducer = () => ({
  sendEvent: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
});

export const createMockKafkaConsumer = () => ({
  subscribe: jest.fn().mockResolvedValue(undefined),
  run: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
});
```

### Stripe Service Mock

```typescript
// libs/testing/src/mocks/stripe.mock.ts
export const createMockStripeService = () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  getStripeInstance: jest.fn().mockReturnValue({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      cancel: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      cancel: jest.fn(),
    },
  }),
  createPaymentIntent: jest.fn(),
  createCustomer: jest.fn(),
  createSubscription: jest.fn(),
  constructWebhookEvent: jest.fn(),
  verifyWebhookSignature: jest.fn().mockReturnValue(true),
});
```

---

## 測試資料工廠

### User Factory

```typescript
// libs/testing/src/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export interface CreateUserOptions {
  email?: string;
  role?: 'sugar_daddy' | 'sugar_baby' | 'admin';
  displayName?: string;
  bio?: string;
}

export class UserFactory {
  static create(overrides?: CreateUserOptions) {
    return {
      id: faker.string.uuid(),
      email: overrides?.email || faker.internet.email(),
      displayName: overrides?.displayName || faker.person.fullName(),
      role: overrides?.role || 'sugar_baby',
      bio: overrides?.bio || faker.lorem.sentence(),
      profilePictureUrl: faker.image.avatar(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  }

  static createMany(count: number, overrides?: CreateUserOptions) {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createSugarDaddy(overrides?: Omit<CreateUserOptions, 'role'>) {
    return this.create({ ...overrides, role: 'sugar_daddy' });
  }

  static createSugarBaby(overrides?: Omit<CreateUserOptions, 'role'>) {
    return this.create({ ...overrides, role: 'sugar_baby' });
  }

  static createAdmin(overrides?: Omit<CreateUserOptions, 'role'>) {
    return this.create({ ...overrides, role: 'admin' });
  }
}

// 使用範例
const user = UserFactory.create({ email: 'test@example.com' });
const users = UserFactory.createMany(10);
const sugarDaddy = UserFactory.createSugarDaddy();
```

### Post Factory

```typescript
// libs/testing/src/factories/post.factory.ts
export class PostFactory {
  static create(overrides?: Partial<Post>) {
    return {
      id: faker.string.uuid(),
      creatorId: overrides?.creatorId || faker.string.uuid(),
      content: overrides?.content || faker.lorem.paragraph(),
      visibility: overrides?.visibility || 'public',
      isPPV: overrides?.isPPV || false,
      ppvPrice: overrides?.ppvPrice || null,
      mediaUrls: overrides?.mediaUrls || [],
      likesCount: overrides?.likesCount || faker.number.int({ min: 0, max: 1000 }),
      commentsCount: overrides?.commentsCount || faker.number.int({ min: 0, max: 100 }),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static createPPV(overrides?: Partial<Post>) {
    return this.create({
      ...overrides,
      isPPV: true,
      ppvPrice: overrides?.ppvPrice || 9.99,
      visibility: 'ppv',
    });
  }

  static createSubscriberOnly(overrides?: Partial<Post>) {
    return this.create({
      ...overrides,
      visibility: 'subscribers',
    });
  }
}
```

---

## 常見問題與解決方案

### 1. 測試間資料污染

**問題**：測試之間互相影響，無法獨立運行

**解決方案**：
```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRedis: ReturnType<typeof createMockRedisService>;

  beforeEach(() => {
    // ✅ 每個測試前重置 mock
    mockRedis = createMockRedisService();
    jest.clearAllMocks();
    
    // 重新創建 service 實例
    service = new UserService(mockRedis, mockKafka);
  });

  afterEach(() => {
    // ✅ 清理資源
    jest.restoreAllMocks();
  });
});
```

### 2. 非同步測試超時

**問題**：測試超時失敗

**解決方案**：
```typescript
// ✅ 使用 async/await
it('should fetch user data', async () => {
  const result = await service.getUser('user-123');
  expect(result).toBeDefined();
});

// ✅ 增加超時時間（僅在必要時）
it('should handle long operation', async () => {
  const result = await service.longOperation();
  expect(result).toBeDefined();
}, 10000); // 10 秒超時

// ❌ 避免使用 done callback（除非必要）
it('should fetch user data', (done) => {
  service.getUser('user-123').then((result) => {
    expect(result).toBeDefined();
    done();
  });
});
```

### 3. Mock 沒有被正確重置

**問題**：Mock 的返回值影響其他測試

**解決方案**：
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // ✅ 清除調用記錄
  jest.resetAllMocks(); // ✅ 重置實作
});

// 或者針對特定 mock
beforeEach(() => {
  mockRedis.get.mockClear();
  mockRedis.get.mockReset();
  mockRedis.get.mockResolvedValue(null); // 設定預設返回值
});
```

### 4. E2E 測試不穩定（Flaky）

**問題**：E2E 測試有時通過有時失敗

**解決方案**：
```typescript
// ✅ 使用 waitFor 等待元素出現
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
}, { timeout: 3000 });

// ✅ 在 Playwright 中使用內建等待
await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 });

// ✅ 等待網路請求完成
await page.waitForResponse(response => 
  response.url().includes('/api/users') && response.status() === 200
);

// ❌ 避免使用固定延遲
await page.waitForTimeout(1000); // 不推薦
```

### 5. 測試覆蓋率不準確

**問題**：覆蓋率報告顯示未測試的行數不對

**解決方案**：
```javascript
// jest.config.ts
export default {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',      // 排除測試檔案
    '!src/**/*.e2e.spec.{ts,tsx}',  // 排除 E2E 測試
    '!src/**/index.ts',              // 排除 index 檔案
    '!src/**/*.d.ts',                // 排除型別定義
    '!src/**/mocks/**',              // 排除 mock 資料
  ],
};
```

---

## 📚 延伸閱讀

- [Jest 官方文件](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Playwright 文件](https://playwright.dev/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**最後更新**：2024-02-13
