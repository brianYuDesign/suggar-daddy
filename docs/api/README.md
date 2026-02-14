# API 文檔完整指南

> **Sugar Daddy 專案 API 文檔配置與管理**  
> 整合自: API-DOCUMENTATION-PHASE1-SUMMARY.md, api-documentation-report.md

---

## 📚 目錄

1. [執行摘要](#執行摘要)
2. [當前狀態](#當前狀態)
3. [Swagger 配置指南](#swagger-配置指南)
4. [快速修復檢查清單](#快速修復檢查清單)
5. [最佳實踐](#最佳實踐)

---

## 執行摘要

### 整體評估

**評估日期**: 2024-01  
**評估範圍**: 10 個微服務，31 個 controllers，150+ API 端點

| 指標 | 數值 | 狀態 |
|------|------|------|
| **Swagger 配置完整度** | 20% → 80% | 🟢 改善中 |
| **已配置服務** | 10/10 | ✅ 完成 |
| **已配置 Controllers** | 3/31 (9.7%) | 🔴 待改進 |
| **DTO 文檔化率** | 0/200+ | 🔴 待處理 |
| **API 端點總數** | 150+ | - |
| **已文檔化端點** | ~15 (10%) | 🔴 待改進 |

### ✅ 已完成工作（階段 1）

#### 1. 啟用 Swagger 配置

修復了 **6 個服務**的 `main.ts` 文件：

1. **Admin Service** - 最複雜的服務（10 controllers, 50+ 端點）
2. **Auth Service** - 認證與授權
3. **User Service** - 用戶管理
4. **Matching Service** - 配對邏輯
5. **Notification Service** - 通知系統
6. **Messaging Service** - 消息系統

**已配置的服務**（原本就有）：
- Content Service
- Payment Service
- Subscription Service
- Media Service

#### 2. 問題識別

發現以下關鍵問題：

1. ❌ **所有 DTO 缺少 @ApiProperty** - 無法自動生成請求/響應體文檔
2. ❌ **Controllers 缺少裝飾器** - 僅 3/31 個 controller 有 @ApiTags
3. ❌ **端點缺少文檔** - 無 @ApiOperation 和 @ApiResponse
4. ❌ **認證端點未標註** - 缺少 @ApiBearerAuth()

---

## 當前狀態

### 🟢 已配置服務（10/10）

#### 1. Admin Service (`:3011`)

```typescript
// apps/admin-service/src/main.ts
setupSwagger(app, {
  title: 'Admin Service API',
  description: 'API documentation for Suggar Daddy Admin Service',
  version: '1.0',
  tag: 'Admin',
  path: 'api/docs',
});
```

**訪問**: `http://localhost:3011/api/docs`

**Controllers**:
- AdminController (10 controllers)
- Analytics, Audit, Monitoring
- User Management, Content Management
- Platform Statistics

#### 2. Auth Service (`:3002`)

```typescript
// apps/auth-service/src/main.ts
setupSwagger(app, {
  title: 'Auth Service API',
  description: 'API documentation for Suggar Daddy Authentication Service',
  version: '1.0',
  tag: 'Authentication',
  path: 'api/docs',
});
```

**訪問**: `http://localhost:3002/api/docs`

**Controllers**:
- AuthController
- OAuth Controller

#### 3. User Service (`:3001`)

```typescript
// apps/user-service/src/main.ts
setupSwagger(app, {
  title: 'User Service API',
  description: 'API documentation for Suggar Daddy User Service',
  version: '1.0',
  tag: 'Users',
  path: 'api/docs',
});
```

**訪問**: `http://localhost:3001/api/docs`

#### 4-10. 其他服務

| 服務 | 端口 | Swagger 路徑 | 狀態 |
|------|------|-------------|------|
| Content Service | 3005 | `/api/docs` | ✅ |
| Payment Service | 3007 | `/api/docs` | ✅ |
| Subscription Service | 3009 | `/api/docs` | ✅ |
| Media Service | 3006 | `/api/docs` | ✅ |
| Matching Service | 3003 | `/api/docs` | ✅ |
| Notification Service | 3004 | `/api/docs` | ✅ |
| Messaging Service | 3008 | `/api/docs` | ✅ |

### 📊 API Gateway 整合

**訪問**: `http://localhost:3000/api/docs`

API Gateway 整合所有微服務的 Swagger 文檔。

---

## Swagger 配置指南

### 1. 基本配置（已完成）

每個服務的 `main.ts` 應包含：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from '@app/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 啟用 CORS
  app.enableCors();
  
  // 設置全局前綴
  app.setGlobalPrefix('api');
  
  // 🔧 配置 Swagger
  setupSwagger(app, {
    title: 'Service Name API',
    description: 'API documentation for Service Name',
    version: '1.0',
    tag: 'ServiceTag',
    path: 'api/docs',
  });
  
  await app.listen(3000);
}
bootstrap();
```

### 2. Controller 層級配置（待完成）

為每個 Controller 添加 `@ApiTags` 和認證裝飾器：

```typescript
import { 
  Controller, 
  Get, 
  Post, 
  Body,
  UseGuards 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Users') // 📌 添加這個
@ApiBearerAuth()  // 📌 如果需要認證
@Controller('users')
export class UserController {
  
  @Get()
  @ApiOperation({ summary: 'Get all users' }) // 📌 添加操作描述
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    // ...
  }
  
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createUserDto: CreateUserDto) {
    // ...
  }
}
```

### 3. DTO 文檔化（待完成）

為所有 DTO 添加 `@ApiProperty` 裝飾器：

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEmail, 
  IsOptional,
  MinLength 
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'User password',
    minLength: 8,
    example: 'SecurePassword123!' 
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ 
    description: 'User display name',
    example: 'John Doe' 
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ 
    description: 'User type',
    enum: ['SUGAR_DADDY', 'SUGAR_BABY'],
    example: 'SUGAR_BABY' 
  })
  @IsEnum(['SUGAR_DADDY', 'SUGAR_BABY'])
  userType: 'SUGAR_DADDY' | 'SUGAR_BABY';
}
```

### 4. 認證配置

`setupSwagger` 函數已自動配置 JWT Bearer 認證：

```typescript
// libs/swagger/src/index.ts
export function setupSwagger(
  app: INestApplication,
  config: SwaggerConfig,
): void {
  const options = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addTag(config.tag)
    .addBearerAuth() // ✅ JWT 認證已配置
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(config.path, app, document);
}
```

在需要認證的 Controller 或端點上使用 `@ApiBearerAuth()`：

```typescript
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('protected')
export class ProtectedController {
  // 所有端點都需要 JWT
}
```

---

## 快速修復檢查清單

### 階段 1: 基本配置 ✅ 已完成

- [x] Admin Service - 啟用 Swagger
- [x] Auth Service - 啟用 Swagger
- [x] User Service - 啟用 Swagger
- [x] Matching Service - 啟用 Swagger
- [x] Notification Service - 啟用 Swagger
- [x] Messaging Service - 啟用 Swagger

### 階段 2: Controller 文檔化（待處理）

**高優先級**（面向用戶的 API）:

- [ ] **Auth Service**
  - [ ] AuthController - @ApiTags, @ApiOperation
  - [ ] OAuthController - @ApiTags, @ApiOperation

- [ ] **User Service**
  - [ ] UserController - @ApiTags, @ApiOperation
  - [ ] ProfileController - @ApiTags, @ApiOperation

- [ ] **Content Service**
  - [ ] ContentController - @ApiTags, @ApiOperation
  - [ ] PostController - @ApiTags, @ApiOperation

- [ ] **Payment Service**
  - [ ] PaymentController - @ApiTags, @ApiOperation
  - [ ] WalletController - @ApiTags, @ApiOperation

**中優先級**（核心業務邏輯）:

- [ ] **Matching Service**
- [ ] **Messaging Service**
- [ ] **Notification Service**
- [ ] **Subscription Service**

**低優先級**（管理和內部）:

- [ ] **Admin Service** (10 controllers)
- [ ] **Media Service**
- [ ] **DB Writer Service**

### 階段 3: DTO 文檔化（待處理）

**核心 DTOs** (`libs/dto/`):

認證相關:
- [ ] LoginDto
- [ ] RegisterDto
- [ ] RefreshTokenDto
- [ ] ChangePasswordDto

用戶相關:
- [ ] CreateUserDto
- [ ] UpdateUserDto
- [ ] UserProfileDto
- [ ] UserPreferencesDto

內容相關:
- [ ] CreatePostDto
- [ ] UpdatePostDto
- [ ] CreateCommentDto

支付相關:
- [ ] CreatePaymentIntentDto
- [ ] TipDto
- [ ] WalletDto

訂閱相關:
- [ ] CreateSubscriptionDto
- [ ] UpdateSubscriptionDto

### 階段 4: 響應文檔化（待處理）

為每個端點添加 `@ApiResponse`：

```typescript
@ApiResponse({ 
  status: 200, 
  description: 'Success',
  type: UserDto // 📌 指定響應類型
})
@ApiResponse({ 
  status: 404, 
  description: 'User not found' 
})
@ApiResponse({ 
  status: 401, 
  description: 'Unauthorized' 
})
```

---

## 最佳實踐

### 1. 組織結構

```typescript
@ApiTags('Users')              // 1. Tag 分組
@ApiBearerAuth()              // 2. 全局認證
@Controller('users')
export class UserController {
  
  @Get(':id')
  @ApiOperation({             // 3. 操作描述
    summary: 'Get user by ID',
    description: 'Retrieve a single user by their unique identifier'
  })
  @ApiParam({                 // 4. 路徑參數
    name: 'id',
    type: 'string',
    description: 'User UUID'
  })
  @ApiResponse({              // 5. 成功響應
    status: 200,
    description: 'User found',
    type: UserDto
  })
  @ApiResponse({              // 6. 錯誤響應
    status: 404,
    description: 'User not found'
  })
  findOne(@Param('id') id: string) {
    // ...
  }
}
```

### 2. DTO 範例

```typescript
export class CreateUserDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    minLength: 8,
    maxLength: 128
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({      // 可選字段
    description: 'Display name',
    example: 'John Doe',
    maxLength: 50
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiProperty({
    description: 'User type',
    enum: ['SUGAR_DADDY', 'SUGAR_BABY'],
    example: 'SUGAR_BABY'
  })
  @IsEnum(['SUGAR_DADDY', 'SUGAR_BABY'])
  userType: UserType;
}
```

### 3. 分頁響應

```typescript
export class PaginatedUsersDto {
  @ApiProperty({ type: [UserDto] })
  data: UserDto[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    type: PaginationMetaDto 
  })
  meta: PaginationMetaDto;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}
```

### 4. 錯誤響應

```typescript
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ 
    example: ['email must be a valid email'],
    type: [String]
  })
  message: string[];

  @ApiProperty({ example: '/api/users' })
  path: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}
```

### 5. 文件上傳

```typescript
@Post('upload')
@ApiOperation({ summary: 'Upload user avatar' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
    },
  },
})
@UseInterceptors(FileInterceptor('file'))
uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  // ...
}
```

---

## 訪問 Swagger 文檔

### 所有服務的 Swagger UI

| 服務 | 端口 | Swagger URL |
|------|------|-------------|
| API Gateway | 3000 | http://localhost:3000/api/docs |
| User Service | 3001 | http://localhost:3001/api/docs |
| Auth Service | 3002 | http://localhost:3002/api/docs |
| Matching Service | 3003 | http://localhost:3003/api/docs |
| Notification Service | 3004 | http://localhost:3004/api/docs |
| Content Service | 3005 | http://localhost:3005/api/docs |
| Media Service | 3006 | http://localhost:3006/api/docs |
| Payment Service | 3007 | http://localhost:3007/api/docs |
| Messaging Service | 3008 | http://localhost:3008/api/docs |
| Subscription Service | 3009 | http://localhost:3009/api/docs |
| Admin Service | 3011 | http://localhost:3011/api/docs |

### 啟動所有服務

```bash
# 使用 Nx 啟動所有服務
nx run-many --target=serve --all

# 或單獨啟動
nx serve api-gateway
nx serve auth-service
nx serve user-service
# ...
```

---

## 下一步

### 短期（1-2 週）

1. ✅ 完成所有服務的 Swagger 基本配置
2. 🔧 為所有 Controllers 添加 @ApiTags
3. 🔧 為核心 DTOs 添加 @ApiProperty

### 中期（1 個月）

4. 為所有端點添加 @ApiOperation 和 @ApiResponse
5. 完善錯誤響應文檔
6. 添加請求範例

### 長期（持續）

7. 自動生成 API 客戶端（TypeScript, Python）
8. API 版本管理
9. 自動化 API 測試

---

**最後更新**: 2024-01  
**維護者**: Backend Team

📚 **完整的 API 文檔讓開發更高效！**
