# API 版本控制指南

## 概述

本文檔定義了 Suggar Daddy 專案的 API 版本控制策略，確保 API 向後兼容、平滑過渡和清晰的版本管理。

## 目錄

- [為什麼需要 API 版本控制](#為什麼需要-api-版本控制)
- [版本控制策略](#版本控制策略)
- [實施方式](#實施方式)
- [使用指南](#使用指南)
- [版本棄用流程](#版本棄用流程)
- [最佳實踐](#最佳實踐)
- [示例](#示例)

---

## 為什麼需要 API 版本控制

### 問題場景

1. **破壞性變更**：修改 API 響應格式會導致現有客戶端崩潰
2. **向後兼容**：新功能需要在不影響舊客戶端的情況下發布
3. **平滑遷移**：允許客戶端按自己的節奏升級
4. **A/B 測試**：在生產環境中測試新版本 API

### 解決方案

實施版本控制可以：
- ✅ 保護現有客戶端不受破壞性變更影響
- ✅ 允許新舊版本共存
- ✅ 提供清晰的遷移路徑
- ✅ 支持版本棄用和下線流程

---

## 版本控制策略

### 1. 語義化版本

使用簡化的語義化版本：`v1`, `v2`, `v3`...

**版本號規則**：
- **主版本號**：有破壞性變更時遞增（例如：v1 -> v2）
- **無需次版本號**：向後兼容的變更不增加版本號

### 2. 版本控制方式

支持三種版本控制方式：

| 方式 | 示例 | 推薦度 | 說明 |
|------|------|--------|------|
| **URI 版本** | `/v1/users` | ⭐⭐⭐⭐⭐ | 最推薦，直觀清晰 |
| **Header 版本** | `X-API-Version: 1` | ⭐⭐⭐ | 適合內部服務 |
| **Query 參數** | `/users?version=1` | ⭐⭐ | 不推薦，混淆業務參數 |

**預設方式**：**URI 版本控制**（例如：`/v1/users`）

---

## 實施方式

### 核心組件

#### 1. ApiVersion 裝飾器

**位置**：`libs/common/src/lib/api-version.decorator.ts`

**用途**：標記 Controller 或 Route 的 API 版本

```typescript
import { ApiVersion } from '@suggar-daddy/common';

@Controller('users')
@ApiVersion('1')
export class UsersV1Controller {
  // v1 API 實現
}

@Controller('users')
@ApiVersion('2')
export class UsersV2Controller {
  // v2 API 實現
}
```

#### 2. ApiVersionMiddleware

**位置**：`libs/common/src/lib/api-version.middleware.ts`

**功能**：
- 提取和驗證 API 版本號
- 檢查版本是否受支持
- 對已棄用的版本發出警告
- 將版本號附加到 request 和 response

**使用方法**：
```typescript
import { ApiVersionMiddleware } from '@suggar-daddy/common';

// 在 main.ts 中註冊
app.use(new ApiVersionMiddleware({
  defaultVersion: '1',
  supportedVersions: ['1', '2'],
  deprecatedVersions: ['1'],
  type: 'uri', // 或 'header', 'query'
}));
```

---

## 使用指南

### 方式 1：URI 版本控制（推薦）

#### 步驟 1：配置路由前綴

在 `main.ts` 中設置全局前綴：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ApiVersionMiddleware } from '@suggar-daddy/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 設置全局前綴（可選）
  app.setGlobalPrefix('api');

  // 啟用版本控制中間件
  app.use(
    new ApiVersionMiddleware({
      defaultVersion: '1',
      supportedVersions: ['1', '2'],
      type: 'uri',
    })
  );

  await app.listen(3000);
}
bootstrap();
```

#### 步驟 2：創建版本化 Controller

**v1 Controller**：
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiVersion } from '@suggar-daddy/common';

@Controller('v1/users')
@ApiVersion('1')
export class UsersV1Controller {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    // v1 實現：返回簡化的用戶列表
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // v1 實現
    return this.userService.findById(id);
  }
}
```

**v2 Controller**：
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { ApiVersion } from '@suggar-daddy/common';

@Controller('v2/users')
@ApiVersion('2')
export class UsersV2Controller {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    // v2 實現：支持分頁
    return this.userService.findAllPaginated({ page, limit });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // v2 實現：返回更詳細的用戶信息
    return this.userService.findByIdDetailed(id);
  }
}
```

#### 步驟 3：在 Module 中註冊

```typescript
import { Module } from '@nestjs/common';
import { UsersV1Controller } from './users-v1.controller';
import { UsersV2Controller } from './users-v2.controller';
import { UserService } from './user.service';

@Module({
  controllers: [
    UsersV1Controller,
    UsersV2Controller,
  ],
  providers: [UserService],
})
export class UserModule {}
```

### 方式 2：Header 版本控制

**適用場景**：內部微服務之間的通信

**配置**：
```typescript
app.use(
  new ApiVersionMiddleware({
    defaultVersion: '1',
    supportedVersions: ['1', '2'],
    type: 'header',
    header: 'X-API-Version', // 自定義 Header 名稱
  })
);
```

**使用**：
```bash
curl -H "X-API-Version: 2" http://localhost:3000/users
```

### 方式 3：Query 參數版本控制

**不推薦**，會與業務查詢參數混淆

**配置**：
```typescript
app.use(
  new ApiVersionMiddleware({
    defaultVersion: '1',
    supportedVersions: ['1', '2'],
    type: 'query',
  })
);
```

**使用**：
```bash
curl http://localhost:3000/users?version=2
```

---

## 版本棄用流程

### 階段 1：宣布棄用

**時間點**：發布新版本時

**操作**：
1. 在配置中標記為已棄用
2. 在響應頭中添加棄用警告
3. 更新文檔

**配置**：
```typescript
app.use(
  new ApiVersionMiddleware({
    defaultVersion: '2',
    supportedVersions: ['1', '2'],
    deprecatedVersions: ['1'], // 標記 v1 為已棄用
    type: 'uri',
  })
);
```

**響應頭**：
```
HTTP/1.1 200 OK
X-API-Version: 1
X-API-Deprecated: true
X-API-Deprecation-Info: Version 1 is deprecated. Please upgrade to 2.
```

### 階段 2：棄用期

**時長**：至少 6 個月

**操作**：
1. 持續監控 v1 API 使用情況
2. 通知主要客戶端進行升級
3. 記錄和分析遷移進度

**監控示例**：
```typescript
@Controller('v1/users')
@ApiVersion('1')
export class UsersV1Controller {
  private readonly logger = new Logger(UsersV1Controller.name);

  @Get()
  async findAll(@Req() req: Request) {
    // 記錄已棄用 API 的使用
    this.logger.warn(
      `Deprecated API v1 used by ${req.ip} - Correlation ID: ${req.correlationId}`
    );
    
    return this.userService.findAll();
  }
}
```

### 階段 3：下線

**條件**：
- 棄用期結束（至少 6 個月）
- v1 API 使用率 < 5%
- 所有主要客戶端已遷移

**操作**：
1. 從 `supportedVersions` 中移除 v1
2. 刪除 v1 Controller
3. 更新文檔

**配置**：
```typescript
app.use(
  new ApiVersionMiddleware({
    defaultVersion: '2',
    supportedVersions: ['2', '3'], // 移除 v1
    deprecatedVersions: ['2'], // v2 進入棄用期
    type: 'uri',
  })
);
```

---

## 最佳實踐

### 1. 何時需要新版本

**需要新版本的情況**（破壞性變更）：
- ✅ 修改響應字段名稱或類型
- ✅ 移除響應或請求字段
- ✅ 修改 API 行為（例如：分頁邏輯）
- ✅ 修改錯誤響應格式
- ✅ 修改認證方式

**不需要新版本的情況**（向後兼容）：
- ✅ 添加新的響應字段（可選）
- ✅ 添加新的 API 端點
- ✅ 修復 bug
- ✅ 性能優化
- ✅ 內部重構

### 2. 版本共享 Service

**推薦**：多個版本共享同一個 Service，在 Controller 層做適配

```typescript
@Injectable()
export class UserService {
  async findAll() {
    // 共享的業務邏輯
    return this.userRepository.find();
  }

  async findAllPaginated(options: PaginationOptions) {
    // v2 新增的分頁邏輯
    return this.userRepository.findWithPagination(options);
  }
}

// v1 Controller
@Controller('v1/users')
export class UsersV1Controller {
  @Get()
  async findAll() {
    const users = await this.userService.findAll();
    // 適配 v1 響應格式
    return users.map(u => ({ id: u.id, name: u.displayName }));
  }
}

// v2 Controller
@Controller('v2/users')
export class UsersV2Controller {
  @Get()
  async findAll(@Query() query: PaginationQuery) {
    const result = await this.userService.findAllPaginated(query);
    // v2 響應格式（包含更多字段）
    return {
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }
}
```

### 3. 使用 DTO 版本化

為不同版本創建不同的 DTO：

```typescript
// v1 DTO
export class UserResponseV1Dto {
  id: string;
  name: string;
}

// v2 DTO
export class UserResponseV2Dto {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  createdAt: Date;
}
```

### 4. 文檔版本化

使用 Swagger 支持多版本文檔：

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // v1 文檔
  const v1Document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Suggar Daddy API')
      .setVersion('1.0')
      .build(),
    {
      include: [UsersV1Controller],
    }
  );
  SwaggerModule.setup('api/v1/docs', app, v1Document);

  // v2 文檔
  const v2Document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Suggar Daddy API')
      .setVersion('2.0')
      .build(),
    {
      include: [UsersV2Controller],
    }
  );
  SwaggerModule.setup('api/v2/docs', app, v2Document);

  await app.listen(3000);
}
bootstrap();
```

### 5. 測試多版本

確保不同版本的測試獨立：

```typescript
describe('UsersV1Controller (e2e)', () => {
  it('/v1/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/v1/users')
      .expect(200)
      .expect((res) => {
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).not.toHaveProperty('email'); // v1 不包含 email
      });
  });
});

describe('UsersV2Controller (e2e)', () => {
  it('/v2/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/v2/users')
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0]).toHaveProperty('id');
        expect(res.body.data[0]).toHaveProperty('displayName');
        expect(res.body.data[0]).toHaveProperty('email'); // v2 包含 email
        expect(res.body).toHaveProperty('pagination');
      });
  });
});
```

---

## 示例

### 完整示例：User API v1 -> v2 遷移

#### v1 API（原始版本）

**特性**：
- 簡單的用戶列表（無分頁）
- 最小化的用戶信息

**Controller**：
```typescript
@Controller('v1/users')
@ApiVersion('1')
@ApiTags('Users V1')
export class UsersV1Controller {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (v1)' })
  async findAll(): Promise<UserResponseV1Dto[]> {
    const users = await this.userService.findAll();
    return users.map(u => ({
      id: u.id,
      name: u.displayName,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (v1)' })
  async findOne(@Param('id') id: string): Promise<UserResponseV1Dto> {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User', id);
    }
    return {
      id: user.id,
      name: user.displayName,
    };
  }
}
```

**DTO**：
```typescript
export class UserResponseV1Dto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
```

**響應示例**：
```json
// GET /v1/users
[
  { "id": "1", "name": "Alice" },
  { "id": "2", "name": "Bob" }
]
```

#### v2 API（新版本）

**特性**：
- 支持分頁
- 更詳細的用戶信息
- 標準化響應格式

**Controller**：
```typescript
@Controller('v2/users')
@ApiVersion('2')
@ApiTags('Users V2')
export class UsersV2Controller {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (v2 - with pagination)' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ): Promise<PaginatedResponse<UserResponseV2Dto>> {
    const result = await this.userService.findAllPaginated({ page, limit });
    return {
      data: result.items.map(u => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        createdAt: u.createdAt,
      })),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (v2 - detailed)' })
  async findOne(@Param('id') id: string): Promise<UserResponseV2Dto> {
    const user = await this.userService.findByIdDetailed(id);
    if (!user) {
      throw new NotFoundException('User', id);
    }
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
```

**DTO**：
```typescript
export class UserResponseV2Dto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  avatarUrl: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  createdAt: Date;
}
```

**響應示例**：
```json
// GET /v2/users?page=1&limit=10
{
  "data": [
    {
      "id": "1",
      "displayName": "Alice",
      "email": "alice@example.com",
      "avatarUrl": "https://...",
      "role": "subscriber",
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "2",
      "displayName": "Bob",
      "email": "bob@example.com",
      "avatarUrl": "https://...",
      "role": "creator",
      "createdAt": "2026-01-02T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

#### 棄用和遷移

**階段 1：宣布棄用（2026-02-12）**

在 `main.ts` 中配置：
```typescript
app.use(
  new ApiVersionMiddleware({
    defaultVersion: '2',
    supportedVersions: ['1', '2'],
    deprecatedVersions: ['1'],
    type: 'uri',
  })
);
```

響應頭會包含：
```
X-API-Version: 1
X-API-Deprecated: true
X-API-Deprecation-Info: Version 1 is deprecated. Please upgrade to 2.
```

**階段 2：棄用期（2026-02-12 ~ 2026-08-12）**

期間持續監控和通知客戶端升級。

**階段 3：下線（2026-08-12）**

移除 v1 支持：
```typescript
app.use(
  new ApiVersionMiddleware({
    defaultVersion: '2',
    supportedVersions: ['2'],
    deprecatedVersions: [],
    type: 'uri',
  })
);
```

刪除 `UsersV1Controller`。

---

## 總結

API 版本控制是大型專案必備的機制，帶來以下好處：

✅ **向後兼容**：舊客戶端不受新變更影響  
✅ **平滑遷移**：客戶端可以按自己的節奏升級  
✅ **清晰明確**：版本號直觀反映 API 狀態  
✅ **易於維護**：不同版本的代碼隔離  
✅ **安全下線**：有計劃地棄用和移除舊版本

遵循本指南可以確保 API 演進過程穩定、可控。

---

## 相關文檔

- [錯誤處理標準化指南](./ERROR_HANDLING_GUIDE.md)
- [Redis 一致性策略](./REDIS_DB_CONSISTENCY_GUIDE.md)
- [Kafka DLQ 指南](./KAFKA_DLQ_GUIDE.md)
