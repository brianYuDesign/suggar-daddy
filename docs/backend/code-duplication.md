# 代碼重複分析報告

> **分析日期**: 2024-02-17  
> **分析範圍**: 11 個後端微服務 + 共享庫  
> **分析師**: Backend Developer Team

## 📋 執行摘要

本報告深入分析了 Suggar Daddy 平台後端微服務架構中的代碼重複問題，識別出 **8 大類重複模式**，總計約 **400+ 行重複代碼**。

### 關鍵發現

🔴 **嚴重重複**
- 日誌初始化代碼重複 50+ 次
- Kafka/Redis 模組配置重複 13 次
- 服務客戶端完全重複實現（SubscriptionServiceClient）

🟡 **中等重複**
- 事件生產者模式重複 3 次
- ID 生成函數重複 4 次
- Redis 鍵命名模式分散在 6+ 個服務

✅ **已有共享庫基礎**
- `libs/common` 已有部分共享功能
- `libs/kafka` 已有 Kafka 模組
- `libs/redis` 已有 Redis 模組

---

## 📊 重複代碼統計

| 類別 | 重複次數 | 行數估算 | 優先級 | 工時估算 |
|------|---------|---------|--------|---------|
| 日誌初始化 | 50+ | ~50 | 🔴 高 | 2h |
| 模組配置 | 13 | ~200 | 🔴 高 | 2h |
| 服務客戶端 | 2-3 | ~100 | 🔴 高 | 3h |
| ID 生成函數 | 4 | ~16 | 🔴 高 | 1h |
| 事件生產者 | 3 | ~30 | 🟡 中 | 2h |
| Redis 鍵定義 | 6+ | ~60 | 🟡 中 | 2h |
| 錯誤處理 | 多次 | ~50+ | 🟡 中 | 3h |
| DTO 定義 | 未確定 | ~? | 🟢 低 | 4h |

**總計**: 約 **506+ 行重複代碼**  
**總工時**: 約 **19 小時**  
**預期減少**: **20-25% 代碼重複率**

---

## 1️⃣ 日誌初始化重複（50+ 次）

### 問題描述

每個類都重複相同的日誌初始化代碼：

```typescript
private readonly logger = new Logger(ClassName.name);
```

### 重複位置

#### User Service
- `apps/user-service/src/app/user.service.ts:25`
- `apps/user-service/src/app/user.controller.ts:15`
- `apps/user-service/src/app/report.service.ts:12`

#### Messaging Service
- `apps/messaging-service/src/app/messaging.service.ts:18`
- `apps/messaging-service/src/app/messaging.gateway.ts:22`
- `apps/messaging-service/src/app/subscription-service.client.ts:7`

#### Content Service
- `apps/content-service/src/app/post.service.ts:32`
- `apps/content-service/src/app/feed.service.ts:18`
- `apps/content-service/src/app/story.service.ts:15`
- `apps/content-service/src/app/moderation.service.ts:12`

#### Payment Service
- `apps/payment-service/src/app/wallet.service.ts:17`
- `apps/payment-service/src/app/transaction.service.ts:14`
- `apps/payment-service/src/app/tip.service.ts:11`

**完整統計**: 至少 **50 個類**中存在相同代碼

### 代碼示例

```typescript
// ❌ 當前重複模式（50+ 處）
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  // ...
}

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);
  // ...
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  // ...
}
```

### 解決方案

**方案 1: 基礎類繼承**

```typescript
// libs/common/src/base/base.service.ts
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }
}

// 使用
@Injectable()
export class UserService extends BaseService {
  constructor() {
    super();
    // logger 自動可用
  }
}
```

**方案 2: 裝飾器注入（推薦）**

```typescript
// libs/common/src/decorators/inject-logger.decorator.ts
import { Logger } from '@nestjs/common';

export function InjectLogger(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const logger = new Logger(target.constructor.name);
    Object.defineProperty(target, propertyKey, {
      value: logger,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  };
}

// 使用
@Injectable()
export class UserService {
  @InjectLogger()
  private readonly logger!: Logger;

  async getUser(id: string) {
    this.logger.log(`Getting user ${id}`);
    // ...
  }
}
```

**方案 3: NestJS 內建依賴注入**

```typescript
// 使用 NestJS LoggerService
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(private readonly logger: Logger) {}
  
  async getUser(id: string) {
    this.logger.log(`Getting user ${id}`, UserService.name);
  }
}

// app.module.ts 配置全局 Logger
{
  provide: Logger,
  useValue: new Logger(),
}
```

### 改進效果

- ✅ 減少 50 行重複代碼
- ✅ 統一日誌初始化方式
- ✅ 更易維護和測試
- ⏱️ **預估工時**: 2 小時

---

## 2️⃣ Kafka/Redis 模組配置重複（13 次）

### 問題描述

每個微服務的 `app.module.ts` 都重複相同的基礎模組配置。

### 重複位置

#### 完全相同配置
1. `apps/messaging-service/src/app/app.module.ts:27-44`
2. `apps/content-service/src/app/app.module.ts:39-56`
3. `apps/subscription-service/src/app/app.module.ts:25-42`
4. `apps/payment-service/src/app/app.module.ts:36-53`
5. `apps/notification-service/src/app/app.module.ts:20-37`
6. `apps/matching-service/src/app/app.module.ts:15-32`
7. `apps/user-service/src/app/app.module.ts:18-35`
8. `apps/auth-service/src/app/app.module.ts:22-39`
9. `apps/media-service/src/app/app.module.ts:16-33`
10. `apps/admin-service/src/app/app.module.ts:14-31`
11. `apps/db-writer-service/src/app/app.module.ts:25-42`
12. `apps/api-gateway/src/app/app.module.ts:12-29`

### 代碼示例

```typescript
// ❌ 在 13 個服務中完全重複
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EnvConfigModule,
    AuthModule,
    RedisModule.forRoot(),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
    // ... 服務特定模組
  ],
})
export class AppModule {}
```

### 解決方案

**創建基礎微服務模組**

```typescript
// libs/common/src/modules/base-microservice.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvConfigModule } from '@suggar-daddy/env';
import { AuthModule } from '@suggar-daddy/auth';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaModule } from '@suggar-daddy/kafka';
import { AppConfigService } from '@suggar-daddy/config';

export interface BaseMicroserviceOptions {
  includeAuth?: boolean;
  includeKafka?: boolean;
  includeRedis?: boolean;
  additionalImports?: any[];
}

@Module({})
export class BaseMicroserviceModule {
  static forRoot(options: BaseMicroserviceOptions = {}): DynamicModule {
    const {
      includeAuth = true,
      includeKafka = true,
      includeRedis = true,
      additionalImports = [],
    } = options;

    const imports: any[] = [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
      }),
      EnvConfigModule,
    ];

    if (includeAuth) {
      imports.push(AuthModule);
    }

    if (includeRedis) {
      imports.push(RedisModule.forRoot());
    }

    if (includeKafka) {
      imports.push(
        KafkaModule.forRootAsync({
          useFactory: (config: AppConfigService) => ({
            clientId: config.kafkaClientId,
            brokers: config.kafkaBrokers,
            groupId: config.kafkaGroupId,
          }),
          inject: [AppConfigService],
        })
      );
    }

    imports.push(...additionalImports);

    return {
      module: BaseMicroserviceModule,
      imports,
      exports: imports,
    };
  }
}
```

**使用方式**

```typescript
// ✅ 簡化後的 app.module.ts
import { BaseMicroserviceModule } from '@suggar-daddy/common';

@Module({
  imports: [
    BaseMicroserviceModule.forRoot({
      includeAuth: true,
      includeKafka: true,
      includeRedis: true,
    }),
    // 服務特定模組
    UserModule,
    TypeOrmModule.forRoot(/* ... */),
  ],
})
export class AppModule {}
```

**針對不同服務的配置**

```typescript
// Auth Service - 不需要 AuthModule（自己就是認證服務）
BaseMicroserviceModule.forRoot({
  includeAuth: false,
  includeKafka: true,
  includeRedis: true,
});

// DB Writer Service - 需要所有模組
BaseMicroserviceModule.forRoot({
  includeAuth: true,
  includeKafka: true,
  includeRedis: true,
});

// 前端 Gateway - 不需要 Kafka
BaseMicroserviceModule.forRoot({
  includeAuth: false,
  includeKafka: false,
  includeRedis: false,
});
```

### 改進效果

- ✅ 減少約 200 行重複代碼
- ✅ 統一微服務基礎配置
- ✅ 更易於添加新的全局功能
- ✅ 簡化新微服務創建流程
- ⏱️ **預估工時**: 2 小時

---

## 3️⃣ 服務客戶端重複（2-3 次）

### 問題描述

相同的服務客戶端類在多個微服務中完全重複實現。

### 重複位置

#### SubscriptionServiceClient（完全相同）
1. `apps/messaging-service/src/app/subscription-service.client.ts:1-37`
2. `apps/content-service/src/app/subscription-service.client.ts:1-36`

#### UserServiceClient（可能存在）
- 在多個服務中可能有類似實現

### 代碼示例

```typescript
// ❌ 在 2 個服務中完全重複（100% 相同）

// messaging-service/src/app/subscription-service.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SubscriptionServiceClient {
  private readonly logger = new Logger(SubscriptionServiceClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config
      .get<string>('SUBSCRIPTION_SERVICE_URL', 'http://localhost:3009')
      .replace(/\/$/, '');
  }

  async hasActiveSubscription(
    subscriberId: string,
    creatorId: string,
    tierId?: string | null,
  ): Promise<boolean> {
    const params = new URLSearchParams({ subscriberId, creatorId });
    if (tierId) params.set('tierId', tierId);
    
    const url = `${this.baseUrl}/api/subscriptions/check?${params.toString()}`;
    
    try {
      const res = await axios.get<{ hasAccess: boolean }>(url, { 
        timeout: 5000 
      });
      return res.data?.hasAccess === true;
    } catch (e) {
      this.logger.warn('subscription check failed', e);
      return false;
    }
  }
}

// content-service/src/app/subscription-service.client.ts
// 完全相同的代碼！
```

### 解決方案

**創建共享服務客戶端庫**

```typescript
// libs/service-clients/src/index.ts
export * from './subscription-service.client';
export * from './user-service.client';
export * from './payment-service.client';

// libs/service-clients/src/subscription-service.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseServiceClient } from './base-service-client';

export interface SubscriptionCheckParams {
  subscriberId: string;
  creatorId: string;
  tierId?: string | null;
}

export interface SubscriptionCheckResponse {
  hasAccess: boolean;
}

@Injectable()
export class SubscriptionServiceClient extends BaseServiceClient {
  protected readonly logger = new Logger(SubscriptionServiceClient.name);

  constructor(config: ConfigService) {
    super(
      config.get<string>('SUBSCRIPTION_SERVICE_URL', 'http://localhost:3009'),
      config
    );
  }

  /**
   * 檢查用戶是否有訂閱創作者
   */
  async hasActiveSubscription(
    params: SubscriptionCheckParams
  ): Promise<boolean> {
    const { subscriberId, creatorId, tierId } = params;
    
    const queryParams = new URLSearchParams({ subscriberId, creatorId });
    if (tierId) queryParams.set('tierId', tierId);

    try {
      const response = await this.get<SubscriptionCheckResponse>(
        `/api/subscriptions/check`,
        { params: queryParams }
      );
      
      return response.hasAccess === true;
    } catch (error) {
      this.logger.warn(
        `Subscription check failed for subscriber=${subscriberId}, creator=${creatorId}`,
        error
      );
      return false;
    }
  }

  /**
   * 取得創作者的所有訂閱層級
   */
  async getCreatorTiers(creatorId: string) {
    return this.get(`/api/subscription-tiers`, {
      params: { creatorId },
    });
  }
}

// libs/service-clients/src/base-service-client.ts
import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export abstract class BaseServiceClient {
  protected readonly client: AxiosInstance;
  protected abstract readonly logger: any;

  constructor(
    baseURL: string,
    protected readonly config: ConfigService
  ) {
    this.client = axios.create({
      baseURL: baseURL.replace(/\/$/, ''),
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加請求攔截器
    this.client.interceptors.request.use(
      (config) => {
        // 可以添加通用 headers（如內部服務認證）
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 添加響應攔截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Service client request failed', error);
        throw new HttpException(
          error.response?.data || 'Service unavailable',
          error.response?.status || 500
        );
      }
    );
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  protected async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  protected async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  protected async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}
```

**創建服務客戶端模組**

```typescript
// libs/service-clients/src/service-clients.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionServiceClient } from './subscription-service.client';
import { UserServiceClient } from './user-service.client';
import { PaymentServiceClient } from './payment-service.client';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SubscriptionServiceClient,
    UserServiceClient,
    PaymentServiceClient,
  ],
  exports: [
    SubscriptionServiceClient,
    UserServiceClient,
    PaymentServiceClient,
  ],
})
export class ServiceClientsModule {}
```

**使用方式**

```typescript
// ✅ 在各個服務中使用
import { SubscriptionServiceClient } from '@suggar-daddy/service-clients';

@Injectable()
export class MessagingService {
  constructor(
    private readonly subscriptionClient: SubscriptionServiceClient,
  ) {}

  async canSendMessage(senderId: string, receiverId: string) {
    const hasSubscription = await this.subscriptionClient.hasActiveSubscription({
      subscriberId: senderId,
      creatorId: receiverId,
    });
    
    return hasSubscription;
  }
}
```

### 改進效果

- ✅ 減少 100+ 行重複代碼
- ✅ 統一服務間通訊方式
- ✅ 更易於維護和更新
- ✅ 更好的類型安全
- ✅ 統一錯誤處理
- ⏱️ **預估工時**: 3 小時

---

## 4️⃣ ID 生成函數重複（4 次）

### 問題描述

相同的 ID 生成函數在多個服務中重複實現。

### 重複位置

1. `apps/content-service/src/app/post.service.ts:68-70`
2. `apps/payment-service/src/app/transaction.service.ts:34-36`
3. `apps/payment-service/src/app/wallet.service.ts:56-58`
4. `apps/subscription-service/src/app/subscription.service.ts:37-39`

### 代碼示例

```typescript
// ❌ 完全相同的實現（4 處）

// post.service.ts
private genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// transaction.service.ts
private genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// 使用
const postId = this.genId('post');
const txId = this.genId('tx');
const subId = this.genId('sub');
```

### 解決方案

```typescript
// libs/common/src/utils/id-generator.ts
import { randomBytes } from 'crypto';

export class IdGenerator {
  /**
   * 生成唯一 ID
   * @param prefix ID 前綴
   * @returns 格式: {prefix}-{timestamp}-{random}
   * @example "post-1708185600000-a7b3c9d"
   */
  static generate(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * 使用加密安全的隨機數生成 ID（更安全）
   */
  static generateSecure(prefix: string): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * 按類型生成 ID
   */
  static generateByType(
    type: 'post' | 'comment' | 'tx' | 'sub' | 'wallet' | 'story'
  ): string {
    return this.generate(type);
  }

  /**
   * 生成短 ID（用於 URL）
   */
  static generateShortId(length = 8): string {
    return randomBytes(length)
      .toString('base64')
      .replace(/[+/=]/g, '')
      .slice(0, length);
  }

  /**
   * 生成 UUID v4
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 從 ID 中提取時間戳
   */
  static extractTimestamp(id: string): number | null {
    const parts = id.split('-');
    if (parts.length >= 2) {
      const timestamp = parseInt(parts[1], 10);
      return isNaN(timestamp) ? null : timestamp;
    }
    return null;
  }
}

// libs/common/src/utils/id-generator.spec.ts
describe('IdGenerator', () => {
  it('should generate ID with correct format', () => {
    const id = IdGenerator.generate('test');
    expect(id).toMatch(/^test-\d+-[a-z0-9]+$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(IdGenerator.generate('test'));
    }
    expect(ids.size).toBe(1000);
  });

  it('should extract timestamp correctly', () => {
    const id = IdGenerator.generate('test');
    const timestamp = IdGenerator.extractTimestamp(id);
    expect(timestamp).toBeCloseTo(Date.now(), -2);
  });
});
```

**使用方式**

```typescript
// ✅ 在各個服務中使用
import { IdGenerator } from '@suggar-daddy/common';

@Injectable()
export class PostService {
  async createPost(dto: CreatePostDto) {
    const post = {
      id: IdGenerator.generateByType('post'),
      // 或
      id: IdGenerator.generate('post'),
      // ...
    };
    return post;
  }
}

@Injectable()
export class TransactionService {
  async createTransaction() {
    const transaction = {
      id: IdGenerator.generateSecure('tx'), // 使用加密安全版本
      // ...
    };
    return transaction;
  }
}
```

### 改進效果

- ✅ 減少 16 行重複代碼
- ✅ 統一 ID 生成方式
- ✅ 提供更安全的選項
- ✅ 可追蹤（包含時間戳）
- ✅ 更易於測試
- ⏱️ **預估工時**: 1 小時

---

## 5️⃣ 事件生產者重複（3 次）

### 問題描述

事件生產者的初始化和發送模式在多個服務中重複。

### 重複位置

1. `apps/content-service/src/app/events/content.producer.ts:11-13`
2. `apps/payment-service/src/app/events/payment.producer.ts:11-13`
3. `apps/subscription-service/src/app/events/subscription.producer.ts:14-17`

### 代碼示例

```typescript
// ❌ 重複的模式

// content.producer.ts
@Injectable()
export class ContentProducer implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  // 相同的初始化邏輯
  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  // 相同的發送模式
  async emitPostCreated(event: PostCreatedEvent) {
    return this.kafkaClient.emit(CONTENT_EVENTS.POST_CREATED, event);
  }
}

// payment.producer.ts
@Injectable()
export class PaymentProducer implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async emitPaymentCompleted(event: PaymentCompletedEvent) {
    return this.kafkaClient.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, event);
  }
}
```

### 解決方案

```typescript
// libs/kafka/src/base-event-producer.ts
import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export abstract class BaseEventProducer implements OnModuleInit {
  protected abstract readonly logger: Logger;
  protected abstract readonly eventPrefix: string;

  constructor(
    @Inject('KAFKA_SERVICE') protected readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error);
      throw error;
    }
  }

  /**
   * 發送事件到 Kafka
   */
  protected async emit<T>(eventName: string, data: T): Promise<void> {
    try {
      await this.kafkaClient.emit(eventName, data).toPromise();
      this.logger.debug(`Event emitted: ${eventName}`, data);
    } catch (error) {
      this.logger.error(`Failed to emit event: ${eventName}`, error);
      throw error;
    }
  }

  /**
   * 發送事件並等待確認
   */
  protected async send<T>(eventName: string, data: T): Promise<any> {
    try {
      const result = await this.kafkaClient.send(eventName, data).toPromise();
      this.logger.debug(`Event sent: ${eventName}`, data);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send event: ${eventName}`, error);
      throw error;
    }
  }

  /**
   * 批量發送事件
   */
  protected async emitBatch<T>(eventName: string, dataArray: T[]): Promise<void> {
    const promises = dataArray.map((data) => this.emit(eventName, data));
    await Promise.all(promises);
  }
}

// libs/kafka/src/event-types.ts
export const CONTENT_EVENTS = {
  POST_CREATED: 'content.post.created',
  POST_UPDATED: 'content.post.updated',
  POST_DELETED: 'content.post.deleted',
  COMMENT_CREATED: 'content.comment.created',
  STORY_CREATED: 'content.story.created',
} as const;

export const PAYMENT_EVENTS = {
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  WITHDRAWAL_REQUESTED: 'payment.withdrawal.requested',
  TIP_SENT: 'payment.tip.sent',
} as const;

export const SUBSCRIPTION_EVENTS = {
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
} as const;
```

**使用方式**

```typescript
// ✅ 各服務的事件生產者

// apps/content-service/src/app/events/content.producer.ts
import { Injectable, Logger } from '@nestjs/common';
import { BaseEventProducer, CONTENT_EVENTS } from '@suggar-daddy/kafka';

export interface PostCreatedEvent {
  postId: string;
  creatorId: string;
  title: string;
  isPremium: boolean;
  createdAt: Date;
}

@Injectable()
export class ContentProducer extends BaseEventProducer {
  protected readonly logger = new Logger(ContentProducer.name);
  protected readonly eventPrefix = 'content';

  async emitPostCreated(event: PostCreatedEvent): Promise<void> {
    return this.emit(CONTENT_EVENTS.POST_CREATED, event);
  }

  async emitPostUpdated(postId: string, updates: Partial<Post>): Promise<void> {
    return this.emit(CONTENT_EVENTS.POST_UPDATED, { postId, updates });
  }

  async emitPostDeleted(postId: string): Promise<void> {
    return this.emit(CONTENT_EVENTS.POST_DELETED, { postId });
  }
}

// apps/payment-service/src/app/events/payment.producer.ts
import { Injectable, Logger } from '@nestjs/common';
import { BaseEventProducer, PAYMENT_EVENTS } from '@suggar-daddy/kafka';

export interface PaymentCompletedEvent {
  transactionId: string;
  amount: number;
  currency: string;
  fromUserId: string;
  toUserId: string;
  type: 'tip' | 'subscription' | 'post_purchase';
}

@Injectable()
export class PaymentProducer extends BaseEventProducer {
  protected readonly logger = new Logger(PaymentProducer.name);
  protected readonly eventPrefix = 'payment';

  async emitPaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    return this.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, event);
  }

  async emitPaymentFailed(transactionId: string, reason: string): Promise<void> {
    return this.emit(PAYMENT_EVENTS.PAYMENT_FAILED, {
      transactionId,
      reason,
      timestamp: new Date(),
    });
  }
}
```

### 改進效果

- ✅ 減少 30+ 行重複代碼
- ✅ 統一事件發送模式
- ✅ 更好的錯誤處理
- ✅ 更易於追蹤和調試
- ✅ 支援批量發送
- ⏱️ **預估工時**: 2 小時

---

## 6️⃣ Redis 鍵定義重複（6+ 次）

### 問題描述

Redis 鍵的命名模式分散在多個服務中，缺乏統一管理。

### 重複位置

1. `apps/content-service/src/app/post.service.ts:10-19`
2. `apps/content-service/src/app/feed.service.ts:6-10`
3. `apps/user-service/src/app/user.service.ts:26-30`
4. `apps/payment-service/src/app/transaction.service.ts:8-11`
5. `apps/payment-service/src/app/wallet.service.ts:6-10`
6. `apps/subscription-service/src/app/subscription.service.ts:8-15`

### 代碼示例

```typescript
// ❌ 分散在各個服務中

// post.service.ts
const POST_KEY = (id: string) => `post:${id}`;
const POST_LIKES = (id: string) => `post:${id}:likes`;
const POST_COMMENTS = (id: string) => `post:${id}:comments`;
const POSTS_CREATOR = (creatorId: string) => `posts:creator:${creatorId}`;

// feed.service.ts
const FEED_KEY = (userId: string) => `feed:${userId}`;
const POST_KEY = (id: string) => `post:${id}`;
const USER_BLOCKS = (userId: string) => `user:blocks:${userId}`;

// user.service.ts
const USER_PREFIX = 'user:';
const USER_BLOCKS = (userId: string) => `user:blocks:${userId}`;
const USER_BLOCKED_BY = (userId: string) => `user:blocked-by:${userId}`;

// wallet.service.ts
const WALLET_KEY = (userId: string) => `wallet:${userId}`;
const WALLET_HISTORY = (userId: string) => `wallet:history:${userId}`;
```

### 解決方案

```typescript
// libs/common/src/constants/redis-keys.ts

/**
 * Redis 鍵命名規範
 * 格式: {service}:{resource}:{id}:{subresource}
 */
export class RedisKeys {
  // ========== User Keys ==========
  static user(userId: string): string {
    return `user:${userId}`;
  }

  static userProfile(userId: string): string {
    return `user:${userId}:profile`;
  }

  static userBlocks(userId: string): string {
    return `user:${userId}:blocks`;
  }

  static userBlockedBy(userId: string): string {
    return `user:${userId}:blocked-by`;
  }

  static userFollowers(userId: string): string {
    return `user:${userId}:followers`;
  }

  static userFollowing(userId: string): string {
    return `user:${userId}:following`;
  }

  // ========== Content Keys ==========
  static post(postId: string): string {
    return `post:${postId}`;
  }

  static postLikes(postId: string): string {
    return `post:${postId}:likes`;
  }

  static postComments(postId: string): string {
    return `post:${postId}:comments`;
  }

  static postViews(postId: string): string {
    return `post:${postId}:views`;
  }

  static postsCreator(creatorId: string): string {
    return `posts:creator:${creatorId}`;
  }

  static feed(userId: string): string {
    return `feed:${userId}`;
  }

  static trendingPosts(): string {
    return 'posts:trending';
  }

  // ========== Story Keys ==========
  static story(storyId: string): string {
    return `story:${storyId}`;
  }

  static storyViewers(storyId: string): string {
    return `story:${storyId}:viewers`;
  }

  static storiesCreator(creatorId: string): string {
    return `stories:creator:${creatorId}`;
  }

  // ========== Payment Keys ==========
  static wallet(userId: string): string {
    return `wallet:${userId}`;
  }

  static walletHistory(userId: string): string {
    return `wallet:${userId}:history`;
  }

  static walletEarnings(userId: string): string {
    return `wallet:${userId}:earnings`;
  }

  static transaction(txId: string): string {
    return `transaction:${txId}`;
  }

  // ========== Subscription Keys ==========
  static subscription(subscriptionId: string): string {
    return `subscription:${subscriptionId}`;
  }

  static subscriptionsUser(userId: string): string {
    return `subscriptions:user:${userId}`;
  }

  static subscriptionsCreator(creatorId: string): string {
    return `subscriptions:creator:${creatorId}`;
  }

  static subscriptionCheck(subscriberId: string, creatorId: string): string {
    return `subscription:check:${subscriberId}:${creatorId}`;
  }

  // ========== Matching Keys ==========
  static matchingCards(userId: string): string {
    return `matching:cards:${userId}`;
  }

  static userMatches(userId: string): string {
    return `matches:${userId}`;
  }

  // ========== Session & Auth Keys ==========
  static session(sessionId: string): string {
    return `session:${sessionId}`;
  }

  static refreshToken(userId: string): string {
    return `refresh-token:${userId}`;
  }

  // ========== Rate Limiting Keys ==========
  static rateLimit(identifier: string, endpoint: string): string {
    return `rate-limit:${identifier}:${endpoint}`;
  }

  // ========== Cache Keys ==========
  static cache(namespace: string, key: string): string {
    return `cache:${namespace}:${key}`;
  }

  // ========== Notification Keys ==========
  static deviceTokens(userId: string): string {
    return `device-tokens:${userId}`;
  }

  static notifications(userId: string): string {
    return `notifications:${userId}`;
  }

  static unreadNotificationsCount(userId: string): string {
    return `notifications:${userId}:unread-count`;
  }

  // ========== Lock Keys ==========
  static lock(resource: string): string {
    return `lock:${resource}`;
  }

  // ========== Utility Methods ==========
  
  /**
   * 解析鍵並返回各部分
   */
  static parse(key: string): { service: string; resource: string; id?: string } {
    const parts = key.split(':');
    return {
      service: parts[0],
      resource: parts[1],
      id: parts[2],
    };
  }

  /**
   * 生成掃描模式
   */
  static pattern(service: string, resource?: string): string {
    if (resource) {
      return `${service}:${resource}:*`;
    }
    return `${service}:*`;
  }

  /**
   * TTL 常數
   */
  static readonly TTL = {
    SHORT: 60, // 1 分鐘
    MEDIUM: 300, // 5 分鐘
    LONG: 3600, // 1 小時
    DAY: 86400, // 1 天
    WEEK: 604800, // 7 天
  };
}

// 使用範例
export class RedisKeyExamples {
  examples() {
    // User
    RedisKeys.user('user-123'); // "user:user-123"
    RedisKeys.userBlocks('user-123'); // "user:user-123:blocks"

    // Post
    RedisKeys.post('post-456'); // "post:post-456"
    RedisKeys.postLikes('post-456'); // "post:post-456:likes"

    // Wallet
    RedisKeys.wallet('user-123'); // "wallet:user-123"

    // Pattern
    RedisKeys.pattern('user'); // "user:*"
    RedisKeys.pattern('user', 'blocks'); // "user:blocks:*"
  }
}
```

**使用方式**

```typescript
// ✅ 在各個服務中使用
import { RedisKeys } from '@suggar-daddy/common';

@Injectable()
export class PostService {
  async getPost(postId: string) {
    // 從 Redis 獲取
    const cached = await this.redis.get(RedisKeys.post(postId));
    if (cached) return JSON.parse(cached);

    // 從資料庫獲取
    const post = await this.postRepository.findOne(postId);

    // 存入 Redis
    await this.redis.setex(
      RedisKeys.post(postId),
      RedisKeys.TTL.LONG,
      JSON.stringify(post)
    );

    return post;
  }

  async getLikes(postId: string) {
    return this.redis.smembers(RedisKeys.postLikes(postId));
  }
}

@Injectable()
export class WalletService {
  async getWallet(userId: string) {
    const walletKey = RedisKeys.wallet(userId);
    const cached = await this.redis.get(walletKey);
    // ...
  }
}
```

### 改進效果

- ✅ 減少 60+ 行重複代碼
- ✅ 統一 Redis 鍵命名規範
- ✅ 避免鍵名衝突
- ✅ 更易於維護和搜尋
- ✅ 提供類型提示
- ⏱️ **預估工時**: 2 小時

---

## 7️⃣ 錯誤處理模式重複

### 問題描述

相同的錯誤處理模式在多個服務中重複。

### 代碼示例

```typescript
// ❌ 重複的錯誤處理模式

// 模式 1: 資源不存在
if (!user) {
  this.logger.warn(`User not found: ${userId}`);
  throw new NotFoundException(`User not found: ${userId}`);
}

// 模式 2: 權限檢查
if (post.creatorId !== userId) {
  throw new ForbiddenException('You do not own this post');
}

// 模式 3: 金額驗證
if (amount < MIN_AMOUNT) {
  throw new BadRequestException(`Amount must be at least ${MIN_AMOUNT}`);
}

// 模式 4: 重複操作
if (alreadyExists) {
  throw new ConflictException('Already following this user');
}
```

### 解決方案

```typescript
// libs/common/src/utils/validation.service.ts
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

export class ValidationService {
  /**
   * 檢查資源是否存在
   */
  static throwIfNotFound<T>(
    entity: T | null | undefined,
    entityName: string,
    identifier?: string
  ): asserts entity is T {
    if (!entity) {
      const message = identifier
        ? `${entityName} not found: ${identifier}`
        : `${entityName} not found`;
      throw new NotFoundException(message);
    }
  }

  /**
   * 檢查資源擁有權
   */
  static throwIfNotOwner(
    resourceOwnerId: string,
    currentUserId: string,
    resourceName = 'resource'
  ): void {
    if (resourceOwnerId !== currentUserId) {
      throw new ForbiddenException(`You do not own this ${resourceName}`);
    }
  }

  /**
   * 檢查最小值
   */
  static throwIfBelowMinimum(
    value: number,
    minimum: number,
    fieldName: string
  ): void {
    if (value < minimum) {
      throw new BadRequestException(
        `${fieldName} must be at least ${minimum}`
      );
    }
  }

  /**
   * 檢查最大值
   */
  static throwIfAboveMaximum(
    value: number,
    maximum: number,
    fieldName: string
  ): void {
    if (value > maximum) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${maximum}`
      );
    }
  }

  /**
   * 檢查資源是否已存在
   */
  static throwIfExists(exists: boolean, message: string): void {
    if (exists) {
      throw new ConflictException(message);
    }
  }

  /**
   * 檢查是否已認證
   */
  static throwIfNotAuthenticated(userId?: string): asserts userId is string {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  /**
   * 檢查陣列是否為空
   */
  static throwIfEmpty<T>(
    array: T[],
    message = 'Array cannot be empty'
  ): void {
    if (!array || array.length === 0) {
      throw new BadRequestException(message);
    }
  }

  /**
   * 檢查字串長度
   */
  static throwIfInvalidLength(
    value: string,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (value.length < min || value.length > max) {
      throw new BadRequestException(
        `${fieldName} must be between ${min} and ${max} characters`
      );
    }
  }
}
```

**使用方式**

```typescript
// ✅ 簡化的錯誤處理
import { ValidationService } from '@suggar-daddy/common';

@Injectable()
export class PostService {
  async getPost(postId: string) {
    const post = await this.postRepository.findOne(postId);
    ValidationService.throwIfNotFound(post, 'Post', postId);
    return post; // TypeScript 知道 post 一定存在
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.postRepository.findOne(postId);
    ValidationService.throwIfNotFound(post, 'Post', postId);
    ValidationService.throwIfNotOwner(post.creatorId, userId, 'post');
    
    await this.postRepository.delete(postId);
  }
}

@Injectable()
export class WalletService {
  async withdraw(userId: string, amount: number) {
    ValidationService.throwIfBelowMinimum(amount, MIN_WITHDRAWAL_AMOUNT, 'Withdrawal amount');
    
    const wallet = await this.getWallet(userId);
    ValidationService.throwIfNotFound(wallet, 'Wallet');
    
    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }
    
    // 處理提現
  }
}
```

### 改進效果

- ✅ 減少 50+ 行重複代碼
- ✅ 統一錯誤訊息格式
- ✅ 更好的類型推導（TypeScript）
- ✅ 更易於測試
- ⏱️ **預估工時**: 3 小時

---

## 8️⃣ DTO 定義可能重複

### 問題描述

DTO 定義可能在多處重複。

### 需要檢查的位置

- `apps/payment-service/src/app/dto/`
- `apps/subscription-service/src/app/dto/`
- `libs/dto/`（可能已有定義）

### 建議方案

**統一 DTO 管理**

```typescript
// libs/dto/src/index.ts
export * from './user';
export * from './content';
export * from './payment';
export * from './subscription';
export * from './common';

// libs/dto/src/common/pagination.dto.ts
export class PaginationDto {
  @ApiProperty({ default: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({ default: 20, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

// libs/dto/src/common/id-param.dto.ts
export class IdParamDto {
  @ApiProperty()
  @IsString()
  id: string;
}
```

### 改進效果

- ✅ 確保 DTO 不重複
- ✅ 統一驗證規則
- ✅ 更易於維護
- ⏱️ **預估工時**: 4 小時

---

## 📊 改進優先級總結

### 🔴 P0 - 高優先級（本週完成）

| 項目 | 重複次數 | 工時 | 收益 |
|------|---------|------|------|
| 1. 日誌初始化 | 50+ | 2h | 減少 50 行 |
| 2. 服務客戶端 | 2-3 | 3h | 減少 100 行 |
| 3. ID 生成 | 4 | 1h | 減少 16 行 |

**小計**: 6 小時，減少 166 行

### 🟡 P1 - 中優先級（2 週內完成）

| 項目 | 重複次數 | 工時 | 收益 |
|------|---------|------|------|
| 4. 模組配置 | 13 | 2h | 減少 200 行 |
| 5. 事件生產者 | 3 | 2h | 減少 30 行 |
| 6. Redis 鍵 | 6+ | 2h | 減少 60 行 |
| 7. 錯誤處理 | 多 | 3h | 減少 50 行 |

**小計**: 9 小時，減少 340 行

### 🟢 P2 - 低優先級（1 個月內）

| 項目 | 重複次數 | 工時 | 收益 |
|------|---------|------|------|
| 8. DTO 統一 | ? | 4h | 待評估 |

**小計**: 4 小時

---

## 🎯 實施計劃

### Week 1: 高優先級重構

**Day 1-2: 日誌和 ID 生成**
- [ ] 創建 `@InjectLogger()` 裝飾器
- [ ] 創建 `IdGenerator` 工具類
- [ ] 更新 5 個主要服務
- [ ] 編寫單元測試

**Day 3-5: 服務客戶端**
- [ ] 創建 `BaseServiceClient` 基類
- [ ] 提取 `SubscriptionServiceClient` 到共享庫
- [ ] 創建 `UserServiceClient`
- [ ] 創建 `PaymentServiceClient`
- [ ] 更新所有使用處

### Week 2: 中優先級重構

**Day 1-2: 模組配置和事件生產者**
- [ ] 創建 `BaseMicroserviceModule`
- [ ] 創建 `BaseEventProducer`
- [ ] 更新所有微服務模組配置
- [ ] 重構所有事件生產者

**Day 3-5: Redis 和錯誤處理**
- [ ] 創建 `RedisKeys` 常數類
- [ ] 創建 `ValidationService`
- [ ] 更新所有 Redis 鍵使用
- [ ] 重構錯誤處理邏輯

### Week 3-4: 低優先級和優化

**Day 1-3: DTO 統一**
- [ ] 檢查所有 DTO 定義
- [ ] 合併重複的 DTO
- [ ] 統一到 `libs/dto`

**Day 4-5: 測試和文檔**
- [ ] 完善單元測試
- [ ] 更新文檔
- [ ] Code Review

---

## 📈 預期效果

### 代碼質量指標

| 指標 | 重構前 | 重構後 | 改善 |
|------|--------|--------|------|
| 重複代碼行數 | 506+ | ~100 | -80% |
| 模組數量 | 分散 | 集中 | +20% 可複用性 |
| 測試覆蓋率 | 未知 | 80%+ | +80% |
| 維護成本 | 高 | 低 | -50% |

### 開發效率指標

| 指標 | 重構前 | 重構後 | 改善 |
|------|--------|--------|------|
| 新服務創建時間 | 4h | 1h | -75% |
| Bug 修復時間 | 2h | 0.5h | -75% |
| 代碼審查時間 | 1h | 0.5h | -50% |

---

## 🔍 後續追蹤

### 定期檢查

- [ ] 每月檢查新的代碼重複
- [ ] 每季度更新共享庫
- [ ] 持續監控代碼質量指標

### 工具輔助

**使用 SonarQube 或類似工具**
```bash
# 安裝
npm install -D sonarqube-scanner

# 配置 sonar-project.properties
sonar.projectKey=suggar-daddy
sonar.sources=apps,libs
sonar.exclusions=**/node_modules/**,**/*.spec.ts

# 執行掃描
npm run sonar
```

**使用 jscpd（Copy/Paste Detector）**
```bash
# 安裝
npm install -D jscpd

# 執行
npx jscpd apps libs

# 生成報告
npx jscpd apps libs --format html -o reports/cpd.html
```

---

## 📝 變更日誌

| 日期 | 變更內容 | 負責人 |
|------|----------|--------|
| 2024-02-17 | 初始重複代碼分析 | Backend Team |
| - | - | - |

---

**最後更新**: 2024-02-17  
**版本**: 1.0.0  
**狀態**: ✅ 已完成

---

## 附錄: 檢查清單

### 重構檢查清單

- [ ] **日誌初始化**
  - [ ] 創建裝飾器
  - [ ] 更新所有服務
  - [ ] 編寫測試
  
- [ ] **模組配置**
  - [ ] 創建基礎模組
  - [ ] 更新所有微服務
  - [ ] 驗證功能正常
  
- [ ] **服務客戶端**
  - [ ] 創建基礎類
  - [ ] 提取到共享庫
  - [ ] 更新所有使用處
  
- [ ] **ID 生成**
  - [ ] 創建工具類
  - [ ] 更新所有服務
  - [ ] 編寫測試
  
- [ ] **事件生產者**
  - [ ] 創建基礎類
  - [ ] 重構所有生產者
  - [ ] 驗證事件發送
  
- [ ] **Redis 鍵**
  - [ ] 創建常數類
  - [ ] 更新所有使用
  - [ ] 驗證鍵名正確
  
- [ ] **錯誤處理**
  - [ ] 創建驗證服務
  - [ ] 重構錯誤處理
  - [ ] 統一錯誤訊息
  
- [ ] **DTO 統一**
  - [ ] 檢查重複
  - [ ] 合併 DTO
  - [ ] 統一驗證規則
