# 環境變數完整說明

Sugar Daddy 專案使用環境變數來配置不同環境下的服務行為。本文檔詳細說明所有環境變數的用途和配置方式。

## 📁 環境文件說明

專案根目錄下有多個環境配置文件：

| 文件名 | 用途 | 說明 |
|--------|------|------|
| `.env.example` | 範本文件 | 包含所有可用的環境變數和預設值（**應提交到 Git**） |
| `.env` | 本地開發 | 開發者的個人配置（**不應提交到 Git**） |
| `.env.development` | 開發環境 | 開發環境專用配置 |
| `.env.staging` | 測試環境 | Staging 環境配置 |
| `.env.production` | 生產環境 | 生產環境配置（**包含敏感資料，不應提交**） |
| `.env.docker` | Docker 部署 | Docker Compose 使用的配置 |
| `.env.local` | 本地覆蓋 | 覆蓋其他環境變數（優先級最高） |

### 優先級順序

```
.env.local > .env.[NODE_ENV] > .env
```

例如：當 `NODE_ENV=development` 時：
1. 首先載入 `.env`
2. 然後載入 `.env.development`（覆蓋重複的變數）
3. 最後載入 `.env.local`（覆蓋所有重複的變數）

---

## 🌍 核心環境變數

### NODE_ENV
- **說明**: 運行環境
- **可選值**: `development` | `staging` | `production`
- **預設值**: `development`
- **範例**: `NODE_ENV=production`

### LOG_LEVEL
- **說明**: 日誌輸出層級
- **可選值**: `error` | `warn` | `info` | `debug`
- **預設值**: `debug` (開發), `info` (生產)
- **範例**: `LOG_LEVEL=info`

---

## 🚪 API Gateway 配置

### PORT
- **說明**: API Gateway 監聽端口
- **預設值**: `3000`
- **範例**: `PORT=3000`

### CORS_ORIGINS
- **說明**: 允許的跨域來源（逗號分隔）
- **預設值**: `http://localhost:4200,http://localhost:4300`
- **範例**: `CORS_ORIGINS=https://app.example.com,https://admin.example.com`

---

## 💾 PostgreSQL 配置

### 單機模式（開發環境）

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=suggar_daddy
```

### 高可用模式（生產環境）

啟用主從架構和讀寫分離：

```env
# 啟用 HA 模式
POSTGRES_HA_ENABLED=true

# 主節點（寫入）
POSTGRES_MASTER_HOST=postgres-master
POSTGRES_MASTER_PORT=5432

# 從節點（讀取）
POSTGRES_REPLICA_HOST=postgres-replica
POSTGRES_REPLICA_PORT=5433

# 複製密碼
REPLICATION_PASSWORD=your_secure_replication_password
```

### 連接池配置

```env
# 最大連接數
DATABASE_POOL_MAX=20

# 最小連接數
DATABASE_POOL_MIN=5

# 空閒連接超時（毫秒）
DATABASE_POOL_IDLE_TIMEOUT=30000

# 連接超時（毫秒）
DATABASE_POOL_CONNECTION_TIMEOUT=2000
```

**說明**:
- `POOL_MAX`: 根據服務數量調整（生產環境建議 20-50）
- `POOL_MIN`: 保持足夠的熱連接以減少延遲
- `IDLE_TIMEOUT`: 釋放長時間未使用的連接
- `CONNECTION_TIMEOUT`: 快速失敗，避免請求堆積

---

## 🔴 Redis 配置

### 單機模式（開發環境）

```env
REDIS_HOST=redis
REDIS_PORT=6379
```

### Sentinel 高可用模式（生產環境）

```env
# Sentinel 節點列表（逗號分隔）
REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26380,redis-sentinel-3:26381

# Master 名稱
REDIS_MASTER_NAME=mymaster
```

**Sentinel 優勢**:
- ✅ 自動故障轉移
- ✅ 可用性達 99.9%+
- ✅ 無需手動干預
- ✅ 主從自動切換

**注意**: 使用 Sentinel 模式時，請註解掉 `REDIS_HOST` 和 `REDIS_PORT`。

---

## 📨 Kafka 配置

### KAFKA_BROKERS
- **說明**: Kafka broker 列表（逗號分隔）
- **預設值**: `kafka:9092`
- **生產環境**: `kafka-1:9092,kafka-2:9092,kafka-3:9092`
- **範例**: `KAFKA_BROKERS=kafka:9092`

### Kafka 主題（自動創建）

服務會自動創建以下主題：
- `user.created`, `user.updated`, `user.deleted`
- `content.post.created`, `content.post.updated`, `content.post.deleted`
- `payment.completed`, `payment.failed`
- `subscription.created`, `subscription.cancelled`
- `media.uploaded`
- `message.created`
- `notification.created`

---

## 🔐 JWT 配置

### JWT_SECRET
- **說明**: JWT 簽名密鑰（**必須保密**）
- **建議**: 使用至少 32 字符的隨機字串
- **生成方式**: `openssl rand -base64 32`
- **範例**: `JWT_SECRET=your-super-secret-jwt-key-change-in-production`

### JWT_EXPIRES_IN
- **說明**: Token 有效期限
- **格式**: `[數字][單位]`，單位可為 `s`(秒), `m`(分), `h`(小時), `d`(天)
- **預設值**: `7d`（7 天）
- **範例**: `JWT_EXPIRES_IN=24h`

---

## 💳 Stripe 配置

### STRIPE_SECRET_KEY
- **說明**: Stripe API 密鑰（**必須保密**）
- **測試模式**: `sk_test_...`
- **生產模式**: `sk_live_...`
- **取得方式**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### STRIPE_WEBHOOK_SECRET
- **說明**: Webhook 簽名驗證密鑰
- **格式**: `whsec_...`
- **取得方式**: Stripe Dashboard > Webhooks > Add endpoint
- **用途**: 驗證 Webhook 請求的真實性

### STRIPE_PUBLISHABLE_KEY
- **說明**: Stripe 公開金鑰（前端使用）
- **測試模式**: `pk_test_...`
- **生產模式**: `pk_live_...`

**範例**:
```env
STRIPE_SECRET_KEY=sk_test_51AbCdEf...
STRIPE_WEBHOOK_SECRET=whsec_AbCdEf123...
STRIPE_PUBLISHABLE_KEY=pk_test_51AbCdEf...
```

---

## 🔥 Firebase 配置（可選）

用於推播通知和即時功能。

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**取得方式**:
1. Firebase Console > 專案設定
2. 服務帳戶 > 生成新的私密金鑰
3. 下載 JSON 文件並提取以上欄位

---

## ☁️ Cloudinary 配置（媒體上傳）

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret
```

**取得方式**: [Cloudinary Console](https://console.cloudinary.com/)

**用途**:
- 圖片上傳與存儲
- 圖片轉換與優化
- CDN 加速

---

## 🔍 Jaeger 分散式追蹤（可選）

用於微服務間的請求追蹤和性能分析。

```env
JAEGER_ENDPOINT=http://jaeger:4318/v1/traces
OTEL_SAMPLING_RATE=1.0
APP_VERSION=1.0.0
```

**說明**:
- `JAEGER_ENDPOINT`: Jaeger Collector 端點
- `OTEL_SAMPLING_RATE`: 採樣率（1.0 = 100%，0.1 = 10%）
- `APP_VERSION`: 應用版本（用於追蹤）

---

## 🌐 前端配置

### NEXT_PUBLIC_API_URL
- **說明**: API Gateway URL（前端使用）
- **開發環境**: `http://localhost:3000`
- **生產環境**: `https://api.yourdomain.com`
- **範例**: `NEXT_PUBLIC_API_URL=http://localhost:3000`

**注意**: Next.js 中，所有以 `NEXT_PUBLIC_` 開頭的變數會被打包到前端 bundle 中，因此**不應包含敏感資料**。

---

## 🛡️ Rate Limiting 配置

### 全局限流

```env
# 全局限流：每分鐘最多請求數
THROTTLE_GLOBAL_LIMIT=100

# 限流時間窗口（秒）
THROTTLE_WINDOW_SECONDS=60
```

### 端點限流

```env
# 認證端點限流（防止暴力破解）
THROTTLE_AUTH_LIMIT=5

# 支付端點限流（防止重複扣款）
THROTTLE_PAYMENT_LIMIT=10
```

**說明**:
- 全局限流適用於所有 API 端點
- 認證端點和支付端點有更嚴格的限制
- 限流基於 IP 地址（認證前）或用戶 ID（認證後）

**參考文檔**: [Rate Limiting 部署指南](../guides/RATE_LIMITING_DEPLOYMENT_GUIDE.md)

---

## 🚀 服務端口配置

各微服務的端口配置（僅開發環境需要）：

```env
# API Gateway
PORT=3000

# 微服務端口（自動配置，無需修改）
AUTH_SERVICE_PORT=3002
USER_SERVICE_PORT=3001
CONTENT_SERVICE_PORT=3006
PAYMENT_SERVICE_PORT=3007
SUBSCRIPTION_SERVICE_PORT=3005
MATCHING_SERVICE_PORT=3003
MEDIA_SERVICE_PORT=3008
ADMIN_SERVICE_PORT=3010
SKILL_SERVICE_PORT=3009

# 前端端口
WEB_PORT=4200
ADMIN_PORT=4300
```

**注意**: 生產環境使用容器編排（Kubernetes / Docker Swarm），端口由編排工具管理。

---

## 🔧 設置步驟

### 1. 複製範本文件

```bash
cp .env.example .env
```

### 2. 修改必要的變數

最少需要修改的變數：
- `POSTGRES_PASSWORD`: 資料庫密碼
- `JWT_SECRET`: JWT 簽名密鑰
- `STRIPE_SECRET_KEY`: Stripe API 密鑰

### 3. 生成安全密鑰

```bash
# JWT Secret
openssl rand -base64 32

# PostgreSQL 密碼
openssl rand -base64 16

# Replication 密碼
openssl rand -base64 16
```

### 4. 驗證配置

```bash
# 啟動服務並檢查日誌
npm run dev

# 檢查服務健康狀態
curl http://localhost:3000/health
```

---

## 🔒 安全最佳實踐

### ✅ 應該做的

1. **使用強密碼**: 至少 16 字符，包含大小寫字母、數字和特殊符號
2. **定期輪換密鑰**: JWT_SECRET 和 API keys 應定期更換
3. **環境隔離**: 開發、測試、生產使用不同的密鑰
4. **使用 Docker Secrets**: 生產環境使用 Docker Secrets 或 Kubernetes Secrets
5. **限制訪問**: `.env` 文件權限設為 `600` (僅擁有者可讀寫)

```bash
chmod 600 .env
```

### ❌ 不應該做的

1. **不要提交 .env**: 確保 `.env` 在 `.gitignore` 中
2. **不要在代碼中硬編碼**: 永遠不要把密鑰直接寫在代碼中
3. **不要共享密鑰**: 每個開發者應該有自己的 `.env` 文件
4. **不要使用預設密碼**: 範本中的密碼必須修改
5. **不要在前端暴露**: 敏感變數不要使用 `NEXT_PUBLIC_` 前綴

---

## 🐳 Docker Secrets

生產環境建議使用 Docker Secrets 管理敏感資料。

### 創建 Secrets

```bash
# 執行自動設置腳本
./scripts/setup-secrets.sh --production
```

### Secrets 列表

專案會創建以下 secrets（存放在 `secrets/` 目錄）：
- `postgres_password.txt`
- `replication_password.txt`
- `jwt_secret.txt`
- `stripe_secret_key.txt`
- `stripe_webhook_secret.txt`
- `cloudinary_api_secret.txt`

### 在 Docker Compose 中使用

```yaml
services:
  api-gateway:
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
    secrets:
      - jwt_secret

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

**參考文檔**: [Secrets 管理指南](../devops/secrets-management.md)

---

## 🌍 環境特定配置

### 開發環境 (.env.development)

```env
NODE_ENV=development
LOG_LEVEL=debug
POSTGRES_HOST=localhost
REDIS_HOST=localhost
KAFKA_BROKERS=localhost:9092
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 測試環境 (.env.staging)

```env
NODE_ENV=staging
LOG_LEVEL=info
POSTGRES_HA_ENABLED=true
POSTGRES_MASTER_HOST=postgres-staging-master
POSTGRES_REPLICA_HOST=postgres-staging-replica
NEXT_PUBLIC_API_URL=https://staging-api.yourdomain.com
```

### 生產環境 (.env.production)

```env
NODE_ENV=production
LOG_LEVEL=warn
POSTGRES_HA_ENABLED=true
POSTGRES_MASTER_HOST=postgres-prod-master
POSTGRES_REPLICA_HOST=postgres-prod-replica
REDIS_SENTINELS=sentinel-1:26379,sentinel-2:26379,sentinel-3:26379
KAFKA_BROKERS=kafka-1:9092,kafka-2:9092,kafka-3:9092
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
OTEL_SAMPLING_RATE=0.1
```

---

## 🧪 測試用配置

執行測試時，可以使用 `.env.test` 文件：

```env
NODE_ENV=test
LOG_LEVEL=error
POSTGRES_HOST=localhost
POSTGRES_PORT=5433  # 使用不同的端口避免衝突
POSTGRES_DB=suggar_daddy_test
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=test-secret-key
```

---

## 📚 相關文檔

- [Docker Secrets 管理](../devops/secrets-management.md)
- [部署指南](../technical/deployment.md)
- [開發指南](../technical/development.md)
- [Rate Limiting 配置](../guides/RATE_LIMITING_DEPLOYMENT_GUIDE.md)
- [安全審查](../architecture/security-review.md)

---

## ❓ 常見問題

### Q: 我應該使用哪個 .env 文件？
**A**: 本地開發使用 `.env`，其他環境使用對應的 `.env.[環境名]`。

### Q: .env 文件應該提交到 Git 嗎？
**A**: 只有 `.env.example` 應該提交，其他 `.env*` 文件包含敏感資料，不應提交。

### Q: 如何在 Docker 中使用環境變數？
**A**: Docker Compose 會自動載入 `.env` 文件。生產環境建議使用 Docker Secrets。

### Q: JWT_SECRET 應該多長？
**A**: 建議至少 32 字符。使用 `openssl rand -base64 32` 生成。

### Q: Stripe 測試模式和生產模式有什麼區別？
**A**: 測試模式使用 `sk_test_` 開頭的密鑰，不會真實扣款。生產模式使用 `sk_live_` 密鑰，會真實交易。

### Q: 如何驗證 Redis Sentinel 配置是否正確？
**A**: 啟動服務後檢查日誌，應該會看到 "Connected to Redis Sentinel" 訊息。

---

## 🔄 更新日誌

- **2026-02-17**: 創建完整的環境變數文檔
- **2026-02-16**: 添加 Rate Limiting 配置
- **2026-02-15**: 添加 Docker Secrets 說明
- **2026-02-13**: 添加 PostgreSQL HA 和 Redis Sentinel 配置
