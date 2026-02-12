# Controller 層整合測試指南

## 📋 目錄

1. [概述](#概述)
2. [測試類型](#測試類型)
3. [測試框架設置](#測試框架設置)
4. [測試基礎設施](#測試基礎設施)
5. [Controller 測試模式](#controller-測試模式)
6. [完整測試範例](#完整測試範例)
7. [Mock 策略](#mock-策略)
8. [測試最佳實踐](#測試最佳實踐)
9. [CI/CD 整合](#cicd-整合)
10. [測試覆蓋率目標](#測試覆蓋率目標)

---

## 概述

**Controller 層整合測試**確保 API endpoints 正確運作，包括:

- ✅ HTTP 請求/響應處理
- ✅ 路由和參數驗證
- ✅ Guards 和 Interceptors
- ✅ DTO 驗證
- ✅ Service 層整合
- ✅ 錯誤處理
- ✅ 認證和授權

---

## 測試類型

### 1. **單元測試** (Unit Tests)

測試單一 Controller 方法，完全 mock 依賴。

**範圍**: 最小  
**速度**: 最快  
**隔離度**: 最高

### 2. **整合測試** (Integration Tests)

測試 Controller + Service + Repository 整合，使用真實 DB/Redis。

**範圍**: 中等  
**速度**: 中等  
**隔離度**: 中等

### 3. **E2E 測試** (End-to-End Tests)

測試完整 HTTP 請求流程，從 API Gateway 到 DB。

**範圍**: 最大  
**速度**: 最慢  
**隔離度**: 最低

---

## 測試框架設置

### 安裝依賴

```bash
npm install --save-dev @nestjs/testing
npm install --save-dev supertest
npm install --save-dev @types/supertest
```

### 項目結構

```
apps/user-service/
├── src/
│   ├── app/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.controller.spec.ts      # 單元測試
│   │   └── user.integration.spec.ts     # 整合測試
│   └── test/
│       ├── setup.ts                      # 測試設置
│       ├── fixtures/                     # 測試數據
│       │   ├── users.fixture.ts
│       │   └── auth.fixture.ts
│       └── helpers/                      # 測試輔助
│           ├── test-app.helper.ts
│           └── mock.helper.ts
```

---

## 測試基礎設施

### 1. Test App Helper

創建 `test/helpers/test-app.helper.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { HttpExceptionFilter } from '@suggar-daddy/common';
import { RequestTrackingInterceptor } from '@suggar-daddy/common';

export class TestAppHelper {
  static async createTestApp(
    moduleImports: any[],
    controllers: any[],
    providers: any[],
  ): Promise<INestApplication> {
    // Mock Redis
    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      expire: jest.fn(),
    };

    // Mock Kafka
    const mockKafka = {
      send: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ...moduleImports,
      ],
      controllers,
      providers: [
        ...providers,
        {
          provide: RedisService,
          useValue: mockRedis,
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafka,
        },
      ],
    }).compile();

    const app = moduleFixture.createNestApplication();

    // 添加全局配置
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new RequestTrackingInterceptor());

    await app.init();

    return app;
  }

  static getMockRedis(app: INestApplication): jest.Mocked<RedisService> {
    return app.get(RedisService);
  }

  static getMockKafka(app: INestApplication): jest.Mocked<KafkaProducerService> {
    return app.get(KafkaProducerService);
  }
}
```

### 2. Auth Helper

創建 `test/helpers/auth.helper.ts`:

```typescript
import { JwtService } from '@nestjs/jwt';

export class AuthHelper {
  private static jwtService = new JwtService({
    secret: 'test-secret-key',
  });

  static generateAccessToken(userId: string, role: string = 'basic'): string {
    return this.jwtService.sign(
      {
        sub: userId,
        email: `${userId}@test.com`,
        role,
      },
      { expiresIn: '15m' },
    );
  }

  static generateAdminToken(userId: string = 'admin-001'): string {
    return this.generateAccessToken(userId, 'admin');
  }

  static generateCreatorToken(userId: string = 'creator-001'): string {
    return this.generateAccessToken(userId, 'creator');
  }

  static getAuthHeader(token: string): { Authorization: string } {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}
```

### 3. Fixtures

創建 `test/fixtures/users.fixture.ts`:

```typescript
export const TEST_USERS = {
  basicUser: {
    userId: 'user-001',
    email: 'user@test.com',
    displayName: 'Test User',
    role: 'basic',
    accountStatus: 'active',
    emailVerified: true,
  },
  
  creator: {
    userId: 'creator-001',
    email: 'creator@test.com',
    displayName: 'Test Creator',
    role: 'creator',
    accountStatus: 'active',
    emailVerified: true,
    stripeAccountId: 'acct_test_123',
  },

  admin: {
    userId: 'admin-001',
    email: 'admin@test.com',
    displayName: 'Test Admin',
    role: 'admin',
    accountStatus: 'active',
    emailVerified: true,
  },

  suspendedUser: {
    userId: 'user-002',
    email: 'suspended@test.com',
    displayName: 'Suspended User',
    role: 'basic',
    accountStatus: 'suspended',
    emailVerified: true,
  },
};
```

---

## Controller 測試模式

### 模式 1: 單元測試（完全 Mock）

```typescript
// user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TEST_USERS } from '../test/fixtures/users.fixture';

describe('UserController (Unit)', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockService = {
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getUserProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService);
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      const user = TEST_USERS.basicUser;
      service.getUserProfile.mockResolvedValue(user);

      const result = await controller.getUserProfile(user.userId);

      expect(result).toEqual(user);
      expect(service.getUserProfile).toHaveBeenCalledWith(user.userId);
      expect(service.getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      service.getUserProfile.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.getUserProfile('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = TEST_USERS.basicUser.userId;
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...TEST_USERS.basicUser, ...updateDto };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(userId, updateDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(userId, updateDto);
    });
  });
});
```

### 模式 2: 整合測試（HTTP 請求）

```typescript
// user.integration.spec.ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppHelper } from '../test/helpers/test-app.helper';
import { AuthHelper } from '../test/helpers/auth.helper';
import { TEST_USERS } from '../test/fixtures/users.fixture';
import { UserModule } from './user.module';

describe('UserController (Integration)', () => {
  let app: INestApplication;
  let mockRedis: jest.Mocked<RedisService>;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp(
      [UserModule],
      [],
      [],
    );

    mockRedis = TestAppHelper.getMockRedis(app);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/:userId/profile', () => {
    it('should return user profile with valid auth token', async () => {
      const user = TEST_USERS.basicUser;
      const token = AuthHelper.generateAccessToken(user.userId);

      // Mock Redis response
      mockRedis.get.mockResolvedValue(JSON.stringify(user));

      const response = await request(app.getHttpServer())
        .get(`/users/${user.userId}/profile`)
        .set(AuthHelper.getAuthHeader(token))
        .expect(200);

      expect(response.body).toMatchObject({
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
      });

      expect(mockRedis.get).toHaveBeenCalledWith(`user:${user.userId}`);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/user-001/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('should return 404 for non-existent user', async () => {
      const token = AuthHelper.generateAccessToken('user-001');
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/users/non-existent/profile')
        .set(AuthHelper.getAuthHeader(token))
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'User not found',
        code: 'ERR_USER_NOT_FOUND',
      });
    });

    it('should include correlation ID in error response', async () => {
      const token = AuthHelper.generateAccessToken('user-001');
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/users/non-existent/profile')
        .set(AuthHelper.getAuthHeader(token))
        .expect(404);

      expect(response.body.correlationId).toBeDefined();
      expect(response.body.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('PATCH /users/:userId/profile', () => {
    it('should update user profile', async () => {
      const user = TEST_USERS.basicUser;
      const token = AuthHelper.generateAccessToken(user.userId);
      const updateDto = {
        displayName: 'Updated Name',
        bio: 'New bio',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(user));
      mockRedis.set.mockResolvedValue('OK');

      const response = await request(app.getHttpServer())
        .patch(`/users/${user.userId}/profile`)
        .set(AuthHelper.getAuthHeader(token))
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: user.userId,
        displayName: updateDto.displayName,
        bio: updateDto.bio,
      });

      // 驗證 Redis 更新
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should validate DTO and return 400 for invalid data', async () => {
      const token = AuthHelper.generateAccessToken('user-001');

      const response = await request(app.getHttpServer())
        .patch('/users/user-001/profile')
        .set(AuthHelper.getAuthHeader(token))
        .send({
          displayName: '', // Empty string invalid
          email: 'invalid-email', // Invalid format
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([
          expect.stringContaining('displayName'),
        ]),
      });
    });

    it('should return 403 when updating other user profile', async () => {
      const token = AuthHelper.generateAccessToken('user-001');

      const response = await request(app.getHttpServer())
        .patch('/users/user-002/profile')
        .set(AuthHelper.getAuthHeader(token))
        .send({ displayName: 'Hacked' })
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: 'Forbidden',
      });
    });
  });

  describe('DELETE /users/:userId', () => {
    it('should delete user (admin only)', async () => {
      const adminToken = AuthHelper.generateAdminToken();
      const userToDelete = TEST_USERS.basicUser;

      mockRedis.get.mockResolvedValue(JSON.stringify(userToDelete));
      mockRedis.del.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .delete(`/users/${userToDelete.userId}`)
        .set(AuthHelper.getAuthHeader(adminToken))
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'User deleted successfully',
      });

      expect(mockRedis.del).toHaveBeenCalledWith(`user:${userToDelete.userId}`);
    });

    it('should return 403 for non-admin users', async () => {
      const basicToken = AuthHelper.generateAccessToken('user-001');

      const response = await request(app.getHttpServer())
        .delete('/users/user-002')
        .set(AuthHelper.getAuthHeader(basicToken))
        .expect(403);

      expect(response.body.message).toContain('Admin access required');
    });
  });
});
```

---

## 完整測試範例

### Auth Controller 整合測試

```typescript
// auth.integration.spec.ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { TestAppHelper } from '../test/helpers/test-app.helper';
import { AuthModule } from './auth.module';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let mockRedis: jest.Mocked<RedisService>;
  let mockKafka: jest.Mocked<KafkaProducerService>;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp([AuthModule], [], []);
    mockRedis = TestAppHelper.getMockRedis(app);
    mockKafka = TestAppHelper.getMockKafka(app);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register new user successfully', async () => {
      const registerDto = {
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      // Mock: Email 不存在
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 900,
        tokenType: 'Bearer',
        user: {
          userId: expect.any(String),
          email: registerDto.email,
          displayName: registerDto.displayName,
          role: 'basic',
        },
      });

      // 驗證 Kafka event
      expect(mockKafka.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'user.registered',
          messages: expect.arrayContaining([
            expect.objectContaining({
              value: expect.stringContaining(registerDto.email),
            }),
          ]),
        }),
      );
    });

    it('should return 409 if email already exists', async () => {
      mockRedis.get.mockResolvedValue('existing-user-id');

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'SecurePass123!',
          displayName: 'Existing User',
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        message: 'Email already registered',
        code: 'ERR_EMAIL_ALREADY_EXISTS',
      });
    });

    it('should validate password requirements', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          password: 'weak', // Too short, no uppercase, no number
          displayName: 'Test',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('at least 8 characters'),
        ]),
      );
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const email = 'test@test.com';
      const password = 'SecurePass123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const mockUser = {
        userId: 'user-001',
        email,
        passwordHash: hashedPassword,
        role: 'basic',
        displayName: 'Test User',
        accountStatus: 'active',
        emailVerified: true,
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockUser));
      mockRedis.set.mockResolvedValue('OK');

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          userId: mockUser.userId,
          email: mockUser.email,
        },
      });
    });

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        userId: 'user-001',
        email: 'test@test.com',
        passwordHash: await bcrypt.hash('correct-password', 10),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockUser));

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should enforce rate limiting after 5 failed attempts', async () => {
      const email = 'test@test.com';
      mockRedis.get
        .mockResolvedValueOnce('5') // Login attempts
        .mockResolvedValueOnce(null); // User doesn't exist

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'any' })
        .expect(429);

      expect(response.body.message).toContain('Too many login attempts');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockRefreshData = {
        userId: 'user-001',
        email: 'test@test.com',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockRefreshData));

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        expiresIn: 900,
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });
  });
});
```

---

## Mock 策略

### 1. **Redis Mock**

```typescript
const mockRedis = {
  // Basic operations
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  
  // Key operations
  exists: jest.fn(),
  ttl: jest.fn(),
  expire: jest.fn(),
  
  // List operations
  lpush: jest.fn(),
  rpush: jest.fn(),
  lrange: jest.fn(),
  
  // Set operations
  sadd: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
};
```

### 2. **Kafka Mock**

```typescript
const mockKafka = {
  send: jest.fn().mockResolvedValue({
    topicName: 'test-topic',
    partition: 0,
    errorCode: 0,
    offset: '0',
  }),
  
  sendBatch: jest.fn().mockResolvedValue([]),
  
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

// 驗證 Kafka event
expect(mockKafka.send).toHaveBeenCalledWith({
  topic: 'user.updated',
  messages: [
    {
      key: 'user-001',
      value: JSON.stringify({
        userId: 'user-001',
        displayName: 'Updated Name',
      }),
    },
  ],
});
```

### 3. **Stripe Mock**

```typescript
const mockStripe = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
      amount: 10000,
      currency: 'usd',
    }),
    retrieve: jest.fn(),
  },
  
  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
    }),
  },
  
  subscriptions: {
    create: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
  },
};
```

---

## 測試最佳實踐

### 1. ✅ AAA 模式

**Arrange - Act - Assert**

```typescript
it('should update user profile', async () => {
  // Arrange: 準備測試數據和 mocks
  const userId = 'user-001';
  const updateDto = { displayName: 'New Name' };
  mockRedis.get.mockResolvedValue(JSON.stringify(TEST_USERS.basicUser));

  // Act: 執行操作
  const response = await request(app.getHttpServer())
    .patch(`/users/${userId}/profile`)
    .send(updateDto);

  // Assert: 驗證結果
  expect(response.status).toBe(200);
  expect(response.body.displayName).toBe(updateDto.displayName);
});
```

### 2. ✅ 描述性測試名稱

```typescript
// ❌ 不好
it('test1', () => {});
it('works', () => {});

// ✅ 好
it('should return 200 when user exists', () => {});
it('should return 404 when user not found', () => {});
it('should validate email format and return 400 for invalid email', () => {});
```

### 3. ✅ 測試正常和異常路徑

```typescript
describe('POST /users', () => {
  // Happy path
  it('should create user with valid data', () => {});
  
  // Error paths
  it('should return 400 for missing required fields', () => {});
  it('should return 409 for duplicate email', () => {});
  it('should return 401 without authentication', () => {});
  it('should return 403 without proper permissions', () => {});
});
```

### 4. ✅ 每個測試獨立

```typescript
beforeEach(() => {
  // 清除所有 mocks
  jest.clearAllMocks();
  
  // 重置數據
  testData = { ...INITIAL_TEST_DATA };
});
```

### 5. ✅ 使用 Test Fixtures

```typescript
// fixtures/users.fixture.ts
export const createTestUser = (overrides = {}) => ({
  userId: `user-${Date.now()}`,
  email: `test-${Date.now()}@test.com`,
  displayName: 'Test User',
  role: 'basic',
  ...overrides,
});

// 在測試中使用
const user = createTestUser({ role: 'creator' });
```

### 6. ✅ 測試 Headers 和 Metadata

```typescript
it('should include CORS headers', async () => {
  const response = await request(app.getHttpServer())
    .get('/users/user-001')
    .expect(200);

  expect(response.headers['access-control-allow-origin']).toBeDefined();
});

it('should include X-Correlation-ID in response', async () => {
  const response = await request(app.getHttpServer())
    .get('/users/user-001')
    .expect(200);

  expect(response.headers['x-correlation-id']).toMatch(/^[a-f0-9-]{36}$/);
});
```

---

## CI/CD 整合

### GitHub Actions 配置

創建 `.github/workflows/integration-tests.yml`:

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: suggar_daddy_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          NODE_ENV: test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          DATABASE_URL: postgresql://test:test@localhost:5432/suggar_daddy_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: integration
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=\\.spec\\.ts$",
    "test:integration": "jest --testPathPattern=\\.integration\\.spec\\.ts$ --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand"
  }
}
```

---

## 測試覆蓋率目標

### 目標覆蓋率

| 類型 | 目標 | 最低要求 |
|------|------|----------|
| **Statements** | 80%+ | 70% |
| **Branches** | 75%+ | 65% |
| **Functions** | 80%+ | 70% |
| **Lines** | 80%+ | 70% |

### Jest 配置

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70,
    },
    // 針對特定目錄設置更高標準
    './apps/*/src/app/*.controller.ts': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  collectCoverageFrom: [
    'apps/*/src/**/*.ts',
    '!apps/*/src/**/*.spec.ts',
    '!apps/*/src/**/*.integration.spec.ts',
    '!apps/*/src/main.ts',
  ],
};
```

### 覆蓋率報告

```bash
# 生成 HTML 報告
npm run test:cov

# 打開報告
open coverage/lcov-report/index.html
```

---

## 相關文檔

- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) - 錯誤處理測試
- [TESTING.md](./TESTING.md) - 通用測試指南
- [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) - OAuth 測試

---

**最後更新**: 2026-02-13  
**維護者**: Engineering Team  
**狀態**: ✅ Production Ready
