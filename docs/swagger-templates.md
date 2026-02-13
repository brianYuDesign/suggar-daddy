# Swagger 裝飾器範本

本文檔提供標準化的 Swagger 裝飾器範本，供開發人員快速複製使用。

---

## 📑 目錄

1. [Controller 範本](#controller-範本)
2. [DTO 範本](#dto-範本)
3. [常見端點範本](#常見端點範本)
4. [檔案上傳範本](#檔案上傳範本)
5. [分頁範本](#分頁範本)
6. [錯誤處理範本](#錯誤處理範本)

---

## Controller 範本

### 基本 Controller（需認證）

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('YourResource')  // 替換為你的資源名稱（複數形式）
@ApiBearerAuth('JWT-auth')  // 需要 JWT 認證
@Controller('your-resource')  // 替換為你的路由
export class YourResourceController {
  constructor(private readonly yourService: YourService) {}

  // 端點實作...
}
```

### 混合認證 Controller（部分公開）

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Public } from '@suggar-daddy/auth';

@ApiTags('YourResource')
@Controller('your-resource')
export class YourResourceController {
  
  @Public()  // 公開端點
  @Get('public')
  @ApiOperation({ summary: '公開端點 - 無需認證' })
  async publicEndpoint() {
    // ...
  }

  @ApiBearerAuth('JWT-auth')  // 需認證端點
  @Get('private')
  @ApiOperation({ summary: '私有端點 - 需要認證' })
  async privateEndpoint() {
    // ...
  }
}
```

---

## DTO 範本

### 建立資源 DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEmail, 
  IsInt, 
  IsBoolean,
  MinLength, 
  MaxLength,
  Min,
  Max 
} from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    description: '必填字串欄位',
    example: '範例文字',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: '選填字串欄位',
    example: '範例描述',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: '整數欄位',
    example: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  amount: number;

  @ApiProperty({
    description: '布林值欄位',
    example: true,
    default: false,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: '列舉欄位',
    example: 'option1',
    enum: ['option1', 'option2', 'option3'],
  })
  @IsIn(['option1', 'option2', 'option3'])
  type: 'option1' | 'option2' | 'option3';
}
```

### 更新資源 DTO

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateResourceDto } from './create-resource.dto';

// 自動將所有屬性變為可選
export class UpdateResourceDto extends PartialType(CreateResourceDto) {}
```

### 查詢參數 DTO

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryResourceDto {
  @ApiPropertyOptional({
    description: '搜尋關鍵字',
    example: 'keyword',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '篩選狀態',
    example: 'active',
    enum: ['active', 'inactive', 'pending'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'pending'])
  status?: string;

  @ApiPropertyOptional({
    description: '頁碼（從 1 開始）',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每頁筆數',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

### 響應 DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ResourceDto {
  @ApiProperty({
    description: '資源 ID',
    example: 'cm4abc123xyz',
  })
  id: string;

  @ApiProperty({
    description: '資源名稱',
    example: '範例資源',
  })
  name: string;

  @ApiProperty({
    description: '創建時間',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新時間',
    example: '2024-01-15T15:45:00.000Z',
  })
  updatedAt: Date;
}
```

---

## 常見端點範本

### GET 取得列表（分頁）

```typescript
@Get()
@ApiOperation({ 
  summary: '取得資源列表',
  description: '支援分頁、搜尋和篩選的資源列表' 
})
@ApiQuery({ name: 'page', required: false, type: Number, description: '頁碼（預設 1）' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: '每頁筆數（預設 20）' })
@ApiQuery({ name: 'search', required: false, type: String, description: '搜尋關鍵字' })
@ApiResponse({ 
  status: 200, 
  description: '成功取得列表',
  type: [ResourceDto],  // 或 PaginatedResponseDto<ResourceDto>
})
@ApiResponse({ status: 401, description: '未認證' })
@ApiResponse({ status: 500, description: '伺服器錯誤' })
async findAll(@Query() query: QueryResourceDto) {
  return this.service.findAll(query);
}
```

### GET 取得單一資源

```typescript
@Get(':id')
@ApiOperation({ 
  summary: '取得資源詳情',
  description: '根據 ID 取得特定資源的完整資訊' 
})
@ApiParam({ 
  name: 'id', 
  description: '資源 ID',
  example: 'cm4abc123xyz',
})
@ApiResponse({ 
  status: 200, 
  description: '成功取得資源',
  type: ResourceDto,
})
@ApiResponse({ status: 404, description: '資源不存在' })
@ApiResponse({ status: 401, description: '未認證' })
async findOne(@Param('id') id: string) {
  return this.service.findOne(id);
}
```

### POST 建立資源

```typescript
@Post()
@ApiOperation({ 
  summary: '建立資源',
  description: '建立新的資源項目' 
})
@ApiResponse({ 
  status: 201, 
  description: '資源建立成功',
  type: ResourceDto,
})
@ApiResponse({ 
  status: 400, 
  description: '驗證失敗 - 請檢查請求參數',
})
@ApiResponse({ status: 401, description: '未認證' })
@ApiResponse({ status: 500, description: '伺服器錯誤' })
async create(@Body() dto: CreateResourceDto) {
  return this.service.create(dto);
}
```

### PUT/PATCH 更新資源

```typescript
@Put(':id')
@ApiOperation({ 
  summary: '更新資源',
  description: '更新指定 ID 的資源' 
})
@ApiParam({ 
  name: 'id', 
  description: '資源 ID',
  example: 'cm4abc123xyz',
})
@ApiResponse({ 
  status: 200, 
  description: '資源更新成功',
  type: ResourceDto,
})
@ApiResponse({ status: 400, description: '驗證失敗' })
@ApiResponse({ status: 404, description: '資源不存在' })
@ApiResponse({ status: 401, description: '未認證' })
@ApiResponse({ status: 403, description: '無權限操作此資源' })
async update(
  @Param('id') id: string,
  @Body() dto: UpdateResourceDto,
) {
  return this.service.update(id, dto);
}
```

### DELETE 刪除資源

```typescript
@Delete(':id')
@ApiOperation({ 
  summary: '刪除資源',
  description: '永久刪除指定 ID 的資源' 
})
@ApiParam({ 
  name: 'id', 
  description: '資源 ID',
  example: 'cm4abc123xyz',
})
@ApiResponse({ 
  status: 204, 
  description: '資源刪除成功（無回傳內容）',
})
@ApiResponse({ status: 404, description: '資源不存在' })
@ApiResponse({ status: 401, description: '未認證' })
@ApiResponse({ status: 403, description: '無權限刪除此資源' })
async remove(@Param('id') id: string) {
  await this.service.remove(id);
  // 通常 DELETE 成功後回傳 204 No Content
}
```

### POST 子資源操作（如按讚、收藏）

```typescript
@Post(':id/like')
@ApiOperation({ 
  summary: '按讚資源',
  description: '為指定資源按讚' 
})
@ApiParam({ 
  name: 'id', 
  description: '資源 ID',
  example: 'cm4abc123xyz',
})
@ApiResponse({ 
  status: 200, 
  description: '按讚成功',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      likeCount: { type: 'number', example: 42 },
    },
  },
})
@ApiResponse({ status: 404, description: '資源不存在' })
@ApiResponse({ status: 409, description: '已經按過讚' })
async like(@Param('id') id: string, @CurrentUser('userId') userId: string) {
  return this.service.like(id, userId);
}
```

---

## 檔案上傳範本

### 單檔上傳

```typescript
import { Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
@ApiOperation({ 
  summary: '上傳單個檔案',
  description: '支援圖片、影片等多媒體檔案上傳' 
})
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: '檔案上傳表單',
  schema: {
    type: 'object',
    required: ['file'],
    properties: {
      file: {
        type: 'string',
        format: 'binary',
        description: '要上傳的檔案',
      },
      userId: {
        type: 'string',
        description: '用戶 ID',
        example: 'user123',
      },
      folder: {
        type: 'string',
        description: '儲存資料夾名稱（選填）',
        example: 'avatars',
      },
    },
  },
})
@ApiResponse({ 
  status: 201, 
  description: '檔案上傳成功',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'file123' },
      url: { type: 'string', example: 'https://cdn.example.com/file.jpg' },
      publicId: { type: 'string', example: 'avatars/abc123' },
      size: { type: 'number', example: 1024000 },
      mimeType: { type: 'string', example: 'image/jpeg' },
    },
  },
})
@ApiResponse({ status: 400, description: '檔案格式不支援或檔案太大' })
@ApiResponse({ status: 401, description: '未認證' })
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  return this.mediaService.upload(file);
}
```

### 多檔上傳

```typescript
import { Post, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

@Post('upload-multiple')
@UseInterceptors(FilesInterceptor('files', 10))  // 最多 10 個檔案
@ApiOperation({ 
  summary: '上傳多個檔案',
  description: '一次最多上傳 10 個檔案' 
})
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: '多檔案上傳表單',
  schema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'string',
          format: 'binary',
        },
        description: '要上傳的檔案（最多 10 個）',
      },
    },
  },
})
@ApiResponse({ 
  status: 201, 
  description: '檔案上傳成功',
  schema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
      },
    },
  },
})
@ApiResponse({ status: 400, description: '檔案數量超過限制或格式錯誤' })
async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
  return this.mediaService.uploadMultiple(files);
}
```

---

## 分頁範本

### 分頁響應 DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: '當前頁碼', example: 1 })
  page: number;

  @ApiProperty({ description: '每頁筆數', example: 20 })
  limit: number;

  @ApiProperty({ description: '總筆數', example: 100 })
  total: number;

  @ApiProperty({ description: '總頁數', example: 5 })
  totalPages: number;

  @ApiProperty({ description: '是否有上一頁', example: false })
  hasPrevious: boolean;

  @ApiProperty({ description: '是否有下一頁', example: true })
  hasNext: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '資料陣列', isArray: true })
  data: T[];

  @ApiProperty({ description: '分頁資訊', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
```

### Cursor-based 分頁響應

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CursorPaginatedResponseDto<T> {
  @ApiProperty({ description: '資料陣列', isArray: true })
  data: T[];

  @ApiProperty({ 
    description: '下一頁游標（null 表示沒有更多資料）',
    example: 'eyJpZCI6ImNtNGFiYzEyMyJ9',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({ description: '是否有更多資料', example: true })
  hasMore: boolean;
}
```

### 分頁端點範例

```typescript
@Get()
@ApiOperation({ summary: '取得資源列表（分頁）' })
@ApiResponse({ 
  status: 200, 
  description: '成功取得列表',
  schema: {
    allOf: [
      { $ref: '#/components/schemas/PaginatedResponseDto' },
      {
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/ResourceDto' },
          },
        },
      },
    ],
  },
})
async findAll(@Query() query: QueryResourceDto): Promise<PaginatedResponseDto<ResourceDto>> {
  return this.service.findAll(query);
}
```

---

## 錯誤處理範本

### 錯誤響應 DTO

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 狀態碼', 
    example: 400,
    enum: [400, 401, 403, 404, 409, 500],
  })
  statusCode: number;

  @ApiProperty({ 
    description: '錯誤訊息（可能為單一字串或陣列）',
    oneOf: [
      { type: 'string', example: '驗證失敗' },
      { 
        type: 'array', 
        items: { type: 'string' }, 
        example: ['email 格式錯誤', 'password 必須至少 8 個字元'] 
      }
    ]
  })
  message: string | string[];

  @ApiProperty({ 
    description: '錯誤類型', 
    example: 'Bad Request',
    enum: ['Bad Request', 'Unauthorized', 'Forbidden', 'Not Found', 'Conflict', 'Internal Server Error'],
  })
  error: string;

  @ApiProperty({ 
    description: '時間戳記', 
    example: '2024-01-15T10:30:00.000Z' 
  })
  timestamp: string;

  @ApiProperty({ 
    description: '請求路徑', 
    example: '/api/users/123' 
  })
  path: string;
}
```

### 標準錯誤響應裝飾器

```typescript
// 可以建立一個輔助函數來減少重複代碼
function ApiStandardResponses() {
  return applyDecorators(
    ApiResponse({ status: 400, description: '驗證失敗', type: ErrorResponseDto }),
    ApiResponse({ status: 401, description: '未認證', type: ErrorResponseDto }),
    ApiResponse({ status: 403, description: '無權限', type: ErrorResponseDto }),
    ApiResponse({ status: 500, description: '伺服器錯誤', type: ErrorResponseDto }),
  );
}

// 使用
@Post()
@ApiOperation({ summary: '建立資源' })
@ApiResponse({ status: 201, description: '建立成功', type: ResourceDto })
@ApiStandardResponses()
async create(@Body() dto: CreateResourceDto) {
  return this.service.create(dto);
}
```

---

## 進階範本

### 使用角色授權的端點

```typescript
import { Roles } from '@suggar-daddy/auth';

@Post('admin-only')
@Roles('admin')
@ApiBearerAuth('JWT-auth')
@ApiOperation({ 
  summary: '管理員專用端點',
  description: '僅限 ADMIN 角色存取' 
})
@ApiResponse({ status: 200, description: '操作成功' })
@ApiResponse({ status: 403, description: '權限不足 - 需要 ADMIN 角色' })
async adminOnly() {
  // ...
}
```

### 批次操作端點

```typescript
@Post('batch')
@ApiOperation({ 
  summary: '批次建立資源',
  description: '一次建立多個資源項目' 
})
@ApiBody({
  description: '資源陣列',
  schema: {
    type: 'array',
    items: { $ref: '#/components/schemas/CreateResourceDto' },
    minItems: 1,
    maxItems: 100,
  },
})
@ApiResponse({ 
  status: 201, 
  description: '批次建立成功',
  schema: {
    type: 'object',
    properties: {
      success: { type: 'number', example: 95 },
      failed: { type: 'number', example: 5 },
      results: {
        type: 'array',
        items: { $ref: '#/components/schemas/ResourceDto' },
      },
    },
  },
})
async batchCreate(@Body() dtos: CreateResourceDto[]) {
  return this.service.batchCreate(dtos);
}
```

### 搜尋/篩選端點

```typescript
@Get('search')
@ApiOperation({ 
  summary: '搜尋資源',
  description: '支援全文搜尋和多條件篩選' 
})
@ApiQuery({ name: 'q', required: true, description: '搜尋關鍵字', example: 'sugar' })
@ApiQuery({ name: 'category', required: false, description: '分類篩選' })
@ApiQuery({ name: 'minPrice', required: false, type: Number, description: '最低價格' })
@ApiQuery({ name: 'maxPrice', required: false, type: Number, description: '最高價格' })
@ApiQuery({ name: 'sort', required: false, enum: ['price', 'date', 'popular'], description: '排序方式' })
@ApiResponse({ 
  status: 200, 
  description: '搜尋結果',
  type: [ResourceDto],
})
async search(@Query() query: SearchResourceDto) {
  return this.service.search(query);
}
```

---

## 快速參考

### 常用裝飾器

| 裝飾器 | 用途 | 範例 |
|--------|------|------|
| `@ApiTags()` | Controller 分組 | `@ApiTags('Users')` |
| `@ApiBearerAuth()` | JWT 認證標記 | `@ApiBearerAuth('JWT-auth')` |
| `@ApiOperation()` | 端點描述 | `@ApiOperation({ summary: '...' })` |
| `@ApiResponse()` | 響應定義 | `@ApiResponse({ status: 200, type: Dto })` |
| `@ApiParam()` | 路徑參數 | `@ApiParam({ name: 'id' })` |
| `@ApiQuery()` | 查詢參數 | `@ApiQuery({ name: 'page' })` |
| `@ApiBody()` | 請求體 | `@ApiBody({ type: CreateDto })` |
| `@ApiProperty()` | DTO 屬性 | `@ApiProperty({ example: '...' })` |
| `@ApiPropertyOptional()` | 選填屬性 | `@ApiPropertyOptional()` |
| `@ApiConsumes()` | 請求格式 | `@ApiConsumes('multipart/form-data')` |

### HTTP 狀態碼快速參考

| 狀態碼 | 用途 | 範例情境 |
|--------|------|----------|
| 200 | 成功 | GET, PUT 成功 |
| 201 | 已建立 | POST 建立成功 |
| 204 | 無內容 | DELETE 成功 |
| 400 | 驗證失敗 | DTO 驗證錯誤 |
| 401 | 未認證 | 缺少或無效 JWT |
| 403 | 權限不足 | 角色權限不符 |
| 404 | 不存在 | 資源找不到 |
| 409 | 衝突 | 重複操作（如重複按讚） |
| 500 | 伺服器錯誤 | 未預期的錯誤 |

---

## 使用建議

1. **複製範本**: 直接複製相應範本到你的代碼中
2. **替換佔位符**: 將 `YourResource`、`ResourceDto` 等替換為實際名稱
3. **調整細節**: 根據業務需求調整描述、範例和驗證規則
4. **保持一致**: 遵循專案現有的命名和風格慣例
5. **測試文檔**: 啟動服務並訪問 Swagger UI 確認文檔正確顯示

---

**最後更新**: 2024-01-XX  
**維護者**: Backend Development Team
