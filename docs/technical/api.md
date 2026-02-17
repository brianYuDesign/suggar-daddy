# API 參考文檔

所有 API 端點透過 API Gateway (`localhost:3000`) 代理轉發至對應微服務。

---

## 認證機制

所有受保護端點需在 HTTP Header 帶入 JWT Bearer Token：

```
Authorization: Bearer <access_token>
```

### Guard 類型

| Guard | 說明 |
|-------|------|
| **JwtAuthGuard** | 必須登入，無 Token 回傳 401 |
| **OptionalJwtGuard** | 有 Token 則解析，無 Token 也放行（匿名可存取） |
| **RolesGuard** | 搭配 `@Roles()` 裝飾器檢查角色權限 |

### 使用者角色

| 角色 | 說明 |
|------|------|
| `SUBSCRIBER` | 一般訂閱者 |
| `CREATOR` | 創作者 |
| `ADMIN` | 管理員 |

### 裝飾器

- `@Public()` — 跳過 JWT 驗證，任何人可存取
- `@Roles(UserRole.ADMIN)` — 限定角色
- `@CurrentUser()` — 從 JWT 取得當前使用者資訊

---

## 1. Auth API — `/api/auth`

> auth-service (port 3002)

### 註冊 / 登入

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/auth/register` | 註冊新帳號 | Public |
| POST | `/api/auth/login` | 登入取得 Token | Public |
| POST | `/api/auth/refresh` | 刷新 Access Token | Public |
| POST | `/api/auth/logout` | 登出（撤銷 Token） | JWT |
| GET | `/api/auth/me` | 取得當前使用者 JWT 資訊 | JWT |

### Email 驗證

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/auth/verify-email/:token` | 驗證 Email | Public |
| POST | `/api/auth/resend-verification` | 重發驗證信 | JWT |

### 密碼管理

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/auth/forgot-password` | 發送密碼重設信 | Public |
| POST | `/api/auth/reset-password` | 重設密碼 | Public |
| POST | `/api/auth/change-password` | 變更密碼（已登入） | JWT |

### OAuth 登入

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/auth/google` | Google OAuth 跳轉 | Passport |
| GET | `/api/auth/google/callback` | Google OAuth 回調 | Passport |
| POST | `/api/auth/apple` | Apple OAuth 跳轉 | Passport |
| POST | `/api/auth/apple/callback` | Apple OAuth 回調 | Passport |

### 帳號管理（Admin）

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/auth/admin/suspend/:userId` | 停權帳號 | JWT + ADMIN |
| POST | `/api/auth/admin/ban/:userId` | 封禁帳號 | JWT + ADMIN |
| POST | `/api/auth/admin/reactivate/:userId` | 恢復帳號 | JWT + ADMIN |

---

## 2. User API — `/api/users`

> user-service (port 3001)

### 個人資料

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/users/me` | 取得當前使用者完整資料 | JWT |
| GET | `/api/users/profile/:userId` | 取得指定使用者公開資料 | Public |
| PUT | `/api/users/profile` | 更新當前使用者資料 | JWT |
| PUT | `/api/users/location` | 更新 GPS 位置 | JWT |
| POST | `/api/users` | 建立使用者（內部呼叫） | Public |

### 推薦卡片

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/users/cards` | 取得推薦用卡片 | Optional |
| POST | `/api/users/cards/by-ids` | 依 ID 批次取得卡片（內部） | Public |

### 關注系統

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/users/follow/:targetId` | 關注使用者 | JWT |
| DELETE | `/api/users/follow/:targetId` | 取消關注 | JWT |
| GET | `/api/users/follow/:targetId/status` | 查詢關注狀態 | JWT |
| GET | `/api/users/:userId/followers` | 取得粉絲列表 | Public |
| GET | `/api/users/:userId/following` | 取得關注列表 | Public |

### 搜尋 / 推薦

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/users/search` | 搜尋使用者 (`?q=`) | Optional |
| GET | `/api/users/recommended` | 推薦創作者 | JWT |

### 封鎖

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/users/block/:targetId` | 封鎖使用者 | JWT |
| DELETE | `/api/users/block/:targetId` | 解除封鎖 | JWT |
| GET | `/api/users/blocked` | 取得封鎖清單 | JWT |

### 設定

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| PUT | `/api/users/settings/dm-price` | 設定私訊價格 | JWT |

### 檢舉

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/users/report` | 檢舉使用者/貼文/留言 | JWT |

### 檢舉管理（Admin）

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/users/admin/reports` | 取得待處理檢舉 | JWT + ADMIN |
| PUT | `/api/users/admin/reports/:reportId` | 更新檢舉狀態 | JWT + ADMIN |

---

## 3. Matching API — `/api/matching`

> matching-service (port 3003)

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/matching/swipe` | 滑動配對（like/pass/superlike） | JWT |
| GET | `/api/matching/cards` | 取得配對卡片（支援 `?radius=` 距離篩選） | JWT |
| GET | `/api/matching/matches` | 取得配對列表 | JWT |
| DELETE | `/api/matching/matches/:matchId` | 取消配對 | JWT |

Query 參數：
- `cards`: `?limit=20&cursor=&radius=50`（radius 單位 km）
- `matches`: `?limit=20&cursor=`

---

## 4. Content API — `/api/posts`, `/api/stories`, `/api/videos`, `/api/moderation`

> content-service (port 3006)

### 貼文 CRUD

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/posts` | 建立貼文 | JWT |
| GET | `/api/posts` | 取得貼文列表（`?creatorId=&page=&limit=`） | Optional |
| GET | `/api/posts/:id` | 取得單一貼文 | Optional |
| PUT | `/api/posts/:id` | 更新貼文（僅創作者） | JWT |
| DELETE | `/api/posts/:id` | 刪除貼文（僅創作者） | JWT |

### 按讚 / 收藏

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/posts/:id/like` | 按讚 | JWT |
| DELETE | `/api/posts/:id/like` | 取消按讚 | JWT |
| POST | `/api/posts/:id/bookmark` | 收藏 | JWT |
| DELETE | `/api/posts/:id/bookmark` | 取消收藏 | JWT |
| GET | `/api/posts/bookmarks` | 取得收藏列表 | JWT |

### 留言

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/posts/:id/comments` | 新增留言 | JWT |
| GET | `/api/posts/:id/comments` | 取得留言列表 | Optional |
| DELETE | `/api/posts/:postId/comments/:commentId` | 刪除留言 | JWT |
| GET | `/api/posts/:postId/comments/:commentId/replies` | 取得留言回覆 | Public |

### 動態消息 / 探索

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/posts/feed` | 個人動態消息 | JWT |
| GET | `/api/posts/trending` | 熱門貼文 | Public |
| GET | `/api/posts/search` | 搜尋貼文（`?q=`） | Public |

### 限時動態 (Stories) — `/api/stories`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/stories` | 建立限時動態 | JWT |
| GET | `/api/stories/feed` | 動態牆 | JWT |
| GET | `/api/stories/creator/:creatorId` | 取得創作者限時動態 | Optional |
| POST | `/api/stories/:storyId/view` | 標記已觀看 | JWT |
| GET | `/api/stories/:storyId/viewers` | 取得觀看者列表（僅創作者） | JWT |
| DELETE | `/api/stories/:storyId` | 刪除限時動態 | JWT |

### 影片串流 — `/api/videos`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/videos/:postId/stream` | 取得 CloudFront Signed URL（15 分鐘有效） | JWT |

需通過存取檢查：創作者本人 / 已訂閱 / 已購買 PPV。

### 內容審核 — `/api/moderation`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/moderation/report` | 檢舉貼文 | JWT |
| GET | `/api/moderation/queue` | 審核佇列 | JWT + ADMIN |
| GET | `/api/moderation/reports/:postId` | 取得貼文檢舉紀錄 | JWT + ADMIN |
| PUT | `/api/moderation/review/:reportId` | 審核檢舉 | JWT + ADMIN |
| POST | `/api/moderation/takedown/:postId` | 下架貼文 | JWT + ADMIN |
| POST | `/api/moderation/reinstate/:postId` | 恢復貼文 | JWT + ADMIN |
| GET | `/api/moderation/taken-down` | 取得已下架貼文 | JWT + ADMIN |

---

## 5. Subscription API — `/api/subscription-tiers`, `/api/subscriptions`

> subscription-service (port 3009)

### 訂閱方案 (Tiers) — `/api/subscription-tiers`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/subscription-tiers` | 建立方案 | JWT + CREATOR/ADMIN |
| GET | `/api/subscription-tiers` | 取得所有方案（`?creatorId=`） | Public |
| GET | `/api/subscription-tiers/:id` | 取得單一方案 | Public |
| PUT | `/api/subscription-tiers/:id` | 更新方案 | JWT（僅創作者/Admin） |
| DELETE | `/api/subscription-tiers/:id` | 刪除方案 | JWT（僅創作者/Admin） |

### 訂閱管理 — `/api/subscriptions`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/subscriptions/check` | 檢查訂閱狀態（`?subscriberId=&creatorId=&tierId=`） | Public（內部） |
| GET | `/api/subscriptions/tiers` | 取得所有方案 | Public |
| GET | `/api/subscriptions/my-subscription` | 取得當前使用者訂閱 | JWT |
| POST | `/api/subscriptions/create-tier` | 建立方案（備用端點） | JWT + CREATOR/ADMIN |
| GET | `/api/subscriptions/admin/all` | 取得所有訂閱紀錄 | JWT + ADMIN |

### Stripe 訂閱 — `/api/stripe/subscriptions`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/stripe/subscriptions` | 建立 Stripe 訂閱 | JWT |
| DELETE | `/api/stripe/subscriptions/:id` | 取消 Stripe 訂閱 | JWT |

---

## 6. Payment API — `/api/tips`, `/api/post-purchases`, `/api/transactions`, `/api/wallet`, `/api/dm-purchases`, `/api/stripe`

> payment-service (port 3007)

### 打賞 (Tips) — `/api/tips`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/tips` | 發送打賞 | JWT |
| GET | `/api/tips` | 查詢打賞紀錄（`?from=&to=`） | JWT |
| GET | `/api/tips/:id` | 取得單筆打賞 | JWT |

### 貼文購買 (PPV) — `/api/post-purchases`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/post-purchases` | 購買付費貼文 | JWT |
| GET | `/api/post-purchases` | 取得購買紀錄 | JWT |
| GET | `/api/post-purchases/:id` | 取得單筆購買 | JWT |

### 私訊購買 — `/api/dm-purchases`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/dm-purchases` | 購買私訊權限 | JWT |

### 交易紀錄 — `/api/transactions`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/transactions` | 建立交易 | JWT |
| GET | `/api/transactions` | 查詢交易紀錄（`?userId=&page=&limit=`） | JWT |
| GET | `/api/transactions/:id` | 取得單筆交易 | JWT |
| POST | `/api/transactions/:id/refund` | 退款 | JWT |
| PUT | `/api/transactions/:id` | 更新交易（Admin） | JWT + ADMIN |

### 錢包 — `/api/wallet`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| GET | `/api/wallet` | 取得錢包資訊 | JWT |
| GET | `/api/wallet/earnings` | 取得收入摘要 | JWT |
| GET | `/api/wallet/history` | 取得錢包歷史 | JWT |
| GET | `/api/wallet/withdrawals` | 取得提領紀錄 | JWT |
| POST | `/api/wallet/withdraw` | 申請提領 | JWT |
| GET | `/api/wallet/admin/withdrawals/pending` | 取得待處理提領 | JWT + ADMIN |
| PUT | `/api/wallet/admin/withdrawals/:id` | 處理提領申請 | JWT + ADMIN |

### Stripe Webhook — `/api/stripe`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/stripe/webhooks` | Stripe Webhook 接收端 | Public（Stripe 簽名驗證） |

---

## 7. Media API — `/api/upload`, `/api/media`

> media-service (port 3010)

### 上傳 — `/api/upload`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/upload/single` | 上傳單一檔案（圖片/影片） | JWT |
| POST | `/api/upload/multiple` | 批次上傳（最多 10 個） | JWT |
| POST | `/api/upload/video` | 上傳影片至 S3（背景處理縮圖+預覽） | JWT |
| DELETE | `/api/upload/:id` | 刪除媒體檔案 | JWT |

### 媒體管理 — `/api/media`

| 方法 | 路徑 | 說明 | Auth |
|------|------|------|------|
| POST | `/api/media/upload` | 上傳媒體（備用端點） | Public |
| GET | `/api/media` | 取得媒體列表（`?userId=`） | Public |
| GET | `/api/media/:id` | 取得單一媒體 | Public |
| DELETE | `/api/media/:id` | 刪除媒體 | Public |

---

## 8. Kafka Events 清單

服務間透過 Kafka 事件通訊，由 `db-writer-service` 消費並持久化至 PostgreSQL。

### User Events

| Topic | 說明 |
|-------|------|
| `user.created` | 使用者建立 |
| `user.updated` | 使用者更新 |
| `user.blocked` | 封鎖使用者 |
| `user.unblocked` | 解除封鎖 |
| `user.reported` | 檢舉使用者 |

### Social Events

| Topic | 說明 |
|-------|------|
| `social.user.followed` | 關注使用者 |
| `social.user.unfollowed` | 取消關注 |

### Matching Events

| Topic | 說明 |
|-------|------|
| `matching.matched` | 配對成功 |
| `matching.unmatched` | 取消配對 |

### Content Events

| Topic | 說明 |
|-------|------|
| `content.post.created` | 建立貼文 |
| `content.post.updated` | 更新貼文 |
| `content.post.deleted` | 刪除貼文 |
| `content.post.liked` | 按讚 |
| `content.post.unliked` | 取消按讚 |
| `content.post.bookmarked` | 收藏 |
| `content.post.unbookmarked` | 取消收藏 |
| `content.post.reported` | 檢舉貼文 |
| `content.post.taken_down` | 下架貼文 |
| `content.post.reinstated` | 恢復貼文 |
| `content.comment.created` | 建立留言 |
| `content.comment.deleted` | 刪除留言 |
| `content.comment.reported` | 檢舉留言 |
| `content.story.created` | 建立限時動態 |
| `content.story.deleted` | 刪除限時動態 |
| `content.story.viewed` | 觀看限時動態 |

### Subscription Events

| Topic | 說明 |
|-------|------|
| `subscription.created` | 建立訂閱 |
| `subscription.updated` | 更新訂閱 |
| `subscription.cancelled` | 取消訂閱 |
| `subscription.tier.created` | 建立方案 |
| `subscription.tier.updated` | 更新方案 |

### Payment Events

| Topic | 說明 |
|-------|------|
| `payment.completed` | 付款完成 |
| `payment.failed` | 付款失敗 |
| `payment.refunded` | 退款 |
| `payment.tip.sent` | 打賞送出 |
| `payment.post.purchased` | 購買貼文 |
| `payment.wallet.credited` | 錢包入帳 |
| `payment.withdrawal.requested` | 申請提領 |
| `payment.withdrawal.completed` | 提領完成 |

### Media Events

| Topic | 說明 |
|-------|------|
| `media.uploaded` | 媒體上傳 |
| `media.deleted` | 媒體刪除 |
| `media.processed` | 媒體處理完成 |
| `media.video.processed` | 影片處理完成 |

### Messaging Events

| Topic | 說明 |
|-------|------|
| `messaging.dm.purchased` | 購買私訊權限 |
| `messaging.broadcast.sent` | 廣播訊息 |

### System Events

| Topic | 說明 |
|-------|------|
| `dead-letter-queue` | 死信佇列（處理失敗的事件） |

---

## API Gateway 路由對照表

| 路由前綴 | 目標服務 | 預設 Port |
|----------|---------|-----------|
| `/api/auth` | auth-service | 3002 |
| `/api/users` | user-service | 3001 |
| `/api/matching` | matching-service | 3003 |
| `/api/posts` | content-service | 3006 |
| `/api/stories` | content-service | 3006 |
| `/api/videos` | content-service | 3006 |
| `/api/moderation` | content-service | 3006 |
| `/api/tips` | payment-service | 3007 |
| `/api/post-purchases` | payment-service | 3007 |
| `/api/dm-purchases` | payment-service | 3007 |
| `/api/transactions` | payment-service | 3007 |
| `/api/wallet` | payment-service | 3007 |
| `/api/stripe` | payment-service | 3007 |
| `/api/subscription-tiers` | subscription-service | 3009 |
| `/api/subscriptions` | subscription-service | 3009 |
| `/api/upload` | media-service | 3010 |
| `/api/media` | media-service | 3010 |
| `/api/notifications` | notification-service | 3008 |
| `/api/messaging` | messaging-service | 3005 |
| `/api/admin` | admin-service | 3011 |
