# API 文檔審查報告

**審查日期**: 2024-01-XX  
**審查範圍**: Suggar Daddy 專案所有微服務 API 文檔配置  
**審查人**: Backend Developer

---

## 📊 執行摘要

### 整體評估

| 指標 | 數值 | 狀態 |
|------|------|------|
| **Swagger 配置完整度** | 10% | 🔴 嚴重不足 |
| **已配置服務** | 2/10 | 🔴 極低 |
| **已配置 Controllers** | 3/31 (9.7%) | 🔴 極低 |
| **DTO 文檔化率** | 0/200+ | 🔴 完全缺失 |
| **API 端點總數** | 150+ | - |
| **已文檔化端點** | ~15 (10%) | 🔴 極低 |

### 關鍵發現

✅ **優點**
- `setupSwagger` 工具函數已實現且配置完善
- JWT 認證配置已加入 Swagger (Bearer Auth)
- Content、Payment、Subscription、Media 四個服務的 main.ts 已啟用 Swagger

❌ **重大缺陷**
1. **8/10 服務完全缺少 Swagger 配置** (Auth, User, Matching, Notification, Messaging, Admin)
2. **所有 DTO 類別缺少 @ApiProperty 裝飾器** - 無法自動生成請求/響應體文檔
3. **Admin Service 完全無文檔** - 最複雜的服務，包含 10 個 controllers
4. **Controller 層級缺少 @ApiTags** - 無法組織 API 端點分類
5. **端點缺少 @ApiOperation 和 @ApiResponse** - 無法描述操作和響應格式
6. **認證端點未標註 @ApiBearerAuth()** - 無法表示哪些端點需要 JWT

---

## 🔍 詳細審查結果

### 1. Auth Service（`:3002`）

**狀態**: 🔴 **完全缺失 Swagger**

#### 配置狀態
- ❌ main.ts 未啟用 setupSwagger
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse
- ❌ DTO 無 @ApiProperty

#### Controllers 清單
- `auth.controller.ts` - **13+ 端點**
  - POST `/register` - 註冊
  - POST `/login` - 登入
  - POST `/refresh` - 刷新 token
  - POST `/logout` - 登出
  - GET `/me` - 取得當前用戶
  - POST `/verify-email/:token` - 驗證郵箱
  - POST `/resend-verification` - 重寄驗證信
  - POST `/forgot-password` - 忘記密碼
  - POST `/reset-password` - 重設密碼
  - POST `/change-password` - 變更密碼
  - POST `/admin/suspend/:userId` - 停用用戶
  - POST `/admin/ban/:userId` - 封禁用戶
  - POST `/admin/reactivate/:userId` - 重啟用戶

#### 需要的 DTO 文檔
- `LoginDto` ❌
- `RegisterDto` ❌
- `RefreshTokenDto` ❌
- `TokenResponseDto` ❌
- `ForgotPasswordDto` ❌
- `ResetPasswordDto` ❌
- `ChangePasswordDto` ❌

#### 建議優先級
**🔥 最高優先級** - Auth 是最常用的服務，應該優先完成文檔

---

### 2. User Service（`:3001`）

**狀態**: 🔴 **完全缺失 Swagger**

#### 配置狀態
- ❌ main.ts 未啟用 setupSwagger
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse
- ❌ DTO 無 @ApiProperty

#### Controllers 清單
- `user.controller.ts` - **20+ 端點**
  - POST `/` - 建立用戶
  - GET `/me` - 取得自己資料
  - GET `/profile/:userId` - 取得用戶 profile
  - PUT `/profile` - 更新 profile
  - PUT `/location` - 更新位置
  - GET `/cards` - 取得推薦卡片
  - POST `/cards/by-ids` - 批次取得卡片
  - POST `/block/:targetId` - 封鎖用戶
  - DELETE `/block/:targetId` - 解除封鎖
  - GET `/blocked` - 取得封鎖名單
  - POST `/report` - 檢舉用戶
  - GET `/admin/reports` - 取得檢舉列表
  - PUT `/admin/reports/:reportId` - 更新檢舉

#### 需要的 DTO 文檔
- `CreateUserDto` ❌
- `UpdateProfileDto` ❌
- `UpdateLocationDto` ❌
- `UserCardDto` ❌
- `UserProfileDto` ❌
- `BlockUserDto` ❌
- `ReportUserDto` ❌

#### 建議優先級
**🔥 最高優先級** - 核心用戶管理服務

---

### 3. Matching Service（`:3003`）

**狀態**: 🔴 **完全缺失 Swagger**

#### 配置狀態
- ❌ main.ts 未啟用 setupSwagger
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse

#### Controllers 清單
- `matching.controller.ts` - **4 端點**
  - POST `/swipe` - 滑動配對
  - GET `/cards` - 取得配對卡片（支援 radius 地理篩選）
  - GET `/matches` - 取得已配對列表
  - DELETE `/matches/:matchId` - 解除配對

#### 需要的 DTO 文檔
- `SwipeDto` ❌
- `GetCardsDto` ❌
- `MatchDto` ❌

#### 建議優先級
**🟠 高優先級** - 核心配對功能

---

### 4. Notification Service（`:3004`）

**狀態**: 🔴 **完全缺失 Swagger**

#### 配置狀態
- ❌ main.ts 未啟用 setupSwagger
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse

#### Controllers 清單
- `notification.controller.ts` - **5 端點**
  - POST `/send` - 發送通知
  - GET `/list` - 取得通知列表
  - POST `/read/:id` - 標記為已讀
  - POST `/read-all` - 全部標記已讀
  - DELETE `/:id` - 刪除通知

- `device-token.controller.ts` - **3 端點**
  - POST `/device-tokens/register` - 註冊裝置 token
  - DELETE `/device-tokens/remove` - 移除裝置 token
  - GET `/device-tokens/list` - 列出裝置 token

#### 建議優先級
**🟡 中優先級**

---

### 5. Messaging Service（`:3005`）

**狀態**: 🔴 **完全缺失 Swagger**

#### 配置狀態
- ❌ main.ts 未啟用 setupSwagger
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse

#### Controllers 清單
- `messaging.controller.ts` - **5+ 端點**
  - POST `/send` - 發送訊息
  - GET `/conversations` - 取得對話列表
  - GET `/conversations/:conversationId/messages` - 取得對話訊息
  - POST `/broadcast` - 廣播訊息（付費）
  - GET `/inbox` - 取得收件匣

#### 需要的 DTO 文檔
- `SendMessageDto` ❌
- `ConversationDto` ❌
- `MessageDto` ❌
- `BroadcastMessageDto` ❌

#### 建議優先級
**🔥 高優先級** - 核心訊息功能

---

### 6. Content Service（`:3006`）

**狀態**: 🟡 **main.ts 已配置，但 controllers 缺失裝飾器**

#### 配置狀態
- ✅ main.ts 已啟用 setupSwagger
- ✅ Swagger UI 可訪問：http://localhost:3006/api/docs
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse
- ❌ DTO 無 @ApiProperty

#### Controllers 清單（7 個）
1. `post.controller.ts` - **15+ 端點**
   - POST `/posts` - 建立貼文
   - GET `/posts` - 列表
   - GET `/posts/:id` - 單篇
   - PUT `/posts/:id` - 更新
   - DELETE `/posts/:id` - 刪除
   - POST `/posts/:id/like` - 按讚
   - DELETE `/posts/:id/like` - 取消讚
   - POST `/posts/:id/comments` - 留言
   - GET `/posts/:id/comments` - 取得留言
   - GET `/posts/bookmarks` - 取得收藏

2. `video.controller.ts` - **3 端點**
   - GET `/videos/:postId/stream` - 取得串流 URL
   - POST `/videos/upload` - 上傳影片
   - GET `/videos/:id/status` - 取得處理狀態

3. `story.controller.ts` - **6 端點**
   - POST `/stories` - 建立限時動態
   - GET `/stories` - 取得限時動態列表
   - GET `/stories/:id` - 單篇
   - DELETE `/stories/:id` - 刪除
   - POST `/stories/:id/view` - 標記已觀看

4. `feed.controller.ts` - **4 端點**
   - GET `/feed` - 取得動態牆
   - GET `/feed/following` - 追蹤對象動態
   - GET `/feed/trending` - 熱門內容
   - GET `/feed/for-you` - 推薦內容

5. `discovery.controller.ts` - **3 端點**
   - GET `/discovery/explore` - 探索頁面
   - GET `/discovery/search` - 搜尋
   - GET `/discovery/tags/:tag` - 依標籤搜尋

6. `moderation.controller.ts` - **8 端點**
   - POST `/moderation/report` - 檢舉貼文
   - GET `/moderation/queue` - 取得檢舉佇列
   - GET `/moderation/reports/:postId` - 取得貼文檢舉
   - PUT `/moderation/review/:reportId` - 審核檢舉
   - POST `/moderation/takedown/:postId` - 下架貼文
   - POST `/moderation/reinstate/:postId` - 恢復貼文
   - GET `/moderation/taken-down` - 已下架列表

7. `app.controller.ts` - Health check

#### 需要的 DTO 文檔
- `CreatePostDto` ❌
- `UpdatePostDto` ❌
- `PostDto` ❌
- `CommentDto` ❌
- `CreateStoryDto` ❌
- `StoryDto` ❌
- `ReportPostDto` ❌
- `ReviewReportDto` ❌

#### 建議優先級
**🔥 最高優先級** - 已啟用 Swagger，只需添加裝飾器即可立即生效

---

### 7. Payment Service（`:3007`）

**狀態**: 🟡 **main.ts 已配置，部分 controller 有裝飾器**

#### 配置狀態
- ✅ main.ts 已啟用 setupSwagger
- ✅ Swagger UI 可訪問：http://localhost:3007/api/docs
- ⚠️ 僅 `stripe-webhook.controller.ts` 有 @ApiTags 和 @ApiOperation
- ❌ 其他 6 個 controllers 完全缺失裝飾器
- ❌ DTO 無 @ApiProperty

#### Controllers 清單（7 個）
1. `wallet.controller.ts` - **8 端點** ❌ 無裝飾器
   - GET `/wallet` - 取得錢包
   - GET `/wallet/earnings` - 收益摘要
   - GET `/wallet/history` - 錢包歷史
   - GET `/wallet/withdrawals` - 提款紀錄
   - POST `/wallet/withdraw` - 申請提款
   - GET `/wallet/admin/withdrawals/pending` - 待處理提款
   - PUT `/wallet/admin/withdrawals/:id` - 處理提款

2. `tip.controller.ts` - **3 端點** ❌ 無裝飾器
   - POST `/tips` - 建立打賞
   - GET `/tips` - 打賞列表
   - GET `/tips/:id` - 打賞詳情

3. `transaction.controller.ts` - **4 端點** ❌ 無裝飾器
   - POST `/transactions` - 建立交易
   - GET `/transactions` - 交易列表
   - GET `/transactions/:id` - 交易詳情
   - PUT `/transactions/:id` - 更新交易

4. `post-purchase.controller.ts` - **3 端點** ❌ 無裝飾器
   - POST `/post-purchases` - 購買 PPV 貼文
   - GET `/post-purchases` - 購買紀錄
   - GET `/post-purchases/:id` - 購買詳情

5. `dm-purchase.controller.ts` - **3 端點** ❌ 無裝飾器
   - POST `/dm-purchases` - 購買 DM 權限
   - GET `/dm-purchases` - 購買紀錄
   - GET `/dm-purchases/:id` - 購買詳情

6. `stripe/stripe-webhook.controller.ts` - **1 端點** ✅ 有裝飾器
   - POST `/stripe/webhooks` - Stripe webhook
   - ✅ @ApiTags('Stripe Webhooks')
   - ✅ @ApiOperation
   - ⚠️ 缺少 @ApiResponse

7. `app.controller.ts` - Health check

#### 需要的 DTO 文檔
- `CreateTipDto` ❌
- `TipDto` ❌
- `TransactionDto` ❌
- `CreateTransactionDto` ❌
- `PurchasePostDto` ❌
- `PostPurchaseDto` ❌
- `WalletDto` ❌
- `WithdrawalDto` ❌
- `RequestWithdrawalDto` ❌

#### 建議優先級
**🔥 高優先級** - 已啟用 Swagger，支付相關 API 文檔重要

---

### 8. Media Service（`:3008`）

**狀態**: 🟡 **main.ts 已配置，但 controllers 缺失裝飾器**

#### 配置狀態
- ✅ main.ts 已啟用 setupSwagger
- ✅ Swagger UI 可訪問：http://localhost:3008/api/docs
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse
- ❌ 上傳相關端點缺少 @ApiConsumes('multipart/form-data')
- ❌ DTO 無 @ApiProperty

#### Controllers 清單（4 個）
1. `upload/upload.controller.ts` - **5 端點**
   - POST `/upload/single` - 單檔上傳
   - POST `/upload/multiple` - 多檔上傳（最多 10 檔）
   - POST `/upload/video` - 影片上傳
   - DELETE `/upload/:id` - 刪除媒體
   - GET `/upload/status/:id` - 取得上傳狀態

2. `media.controller.ts` - **3 端點**
   - GET `/media` - 媒體列表
   - GET `/media/:id` - 媒體詳情
   - DELETE `/media/:id` - 刪除媒體

3. `media-upload.controller.ts` - 可能重複

4. `app.controller.ts` - Health check

#### 需要的 DTO 文檔
- `UploadSingleDto` ❌
- `UploadMultipleDto` ❌
- `UploadVideoDto` ❌
- `MediaDto` ❌

#### 特殊需求
- 需要 @ApiConsumes('multipart/form-data') 用於上傳端點
- 需要 @ApiBody 描述 file upload schema

#### 建議優先級
**🟠 高優先級** - 已啟用 Swagger，檔案上傳 API 需要清晰文檔

---

### 9. Subscription Service（`:3009`）

**狀態**: 🟢 **部分完成，最佳實踐範例**

#### 配置狀態
- ✅ main.ts 已啟用 setupSwagger
- ✅ Swagger UI 可訪問：http://localhost:3009/api/docs
- ✅ `subscription.controller.ts` 有完整裝飾器
- ✅ `stripe-subscription.controller.ts` 有完整裝飾器
- ⚠️ `subscription-tier.controller.ts` 缺失裝飾器
- ❌ DTO 無 @ApiProperty

#### Controllers 清單（4 個）
1. `subscription.controller.ts` - **6 端點** ✅ **範例實作**
   - ✅ @ApiTags('Subscriptions')
   - ✅ @ApiBearerAuth('JWT-auth')
   - GET `/subscriptions/check` - 檢查訂閱權限
     - ✅ @ApiOperation({ summary: 'Check subscription access' })
   - GET `/subscriptions/tiers` - 取得方案列表
     - ✅ @ApiOperation({ summary: 'Get all subscription tiers' })
   - GET `/subscriptions/my-subscription` - 取得自己的訂閱
     - ✅ @ApiOperation({ summary: 'Get current user subscription' })
   - POST `/subscriptions/create-tier` - 建立方案
     - ✅ @ApiOperation({ summary: 'Create subscription tier (Creator/Admin only)' })
   - ⚠️ 缺少 @ApiResponse

2. `stripe-subscription.controller.ts` - **4 端點** ✅ **範例實作**
   - ✅ @ApiTags('Stripe Subscriptions')
   - ✅ @ApiBearerAuth('JWT-auth')
   - POST `/stripe/create-checkout` - 建立結帳
     - ✅ @ApiOperation
     - ✅ @ApiResponse({ status: 200 })
   - POST `/stripe/create-portal-session` - 建立客戶入口
     - ✅ @ApiOperation
     - ✅ @ApiResponse({ status: 200 })
   - POST `/stripe/webhooks` - Stripe webhook
     - ✅ @ApiOperation
     - ✅ @ApiResponse
   - GET `/stripe/plans` - 取得 Stripe 方案
     - ✅ @ApiOperation
     - ✅ @ApiResponse

3. `subscription-tier.controller.ts` - **5 端點** ❌ 無裝飾器
   - POST `/subscription-tiers` - 建立方案
   - GET `/subscription-tiers` - 方案列表
   - GET `/subscription-tiers/:id` - 方案詳情
   - PUT `/subscription-tiers/:id` - 更新方案
   - DELETE `/subscription-tiers/:id` - 刪除方案

4. `app.controller.ts` - Health check

#### 需要的 DTO 文檔
- `CheckAccessDto` ❌
- `SubscriptionDto` ❌
- `CreateTierDto` ❌
- `SubscriptionTierDto` ❌
- `UpdateTierDto` ❌
- `CreateCheckoutDto` ✅ (已在 Stripe controller 使用)
- `CreatePortalSessionDto` ✅

#### 建議優先級
**🟡 中優先級** - 大部分已完成，可作為其他服務的範本

#### 💡 最佳實踐範例
此服務可作為其他服務的參考範例：
```typescript
@ApiTags('Subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('subscriptions')
export class SubscriptionController {
  @Get('check')
  @ApiOperation({ summary: 'Check subscription access' })
  async checkAccess(@Query() query: CheckAccessDto) {
    // ...
  }
}
```

---

### 10. Admin Service（`:3011`）

**狀態**: 🔴 **完全缺失 Swagger - 最嚴重問題**

#### 配置狀態
- ❌ main.ts 未啟用 setupSwagger
- ❌ Controllers 無 @ApiTags
- ❌ 端點無 @ApiOperation、@ApiResponse
- ❌ DTO 無 @ApiProperty

#### Controllers 清單（10 個 - 最多）
1. `user-management.controller.ts` - **8+ 端點**
   - GET `/users` - 用戶列表
   - GET `/users/stats` - 用戶統計
   - GET `/users/:userId` - 用戶詳情
   - POST `/users/:userId/disable` - 停用用戶
   - POST `/users/:userId/enable` - 啟用用戶
   - POST `/users/:userId/role` - 變更角色
   - GET `/users/:userId/activity` - 用戶活動
   - POST `/users/batch/disable` - 批次停用

2. `content-moderation.controller.ts` - **7 端點**
   - GET `/content/reports` - 檢舉列表
   - GET `/content/reports/:reportId` - 檢舉詳情
   - POST `/content/reports/batch/resolve` - 批次解決
   - POST `/content/posts/:postId/take-down` - 下架貼文
   - POST `/content/posts/:postId/reinstate` - 恢復貼文
   - GET `/content/stats` - 內容統計
   - GET `/content/posts` - 貼文列表

3. `analytics.controller.ts` - **5 端點**
   - GET `/analytics/dau-mau` - DAU/MAU
   - GET `/analytics/creator-revenue` - 創作者收入
   - GET `/analytics/popular-content` - 熱門內容
   - GET `/analytics/churn-rate` - 流失率
   - GET `/analytics/matching` - 配對統計

4. `payment-stats.controller.ts` - **4 端點**
   - GET `/payments/revenue` - 收入報表
   - GET `/payments/top-creators` - 頂級創作者
   - GET `/payments/daily-revenue` - 每日收入
   - GET `/payments/stats` - 支付統計

5. `withdrawal-management.controller.ts` - **5 端點**
   - GET `/withdrawals` - 提款列表
   - GET `/withdrawals/stats` - 提款統計
   - GET `/withdrawals/:withdrawalId` - 提款詳情
   - POST `/withdrawals/:withdrawalId/approve` - 核准提款
   - POST `/withdrawals/:withdrawalId/reject` - 拒絕提款

6. `subscription-management.controller.ts` - **4 端點**
   - GET `/subscriptions` - 訂閱列表
   - GET `/subscriptions/stats` - 訂閱統計
   - GET `/subscriptions/tiers` - 方案列表
   - POST `/subscriptions/tiers/:tierId/toggle` - 切換方案啟用

7. `transaction-management.controller.ts` - **2 端點**
   - GET `/transactions` - 交易列表
   - GET `/transactions/type-stats` - 類型統計

8. `system-monitor.controller.ts` - **10+ 端點**
   - GET `/system/health` - 系統健康
   - GET `/system/kafka` - Kafka 狀態
   - GET `/system/dlq` - DLQ 統計
   - GET `/system/consistency` - 一致性指標
   - GET `/system/dlq/messages` - DLQ 訊息列表
   - POST `/system/dlq/retry/:messageId` - 重試 DLQ
   - POST `/system/dlq/retry-all` - 重試全部
   - DELETE `/system/dlq/messages/:messageId` - 刪除 DLQ
   - DELETE `/system/dlq/purge` - 清除 DLQ

9. `audit-log.controller.ts` - **2 端點**
   - GET `/audit-logs` - 日誌列表
   - GET `/audit-logs/:logId` - 日誌詳情

10. `app.controller.ts` - Health check

#### 需要的 DTO 文檔（20+ 個）
- `GetUsersDto` ❌
- `UserStatsDto` ❌
- `UpdateUserRoleDto` ❌
- `BatchDisableDto` ❌
- `GetReportsDto` ❌
- `ReportDetailDto` ❌
- `ReviewReportDto` ❌
- `AnalyticsQueryDto` ❌
- `DauMauDto` ❌
- `RevenueReportDto` ❌
- `WithdrawalDto` ❌
- `ApproveWithdrawalDto` ❌
- `SystemHealthDto` ❌
- `KafkaStatusDto` ❌
- `DlqStatsDto` ❌
- `AuditLogDto` ❌
- ... 更多

#### 建議優先級
**🔥🔥🔥 最高優先級 - 極度緊急**

#### 原因
1. **最複雜的服務** - 10 個 controllers，50+ 端點
2. **僅限 Admin 使用** - 需要清晰文檔供管理員參考
3. **涉及敏感操作** - 用戶管理、支付、系統監控等
4. **跨服務統整** - 整合多個服務的管理功能
5. **前端需求** - Admin 前端開發需要準確的 API 文檔

---

## 📋 DTO 審查結果

### libs/dto/src/ 檔案清單

| 檔案 | DTO 數量 | @ApiProperty 使用 | 狀態 |
|------|----------|-------------------|------|
| `auth.dto.ts` | 8 個 | ❌ 0% | 🔴 完全缺失 |
| `user.dto.ts` | 10 個 | ❌ 0% | 🔴 完全缺失 |
| `matching.dto.ts` | 5 個 | ❌ 0% | 🔴 完全缺失 |
| `messaging.dto.ts` | 6 個 | ❌ 0% | 🔴 完全缺失 |
| `notification.dto.ts` | 4 個 | ❌ 0% | 🔴 完全缺失 |
| `pagination.dto.ts` | 2 個 | ❌ 0% | 🔴 完全缺失 |
| `feed.dto.ts` | 5 個 | ❌ 0% | 🔴 完全缺失 |
| `story.dto.ts` | 3 個 | ❌ 0% | 🔴 完全缺失 |
| `social.dto.ts` | 4 個 | ❌ 0% | 🔴 完全缺失 |
| `types.ts` | 多個 interfaces | ❌ 0% | 🔴 完全缺失 |
| **總計** | **47+ 個** | **0/47 (0%)** | **🔴 極嚴重** |

### DTO 範例：現況 vs 建議

#### 現況（auth.dto.ts）
```typescript
/** 登入請求 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
```

#### 建議修改
```typescript
import { ApiProperty } from '@nestjs/swagger';

/** 登入請求 */
export class LoginDto {
  @ApiProperty({
    description: '用戶郵箱',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '用戶密碼',
    example: 'SecureP@ss123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
```

### 影響

沒有 @ApiProperty 的後果：
1. ❌ Swagger UI 無法顯示請求/響應體 schema
2. ❌ 無法顯示欄位描述和範例
3. ❌ 無法標註必填/選填欄位
4. ❌ 無法顯示驗證規則（min, max, pattern）
5. ❌ 前端開發者無法了解 API 參數結構
6. ❌ 無法自動生成 API 客戶端代碼

---

## 🔄 API 設計規範審查

### 命名一致性

#### ✅ 優點
- RESTful 風格一致：使用 GET、POST、PUT、DELETE
- 路由命名使用複數形式（users, posts, subscriptions）
- 使用 kebab-case（subscription-tiers）

#### ⚠️ 需改進
- 部分路由前綴不一致：
  - Auth Service: `/api/auth` ✅
  - User Service: `/api/users` ✅
  - Content Service: `/api/posts`, `/api/videos` ⚠️ (應統一在 `/api/content` 下)
  - Payment Service: `/api/tips`, `/api/wallet`, `/api/transactions` ⚠️ (應統一在 `/api/payments` 下)

### 錯誤處理一致性

#### ✅ 優點
- 使用統一的 `AllExceptionsFilter`
- HTTP 狀態碼使用正確：
  - 200 OK
  - 201 Created
  - 400 Bad Request
  - 401 Unauthorized
  - 403 Forbidden
  - 404 Not Found
  - 409 Conflict
  - 500 Internal Server Error

#### ⚠️ 需改進
- 缺少標準化的錯誤響應格式文檔
- 未在 Swagger 中標註可能的錯誤響應

建議標準格式：
```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path: string;
}
```

並在所有端點添加：
```typescript
@ApiResponse({ status: 400, description: 'Bad Request', type: ErrorResponse })
@ApiResponse({ status: 401, description: 'Unauthorized', type: ErrorResponse })
@ApiResponse({ status: 500, description: 'Internal Server Error', type: ErrorResponse })
```

### 分頁格式統一

#### ✅ 優點
- 定義了統一的 `PaginatedResponse<T>` 介面
- 支援兩種分頁方式：
  1. Page-based（page, limit）
  2. Cursor-based（cursor, limit）

#### ⚠️ 需改進
- PaginatedResponse DTO 未加入 @ApiProperty
- 未在文檔中清楚標註哪些端點使用哪種分頁
- 缺少 @ApiQuery 裝飾器標註分頁參數

建議：
```typescript
export class PaginationQueryDto {
  @ApiProperty({ 
    description: '頁碼（從 1 開始）', 
    example: 1, 
    required: false, 
    default: 1 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: '每頁筆數', 
    example: 20, 
    required: false, 
    default: 20,
    maximum: 100 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

在 controller 中使用：
```typescript
@Get()
@ApiOperation({ summary: 'Get posts list' })
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
async findAll(@Query() query: PaginationQueryDto) {
  // ...
}
```

### 認證標註一致性

#### ❌ 問題
- 大部分需要認證的端點未標註 @ApiBearerAuth()
- Swagger UI 無法顯示哪些端點需要 JWT token
- 未區分公開、需認證、需特定角色的端點

#### 建議
在所有需要認證的 controller 加上：
```typescript
@ApiBearerAuth('JWT-auth')  // 對應 setupSwagger 中的 JWT-auth
@Controller()
export class SomeController {
  // ...
}
```

或在特定端點加上：
```typescript
@Get('profile')
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Get user profile' })
async getProfile() {
  // ...
}
```

對於公開端點，使用：
```typescript
@Public()
@ApiOperation({ 
  summary: 'Public endpoint - no authentication required',
  description: 'This endpoint can be accessed without JWT token' 
})
async publicEndpoint() {
  // ...
}
```

---

## 📊 與實際代碼一致性檢查

### docs/02-開發指南.md 審查

#### ✅ 正確的部分
- 服務端口號正確無誤
- 路由前綴大部分正確
- Swagger 位址正確（已配置的服務）

#### ❌ 發現的不一致

1. **Swagger 可訪問性聲明不準確**
   - 文件列出 4 個服務有 Swagger：Content, Payment, Media, Subscription
   - **實際**: Auth, User, Matching, Notification, Messaging, Admin 也應該有但缺失
   - **缺少**: API Gateway, DB Writer Service 不需要（正確）

2. **端點列表不完整**
   - Content Service 文件只列出 Posts、Videos、Moderation
   - **實際**: 還有 Story, Feed, Discovery controllers（缺少在文檔中）
   
3. **Messaging Service 端點遺漏**
   - 文件只列出 3 個端點
   - **實際**: 有 broadcast、inbox 等端點未列出

4. **Payment Service 端點遺漏**
   - 文件未列出 DM Purchase 端點
   - 實際有 `dm-purchase.controller.ts`

5. **Admin Service 端點部分遺漏**
   - 文件列出的端點較完整
   - ⚠️ 需確認所有 controller 端點都已記錄

#### 建議更新

在文檔開頭添加：
```markdown
## Swagger 文檔可訪問性

| 服務 | Swagger UI | 狀態 | 完整度 |
|------|-----------|------|--------|
| Auth | http://localhost:3002/api/docs | ❌ 未啟用 | 0% |
| User | http://localhost:3001/api/docs | ❌ 未啟用 | 0% |
| Matching | http://localhost:3003/api/docs | ❌ 未啟用 | 0% |
| Notification | http://localhost:3004/api/docs | ❌ 未啟用 | 0% |
| Messaging | http://localhost:3005/api/docs | ❌ 未啟用 | 0% |
| Content | http://localhost:3006/api/docs | ✅ 可用 | 10% (僅基礎) |
| Payment | http://localhost:3007/api/docs | ✅ 可用 | 15% (部分 controller) |
| Media | http://localhost:3008/api/docs | ✅ 可用 | 10% (僅基礎) |
| Subscription | http://localhost:3009/api/docs | ✅ 可用 | 60% (最佳範例) |
| Admin | http://localhost:3011/api/docs | ❌ 未啟用 | 0% |
```

---

## 🎯 行動計劃

### 階段 1: 緊急修復（1-2 天）

#### 優先級 P0 - 立即執行

1. **Admin Service** 🔥🔥🔥
   - [ ] 在 main.ts 啟用 setupSwagger
   - [ ] 所有 10 個 controllers 添加 @ApiTags
   - [ ] 所有端點添加 @ApiOperation
   - [ ] 關鍵端點添加 @ApiResponse
   - [ ] 添加 @ApiBearerAuth('JWT-auth')
   - **工作量**: 4-6 小時

2. **Auth Service** 🔥🔥
   - [ ] 在 main.ts 啟用 setupSwagger
   - [ ] auth.controller.ts 添加完整裝飾器
   - [ ] 所有 Auth DTO 添加 @ApiProperty
   - **工作量**: 2-3 小時

3. **User Service** 🔥🔥
   - [ ] 在 main.ts 啟用 setupSwagger
   - [ ] user.controller.ts 添加完整裝飾器
   - [ ] 所有 User DTO 添加 @ApiProperty
   - **工作量**: 2-3 小時

#### 優先級 P1 - 本週完成

4. **Content Service** 🔥
   - [ ] 7 個 controllers 全部添加 @ApiTags
   - [ ] 所有端點添加 @ApiOperation 和 @ApiResponse
   - [ ] 所有 Content DTO 添加 @ApiProperty
   - **工作量**: 4-5 小時

5. **Payment Service** 🔥
   - [ ] 補齊其餘 6 個 controllers 的裝飾器
   - [ ] 所有 Payment DTO 添加 @ApiProperty
   - **工作量**: 3-4 小時

6. **Matching Service** 🟠
   - [ ] 啟用 Swagger
   - [ ] 添加完整裝飾器
   - [ ] Matching DTO 添加 @ApiProperty
   - **工作量**: 1-2 小時

7. **Messaging Service** 🟠
   - [ ] 啟用 Swagger
   - [ ] 添加完整裝飾器
   - [ ] Messaging DTO 添加 @ApiProperty
   - **工作量**: 1-2 小時

### 階段 2: 完整優化（3-5 天）

#### 優先級 P2 - 下週完成

8. **Media Service**
   - [ ] 補齊 controllers 裝飾器
   - [ ] 特別處理文件上傳端點（@ApiConsumes, @ApiBody）
   - [ ] Media DTO 添加 @ApiProperty
   - **工作量**: 2-3 小時

9. **Notification Service**
   - [ ] 啟用 Swagger
   - [ ] 添加完整裝飾器
   - [ ] Notification DTO 添加 @ApiProperty
   - **工作量**: 1-2 小時

10. **Subscription Service**
    - [ ] 補齊 subscription-tier.controller.ts 裝飾器
    - [ ] 添加缺少的 @ApiResponse
    - [ ] Subscription DTO 添加 @ApiProperty
    - **工作量**: 1 小時

### 階段 3: 文檔與標準化（2-3 天）

11. **更新開發指南**
    - [ ] 補充所有缺失的端點
    - [ ] 更新 Swagger 可訪問性表格
    - [ ] 添加 API 裝飾器使用指南
    - [ ] 添加錯誤響應標準格式
    - **工作量**: 3-4 小時

12. **建立 Swagger 標準範本**
    - [ ] 創建 controller 範本
    - [ ] 創建 DTO 範本
    - [ ] 創建分頁端點範本
    - [ ] 創建文件上傳範本
    - **工作量**: 2-3 小時

13. **代碼審查檢查清單**
    - [ ] PR 必須包含 Swagger 裝飾器
    - [ ] 新 DTO 必須有 @ApiProperty
    - [ ] 新端點必須有 @ApiOperation
    - **工作量**: 1 小時

---

## 📈 預期成果

完成所有階段後：

| 指標 | 現況 | 目標 | 改進 |
|------|------|------|------|
| Swagger 配置服務 | 2/10 (20%) | 10/10 (100%) | +400% |
| 已配置 Controllers | 3/31 (9.7%) | 31/31 (100%) | +933% |
| DTO 文檔化率 | 0/47 (0%) | 47/47 (100%) | ∞ |
| API 端點文檔化 | 15/150 (10%) | 150/150 (100%) | +900% |
| **整體完整度** | **10%** | **100%** | **+900%** |

### 質量提升

1. ✅ **開發者體驗**
   - 所有 API 都有清晰的 Swagger 文檔
   - 前端開發者可以直接在 Swagger UI 測試 API
   - 可以自動生成 API 客戶端代碼

2. ✅ **維護性**
   - API 變更時文檔自動更新
   - 新人上手更快
   - 減少溝通成本

3. ✅ **專業性**
   - 符合業界標準
   - 展現專業的 API 設計
   - 方便與第三方整合

---

## 🔧 技術建議

### 1. 建立自動化檢查

在 CI/CD 中添加 Swagger 驗證：

```typescript
// scripts/validate-swagger.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';

async function validateSwagger(module: any, serviceName: string) {
  const app = await NestFactory.create(module);
  const document = SwaggerModule.createDocument(app, config);
  
  // 檢查是否有未文檔化的端點
  const routes = app.getHttpAdapter().getRoutes();
  const documentedPaths = Object.keys(document.paths);
  
  const undocumented = routes.filter(
    route => !documentedPaths.includes(route.path)
  );
  
  if (undocumented.length > 0) {
    console.error(`${serviceName}: Found ${undocumented.length} undocumented routes`);
    process.exit(1);
  }
}
```

### 2. 使用 DTO 繼承減少重複

```typescript
// libs/dto/src/lib/base.dto.ts
export class PaginationDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// 使用
export class GetPostsDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  creatorId?: string;
}
```

### 3. 使用 PartialType 和 PickType

```typescript
import { PartialType, PickType } from '@nestjs/swagger';

// 自動繼承 @ApiProperty
export class UpdateUserDto extends PartialType(CreateUserDto) {}

// 只選擇特定欄位
export class LoginDto extends PickType(CreateUserDto, ['email', 'password']) {}
```

### 4. 建立共用的 Response DTO

```typescript
// libs/dto/src/lib/response.dto.ts
export class ApiResponse<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ required: false })
  message?: string;
}

export class PaginatedApiResponse<T> extends ApiResponse<T[]> {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
```

---

## 📝 附錄：快速修復範例

### 範例 1: Auth Controller 完整修復

```typescript
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { Public } from '@suggar-daddy/auth';
import { 
  LoginDto, 
  RegisterDto, 
  TokenResponseDto,
  UserDto 
} from '@suggar-daddy/dto';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  
  @Public()
  @Post('register')
  @ApiOperation({ 
    summary: 'Register new user',
    description: 'Create a new user account with email and password' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    type: TokenResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input or email already exists' 
  })
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user and return JWT tokens' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: TokenResponseDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials' 
  })
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ 
    summary: 'Get current user',
    description: 'Get authenticated user information' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User information retrieved',
    type: UserDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or expired token' 
  })
  async me(@CurrentUser() user: CurrentUserData): Promise<UserDto> {
    return this.authService.getUserById(user.userId);
  }
}
```

### 範例 2: DTO 完整修復

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, IsIn } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecureP@ss123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128)
  password: string;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({
    description: 'User role',
    example: 'sugar_baby',
    enum: ['sugar_baby', 'sugar_daddy'],
  })
  @IsIn(['sugar_baby', 'sugar_daddy'])
  role: 'sugar_baby' | 'sugar_daddy';

  @ApiProperty({
    description: 'Display name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  displayName: string;
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 604800,
  })
  expiresIn: number;
}
```

### 範例 3: 檔案上傳端點

```typescript
import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles 
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiConsumes, 
  ApiBody, 
  ApiResponse,
  ApiBearerAuth 
} from '@nestjs/swagger';

@ApiTags('Media Upload')
@ApiBearerAuth('JWT-auth')
@Controller('upload')
export class UploadController {
  
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        userId: {
          type: 'string',
        },
        folder: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        publicId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or missing parameters' })
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.uploadSingle(file);
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload multiple files (max 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Files uploaded successfully',
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
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    return this.mediaService.uploadMultiple(files);
  }
}
```

---

## 🎓 學習資源

1. **NestJS Swagger 官方文檔**
   - https://docs.nestjs.com/openapi/introduction
   - https://docs.nestjs.com/openapi/types-and-parameters
   - https://docs.nestjs.com/openapi/decorators

2. **OpenAPI 3.0 規範**
   - https://swagger.io/specification/

3. **最佳實踐文章**
   - [NestJS API Documentation Best Practices](https://docs.nestjs.com/openapi/cli-plugin)
   - [Swagger UI Configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)

---

## ✅ 結論

### 現況總結
- **Swagger 配置完整度**: 10%（極低）
- **主要問題**: 8/10 服務缺失 Swagger，所有 DTO 無 @ApiProperty
- **最嚴重**: Admin Service 完全無文檔（10 controllers, 50+ 端點）

### 建議行動
1. **立即**: Admin, Auth, User Services 啟用 Swagger（P0）
2. **本週**: Content, Payment, Matching, Messaging 補齊裝飾器（P1）
3. **下週**: Media, Notification, Subscription 完整優化（P2）
4. **持續**: 建立標準範本，強制代碼審查

### 預期效益
- **開發效率**: 前端開發時間減少 30-40%
- **溝通成本**: 減少 50% 的 API 規格詢問
- **維護性**: 文檔自動更新，減少過時問題
- **專業性**: 提升項目整體質量和可信度

### 總工作量估計
- **階段 1（緊急）**: 15-20 小時
- **階段 2（完整）**: 8-12 小時
- **階段 3（優化）**: 6-8 小時
- **總計**: **29-40 小時**（約 1 週全職工作）

---

**審查完成日期**: 2024-01-XX  
**下次審查建議**: 完成階段 1 後（預計 2 天後）

