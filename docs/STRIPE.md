# Stripe 整合說明

本文件說明專案內 Stripe 的環境變數、流程與進階整合（含 Connect）。

---

## 1. 環境變數

| 變數 | 必填 | 說明 |
|------|------|------|
| `STRIPE_SECRET_KEY` | 支付/訂閱時必填 | Stripe 後端金鑰（`sk_test_xxx` / `sk_live_xxx`） |
| `STRIPE_WEBHOOK_SECRET` | Webhook 驗證時必填 | Stripe Dashboard → Developers → Webhooks → 簽名密鑰 |

**未設定時行為：**

- 未設定 `STRIPE_SECRET_KEY`：應用可正常啟動；呼叫建立 PaymentIntent、訂閱、Customer 等 API 時會回傳錯誤「Stripe is not configured」。
- 未設定 `STRIPE_WEBHOOK_SECRET`：發送 Webhook 時會回傳錯誤「Stripe webhook is not configured」。

本地開發可只設 `STRIPE_SECRET_KEY`，用 Stripe CLI 轉發 webhook 時會取得暫時的 `STRIPE_WEBHOOK_SECRET`。

---

## 2. 使用中的流程

### 2.1 訂閱（Subscription Service）

- 創建訂閱：`StripeSubscriptionController` → `StripeSubscriptionService.createSubscription(userId, tierId, paymentMethodId)`。
- 使用 Stripe Subscriptions API 建立訂閱，成功後寫入 Redis + Kafka `subscription.created`。
- 取消：`cancelSubscription` 設定 `cancel_at_period_end`。
- 續訂：`PaymentEventConsumer` 訂閱 `payment.completed`，依 `metadata.subscriptionId` 呼叫 `SubscriptionService.extendPeriod`。

### 2.2 單次支付：PPV / 打賞（Payment Service）

- **建立意圖**  
  - PPV：`StripePaymentService.purchasePost(userId, postId, amount, stripeCustomerId)` → 建立 PaymentIntent + 一筆 `transaction`（type=ppv, relatedEntityId=postId）。  
  - 打賞：`StripePaymentService.tipCreator(userId, creatorId, amount, stripeCustomerId, message?)` → 建立 PaymentIntent + 一筆 `transaction`（type=tip, relatedEntityId=creatorId）。  
- **前端**：使用回傳的 `clientSecret` 以 Stripe.js 確認支付。
- **Webhook**：`payment_intent.succeeded` 時由 `StripeWebhookService.handlePaymentSuccess`：
  - 更新對應 `transaction` 為 succeeded；
  - 若 type=ppv：建立 `PostPurchase`（postId, buyerId, amount）；
  - 若 type=tip：建立 `Tip`（fromUserId, toUserId, amount）；
  - 發送 Kafka `PAYMENT_COMPLETED`。

Webhook 具冪等性：以 Redis `stripe:webhook:processed:{event.id}`（TTL 24h）避免重複處理。

---

## 3. Webhook 設定

1. Stripe Dashboard → Developers → Webhooks → Add endpoint。  
2. URL：`https://你的網域/stripe/webhooks`（對應 Payment Service 的 `StripeWebhookController`）。  
3. 訂閱事件：至少 `payment_intent.succeeded`、`payment_intent.payment_failed`。  
4. 複製「Signing secret」到環境變數 `STRIPE_WEBHOOK_SECRET`。  
5. 本地測試：`stripe listen --forward-to localhost:3000/stripe/webhooks`，並將輸出中的 signing secret 設為 `STRIPE_WEBHOOK_SECRET`。

---

## 4. Stripe Connect（創作者分潤，可選）

若未來要讓創作者直接收款、平台抽成，可導入 **Stripe Connect**：

- **帳戶類型**：Express 或 Custom（依審核與產品需求選擇）。  
- **流程概要**：  
  1. 創作者透過平台連結 Stripe Connect 帳戶（OAuth 或 Account Links）。  
  2. 平台在建立 PaymentIntent / Subscription 時帶上 `transfer_data.destination`（創作者 Connect account id）或使用 Destination Charges。  
  3. 打賞 / 訂閱 / PPV 可設定 `application_fee_amount` 作為平台抽成。

目前程式尚未實作 Connect；若需實作，需在：

- 創作者註冊/設定流程中取得並儲存 `stripeAccountId`；
- `StripePaymentService` / 訂閱建立處傳入 `stripeAccountId` 與（可選）`application_fee_amount`。

---

## 5. 測試

- 單元測試：`libs/common` 的 Stripe 相關邏輯可在 key 未設定時不拋錯啟動（見 `StripeService` 建構與 `isConfigured()`）。  
- 整合：使用 Stripe 測試卡號（如 `4242 4242 4242 4242`）與測試金鑰 `sk_test_xxx` 驗證支付與 webhook。
