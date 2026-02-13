# 業務邏輯檢視與待補項目

本文件整理各服務業務邏輯缺口，供後續實作與 Code Review 對照。**已實作**項目已標註 ✅。

---

## 1. 授權與身分（JWT / 所有權）

### 1.1 Content Service（貼文）✅

| 項目 | 現狀 |
|------|------|
| 全 API | ✅ 除 findAll/findOne/getComments 為 @Public 外，其餘 JWT |
| POST /posts | ✅ creatorId 來自 @CurrentUser() |
| PUT/DELETE /posts/:id | ✅ 驗證 post.creatorId === user.userId，否則 403 |
| POST/DELETE /posts/:id/like | ✅ userId 來自 JWT |
| createComment | ✅ userId 來自 JWT |
| 付費貼文（ppv / 訂閱牆） | ✅ findOneWithAccess + OptionalJwt；PPV 已購買解鎖、未解鎖回傳 locked 版 |

### 1.2 Subscription Service（訂閱方案）✅

| 項目 | 現狀 |
|------|------|
| SubscriptionTierController | ✅ JWT；Create 僅 CREATOR/ADMIN |
| PUT/DELETE tier | ✅ 驗證 tier.creatorId === user.userId 或 ADMIN |
| GET /subscription-tiers | ✅ @Public() |

### 1.3 Payment Service（打賞 / 貼文購買）✅

| 項目 | 現狀 |
|------|------|
| POST /tips | ✅ fromUserId 強制為 JWT 當前用戶 |
| POST /post-purchases | ✅ buyerId 強制為 JWT 當前用戶 |
| GET /tips、/post-purchases | ✅ JWT；僅允許查自己 |

### 1.4 Messaging Service（訊息）✅

| 項目 | 現狀 |
|------|------|
| 全 API | ✅ JWT @CurrentUser() |
| POST /send | ✅ isParticipant(conversationId, userId) 驗證 |

### 1.5 Notification Service（通知）✅

| 項目 | 現狀 |
|------|------|
| GET /list、POST /read/:id | ✅ JWT @CurrentUser()，僅能看/標記自己的 |
| POST /send | ✅ @Public，供內部/Kafka 呼叫 |

### 1.6 Media Service（上傳）✅

| 項目 | 現狀 |
|------|------|
| POST /upload/single、multiple | ✅ JWT @CurrentUser() 作為 userId |
| DELETE /upload/:id | ✅ JWT + 驗證 media.userId === user.userId |

### 1.7 Admin Service（管理後台）✅

| 項目 | 現狀 |
|------|------|
| 全 API | ✅ JWT + @Roles(UserRole.ADMIN) |
| 用戶管理 | ✅ 停用/啟用/查詢用戶 |
| 內容審核 | ✅ 檢舉列表/詳情/處理 |

---

## 2. 冪等與重複請求 ✅

| 項目 | 現狀 |
|------|------|
| 貼文購買（PPV） | ✅ Redis post-purchase:by-buyer-post:buyerId:postId，已存在則 ConflictException |
| Stripe Webhook | ✅ Redis stripe:webhook:processed:{event.id} TTL 24h，已處理則跳過 |

---

## 3. 業務流程補齊

| 項目 | 現狀 |
|------|------|
| 訂閱支付完成 | ✅ PaymentEventConsumer 訂閱 payment.completed，延長週期 |
| 貼文可見性 | ✅ PPV 依 post:unlock 解鎖；未購買回傳 locked 版 |
| 訂閱牆可見性 | ✅ subscribers/tier_specific 依訂閱狀態過濾 |
| API 分頁 | ✅ 所有列表端點支援 page/limit 查詢，回傳 PaginatedResponse |

---

## 4. 資料一致性與錯誤處理 ✅

| 項目 | 現狀 | 待補 |
|------|------|------|
| Kafka 消費失敗 | ✅ DB Writer 簡易重試（最多 3 次） | 可補死信佇列或告警 |
| Redis 與 DB 不一致 | DB Writer 寫 DB 後寫 Redis | 可補重試或校準策略 |

---

## 5. 後續可補項目

1. 死信佇列 / 告警（Kafka 消費失敗）
2. Redis 與 DB 不一致時的重試或校準策略
3. OAuth、WebSocket、真實推播 FCM/APNs
4. Stripe Connect（創作者分潤）

---

## 6. 架構與入口 ✅

| 項目 | 現狀 |
|------|------|
| API Gateway | ✅ 統一入口（:3000），依路徑前綴代理至各服務 |
| Matching 推薦 | ✅ getCards 呼叫 user-service GET /api/users/cards |
| Messaging 持久化 | ✅ 對話與訊息存 Redis + Kafka message.created |
| Notification 持久化 | ✅ 通知存 Redis + Kafka notification.created |
| Admin 管理後台 | ✅ admin-service (:3011) + admin 前端 (:4300) |
