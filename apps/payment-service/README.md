# Payment Service

## 📖 簡介

Payment Service 負責處理平台上所有金流相關功能，包括 Stripe 支付整合、打賞、內容購買、交易管理和錢包系統。

## 🎯 職責說明

- **Stripe 整合**: Payment Intent、Webhook 處理、退款管理
- **打賞功能**: 用戶對創作者的打賞
- **內容購買**: 付費貼文、影片的購買處理
- **私訊購買**: 付費私訊解鎖
- **交易管理**: 交易歷史、收支明細、對帳
- **錢包系統**: 創作者錢包餘額、提現請求
- **手續費計算**: 平台手續費（預設 20%）
- **退款處理**: 爭議處理和退款流程

## 🚀 端口和路由

- **端口**: `3007`
- **路由前綴**: 
  - `/api/tips` - 打賞
  - `/api/post-purchases` - 內容購買
  - `/api/dm-purchases` - 私訊購買
  - `/api/transactions` - 交易記錄
  - `/api/stripe` - Stripe Webhook
  - `/api/wallet` - 錢包管理

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **支付平台**: Stripe SDK
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **快取**: Redis
- **事件**: Kafka Producer

## ⚙️ 環境變數

```bash
# 服務端口
PAYMENT_SERVICE_PORT=3007
PORT=3007

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Stripe 設定
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_API_VERSION=2023-10-16

# 手續費設定
PLATFORM_FEE_PERCENTAGE=20  # 平台抽成 20%
MIN_TIP_AMOUNT=1.00         # 最低打賞金額 (USD)
MIN_WITHDRAWAL_AMOUNT=50.00 # 最低提現金額 (USD)

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=payment-service

# 貨幣設定
DEFAULT_CURRENCY=USD
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve payment-service

# 建置
nx build payment-service

# 執行測試
nx test payment-service

# Lint 檢查
nx lint payment-service

# Stripe CLI Webhook 測試（需安裝 Stripe CLI）
stripe listen --forward-to localhost:3007/api/stripe/webhook
```

## 📡 API 端點列表

### 打賞 (Tips)

#### 創建打賞 Payment Intent

```
POST /api/tips/create-payment-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "creatorId": "uuid",
  "amount": 10.00,
  "currency": "USD",
  "message": "Great content!"  // 可選
}

Response 201:
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 10.00,
  "currency": "USD"
}
```

#### 確認打賞

```
POST /api/tips/:tipId/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentIntentId": "pi_xxx"
}

Response 200:
{
  "tipId": "uuid",
  "status": "SUCCEEDED",
  "amount": 10.00,
  "creatorEarnings": 8.00,  // 扣除 20% 手續費
  "platformFee": 2.00,
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得打賞歷史

```
GET /api/tips?page=1&limit=20&type=sent
Authorization: Bearer <token>

Query Parameters:
- type: sent (我送出的) | received (我收到的)

Response 200:
{
  "tips": [
    {
      "tipId": "uuid",
      "sender": {...},
      "receiver": {...},
      "amount": 10.00,
      "message": "Great content!",
      "status": "SUCCEEDED",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "totalAmount": 500.00
}
```

### 內容購買 (Post Purchases)

#### 購買付費內容

```
POST /api/post-purchases
Authorization: Bearer <token>
Content-Type: application/json

{
  "postId": "uuid",
  "paymentMethodId": "pm_xxx"  // Stripe Payment Method ID
}

Response 201:
{
  "purchaseId": "uuid",
  "postId": "uuid",
  "amount": 10.00,
  "status": "SUCCEEDED",
  "purchasedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 檢查內容購買狀態

```
GET /api/post-purchases/check/:postId
Authorization: Bearer <token>

Response 200:
{
  "isPurchased": true,
  "purchaseId": "uuid",
  "purchasedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得購買歷史

```
GET /api/post-purchases?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "purchases": [...],
  "total": 30,
  "totalSpent": 300.00
}
```

### 私訊購買 (DM Purchases)

#### 購買付費私訊

```
POST /api/dm-purchases
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageId": "uuid",
  "paymentMethodId": "pm_xxx"
}

Response 201:
{
  "purchaseId": "uuid",
  "messageId": "uuid",
  "amount": 5.00,
  "status": "SUCCEEDED"
}
```

### 交易記錄 (Transactions)

#### 取得交易歷史

```
GET /api/transactions?page=1&limit=20&type=all
Authorization: Bearer <token>

Query Parameters:
- type: all | tip | purchase | withdrawal | refund
- startDate: 2024-01-01
- endDate: 2024-12-31

Response 200:
{
  "transactions": [
    {
      "transactionId": "uuid",
      "type": "TIP",
      "amount": 10.00,
      "status": "SUCCEEDED",
      "description": "Tip to @creator",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "summary": {
    "totalIncome": 800.00,
    "totalExpense": 300.00,
    "netAmount": 500.00
  }
}
```

#### 取得單筆交易詳情

```
GET /api/transactions/:transactionId
Authorization: Bearer <token>

Response 200:
{
  "transactionId": "uuid",
  "type": "TIP",
  "amount": 10.00,
  "platformFee": 2.00,
  "netAmount": 8.00,
  "status": "SUCCEEDED",
  "stripePaymentIntentId": "pi_xxx",
  "metadata": {...},
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 錢包 (Wallet)

#### 取得錢包餘額

```
GET /api/wallet/balance
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "balance": 1250.50,
  "currency": "USD",
  "pendingBalance": 50.00,  // 待結算金額
  "availableBalance": 1200.50,
  "lastUpdatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得收支明細

```
GET /api/wallet/earnings?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "earnings": [
    {
      "earningId": "uuid",
      "type": "TIP",
      "amount": 8.00,        // 扣除手續費後
      "originalAmount": 10.00,
      "platformFee": 2.00,
      "status": "SETTLED",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 200,
  "totalEarnings": 1250.50
}
```

#### 申請提現

```
POST /api/wallet/withdrawal
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500.00,
  "stripeAccountId": "acct_xxx"  // Stripe Connect Account
}

Response 201:
{
  "withdrawalId": "uuid",
  "amount": 500.00,
  "status": "PENDING",
  "expectedArrival": "2024-01-05T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得提現歷史

```
GET /api/wallet/withdrawals?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "withdrawals": [
    {
      "withdrawalId": "uuid",
      "amount": 500.00,
      "status": "COMPLETED",  // PENDING, PROCESSING, COMPLETED, FAILED
      "stripeTransferId": "tr_xxx",
      "completedAt": "2024-01-05T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10
}
```

### Stripe Webhook

#### Webhook 端點（公開，由 Stripe 呼叫）

```
POST /api/stripe/webhook
Content-Type: application/json
Stripe-Signature: xxx

處理事件:
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
- payout.paid
- payout.failed
- account.updated
```

### 退款 (Refunds)

#### 申請退款

```
POST /api/transactions/:transactionId/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "DUPLICATE",  // DUPLICATE, FRAUDULENT, REQUESTED_BY_CUSTOMER
  "description": "Accidental double payment"
}

Response 201:
{
  "refundId": "uuid",
  "transactionId": "uuid",
  "amount": 10.00,
  "status": "PENDING",
  "reason": "DUPLICATE",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得退款狀態

```
GET /api/transactions/:transactionId/refund
Authorization: Bearer <token>

Response 200:
{
  "refundId": "uuid",
  "status": "SUCCEEDED",  // PENDING, SUCCEEDED, FAILED
  "amount": 10.00,
  "processedAt": "2024-01-01T00:00:00.000Z"
}
```

## 📊 資料模型

### Tip Entity

```typescript
{
  tipId: string;
  senderId: string;
  receiverId: string;
  amount: number;
  currency: string;
  message?: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  stripePaymentIntentId: string;
  platformFee: number;
  creatorEarnings: number;
  createdAt: Date;
  completedAt?: Date;
}
```

### PostPurchase Entity

```typescript
{
  purchaseId: string;
  userId: string;
  postId: string;
  amount: number;
  currency: string;
  status: 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  stripePaymentIntentId: string;
  createdAt: Date;
}
```

### Transaction Entity

```typescript
{
  transactionId: string;
  userId: string;
  type: 'TIP' | 'PURCHASE' | 'WITHDRAWAL' | 'REFUND';
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  stripeId?: string;  // Payment Intent or Transfer ID
  metadata: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}
```

### Wallet Entity

```typescript
{
  walletId: string;
  userId: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  stripeAccountId?: string;  // Stripe Connect Account
  lastUpdatedAt: Date;
}
```

## 🔄 資料流模式

### 支付流程

1. 創建 Payment Intent（Stripe）
2. 客戶端確認支付（Stripe.js）
3. **Webhook 通知** → 驗證簽名
4. 更新交易狀態到 Redis
5. **發送 Kafka 事件** `payment.completed`
6. DB Writer Service 持久化

### 錢包更新

1. 接收到 `payment.completed` 事件
2. 計算手續費和創作者收益
3. 更新創作者錢包 Redis 快取
4. 發送 `wallet.updated` 事件

## 💰 手續費計算

```
打賞金額: $10.00
平台手續費 (20%): $2.00
創作者收益: $8.00

Stripe 手續費: $0.30 + 2.9% = $0.59
實際平台收入: $2.00 - $0.59 = $1.41
```

## 📤 Kafka 事件

- `payment.tip.created` - 打賞創建
- `payment.completed` - 支付完成
- `payment.failed` - 支付失敗
- `payment.refunded` - 退款完成
- `wallet.updated` - 錢包餘額更新
- `withdrawal.requested` - 提現請求
- `withdrawal.completed` - 提現完成

## 🧪 測試

```bash
# 單元測試
nx test payment-service

# Stripe Webhook 測試
stripe trigger payment_intent.succeeded
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [Stripe 整合](../../docs/STRIPE.md)
- [業務邏輯缺口](../../docs/BUSINESS_LOGIC_GAPS.md#payment-service)

## 🤝 依賴服務

- **PostgreSQL**: 交易資料讀取
- **Redis**: 快取和實時餘額
- **Kafka**: 事件發送
- **Stripe**: 支付處理

## 🚨 已知問題

- 多幣別支援尚未實作（目前僅 USD）
- 批次提現功能待開發
- 爭議處理流程待完善
- Stripe Connect Onboarding 流程需補充

## 📝 開發注意事項

1. **Webhook 驗證**: 務必驗證 Stripe-Signature
2. **冪等性**: 同一 Webhook 事件可能重複收到
3. **手續費**: 記得扣除 Stripe 手續費和平台手續費
4. **測試模式**: 開發環境使用 Stripe Test Mode
5. **PCI 合規**: 不儲存信用卡資訊，使用 Stripe.js
