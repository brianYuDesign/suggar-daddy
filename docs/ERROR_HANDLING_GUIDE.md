# 錯誤處理標準化指南

## 概述

本文檔定義了 Suggar Daddy 專案的統一錯誤處理標準，確保所有微服務的錯誤響應格式一致、可追踪、易於調試。

## 目錄

- [核心組件](#核心組件)
- [標準化錯誤響應](#標準化錯誤響應)
- [錯誤碼體系](#錯誤碼體系)
- [使用指南](#使用指南)
- [最佳實踐](#最佳實踐)
- [遷移指南](#遷移指南)
- [測試](#測試)

---

## 核心組件

### 1. HttpExceptionFilter（全局異常過濾器）

**位置**：`libs/common/src/lib/http-exception.filter.ts`

**功能**：
- 捕獲所有未處理的異常
- 返回標準化的錯誤響應
- 記錄錯誤日誌（包含上下文信息）
- 根據錯誤嚴重程度分級記錄

**使用方法**：
```typescript
import { HttpExceptionFilter } from '@suggar-daddy/common';

// 在 main.ts 中全局註冊
app.useGlobalFilters(new HttpExceptionFilter());
```

### 2. RequestTrackingInterceptor（請求追踪攔截器）

**位置**：`libs/common/src/lib/request-tracking.interceptor.ts`

**功能**：
- 為每個請求生成唯一的 Correlation ID
- 記錄請求開始和結束時間
- 計算請求耗時
- 自動附加 Correlation ID 到錯誤響應

**使用方法**：
```typescript
import { RequestTrackingInterceptor } from '@suggar-daddy/common';

// 在 main.ts 中全局註冊
app.useGlobalInterceptors(new RequestTrackingInterceptor());
```

### 3. BusinessException（業務異常基類）

**位置**：`libs/common/src/lib/business-exception.ts`

**功能**：
- 所有業務異常的基類
- 自動映射錯誤碼到 HTTP 狀態碼
- 支持附加詳細錯誤信息

**內建異常類**：
- `ValidationException` - 驗證錯誤
- `UnauthorizedException` - 未授權
- `ForbiddenException` - 禁止訪問
- `NotFoundException` - 資源未找到
- `ConflictException` - 資源衝突
- `PaymentException` - 支付錯誤
- `InsufficientBalanceException` - 餘額不足
- `SubscriptionException` - 訂閱錯誤

### 4. ErrorCode（錯誤碼枚舉）

**位置**：`libs/common/src/lib/error-codes.enum.ts`

**分類**：
- **1xxx**：認證和授權錯誤
- **2xxx**：驗證錯誤
- **3xxx**：資源錯誤
- **4xxx**：業務邏輯錯誤
- **5xxx**：系統錯誤
- **6xxx**：限流錯誤
- **9999**：未知錯誤

---

## 標準化錯誤響應

### 響應格式

所有錯誤響應遵循以下格式：

```json
{
  "code": "ERR_3001",
  "message": "User with identifier '12345' not found",
  "timestamp": "2026-02-12T10:30:00.000Z",
  "path": "/api/users/12345",
  "method": "GET",
  "statusCode": 404,
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "details": {
    "resource": "User",
    "identifier": "12345"
  }
}
```

### 字段說明

| 字段 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `code` | string | ✅ | 標準化錯誤碼（例如：ERR_3001） |
| `message` | string | ✅ | 人類可讀的錯誤消息 |
| `timestamp` | string | ✅ | 錯誤發生時間（ISO 8601 格式） |
| `path` | string | ✅ | 請求路徑 |
| `method` | string | ✅ | HTTP 方法 |
| `statusCode` | number | ✅ | HTTP 狀態碼 |
| `correlationId` | string | ✅ | 請求追踪 ID（用於日誌關聯） |
| `details` | object | ❌ | 額外的錯誤詳情（可選） |
| `stack` | string | ❌ | 堆疊追踪（僅開發環境） |

---

## 錯誤碼體系

### 認證和授權（1xxx）

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| ERR_1001 | 401 | 未授權訪問 |
| ERR_1002 | 401 | Token 無效 |
| ERR_1003 | 401 | Token 已過期 |
| ERR_1004 | 403 | 權限不足 |
| ERR_1005 | 401 | 憑證無效 |

### 驗證錯誤（2xxx）

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| ERR_2001 | 400 | 驗證錯誤 |
| ERR_2002 | 400 | 輸入無效 |
| ERR_2003 | 400 | 缺少必填字段 |
| ERR_2004 | 400 | 格式無效 |
| ERR_2005 | 409 | 重複條目 |

### 資源錯誤（3xxx）

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| ERR_3001 | 404 | 資源未找到 |
| ERR_3002 | 409 | 資源已存在 |
| ERR_3003 | 409 | 資源衝突 |
| ERR_3004 | 423 | 資源已鎖定 |

### 業務邏輯錯誤（4xxx）

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| ERR_4001 | 422 | 業務規則違反 |
| ERR_4002 | 402 | 餘額不足 |
| ERR_4003 | 402 | 支付失敗 |
| ERR_4004 | 403 | 訂閱未激活 |
| ERR_4005 | 403 | 操作不允許 |

### 系統錯誤（5xxx）

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| ERR_5001 | 500 | 內部服務器錯誤 |
| ERR_5002 | 503 | 服務不可用 |
| ERR_5003 | 500 | 數據庫錯誤 |
| ERR_5004 | 502 | 外部服務錯誤 |
| ERR_5005 | 500 | 配置錯誤 |

### 限流錯誤（6xxx）

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| ERR_6001 | 429 | 超過限流閾值 |
| ERR_6002 | 429 | 請求過多 |

---

## 使用指南

### 基本用法

**推薦方式**：使用內建的異常類

```typescript
import { 
  NotFoundException, 
  ConflictException, 
  ValidationException 
} from '@suggar-daddy/common';

// 資源未找到
throw new NotFoundException('User', userId);

// 資源衝突
throw new ConflictException('Email already exists', { email: dto.email });

// 驗證錯誤
throw new ValidationException('Invalid email format', {
  field: 'email',
  value: dto.email
});
```

**不推薦方式**：使用 NestJS 標準異常

```typescript
// ❌ 不推薦（錯誤碼不統一）
throw new NotFoundException('User not found');

// ✅ 推薦（使用統一的異常類）
throw new NotFoundException('User', userId);
```

### 自定義異常

如果需要創建新的業務異常類：

```typescript
import { BusinessException, ErrorCode } from '@suggar-daddy/common';

export class CustomException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, details);
  }
}

// 使用
throw new CustomException('Custom error message', { customField: 'value' });
```

### 在 Controller 中使用

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { NotFoundException } from '@suggar-daddy/common';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    
    if (!user) {
      throw new NotFoundException('User', id);
    }
    
    return user;
  }
}
```

### 在 Service 中使用

```typescript
import { Injectable } from '@nestjs/common';
import { 
  NotFoundException, 
  ConflictException,
  InsufficientBalanceException 
} from '@suggar-daddy/common';

@Injectable()
export class WalletService {
  async deductBalance(userId: string, amount: number) {
    const wallet = await this.getWallet(userId);
    
    if (!wallet) {
      throw new NotFoundException('Wallet', userId);
    }
    
    if (wallet.balance < amount) {
      throw new InsufficientBalanceException(amount, wallet.balance);
    }
    
    // 執行扣款邏輯...
  }
}
```

---

## 最佳實踐

### 1. 始終使用 BusinessException 子類

**✅ 推薦**：
```typescript
throw new NotFoundException('User', userId);
throw new ValidationException('Invalid email', { field: 'email' });
```

**❌ 不推薦**：
```typescript
throw new Error('User not found');
throw new HttpException('Invalid email', 400);
```

### 2. 提供有意義的錯誤消息

**✅ 推薦**：
```typescript
throw new NotFoundException('User', userId, {
  searchedBy: 'id',
  searchValue: userId
});
```

**❌ 不推薦**：
```typescript
throw new NotFoundException('Not found');
```

### 3. 附加詳細錯誤信息

**✅ 推薦**：
```typescript
throw new PaymentException('Stripe payment failed', {
  provider: 'Stripe',
  errorCode: 'card_declined',
  cardLast4: '4242',
  amount: 1000
});
```

**❌ 不推薦**：
```typescript
throw new PaymentException('Payment failed');
```

### 4. 使用 Correlation ID 追踪錯誤

所有錯誤響應自動包含 `correlationId`，用於關聯請求日誌：

```typescript
// 在日誌中搜索 correlationId
this.logger.error(`[${correlationId}] Payment processing failed`, error.stack);
```

### 5. 不要在響應中暴露敏感信息

**✅ 推薦**：
```typescript
throw new UnauthorizedException('Invalid credentials');
```

**❌ 不推薦**：
```typescript
throw new UnauthorizedException('Password mismatch for user@example.com');
```

### 6. 使用適當的 HTTP 狀態碼

確保錯誤碼映射到正確的 HTTP 狀態碼：

| 狀態碼範圍 | 用途 |
|-----------|------|
| 400-499 | 客戶端錯誤（請求錯誤、驗證失敗、權限不足） |
| 500-599 | 服務器錯誤（內部錯誤、依賴服務失敗） |

### 7. 記錄適當級別的日誌

- **5xx 錯誤**：`logger.error()` - 需要立即關注
- **4xx 錯誤**：`logger.warn()` - 可能的濫用或錯誤使用
- **正常流程**：`logger.log()` 或 `logger.debug()`

### 8. 避免捕獲所有異常

**✅ 推薦**：
```typescript
try {
  await this.paymentService.processPayment(userId, amount);
} catch (error) {
  if (error instanceof PaymentException) {
    // 處理支付錯誤
    throw error;
  }
  throw new PaymentException('Unexpected payment error', { originalError: error.message });
}
```

**❌ 不推薦**：
```typescript
try {
  await this.paymentService.processPayment(userId, amount);
} catch (error) {
  // 吞掉所有錯誤
  return { success: false };
}
```

---

## 遷移指南

### 從 NestJS 標準異常遷移

**步驟 1**：識別現有的異常使用

搜索項目中的異常使用：
```bash
# 搜索標準 NestJS 異常
grep -r "throw new NotFoundException" apps/
grep -r "throw new BadRequestException" apps/
grep -r "throw new ConflictException" apps/
```

**步驟 2**：替換為 BusinessException

| NestJS 標準異常 | BusinessException 替代 |
|----------------|----------------------|
| `NotFoundException` | `NotFoundException` |
| `BadRequestException` | `ValidationException` |
| `ConflictException` | `ConflictException` |
| `UnauthorizedException` | `UnauthorizedException` |
| `ForbiddenException` | `ForbiddenException` |

**步驟 3**：更新導入

```typescript
// 舊的導入
import { NotFoundException } from '@nestjs/common';

// 新的導入
import { NotFoundException } from '@suggar-daddy/common';
```

**步驟 4**：更新異常使用

```typescript
// 舊的用法
throw new NotFoundException('User not found');

// 新的用法
throw new NotFoundException('User', userId);
```

### 遷移示例

**遷移前**：
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

@Injectable()
export class UserService {
  async findById(id: string) {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    return this.userRepository.save(dto);
  }
}
```

**遷移後**：
```typescript
import { Injectable } from '@nestjs/common';
import { 
  NotFoundException, 
  ConflictException 
} from '@suggar-daddy/common';

@Injectable()
export class UserService {
  async findById(id: string) {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User', id);
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists', {
        email: dto.email
      });
    }
    return this.userRepository.save(dto);
  }
}
```

---

## 測試

### 測試錯誤處理

**位置**：`/_debug/errors/*`（僅開發環境）

測試各種異常類型：

```bash
# 測試驗證錯誤
curl http://localhost:3000/_debug/errors/validation

# 測試資源未找到
curl http://localhost:3000/_debug/errors/not-found

# 測試衝突錯誤
curl http://localhost:3000/_debug/errors/conflict

# 測試支付錯誤
curl http://localhost:3000/_debug/errors/payment

# 查看所有測試端點
curl http://localhost:3000/_debug/errors
```

### 單元測試示例

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@suggar-daddy/common';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should throw NotFoundException when user not found', async () => {
    jest.spyOn(service['userRepository'], 'findOne').mockResolvedValue(null);

    await expect(service.findById('non-existent-id')).rejects.toThrow(
      NotFoundException
    );
  });

  it('should throw ConflictException when email already exists', async () => {
    jest.spyOn(service, 'findByEmail').mockResolvedValue({ id: '123' } as any);

    await expect(
      service.create({ email: 'existing@example.com' } as any)
    ).rejects.toThrow(ConflictException);
  });
});
```

### E2E 測試示例

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users/:id (GET) - should return 404 with standard error format', () => {
    return request(app.getHttpServer())
      .get('/users/non-existent-id')
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('code', 'ERR_3001');
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('path');
        expect(res.body).toHaveProperty('method', 'GET');
        expect(res.body).toHaveProperty('statusCode', 404);
        expect(res.body).toHaveProperty('correlationId');
      });
  });
});
```

---

## 附錄

### Correlation ID 流程

```
客戶端請求
    │
    ├─→ RequestTrackingInterceptor
    │     └─→ 生成/提取 Correlation ID
    │
    ├─→ Controller/Service
    │     └─→ 業務邏輯執行
    │
    ├─→ 異常發生
    │
    └─→ HttpExceptionFilter
          ├─→ 附加 Correlation ID
          ├─→ 記錄錯誤日誌
          └─→ 返回標準化響應
```

### 日誌關聯

使用 Correlation ID 在日誌系統中關聯請求：

```typescript
// 在 Service 中記錄日誌
this.logger.log(`[${req.correlationId}] Processing payment for user ${userId}`);

// 在異常處理中記錄
this.logger.error(`[${req.correlationId}] Payment failed`, error.stack);
```

在 ELK、CloudWatch Logs 等系統中搜索 Correlation ID 可以追踪整個請求鏈路。

### 相關文檔

- [Redis 一致性策略](./REDIS_DB_CONSISTENCY_GUIDE.md)
- [Kafka DLQ 指南](./KAFKA_DLQ_GUIDE.md)

---

## 總結

統一的錯誤處理系統帶來以下好處：

✅ **一致性**：所有服務的錯誤響應格式統一  
✅ **可追踪性**：Correlation ID 讓請求鏈路清晰可見  
✅ **易於調試**：詳細的錯誤信息和上下文  
✅ **標準化**：錯誤碼體系讓前端可以統一處理  
✅ **可維護性**：異常分類清晰，易於擴展

遵循本指南可以確保專案的錯誤處理質量和一致性。
