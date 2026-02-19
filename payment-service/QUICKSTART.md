# 快速啟動指南

## ⚡ 5 分鐘快速開始

### 前置條件

- Docker 和 Docker Compose
- Node.js 20+
- Stripe 測試帳號

### 步驟 1: 克隆並配置

```bash
cd /Users/brianyu/.openclaw/workspace/payment-service

# 複製環境文件
cp .env.example .env

# 獲取 Stripe 密鑰
# 從 https://dashboard.stripe.com/apikeys 複製
# STRIPE_API_KEY=sk_test_xxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 步驟 2: 編輯 .env 文件

```bash
# 打開編輯器
nano .env

# 需要更新的字段:
STRIPE_API_KEY=sk_test_xxxxx  # 從 Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # 從 Stripe Webhooks
JWT_SECRET=your_jwt_secret_key  # 可以是任意字符串
```

### 步驟 3: 啟動服務

```bash
# 啟動 Docker 容器（包括 PostgreSQL）
docker-compose up -d

# 檢查狀態
docker-compose ps

# 查看日誌
docker-compose logs -f payment-service
```

### 步驟 4: 安裝依賴

```bash
npm install
```

### 步驟 5: 測試服務

```bash
# 運行單元測試
npm test

# 或者手動測試 API
curl http://localhost:3002/api/v1/payments
```

### 步驟 6: 本地開發

```bash
# 啟動開發服務器（熱重載）
npm run start:dev

# 服務運行在 http://localhost:3002
```

---

## 📝 常用命令

### 開發

```bash
# 開發模式（熱重載）
npm run start:dev

# 生產模式
npm run build
npm run start:prod

# 代碼格式化
npm run format

# Lint 檢查
npm run lint
```

### 測試

```bash
# 運行所有測試
npm test

# 監視模式（開發時持續運行）
npm run test:watch

# 生成覆蓋率報告
npm run test:cov
```

### Docker

```bash
# 啟動
docker-compose up -d

# 停止
docker-compose down

# 重啟
docker-compose restart

# 查看日誌
docker-compose logs -f payment-service
docker-compose logs -f postgres
```

---

## 🧪 測試 API

### 創建支付

```bash
curl -X POST http://localhost:3002/api/v1/payments/intent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 9.99,
    "currency": "USD",
    "description": "Premium Content"
  }'
```

### 創建訂閱

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

### 獲取訂閱

```bash
curl http://localhost:3002/api/v1/subscriptions/user/123e4567-e89b-12d3-a456-426614174000
```

---

## 🔗 Stripe CLI 本地測試

### 安裝 Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# 或在線安裝
curl https://files.stripe.com/stripe-cli/install.sh -O
sudo bash install.sh
```

### 監聽本地 Webhook

```bash
stripe login  # 登錄 Stripe 帳號

stripe listen --forward-to localhost:3002/api/v1/webhooks/stripe
# 記下 webhook signing secret: whsec_xxxxx
# 更新到 .env 中的 STRIPE_WEBHOOK_SECRET
```

### 模擬 Stripe 事件

```bash
# 在另一個終端

# 模擬支付成功
stripe trigger charge.succeeded

# 模擬支付失敗
stripe trigger charge.failed

# 模擬訂閱更新
stripe trigger customer.subscription.updated
```

---

## 📊 檢查應用狀態

### 數據庫連接

```bash
# 連接到 PostgreSQL
psql postgresql://payment_user:payment_password@localhost:5432/sugar_daddy_payment

# 查看表
\dt

# 查看支付記錄
SELECT * FROM payments LIMIT 5;

# 查看訂閱記錄
SELECT * FROM subscriptions LIMIT 5;
```

### 應用日誌

```bash
# 查看 Docker 日誌
docker-compose logs -f payment-service

# 查看最後 100 行
docker-compose logs --tail=100 payment-service
```

---

## 🐛 故障排除

### 問題: 無法連接到數據庫

```bash
# 檢查 Docker 容器是否運行
docker-compose ps

# 重啟數據庫容器
docker-compose restart postgres

# 檢查數據庫日誌
docker-compose logs postgres
```

### 問題: 端口 3002 已占用

```bash
# 檢查誰在使用該端口
lsof -i :3002

# 在 docker-compose.yml 中更改端口
# 把 "3002:3002" 改為 "3003:3002"
```

### 問題: 依賴安裝失敗

```bash
# 清除 node_modules 和 npm 緩存
rm -rf node_modules package-lock.json

# 重新安裝
npm install
```

### 問題: Stripe Webhook 不工作

```bash
# 確認 STRIPE_WEBHOOK_SECRET 正確
# 確認 webhook 端點 URL 配置正確
# 檢查 Stripe 儀表板中的 webhook 事件日誌
```

---

## 📚 下一步

1. **集成到前端**
   - 使用 Stripe.js 在前端收集支付信息
   - 調用支付 API 端點

2. **設置生產環境**
   - 更新 Stripe 生產密鑰
   - 配置生產數據庫
   - 部署到服務器

3. **添加功能**
   - PDF 發票生成
   - SendGrid 郵件集成
   - AWS S3 存儲

4. **監控和告警**
   - 設置 Stripe 告警
   - 配置日誌監控
   - 設置性能告警

---

## 📖 更多資源

- **API 文檔**: `docs/openapi.yaml`
- **完整文檔**: `README.md`
- **Stripe 配置**: `docs/STRIPE_SETUP.md`
- **完成報告**: `COMPLETION_REPORT.md`

---

## ✅ 檢查清單

確保一切設置正確：

- [ ] Docker 和 Docker Compose 已安裝
- [ ] Node.js 20+ 已安裝
- [ ] `.env` 文件已創建和配置
- [ ] Stripe API 密鑰已添加到 `.env`
- [ ] Docker 容器正在運行
- [ ] npm 依賴已安裝
- [ ] 測試通過 (`npm test`)
- [ ] 開發服務器運行中 (`npm run start:dev`)
- [ ] 可以調用 API (`curl http://localhost:3002/api/v1/payments`)

---

祝你開發愉快！🚀
