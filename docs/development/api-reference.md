> 本文件合併自：`docs/02-開發指南.md`、`api-documentation-report.md`、`API-DOCUMENTATION-PHASE1-SUMMARY.md`

# API 參考手冊

整合 API 端點總覽、JWT 認證、Swagger 文檔配置、檔案上傳、Kafka 事件、分頁與錯誤處理。

---

## 1. 服務總覽

| 服務 | 埠號 | 路由前綴 | 說明 |
|------|------|----------|------|
| api-gateway | 3000 | `/api/*` | HTTP 代理，轉發至各服務 |
| user-service | 3001 | `/api/users` | 用戶資料、封鎖、檢舉 |
| auth-service | 3002 | `/api/auth` | 註冊、登入、密碼、帳號管理 |
| matching-service | 3003 | `/api/matching` | 滑動配對、地理篩選 |
| notification-service | 3004 | `/api/notifications` | 推播通知、裝置 token |
| messaging-service | 3005 | `/api/messaging` | 私訊對話 |
| content-service | 3006 | `/api/posts`, `/api/videos`, `/api/moderation` | 貼文、影片、審核 |
| payment-service | 3007 | `/api/tips`, `/api/wallet`, `/api/transactions` | 打賞、錢包、交易 |
| media-service | 3008 | `/api/upload`, `/api/media` | 檔案上傳 |
| subscription-service | 3009 | `/api/subscriptions`, `/api/subscription-tiers` | 訂閱方案 |
| admin-service | 3011 | `/api/admin` | 後台管理 |
| db-writer-service | — | — | Kafka consumer，負責寫入 PostgreSQL |

路由對應設定：`apps/api-gateway/src/app/proxy.service.ts`

---

## 2. Swagger API 文件

所有 10 個微服務已啟用 Swagger UI（`/api/docs`）：

| 服務 | Swagger 位址 | 配置狀態 |
|------|--------------|----------|
| Auth | http://localhost:3002/api/docs | 已啟用 |
| User | http://localhost:3001/api/docs | 已啟用 |
| Matching | http://localhost:3003/api/docs | 已啟用 |
| Notification | http://localhost:3004/api/docs | 已啟用 |
| Messaging | http://localhost:3005/api/docs | 已啟用 |
| Content | http://localhost:3006/api/docs | 已啟用 |
| Payment | http://localhost:3007/api/docs | 已啟用 |
| Media | http://localhost:3008/api/docs | 已啟用 |
| Subscription | http://localhost:3009/api/docs | 已啟用 |
| Admin | http://localhost:3011/api/docs | 已啟用 |

> **注意**: API Gateway (`:3000`) 和 DB Writer Service 不提供 Swagger，因為它們分別為代理服務和後台消費者。

### 使用 Swagger 認證

所有服務的 Swagger UI 已配置 JWT Bearer 認證：

1. 通過 Auth Service 取得 JWT token：
   ```bash
   curl -X POST http://localhost:3002/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password"}'
   ```
2. 在 Swagger UI 點擊右上角 **Authorize** 按鈕
3. 輸入 `Bearer <JWT token>`
4. 點擊 **Authorize** 後即可測試受保護端點

> Swagger UI 會自動保存認證狀態（persistAuthorization），刷新頁面後仍然有效。

### Swagger 文檔化進度

| 指標 | 狀態 |
|------|------|
| Swagger 配置服務 | 10/10 (100%) |
| Controllers 已文檔化 | 部分（需補齊裝飾器） |
| DTO 已文檔化 | 部分（需補齊 @ApiProperty） |

> 完整的 Swagger 裝飾器範本請參閱 [swagger-templates.md](./swagger-templates.md)。

---

## 3. JWT 認證與授權

### 使用者角色

```typescript
enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator',
  SUBSCRIBER = 'subscriber',
}
```

### 常用 Decorator

| Decorator | 說明 |
|-----------|------|
| `@Public()` | 免認證 |
| `@Roles(UserRole.CREATOR)` | 限定角色 |
| `@CurrentUser()` | 注入當前用戶 |
| `@CurrentUser('userId')` | 僅取 userId |

### Guards

| Guard | 說明 |
|-------|------|
| `JwtAuthGuard` | 預設全域 JWT 驗證 |
| `RolesGuard` | 角色驗證 |
| `OptionalJwtGuard` | 可選 JWT（未帶 token 不會拒絕） |

### 範例

```typescript
@Public()
@Get('health')
async health() { return { status: 'ok' }; }

@Get('profile')
async profile(@CurrentUser() user: CurrentUserData) {
  return { userId: user.userId, email: user.email, role: user.role };
}

@Post('posts')
@Roles(UserRole.CREATOR)
async createPost(@CurrentUser('userId') userId: string) {
  return this.postsService.create(userId, dto);
}
```

### 環境變數

```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

---

## 4. API 端點總覽

認證標記：🔓 需 JWT ｜🔑 需 Admin ｜🌐 公開 ｜🔄 可選 JWT

### 4.1 Auth Service（`:3002`）

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/auth/register` | 🌐 | 註冊新用戶 |
| POST | `/api/auth/login` | 🌐 | 登入 |
| POST | `/api/auth/refresh` | 🌐 | 刷新 access token |
| POST | `/api/auth/logout` | 🔓 | 登出 |
| GET | `/api/auth/me` | 🔓 | 取得當前用戶資訊 |
| POST | `/api/auth/verify-email/:token` | 🌐 | 驗證 email |
| POST | `/api/auth/resend-verification` | 🔓 | 重寄驗證信 |
| POST | `/api/auth/forgot-password` | 🌐 | 請求重設密碼 |
| POST | `/api/auth/reset-password` | 🌐 | 以 token 重設密碼 |
| POST | `/api/auth/change-password` | 🔓 | 變更密碼 |
| POST | `/api/auth/admin/suspend/:userId` | 🔑 | 停用用戶 |
| POST | `/api/auth/admin/ban/:userId` | 🔑 | 封禁用戶 |
| POST | `/api/auth/admin/reactivate/:userId` | 🔑 | 重新啟用用戶 |

### 4.2 User Service（`:3001`）

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/users` | 🌐 | 建立用戶（供註冊流程） |
| GET | `/api/users/me` | 🔓 | 取得自己的 profile |
| GET | `/api/users/profile/:userId` | 🔄 | 取得指定用戶 profile |
| PUT | `/api/users/profile` | 🔓 | 更新自己的 profile |
| PUT | `/api/users/location` | 🔓 | 更新地理位置 |
| GET | `/api/users/cards` | 🌐 | 取得推薦卡片 |
| POST | `/api/users/cards/by-ids` | 🌐 | 依 ID 批次取得卡片 |
| POST | `/api/users/block/:targetId` | 🔓 | 封鎖用戶 |
| DELETE | `/api/users/block/:targetId` | 🔓 | 解除封鎖 |
| GET | `/api/users/blocked` | 🔓 | 取得封鎖名單 |
| POST | `/api/users/report` | 🔓 | 檢舉用戶 |
| GET | `/api/users/admin/reports` | 🔑 | 取得待處理檢舉 |
| PUT | `/api/users/admin/reports/:reportId` | 🔑 | 更新檢舉狀態 |

### 4.3 Matching Service（`:3003`）

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/matching/swipe` | 🔓 | 滑動（like/dislike） |
| GET | `/api/matching/cards` | 🔓 | 取得配對卡片（query: `limit`, `cursor`, `radius`） |
| GET | `/api/matching/matches` | 🔓 | 取得已配對列表 |
| DELETE | `/api/matching/matches/:matchId` | 🔓 | 解除配對 |

> `radius` 參數：使用 Redis GEO 以公里為單位做距離篩選。

### 4.4 Notification Service（`:3004`）

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/notifications/send` | 🔑 | 發送通知 |
| GET | `/api/notifications/list` | 🔓 | 取得通知列表 |
| POST | `/api/notifications/read/:id` | 🔓 | 標記通知為已讀 |
| POST | `/api/notifications/device-tokens/register` | 🔓 | 註冊裝置 token |
| DELETE | `/api/notifications/device-tokens/remove` | 🔓 | 移除裝置 token |
| GET | `/api/notifications/device-tokens/list` | 🔓 | 列出裝置 token |

### 4.5 Messaging Service（`:3005`）

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/messaging/send` | 🔓 | 發送訊息 |
| GET | `/api/messaging/conversations` | 🔓 | 取得對話列表 |
| GET | `/api/messaging/conversations/:conversationId/messages` | 🔓 | 取得對話訊息 |

### 4.6 Content Service（`:3006`）

#### 貼文

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/posts` | 🔓 | 建立貼文 |
| GET | `/api/posts` | 🔄 | 貼文列表 |
| GET | `/api/posts/:id` | 🔄 | 取得單篇貼文 |
| PUT | `/api/posts/:id` | 🔓 | 更新貼文 |
| DELETE | `/api/posts/:id` | 🔓 | 刪除貼文 |
| POST | `/api/posts/:id/like` | 🔓 | 按讚 |
| DELETE | `/api/posts/:id/like` | 🔓 | 取消讚 |
| POST | `/api/posts/:id/comments` | 🔓 | 建立留言 |
| GET | `/api/posts/:id/comments` | 🌐 | 取得留言 |

#### 影片

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/videos/:postId/stream` | 🔓 | 取得 CloudFront Signed URL |

#### 內容審核

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/moderation/report` | 🔓 | 檢舉貼文 |
| GET | `/api/moderation/queue` | 🔑 | 取得檢舉佇列 |
| GET | `/api/moderation/reports/:postId` | 🔑 | 取得指定貼文的檢舉 |
| PUT | `/api/moderation/review/:reportId` | 🔑 | 審核檢舉 |
| POST | `/api/moderation/takedown/:postId` | 🔑 | 下架貼文 |
| POST | `/api/moderation/reinstate/:postId` | 🔑 | 恢復貼文 |
| GET | `/api/moderation/taken-down` | 🔑 | 取得已下架貼文 |

### 4.7 Payment Service（`:3007`）

#### 打賞

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/tips` | 🔓 | 建立打賞 |
| GET | `/api/tips` | 🔓 | 打賞列表 |
| GET | `/api/tips/:id` | 🔓 | 取得打賞詳情 |

#### 付費解鎖

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/post-purchases` | 🔓 | 購買 PPV 貼文 |
| GET | `/api/post-purchases` | 🔓 | 購買紀錄 |
| GET | `/api/post-purchases/:id` | 🔓 | 取得購買詳情 |

#### 交易

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/transactions` | 🔓 | 建立交易 |
| GET | `/api/transactions` | 🔓 | 交易列表 |
| GET | `/api/transactions/:id` | 🔓 | 取得交易詳情 |
| PUT | `/api/transactions/:id` | 🔑 | 更新交易狀態 |

#### 錢包

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/wallet` | 🔓 | 取得錢包資訊 |
| GET | `/api/wallet/earnings` | 🔓 | 收益摘要 |
| GET | `/api/wallet/history` | 🔓 | 錢包歷史紀錄 |
| GET | `/api/wallet/withdrawals` | 🔓 | 提款紀錄 |
| POST | `/api/wallet/withdraw` | 🔓 | 申請提款 |
| GET | `/api/wallet/admin/withdrawals/pending` | 🔑 | 待處理提款 |
| PUT | `/api/wallet/admin/withdrawals/:id` | 🔑 | 處理提款 |

#### Stripe Webhook

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/stripe/webhooks` | 🌐 | Stripe webhook 回呼 |

### 4.8 Media Service（`:3008`）

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/upload/single` | 🔓 | 單檔上傳（multipart/form-data） |
| POST | `/api/upload/multiple` | 🔓 | 多檔上傳（最多 10 檔） |
| POST | `/api/upload/video` | 🔓 | 影片上傳至 S3 |
| DELETE | `/api/upload/:id` | 🔓 | 刪除媒體 |
| GET | `/api/media` | 🌐 | 媒體列表 |

### 4.9 Subscription Service（`:3009`）

#### 訂閱

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/subscriptions/check` | 🌐 | 檢查訂閱權限 |
| GET | `/api/subscriptions/tiers` | 🌐 | 取得所有方案 |
| GET | `/api/subscriptions/my-subscription` | 🔓 | 取得自己的訂閱 |
| POST | `/api/subscriptions/create-tier` | 🔓 | 建立方案（Creator/Admin） |
| GET | `/api/subscriptions/admin/all` | 🔑 | 取得所有訂閱 |

#### 訂閱方案

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/subscription-tiers` | 🔓 | 建立方案 |
| GET | `/api/subscription-tiers` | 🌐 | 方案列表 |
| GET | `/api/subscription-tiers/:id` | 🌐 | 方案詳情 |
| PUT | `/api/subscription-tiers/:id` | 🔓 | 更新方案 |
| DELETE | `/api/subscription-tiers/:id` | 🔓 | 刪除方案 |

### 4.10 Admin Service（`:3011`）

所有端點皆需 Admin 權限 🔑

#### 用戶管理（`/api/admin/users`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/users` | 用戶列表 |
| GET | `/api/admin/users/stats` | 用戶統計 |
| GET | `/api/admin/users/:userId` | 用戶詳情 |
| POST | `/api/admin/users/:userId/disable` | 停用用戶 |
| POST | `/api/admin/users/:userId/enable` | 啟用用戶 |
| POST | `/api/admin/users/:userId/role` | 變更角色 |
| GET | `/api/admin/users/:userId/activity` | 用戶活動紀錄 |
| POST | `/api/admin/users/batch/disable` | 批次停用 |

#### 內容審核（`/api/admin/content`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/content/reports` | 檢舉列表 |
| GET | `/api/admin/content/reports/:reportId` | 檢舉詳情 |
| POST | `/api/admin/content/reports/batch/resolve` | 批次解決檢舉 |
| POST | `/api/admin/content/posts/:postId/take-down` | 下架貼文 |
| POST | `/api/admin/content/posts/:postId/reinstate` | 恢復貼文 |
| GET | `/api/admin/content/stats` | 內容統計 |
| GET | `/api/admin/content/posts` | 貼文列表 |

#### 數據分析（`/api/admin/analytics`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/analytics/dau-mau` | DAU/MAU |
| GET | `/api/admin/analytics/creator-revenue` | 創作者收入排行 |
| GET | `/api/admin/analytics/popular-content` | 熱門內容 |
| GET | `/api/admin/analytics/churn-rate` | 訂閱流失率 |
| GET | `/api/admin/analytics/matching` | 配對統計 |

#### 支付統計（`/api/admin/payments`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/payments/revenue` | 收入報表 |
| GET | `/api/admin/payments/top-creators` | 頂級創作者 |
| GET | `/api/admin/payments/daily-revenue` | 每日收入 |
| GET | `/api/admin/payments/stats` | 支付統計 |

#### 提款管理（`/api/admin/withdrawals`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/withdrawals` | 提款列表 |
| GET | `/api/admin/withdrawals/stats` | 提款統計 |
| GET | `/api/admin/withdrawals/:withdrawalId` | 提款詳情 |
| POST | `/api/admin/withdrawals/:withdrawalId/approve` | 核准提款 |
| POST | `/api/admin/withdrawals/:withdrawalId/reject` | 拒絕提款 |

#### 訂閱管理（`/api/admin/subscriptions`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/subscriptions` | 訂閱列表 |
| GET | `/api/admin/subscriptions/stats` | 訂閱統計 |
| GET | `/api/admin/subscriptions/tiers` | 方案列表 |
| POST | `/api/admin/subscriptions/tiers/:tierId/toggle` | 切換方案啟用 |

#### 交易管理（`/api/admin/transactions`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/transactions` | 交易列表 |
| GET | `/api/admin/transactions/type-stats` | 交易類型統計 |

#### 系統監控（`/api/admin/system`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/system/health` | 系統健康檢查 |
| GET | `/api/admin/system/kafka` | Kafka 狀態 |
| GET | `/api/admin/system/dlq` | DLQ 統計 |
| GET | `/api/admin/system/consistency` | 一致性指標 |
| GET | `/api/admin/system/dlq/messages` | DLQ 訊息列表 |
| POST | `/api/admin/system/dlq/retry/:messageId` | 重試 DLQ 訊息 |
| POST | `/api/admin/system/dlq/retry-all` | 重試全部 DLQ |
| DELETE | `/api/admin/system/dlq/messages/:messageId` | 刪除 DLQ 訊息 |
| DELETE | `/api/admin/system/dlq/purge` | 清除 DLQ |

#### 稽核日誌（`/api/admin/audit-logs`）

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/admin/audit-logs` | 日誌列表 |
| GET | `/api/admin/audit-logs/:logId` | 日誌詳情 |

---

## 5. 分頁（Pagination）

所有列表 API 回傳統一的分頁格式。

### 查詢參數

| 參數 | 說明 | 預設 | 上限 |
|------|------|------|------|
| `page` | 頁碼（從 1 開始） | 1 | — |
| `limit` | 每頁筆數 | 20 | 100 |

部分端點使用 cursor-based 分頁（如 matching、messaging），以 `cursor` + `limit` 取代 `page`。

### 回應格式

```typescript
// Page-based
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Cursor-based（matching, messaging）
interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}
```

---

## 6. 檔案上傳

### Cloudinary（圖片）

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```typescript
// multipart/form-data
file: <binary>
userId: "user-123"
folder: "posts" (選填)
```

### S3 + CloudFront（影片）

影片透過 `POST /api/upload/video` 上傳至 S3，由 CloudFront Signed URL 提供串流。
取得串流 URL：`GET /api/videos/:postId/stream`（需付費解鎖或訂閱權限）。

```env
AWS_S3_BUCKET=your-bucket
AWS_CLOUDFRONT_DOMAIN=your-distribution.cloudfront.net
AWS_CLOUDFRONT_KEY_PAIR_ID=your-key-pair-id
AWS_CLOUDFRONT_PRIVATE_KEY=your-private-key
```

---

## 7. Kafka 事件整合

### 常用 Topic

| 分類 | Topic |
|------|-------|
| 用戶 | `user.created` |
| 配對 | `matching.matched` |
| 訂閱 | `subscription.created`, `subscription.cancelled` |
| 支付 | `payment.completed`, `payment.failed` |
| 內容 | `content.post.created`, `content.post.liked` |
| 媒體 | `media.uploaded`, `media.deleted` |
| 訊息 | `message.created` |
| 通知 | `notification.created` |

### 發送事件

```typescript
await this.kafkaProducer.sendEvent('subscription.created', id, event);
```

### 消費事件

```typescript
@EventPattern('payment.completed')
async handlePaymentCompleted(@Payload() event: PaymentCompletedEvent) {
  // 處理邏輯
}
```

### 環境變數

```env
KAFKA_BROKERS=localhost:9092
```

---

## 8. 錯誤回應格式

| 狀態碼 | 說明 |
|--------|------|
| 400 | 驗證失敗（class-validator） |
| 401 | 未認證 |
| 403 | 權限不足 |
| 404 | 資源不存在 |
| 409 | 衝突（重複操作） |
| 500 | 伺服器錯誤 |

---

## 9. Swagger 裝飾器使用指南

### 9.1 Controller 層級

```typescript
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController { }
```

### 9.2 端點層級

```typescript
@Post()
@ApiOperation({ summary: '建立用戶', description: '...' })
@ApiResponse({ status: 201, description: '用戶建立成功', type: UserDto })
@ApiResponse({ status: 400, description: '驗證失敗' })
async create(@Body() dto: CreateUserDto) { }
```

### 9.3 DTO 裝飾器

```typescript
export class CreateUserDto {
  @ApiProperty({ description: '用戶郵箱', example: 'user@example.com', format: 'email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: '用戶簡介', maxLength: 500 })
  @IsOptional()
  bio?: string;
}
```

### 9.4 檔案上傳端點

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
@ApiBody({ description: '檔案上傳', schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
async upload(@UploadedFile() file: Express.Multer.File) { }
```

### 9.5 DTO 繼承工具

```typescript
import { PartialType, PickType, OmitType } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
export class LoginDto extends PickType(CreateUserDto, ['email', 'password']) {}
```

### 9.6 最佳實踐檢查清單

- [ ] Controller 有 @ApiTags
- [ ] 需認證的 Controller 有 @ApiBearerAuth('JWT-auth')
- [ ] 每個端點有 @ApiOperation
- [ ] 每個端點至少有 2xx 和 4xx 的 @ApiResponse
- [ ] 所有 DTO 屬性有 @ApiProperty
- [ ] 檔案上傳端點有 @ApiConsumes 和 @ApiBody
- [ ] 公開端點有 @Public() 和描述說明

---

## 參考資源

- [NestJS Swagger 官方文檔](https://docs.nestjs.com/openapi/introduction)
- [Cloudinary 文件](https://cloudinary.com/documentation)
- [Kafka 官方文件](https://kafka.apache.org/documentation/)
- [OpenAPI 3.0 規範](https://swagger.io/specification/)
