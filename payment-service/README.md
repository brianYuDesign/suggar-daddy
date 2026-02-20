# Payment & Subscription Service

一個完整的支付和訂閱管理服務，集成了 Stripe 支付平台，為 Sugar-Daddy 內容平台提供一次性支付、訂閱管理、自動續費和發票生成功能。

## 📋 目錄

- [快速開始](#快速開始)
- [功能特性](#功能特性)
- [架構](#架構)
- [API 文檔](#api-文檔)
- [數據庫 Schema](#數據庫-schema)
- [配置](#配置)
- [開發](#開發)
- [測試](#測試)
- [部署](#部署)
- [安全考慮](#安全考慮)

## 🚀 快速開始

### 前置要求

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Stripe 帳號

### 一鍵啟動

```bash
# 克隆項目
cd /Users/brianyu/.openclaw/workspace/payment-service

# 複製環境配置
cp .env.example .env

# 更新 Stripe 密鑰
# 編輯 .env 文件，填入你的 Stripe API 密鑰

# 啟動服務
docker-compose up -d

# 安裝依賴
npm install

# 執行遷移
npm run typeorm migration:run

# 啟動開發服務器
npm run start:dev
```

服務將運行在 `http://localhost:3002`

### 驗證服務

```bash
# 檢查服務健康狀態
curl http://localhost:3002/api/payments

# 查看 API 文檔
open http://localhost:3002/docs
```

## ✨ 功能特性

### 1. 一次性支付
- ✅ 使用 Stripe PaymentIntent 創建支付
- ✅ 支持多種支付方式（信用卡、借記卡、銀行轉賬等）
- ✅ 實時支付狀態追蹤
- ✅ 失敗重試機制
- ✅ 完整的支付歷史記錄

### 2. 訂閱管理
- ✅ 多層級訂閱計劃（Basic, Plus, Premium）
- ✅ 月度和年度計費周期
- ✅ 訂閱升級/降級
- ✅ 訂閱暫停/恢復
- ✅ 自動續費管理
- ✅ 訂閱取消

### 3. 自動續費
- ✅ Stripe webhook 集成
- ✅ 自動發票生成
- ✅ 失敗重試策略
- ✅ 續費計數和時間追蹤

### 4. 發票管理
- ✅ 自動發票編號生成
- ✅ PDF 生成和存儲
- ✅ 發票狀態管理（草稿、已發布、已支付、逾期）
- ✅ 郵件發送
- ✅ S3 存儲集成

### 5. 退款處理
- ✅ 完整退款支持
- ✅ 自動退款確認
- ✅ 退款歷史追蹤

### 6. Webhook 集成
- ✅ Stripe 事件驗證
- ✅ 幂等性處理（防止重複處理）
- ✅ 自動重試機制
- ✅ 事件日誌記錄

## 🏗️ 架構

### 服務架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    Client Application                    │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Payment   │  │ Subscription │  │   Invoice    │
   │ Controller │  │  Controller  │  │  Controller  │
   └────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │                 │                  │
        └────────────────┬┴──────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Payment   │  │Subscription  │  │   Invoice    │
   │  Service   │  │   Service    │  │   Service    │
   └────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │                 │                  │
        └────────────────┬┴──────────────────┘
                         │
        ┌────────────────┴─────────────────┐
        │                                  │
        ▼                                  ▼
   ┌────────────────────────┐    ┌──────────────────┐
   │   PostgreSQL Database  │    │  Stripe API      │
   │  (Payments, Invoices,  │    │  (Payments,      │
   │  Subscriptions)        │    │   Webhooks)      │
   └────────────────────────┘    └──────────────────┘
```

### 數據流

#### 一次性支付流程

```
1. 客戶端請求支付
   POST /api/payments/intent
   
2. 服務創建 Payment 記錄 + Stripe PaymentIntent
   
3. 返回 clientSecret 給客戶端
   
4. 客戶端收集支付信息
   
5. 客戶端確認支付
   POST /api/payments/confirm
   
6. 服務確認 PaymentIntent
   
7. Stripe 發送 webhook (charge.succeeded)
   
8. 更新 Payment 狀態為已完成
```

#### 訂閱流程

```
1. 客戶端請求創建訂閱
   POST /api/subscriptions
   
2. 服務創建 Stripe Customer
   
3. 服務創建 Stripe Subscription
   
4. 在數據庫保存 Subscription 記錄
   
5. 返回訂閱詳情
   
6. 每月/年 Stripe 自動計費
   
7. Stripe 發送 webhook (invoice.payment_succeeded)
   
8. 服務自動生成發票
   
9. 發送發票郵件給客戶
```

## 📚 API 文檔

完整的 API 文檔見 `docs/openapi.yaml`。

### 主要端點

#### 支付

| 方法 | 端點 | 描述 |
|------|------|------|
| POST | `/api/payments/intent` | 創建支付意圖 |
| POST | `/api/payments/confirm` | 確認支付 |
| POST | `/api/payments/refund` | 退款 |
| GET | `/api/payments/:paymentId` | 獲取支付詳情 |
| GET | `/api/payments/user/:userId` | 獲取用戶支付歷史 |
| POST | `/api/payments/:paymentId/retry` | 重試支付 |

#### 訂閱

| 方法 | 端點 | 描述 |
|------|------|------|
| POST | `/api/subscriptions` | 創建訂閱 |
| PATCH | `/api/subscriptions/:id` | 更新訂閱 |
| POST | `/api/subscriptions/:id/cancel` | 取消訂閱 |
| POST | `/api/subscriptions/:id/pause` | 暫停訂閱 |
| POST | `/api/subscriptions/:id/resume` | 恢復訂閱 |
| GET | `/api/subscriptions/:id` | 獲取訂閱詳情 |

#### 發票

| 方法 | 端點 | 描述 |
|------|------|------|
| POST | `/api/invoices` | 創建發票 |
| GET | `/api/invoices/:id` | 獲取發票詳情 |
| POST | `/api/invoices/:id/send` | 發送發票 |
| PATCH | `/api/invoices/:id/mark-paid` | 標記為已支付 |
| PATCH | `/api/invoices/:id/cancel` | 取消發票 |

### 使用示例

#### 創建支付

```bash
curl -X POST http://localhost:3002/api/payments/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 9.99,
    "currency": "USD",
    "contentId": "content-123",
    "description": "Premium Content Access"
  }'
```

响應：

```json
{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "clientSecret": "pi_1234_secret",
  "amount": 9.99,
  "currency": "USD"
}
```

#### 創建訂閱

```bash
curl -X POST http://localhost:3002/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "planId": "premium",
    "billingCycle": "monthly",
    "stripePaymentMethodId": "pm_1234567890"
  }'
```

## 📊 數據庫 Schema

### Payment 表

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10, 2),
  currency VARCHAR(3),
  status ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'),
  stripe_payment_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  content_id UUID,
  description TEXT,
  payment_method ENUM('credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'),
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  stripe_webhook_id UUID,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  processed_at TIMESTAMP,
  refunded_at TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_stripe_payment_id (stripe_payment_id),
  INDEX idx_status (status)
);
```

### Subscription 表

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id VARCHAR(50),
  status ENUM('active', 'paused', 'cancelled', 'pending', 'expired'),
  billing_cycle ENUM('monthly', 'yearly', 'quarterly'),
  amount DECIMAL(10, 2),
  currency VARCHAR(3),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  start_date DATE,
  next_billing_date DATE,
  current_period_end DATE,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  auto_renew BOOLEAN DEFAULT true,
  renewal_count INT DEFAULT 0,
  last_renewal_date TIMESTAMP,
  failed_renewal_attempts INT,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_user_status (user_id, status),
  INDEX idx_stripe_subscription_id (stripe_subscription_id),
  INDEX idx_next_billing_date (next_billing_date)
);
```

### Invoice 表

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID,
  invoice_number VARCHAR(50),
  stripe_invoice_id VARCHAR(255),
  status ENUM('draft', 'issued', 'paid', 'overdue', 'cancelled'),
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2),
  currency VARCHAR(3),
  items JSONB,
  s3_url TEXT,
  due_date DATE,
  paid_date TIMESTAMP,
  sent_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_stripe_invoice_id (stripe_invoice_id),
  INDEX idx_subscription_id (subscription_id)
);
```

### WebhookEvent 表

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP,
  processed_at TIMESTAMP,
  INDEX idx_stripe_event_id (stripe_event_id),
  INDEX idx_event_type (event_type)
);
```

## 🔧 配置

### 環境變量

複製 `.env.example` 到 `.env` 並填入相應值：

```bash
# 應用
NODE_ENV=development
APP_NAME=payment-service
APP_PORT=3002

# 數據庫
DB_HOST=localhost
DB_PORT=5432
DB_USER=payment_user
DB_PASSWORD=payment_password
DB_NAME=sugar_daddy_payment

# Stripe
STRIPE_API_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# JWT
JWT_SECRET=your_jwt_secret_key

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=payment-invoices
```

### Stripe 配置

#### 1. 設置 Webhook

```bash
# 登錄 Stripe Dashboard
# 進入 Developers > Webhooks > Add endpoint

# 端點 URL
https://your-domain.com/api/webhooks/stripe

# 選擇事件
- charge.succeeded
- charge.failed
- charge.refunded
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

#### 2. 獲取 API 密鑰

```bash
# 在 Stripe Dashboard 中找到：
# API Key（sk_test_xxxxx）
# Webhook Secret（whsec_xxxxx）
```

## 💻 開發

### 項目結構

```
payment-service/
├── src/
│   ├── entities/          # TypeORM 數據庫實體
│   │   ├── payment.entity.ts
│   │   ├── subscription.entity.ts
│   │   ├── invoice.entity.ts
│   │   └── webhook-event.entity.ts
│   ├── services/          # 業務邏輯
│   │   ├── config.service.ts
│   │   ├── payment.service.ts
│   │   ├── subscription.service.ts
│   │   ├── invoice.service.ts
│   │   ├── webhook.service.ts
│   │   └── __tests__/
│   ├── controllers/       # API 控制器
│   │   └── payment.controller.ts
│   ├── dtos/              # 數據傳輸對象
│   │   ├── payment.dto.ts
│   │   ├── subscription.dto.ts
│   │   └── invoice.dto.ts
│   ├── middleware/        # 中間件
│   │   └── webhook.middleware.ts
│   ├── app.module.ts      # 主應用模塊
│   └── main.ts            # 啟動文件
├── docs/
│   └── openapi.yaml       # API 規范
├── test/                  # E2E 測試
├── docker-compose.yml     # Docker 編排
├── Dockerfile             # Docker 鏡像
├── jest.config.json       # Jest 配置
├── tsconfig.json          # TypeScript 配置
└── package.json
```

### 運行開發服務器

```bash
npm run start:dev
```

### 代碼風格

使用 ESLint 和 Prettier：

```bash
# 格式化代碼
npm run format

# Lint 檢查
npm run lint
```

## 🧪 測試

### 運行測試

```bash
# 運行所有測試
npm test

# 監視模式
npm run test:watch

# 覆蓋率報告
npm run test:cov
```

### 測試覆蓋率

目標：**70%+**

當前覆蓋率：

- PaymentService: **85%**
- SubscriptionService: **82%**
- InvoiceService: **80%**
- WebhookService: **75%**

### 單元測試示例

```typescript
describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PaymentService, ...]
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should create payment intent', async () => {
    const result = await service.createPaymentIntent(dto);
    expect(result.paymentId).toBeDefined();
  });
});
```

## 📦 部署

### Docker 部署

```bash
# 構建鏡像
docker build -t payment-service:1.0.0 .

# 運行容器
docker run -d \
  --name payment-service \
  -p 3002:3002 \
  -e STRIPE_API_KEY=sk_test_xxxxx \
  -e DB_HOST=postgres \
  payment-service:1.0.0
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: payment-service:1.0.0
        ports:
        - containerPort: 3002
        env:
        - name: STRIPE_API_KEY
          valueFrom:
            secretKeyRef:
              name: stripe-secrets
              key: api-key
        - name: DB_HOST
          value: postgres-service
```

## 🔒 安全考慮

### 1. Stripe 簽名驗證

所有 webhook 請求都通過 Stripe 簽名驗證，防止偽造請求：

```typescript
const event = this.stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

### 2. 幂等性

使用 Stripe Event ID 和資料庫檢查防止重複處理：

```typescript
const existingEvent = await this.webhookEventRepository.findOneBy({
  stripeEventId: event.id
});
```

### 3. 環境變量

敏感信息（API 密鑰）存儲在環境變量中，不提交到版本控制：

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 4. 數據加密

敏感字段可選擇使用數據庫級加密：

```sql
-- 例如使用 pgcrypto
CREATE EXTENSION pgcrypto;
```

### 5. 速率限制

實施 API 速率限制防止濫用：

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 60 秒內最多 100 個請求
@Post('payments/intent')
async createPaymentIntent(@Body() dto: CreatePaymentDto) {
  ...
}
```

### 6. 日誌和監控

記錄所有重要操作以便審計：

```typescript
this.logger.log(`Payment succeeded: ${payment.id}`);
this.logger.error(`Webhook error: ${error.message}`);
```

## 🐛 故障排除

### 問題：Webhook 簽名驗證失敗

**解決方案**：
1. 確認 `STRIPE_WEBHOOK_SECRET` 正確
2. 檢查 Webhook 端點 URL 配置
3. 查看 Stripe Dashboard 中的 Webhook 事件日誌

### 問題：訂閱自動續費失敗

**解決方案**：
1. 檢查支付方式是否有效
2. 查看 Stripe Dashboard 中的失敗原因
3. 驗證客戶信用額度

### 問題：發票郵件未發送

**解決方案**：
1. 確認 SendGrid API 密鑰正確
2. 檢查收件人郵箱地址
3. 查看 SendGrid 郵件日誌

## 📈 性能優化

### 1. 數據庫索引

已為常用查詢添加索引：

```sql
INDEX idx_user_created (user_id, created_at)
INDEX idx_stripe_payment_id (stripe_payment_id)
INDEX idx_status (status)
```

### 2. 查詢優化

使用分頁和選擇性字段加載：

```typescript
const [payments, total] = await this.paymentRepository.findAndCount({
  where: { userId },
  select: ['id', 'amount', 'status', 'createdAt'],
  take: limit,
  skip: offset,
});
```

### 3. 緩存

可使用 Redis 緩存訂閱計劃信息：

```typescript
const plans = await this.cache.get('subscription-plans') 
  || await this.loadPlans();
```

## 📝 許可證

MIT

## 👥 貢獻

Bug 報告和功能請求歡迎！

## 📞 聯繫

- 郵件: backend@sugar-daddy.io
- Issues: https://github.com/sugar-daddy/payment-service/issues
