> 本文件來源：docs/swagger-templates.md

# Swagger 裝飾器範本

本文檔提供標準化的 Swagger 裝飾器範本，供開發人員快速複製使用。

---

## 目錄

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

@ApiTags('YourResource')
@ApiBearerAuth('JWT-auth')
@Controller('your-resource')
export class YourResourceController {
  constructor(private readonly yourService: YourService) {}
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

  @Public()
  @Get('public')
  @ApiOperation({ summary: '公開端點 - 無需認證' })
  async publicEndpoint() {}

  @ApiBearerAuth('JWT-auth')
  @Get('private')
  @ApiOperation({ summary: '私有端點 - 需要認證' })
  async privateEndpoint() {}
}
```

---

## DTO 範本

### 建立資源 DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({ description: '必填字串欄位', example: '範例文字', minLength: 2, maxLength: 100 })
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '選填字串欄位', example: '範例描述', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiProperty({ description: '整數欄位', example: 100, minimum: 1, maximum: 1000 })
  @IsInt() @Min(1) @Max(1000)
  amount: number;

  @ApiProperty({ description: '布林值欄位', example: true, default: false })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: '列舉欄位', example: 'option1', enum: ['option1', 'option2', 'option3'] })
  @IsIn(['option1', 'option2', 'option3'])
  type: 'option1' | 'option2' | 'option3';
}
```

### 更新資源 DTO

```typescript
import { PartialType } from '@nestjs/swagger';
export class UpdateResourceDto extends PartialType(CreateResourceDto) {}
```

### 查詢參數 DTO

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryResourceDto {
  @ApiPropertyOptional({ description: '搜尋關鍵字', example: 'keyword' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '頁碼', example: 1, minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每頁筆數', example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}
```

---

## 常見端點範本

### GET 列表（分頁）

```typescript
@Get()
@ApiOperation({ summary: '取得資源列表' })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
@ApiResponse({ status: 200, description: '成功取得列表', type: [ResourceDto] })
@ApiResponse({ status: 401, description: '未認證' })
async findAll(@Query() query: QueryResourceDto) {
  return this.service.findAll(query);
}
```

### GET 單一資源

```typescript
@Get(':id')
@ApiOperation({ summary: '取得資源詳情' })
@ApiParam({ name: 'id', description: '資源 ID', example: 'cm4abc123xyz' })
@ApiResponse({ status: 200, description: '成功', type: ResourceDto })
@ApiResponse({ status: 404, description: '資源不存在' })
async findOne(@Param('id') id: string) {
  return this.service.findOne(id);
}
```

### POST 建立

```typescript
@Post()
@ApiOperation({ summary: '建立資源' })
@ApiResponse({ status: 201, description: '建立成功', type: ResourceDto })
@ApiResponse({ status: 400, description: '驗證失敗' })
async create(@Body() dto: CreateResourceDto) {
  return this.service.create(dto);
}
```

### PUT 更新

```typescript
@Put(':id')
@ApiOperation({ summary: '更新資源' })
@ApiParam({ name: 'id', description: '資源 ID' })
@ApiResponse({ status: 200, description: '更新成功', type: ResourceDto })
@ApiResponse({ status: 404, description: '資源不存在' })
async update(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
  return this.service.update(id, dto);
}
```

### DELETE 刪除

```typescript
@Delete(':id')
@ApiOperation({ summary: '刪除資源' })
@ApiParam({ name: 'id', description: '資源 ID' })
@ApiResponse({ status: 204, description: '刪除成功' })
@ApiResponse({ status: 404, description: '資源不存在' })
async remove(@Param('id') id: string) {
  await this.service.remove(id);
}
```

---

## 檔案上傳範本

### 單檔上傳

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
@ApiOperation({ summary: '上傳單個檔案' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    required: ['file'],
    properties: {
      file: { type: 'string', format: 'binary' },
      userId: { type: 'string' },
      folder: { type: 'string' },
    },
  },
})
@ApiResponse({ status: 201, description: '上傳成功' })
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  return this.mediaService.upload(file);
}
```

---

## 分頁範本

### Page-based 分頁響應

```typescript
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '資料陣列', isArray: true })
  data: T[];

  @ApiProperty({ description: '總筆數', example: 100 })
  total: number;

  @ApiProperty({ description: '當前頁碼', example: 1 })
  page: number;

  @ApiProperty({ description: '每頁筆數', example: 20 })
  limit: number;
}
```

### Cursor-based 分頁響應

```typescript
export class CursorPaginatedResponseDto<T> {
  @ApiProperty({ description: '資料陣列', isArray: true })
  data: T[];

  @ApiProperty({ description: '下一頁游標', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ description: '是否有更多資料', example: true })
  hasMore: boolean;
}
```

---

## 錯誤處理範本

### 錯誤響應 DTO

```typescript
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP 狀態碼', example: 400 })
  statusCode: number;

  @ApiProperty({ description: '錯誤訊息' })
  message: string | string[];

  @ApiProperty({ description: '錯誤類型', example: 'Bad Request' })
  error: string;

  @ApiProperty({ description: '時間戳記' })
  timestamp: string;

  @ApiProperty({ description: '請求路徑' })
  path: string;
}
```

---

## 快速參考

| 裝飾器 | 用途 |
|--------|------|
| `@ApiTags()` | Controller 分組 |
| `@ApiBearerAuth('JWT-auth')` | JWT 認證標記 |
| `@ApiOperation()` | 端點描述 |
| `@ApiResponse()` | 響應定義 |
| `@ApiParam()` | 路徑參數 |
| `@ApiQuery()` | 查詢參數 |
| `@ApiBody()` | 請求體 |
| `@ApiProperty()` | DTO 必填屬性 |
| `@ApiPropertyOptional()` | DTO 選填屬性 |
| `@ApiConsumes()` | 請求格式 |

### HTTP 狀態碼

| 狀態碼 | 用途 |
|--------|------|
| 200 | GET/PUT 成功 |
| 201 | POST 建立成功 |
| 204 | DELETE 成功 |
| 400 | 驗證失敗 |
| 401 | 未認證 |
| 403 | 權限不足 |
| 404 | 資源不存在 |
| 409 | 衝突（重複操作） |
| 500 | 伺服器錯誤 |
