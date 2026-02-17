# Subscription Service

## 📖 簡介

Subscription Service 負責處理訂閱相關功能，包括訂閱方案管理、用戶訂閱狀態、自動續訂和訂閱生命週期管理。

## 🎯 職責說明

- **訂閱方案管理**: 創作者創建和管理訂閱方案（Tiers）
- **訂閱處理**: 用戶訂閱、取消訂閱、升降級
- **自動續訂**: 與 Stripe 整合處理週期性扣款
- **訂閱狀態**: 追蹤訂閱狀態（活躍、已取消、過期等）
- **試用期**: 支援免費試用期設定
- **訂閱者管理**: 創作者查看訂閱者列表和統計

## 🚀 端口和路由

- **端口**: `3009`（注意：proxy.service.ts 中配置為 3009，非 3005）
- **路由前綴**: 
  - `/api/subscription-tiers` - 訂閱方案
  - `/api/subscriptions` - 訂閱管理

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **快取**: Redis
- **支付**: Stripe Subscriptions API
- **事件**: Kafka Producer

## ⚙️ 環境變數

```bash
# 服務端口
SUBSCRIPTION_SERVICE_PORT=3009
PORT=3009

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=subscription-service

# Stripe 設定
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 訂閱設定
DEFAULT_TRIAL_DAYS=7
MAX_TIERS_PER_CREATOR=5
DEFAULT_CURRENCY=USD
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve subscription-service

# 建置
nx build subscription-service

# 執行測試
nx test subscription-service

# Lint 檢查
nx lint subscription-service
```

## 📡 API 端點列表

### 訂閱方案 (Subscription Tiers)

#### 創建訂閱方案（僅 CREATOR）

```
POST /api/subscription-tiers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Gold Membership",
  "description": "Access to exclusive content",
  "price": 9.99,
  "currency": "USD",
  "billingPeriod": "MONTHLY",  // MONTHLY, QUARTERLY, YEARLY
  "trialDays": 7,
  "benefits": [
    "Exclusive posts",
    "Direct messaging",
    "Early access to content"
  ]
}

Response 201:
{
  "tierId": "uuid",
  "creatorId": "uuid",
  "name": "Gold Membership",
  "price": 9.99,
  "billingPeriod": "MONTHLY",
  "subscribersCount": 0,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得創作者的訂閱方案

```
GET /api/subscription-tiers/creator/:creatorId
Authorization: Bearer <token>

Response 200:
{
  "tiers": [
    {
      "tierId": "uuid",
      "name": "Gold Membership",
      "price": 9.99,
      "billingPeriod": "MONTHLY",
      "subscribersCount": 150,
      "benefits": [...],
      "isActive": true
    },
    {
      "tierId": "uuid",
      "name": "Platinum Membership",
      "price": 19.99,
      "billingPeriod": "MONTHLY",
      "subscribersCount": 50,
      "benefits": [...],
      "isActive": true
    }
  ],
  "total": 2
}
```

#### 取得單一訂閱方案詳情

```
GET /api/subscription-tiers/:tierId
Authorization: Bearer <token>

Response 200:
{
  "tierId": "uuid",
  "creator": {
    "userId": "uuid",
    "username": "creator_name",
    "avatarUrl": "..."
  },
  "name": "Gold Membership",
  "description": "...",
  "price": 9.99,
  "currency": "USD",
  "billingPeriod": "MONTHLY",
  "trialDays": 7,
  "benefits": [...],
  "subscribersCount": 150,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 更新訂閱方案（僅 CREATOR 本人）

```
PATCH /api/subscription-tiers/:tierId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Gold Membership",
  "price": 12.99,
  "description": "Updated description",
  "benefits": ["Updated benefit 1", "Updated benefit 2"]
}

Response 200:
{
  "tierId": "uuid",
  "name": "Updated Gold Membership",
  "price": 12.99,
  ...
}
```

注意：價格變更不影響現有訂閱者，僅對新訂閱者生效。

#### 停用/啟用訂閱方案

```
PATCH /api/subscription-tiers/:tierId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": false
}

Response 200:
{
  "tierId": "uuid",
  "isActive": false,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 刪除訂閱方案

```
DELETE /api/subscription-tiers/:tierId
Authorization: Bearer <token>

Response 204: No Content
```

注意：有活躍訂閱者的方案無法刪除，需先停用並等待所有訂閱過期。

### 訂閱管理 (Subscriptions)

#### 訂閱創作者

```
POST /api/subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "tierId": "uuid",
  "paymentMethodId": "pm_xxx"  // Stripe Payment Method ID
}

Response 201:
{
  "subscriptionId": "uuid",
  "tierId": "uuid",
  "userId": "uuid",
  "status": "ACTIVE",
  "currentPeriodStart": "2024-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "trialEnd": "2024-01-08T00:00:00.000Z",  // 如有試用期
  "stripeSubscriptionId": "sub_xxx",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得我的訂閱列表

```
GET /api/subscriptions/me?status=ACTIVE&page=1&limit=20
Authorization: Bearer <token>

Query Parameters:
- status: ACTIVE | CANCELED | PAST_DUE | TRIALING | ALL

Response 200:
{
  "subscriptions": [
    {
      "subscriptionId": "uuid",
      "tier": {
        "tierId": "uuid",
        "name": "Gold Membership",
        "price": 9.99
      },
      "creator": {
        "userId": "uuid",
        "username": "creator_name",
        "avatarUrl": "..."
      },
      "status": "ACTIVE",
      "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
      "cancelAtPeriodEnd": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "totalMonthlySpend": 49.95
}
```

#### 取得單一訂閱詳情

```
GET /api/subscriptions/:subscriptionId
Authorization: Bearer <token>

Response 200:
{
  "subscriptionId": "uuid",
  "tier": {...},
  "creator": {...},
  "status": "ACTIVE",
  "currentPeriodStart": "2024-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "canceledAt": null,
  "stripeSubscriptionId": "sub_xxx",
  "billingHistory": [
    {
      "date": "2024-01-01T00:00:00.000Z",
      "amount": 9.99,
      "status": "PAID"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 檢查訂閱狀態

```
GET /api/subscriptions/check/:creatorId
Authorization: Bearer <token>

Response 200:
{
  "isSubscribed": true,
  "subscriptionId": "uuid",
  "tier": {
    "tierId": "uuid",
    "name": "Gold Membership"
  },
  "status": "ACTIVE",
  "expiresAt": "2024-02-01T00:00:00.000Z"
}
```

#### 取消訂閱

```
POST /api/subscriptions/:subscriptionId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "immediate": false,  // false: 期末取消, true: 立即取消並退款
  "reason": "Too expensive"  // 可選
}

Response 200:
{
  "subscriptionId": "uuid",
  "status": "ACTIVE",  // 期末前仍為 ACTIVE
  "cancelAtPeriodEnd": true,
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "canceledAt": "2024-01-15T00:00:00.000Z"
}
```

#### 重新訂閱（恢復已取消的訂閱）

```
POST /api/subscriptions/:subscriptionId/resume
Authorization: Bearer <token>

Response 200:
{
  "subscriptionId": "uuid",
  "status": "ACTIVE",
  "cancelAtPeriodEnd": false,
  "resumedAt": "2024-01-16T00:00:00.000Z"
}
```

#### 升級/降級訂閱

```
PATCH /api/subscriptions/:subscriptionId/change-tier
Authorization: Bearer <token>
Content-Type: application/json

{
  "newTierId": "uuid",
  "prorationBehavior": "CREATE_PRORATIONS"  // CREATE_PRORATIONS, NONE
}

Response 200:
{
  "subscriptionId": "uuid",
  "oldTierId": "old-tier-uuid",
  "newTierId": "new-tier-uuid",
  "prorationAmount": 5.00,  // 按比例計費金額
  "effectiveDate": "2024-01-15T00:00:00.000Z"
}
```

### 訂閱者管理（僅 CREATOR）

#### 取得我的訂閱者列表

```
GET /api/subscriptions/subscribers?tierId=uuid&page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "subscribers": [
    {
      "userId": "uuid",
      "username": "subscriber1",
      "avatarUrl": "...",
      "tier": {
        "tierId": "uuid",
        "name": "Gold Membership"
      },
      "status": "ACTIVE",
      "subscribedAt": "2024-01-01T00:00:00.000Z",
      "expiresAt": "2024-02-01T00:00:00.000Z"
    }
  ],
  "total": 150,
  "activeCount": 145,
  "totalMonthlyRevenue": 1498.50
}
```

#### 取得訂閱統計

```
GET /api/subscriptions/stats
Authorization: Bearer <token>

Response 200:
{
  "totalSubscribers": 150,
  "activeSubscribers": 145,
  "trialingSubscribers": 10,
  "canceledSubscribers": 5,
  "monthlyRecurringRevenue": 1498.50,
  "projectedAnnualRevenue": 17982.00,
  "churnRate": 3.33,  // 百分比
  "growthRate": 15.2,  // 百分比
  "averageSubscriptionValue": 9.99
}
```

## 📊 資料模型

### SubscriptionTier Entity

```typescript
{
  tierId: string;
  creatorId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  trialDays: number;
  benefits: string[];
  subscribersCount: number;
  isActive: boolean;
  stripePriceId?: string;  // Stripe Price ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscription Entity

```typescript
{
  subscriptionId: string;
  userId: string;
  tierId: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔄 資料流模式

### 訂閱流程

1. 用戶選擇訂閱方案
2. 創建 Stripe Subscription
3. **寫入 Redis 快取**（訂閱狀態）
4. **發送 Kafka 事件** `subscription.created`
5. 返回訂閱資訊
6. DB Writer Service 持久化

### 自動續訂

1. Stripe 定期扣款
2. Webhook 通知 `invoice.paid` 或 `invoice.payment_failed`
3. 更新訂閱狀態
4. 發送 Kafka 事件
5. 通知用戶（Notification Service）

## 📤 Kafka 事件

- `subscription.created` - 新訂閱創建
- `subscription.renewed` - 訂閱續訂成功
- `subscription.canceled` - 訂閱取消
- `subscription.expired` - 訂閱過期
- `subscription.payment_failed` - 續訂失敗
- `subscription.tier_changed` - 訂閱方案變更

## 🧪 測試

```bash
# 單元測試
nx test subscription-service

# 覆蓋率報告
nx test subscription-service --coverage
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [Stripe 整合](../../docs/STRIPE.md)
- [業務邏輯缺口](../../docs/BUSINESS_LOGIC_GAPS.md#subscription-service)

## 🤝 依賴服務

- **PostgreSQL**: 訂閱資料讀取
- **Redis**: 快取訂閱狀態
- **Kafka**: 事件發送
- **Stripe**: 訂閱和計費管理
- **Notification Service**: 訂閱通知

## 🚨 已知問題

- 優惠券和促銷碼功能尚未實作
- 訂閱暫停功能待開發
- 多幣別支援有限
- 家庭/團體訂閱方案待規劃

請參考 [BUSINESS_LOGIC_GAPS.md](../../docs/BUSINESS_LOGIC_GAPS.md#subscription-service)。

## 📝 開發注意事項

1. **Stripe Webhook**: 務必正確處理 `invoice.payment_failed` 避免服務中斷
2. **試用期**: 試用期結束前提醒用戶避免流失
3. **價格變更**: 現有訂閱者保持原價，新訂閱者使用新價
4. **取消訂閱**: 預設期末取消，讓用戶使用完剩餘期限
5. **訂閱狀態**: 需處理 Stripe 的所有訂閱狀態（trialing, active, past_due, canceled, unpaid）
