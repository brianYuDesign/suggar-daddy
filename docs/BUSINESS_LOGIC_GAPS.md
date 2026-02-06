# 業務邏輯檢視與待補項目

本文件整理各服務業務邏輯缺口，供後續實作與 Code Review 對照。**已實作**項目已標註 ✅。

---

## 1. 授權與身分（JWT / 所有權）

### 1.1 Content Service（貼文）✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| 全 API | ✅ 除 findAll/findOne/getComments 為 @Public 外，其餘 JWT | — |
| POST /posts | ✅ creatorId 來自 @CurrentUser() | — |
| PUT/DELETE /posts/:id | ✅ 驗證 post.creatorId === user.userId，否則 403 | — |
| POST/DELETE /posts/:id/like | ✅ userId 來自 JWT | — |
| createComment | ✅ userId 來自 JWT | — |
| 付費貼文（ppv / 訂閱牆） | ✅ findOneWithAccess + OptionalJwt；PPV 已購買解鎖、未解鎖回傳 locked 版；PostPurchaseConsumer 寫入 post:unlock | — |

### 1.2 Subscription Service（訂閱方案）✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| SubscriptionTierController | ✅ JWT；Create 僅 CREATOR/ADMIN，creatorId 來自 @CurrentUser() | — |
| PUT/DELETE tier | ✅ 驗證 tier.creatorId === user.userId 或 user.role === ADMIN | — |
| GET /subscription-tiers | ✅ @Public()，可依 query creatorId 瀏覽 | — |

### 1.3 Payment Service（打賞 / 貼文購買）✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| POST /tips | ✅ fromUserId 強制為 JWT 當前用戶 | — |
| POST /post-purchases | ✅ buyerId 強制為 JWT 當前用戶 | — |
| GET /tips、/post-purchases | ✅ JWT；僅允許查自己（from/to 或 buyerId 與當前用戶比對） | — |

### 1.4 Messaging Service（訊息）✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| 全 API | ✅ JWT @CurrentUser() | — |
| POST /send | ✅ 透過 isParticipant(conversationId, userId) 驗證，否則 403 | — |

### 1.5 Notification Service（通知）✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| GET /list、POST /read/:id | ✅ JWT @CurrentUser()，僅能看/標記自己的通知 | — |
| POST /send | ✅ @Public，供內部/Kafka 呼叫 | — |

### 1.6 Media Service（上傳）✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| POST /upload/single、multiple | ✅ JWT @CurrentUser() 作為 userId | — |
| DELETE /upload/:id | ✅ JWT + 驗證 media.userId === user.userId，否則 403 | — |

---

## 2. 冪等與重複請求 ✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| 貼文購買（PPV） | ✅ Redis post-purchase:by-buyer-post:buyerId:postId，已存在則 ConflictException | — |
| Stripe Webhook | ✅ Redis stripe:webhook:processed:{event.id} TTL 24h，已處理則跳過 | — |

---

## 3. 業務流程補齊

| 項目 | 現狀 | 建議 |
|------|------|------|
| 訂閱支付完成 | ✅ PaymentEventConsumer 訂閱 payment.completed，呼叫 subscriptionService.extendPeriod 延長週期 | — |
| 貼文可見性 | ✅ PPV 依 post:unlock 解鎖；未登入/未購買回傳 locked 版（隱藏 mediaUrls） | 訂閱牆（subscribers/tier_specific）可後續補 |

---

## 4. 資料一致性與錯誤處理 ✅

| 項目 | 現狀 | 建議 |
|------|------|------|
| Kafka 消費失敗 | ✅ DB Writer consumer 簡易重試（最多 3 次、間隔 1s），仍失敗則 log error | 可再補死信佇列或告警 |
| Redis 與 DB 不一致 | DB Writer 寫 DB 後寫 Redis | 失敗時考慮重試或標記需校準；目前 handler 內可自行 try/catch Redis 寫入 |

---

## 5. 實作優先順序建議

1. **高**：Content / Messaging / Notification / Media 的 JWT + 所有權（創作者/參與者/本人）。
2. **高**：Payment 的 tip、post-purchase 強制 fromUserId / buyerId 為當前用戶。
3. **中**：Subscription tier 僅創作者可管理；Payment consumer 訂閱支付完成後延長週期。
4. **中**：PPV 重複購買防呆、Webhook 冪等。
5. **低**：付費貼文讀取權限邏輯、Kafka/Redis 一致性與重試策略。

以上項目補齊後，再依需求補 OAuth、WebSocket、真實推播等進階功能。
