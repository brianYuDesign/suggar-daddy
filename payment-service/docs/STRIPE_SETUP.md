# Stripe 配置指南

本文檔詳細說明如何配置 Stripe 以與支付服務集成。

## 📋 目錄

- [創建 Stripe 帳號](#創建-stripe-帳號)
- [獲取 API 密鑰](#獲取-api-密鑰)
- [配置 Webhook](#配置-webhook)
- [測試](#測試)
- [常見問題](#常見問題)

## 🔐 創建 Stripe 帳號

### 步驟 1：註冊

1. 訪問 https://dashboard.stripe.com/register
2. 使用郵箱和密碼註冊
3. 填寫公司信息
4. 完成身份驗證

### 步驟 2：激活帳號

1. 確認郵箱
2. 完成 KYC 驗證
3. 添加銀行賬戶

## 🔑 獲取 API 密鑰

### 測試模式

1. 登錄 [Stripe Dashboard](https://dashboard.stripe.com)
2. 點擊左側 "Developers"
3. 點擊 "API keys"
4. 在 "Standard keys" 下找到：
   - **Publishable key**: `pk_test_xxxxx`
   - **Secret key**: `sk_test_xxxxx`

### 復制密鑰

```bash
# 將密鑰添加到 .env
STRIPE_API_KEY=sk_test_xxxxx
```

### 生產模式

1. 點擊右上角切換到 "Live mode"
2. 複製生產環境密鑰
3. **注意**：生產密鑰開頭為 `sk_live_`

```bash
# 生產環境
STRIPE_API_KEY=sk_live_xxxxx
```

## 🔗 配置 Webhook

Webhook 允許 Stripe 將事件通知發送到你的服務。

### 步驟 1：創建 Webhook 端點

1. 登錄 [Stripe Dashboard](https://dashboard.stripe.com)
2. 導航到 "Developers" → "Webhooks"
3. 點擊 "+ Add endpoint"

### 步驟 2：設置端點 URL

輸入你的 webhook URL：

```
https://your-domain.com/api/v1/webhooks/stripe
```

或本地開發（使用 Stripe CLI）：

```
http://localhost:3002/api/v1/webhooks/stripe
```

### 步驟 3：選擇事件

選擇以下事件：

```
✓ charge.succeeded
✓ charge.failed
✓ charge.refunded
✓ customer.subscription.created
✓ customer.subscription.updated
✓ customer.subscription.deleted
✓ invoice.payment_succeeded
✓ invoice.payment_failed
```

### 步驟 4：獲取 Signing Secret

1. 創建端點後，點擊進入
2. 滾動到 "Signing secret"
3. 點擊 "Reveal"
4. 複製 signing secret

```bash
# 添加到 .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 使用 Stripe CLI 進行本地測試

#### 安裝 Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/install.sh -O
sudo bash install.sh

# Windows
choco install stripe
```

#### 連接你的帳號

```bash
stripe login
```

#### 監聽本地 Webhook

```bash
stripe listen --forward-to localhost:3002/api/v1/webhooks/stripe
```

輸出會包含 webhook signing secret：

```
> Ready! Your webhook signing secret is whsec_xxxxx
```

#### 觸發測試事件

```bash
# 在另一個終端

# 模擬支付成功
stripe trigger charge.succeeded

# 模擬支付失敗
stripe trigger charge.failed

# 模擬訂閱更新
stripe trigger customer.subscription.updated
```

## 🧪 測試

### 測試支付流程

#### 1. 使用測試卡號

Stripe 提供測試卡號進行支付測試：

```
成功支付
Card: 4242 4242 4242 4242
Exp: 任何未來日期
CVC: 任何 3 位數

失敗支付
Card: 4000 0000 0000 0002
Exp: 任何未來日期
CVC: 任何 3 位數

需要驗證
Card: 4000 0025 0000 3155
Exp: 任何未來日期
CVC: 任何 3 位數
```

#### 2. 創建測試支付

```bash
curl -X POST http://localhost:3002/api/v1/payments/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 9.99,
    "currency": "USD"
  }'
```

響應：

```json
{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "clientSecret": "pi_xxxxx_secret",
  "amount": 9.99,
  "currency": "USD"
}
```

#### 3. 確認支付

使用返回的 `paymentId` 和測試卡確認支付：

```bash
curl -X POST http://localhost:3002/api/v1/payments/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "550e8400-e29b-41d4-a716-446655440000",
    "stripeToken": "pm_card_4242"
  }'
```

#### 4. 驗證 Webhook

使用 Stripe CLI 模擬 webhook：

```bash
stripe trigger charge.succeeded
```

檢查應用日誌確認事件已收到和處理。

### 測試訂閱流程

#### 1. 創建訂閱

```bash
curl -X POST http://localhost:3002/api/v1/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "planId": "premium",
    "billingCycle": "monthly",
    "stripePaymentMethodId": "pm_card_4242"
  }'
```

#### 2. 模擬續費

```bash
stripe trigger invoice.payment_succeeded
```

## 📊 Stripe Dashboard 指南

### 查看交易

1. 導航到 "Payments" → "Transactions"
2. 查看所有支付記錄
3. 點擊交易查看詳情

### 查看客戶

1. 導航到 "Customers"
2. 查看所有客戶和他們的訂閱

### 查看訂閱

1. 導航到 "Billing" → "Subscriptions"
2. 查看活躍和已取消的訂閱

### 查看發票

1. 導航到 "Billing" → "Invoices"
2. 查看所有發票和支付狀態

### Webhook 日誌

1. 導航到 "Developers" → "Webhooks"
2. 點擊端點
3. 查看 "Event log" 中的所有事件

## 🔄 API 版本

當前支持的 Stripe API 版本：

```
2024-04-10
```

在 `.env` 中更新：

```bash
STRIPE_API_VERSION=2024-04-10
```

檢查 [Stripe API 更新日誌](https://stripe.com/docs/upgrades)。

## 🛡️ 安全最佳實踐

### 1. 密鑰管理

```bash
# ❌ 不要提交到版本控制
sk_test_xxxxx
sk_live_xxxxx

# ✅ 使用環境變量
STRIPE_API_KEY=sk_test_xxxxx
```

### 2. Webhook 簽名驗證

始終驗證 webhook 簽名：

```typescript
const event = this.stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

### 3. PCI 合規性

- 不存儲完整卡號
- 不處理明文密碼
- 使用 Stripe Token 或 PaymentMethod

### 4. 監控和告警

設置 Stripe 告警：

1. 進入 "Developers" → "Alerts"
2. 配置異常活動告警
3. 訂閱郵件通知

### 5. 定期審計

- 檢查 webhook 事件日誌
- 審計失敗交易
- 驗證對賬

## 🐛 常見問題

### Q: Webhook 簽名驗證失敗

**A**: 
1. 確認使用了正確的 `STRIPE_WEBHOOK_SECRET`
2. 檢查不是在測試和生產密鑰間混淆
3. 重新生成 signing secret 並更新 `.env`

### Q: 支付測試成功但在儀表盤看不到

**A**: 確認你在 **測試模式**（不是生產模式）查看。

### Q: 訂閱自動續費不工作

**A**: 
1. 確認 webhook 已正確配置
2. 檢查支付方式是否仍然有效
3. 查看 Stripe 儀表盤中的失敗原因

### Q: 如何切換到生產模式？

**A**: 
1. 完成 Stripe 驗證
2. 更新 `.env` 使用生產 API 密鑰（`sk_live_`）
3. 更新 webhook 端點為生產 URL
4. 重新部署應用

### Q: 本地開發中 webhook 無法工作

**A**: 使用 Stripe CLI：

```bash
stripe listen --forward-to localhost:3002/api/v1/webhooks/stripe
```

## 📚 更多資源

- [Stripe 官方文檔](https://stripe.com/docs)
- [API 參考](https://stripe.com/docs/api)
- [Webhook 指南](https://stripe.com/docs/webhooks)
- [測試模式指南](https://stripe.com/docs/testing)
- [Stripe CLI 文檔](https://stripe.com/docs/stripe-cli)

## 🆘 支持

遇到問題？

1. 檢查 [Stripe 狀態頁面](https://status.stripe.com)
2. 查看 [Stripe 文檔](https://stripe.com/docs)
3. 聯繫 [Stripe 支持](https://support.stripe.com)
