# 環境變數文檔

本文檔說明 Suggar Daddy 應用程式中所有環境變數的定義、用途、類型和要求。

## 目錄

- [環境變數文檔](#環境變數文檔)
  - [概述](#概述)
  - [核心環境變數](#核心環境變數)
  - [API 網關配置](#api-網關配置)
  - [數據庫配置](#數據庫配置)
  - [Redis 配置](#redis-配置)
  - [Kafka 配置](#kafka-配置)
  - [JWT 認證配置](#jwt-認證配置)
  - [Stripe 支付配置](#stripe-支付配置)
  - [Firebase 配置](#firebase-配置)
  - [Cloudinary 圖片配置](#cloudinary-圖片配置)
  - [前端配置](#前端配置)
  - [設定範例](#設定範例)

## 概述

環境變數在應用程式啟動時由 `EnvConfigModule` 進行驗證。所有變數都被驗證以確保應用程式具有運行所需的所有必要配置。

### 使用配置

所有環境變數都應該通過注入 `AppConfigService` 來訪問：

```typescript
import { AppConfigService } from '@libs/common';

@Injectable()
export class MyService {
  constructor(private config: AppConfigService) {}

  async myMethod() {
    const port = this.config.port;
    const dbHost = this.config.dbHost;
  }
}
```

相比直接訪問 `process.env['PORT']`，這提供了：
- ✅ 強型別的屬性存取
- ✅ IDE 自動完成
- ✅ 未定義屬性的編譯時檢查
- ✅ 默認值的安全擁有

---

## 核心環境變數

### NODE_ENV

- **類型**: `enum: 'development' | 'staging' | 'production'`
- **必需**: ✅ 是
- **默認**: `development`
- **說明**: 應用程式運行環境。控制日誌級別、驗證規則、錯誤處理等。
- **使用方式**:
  ```typescript
  const isDev = this.config.isDevelopment;
  const isProd = this.config.isProduction;
  const isStaging = this.config.isStaging;
  ```
- **例子**:
  ```env
  NODE_ENV=production
  NODE_ENV=development
  NODE_ENV=staging
  ```

### LOG_LEVEL

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `info`
- **說明**: 日誌詳細程度。選項: `error`、`warn`、`info`、`debug`、`trace`
- **例子**:
  ```env
  LOG_LEVEL=debug      # 開發環境
  LOG_LEVEL=info       # 關鍵環境
  LOG_LEVEL=error      # 生產環境（最小日誌）
  ```

---

## API 網關配置

### PORT

- **類型**: `number`
- **必需**: ❌ 否
- **默認**: `3000`
- **說明**: API 網關監聽的 HTTP 埠
- **使用環境**: Docker/Kubernetes 部署時覆蓋
- **例子**:
  ```env
  PORT=3000
  PORT=8080
  ```

### CORS_ORIGINS

- **類型**: `string` (逗號分隔)
- **必需**: ❌ 否
- **默認**: `http://localhost:4200`
- **說明**: 允許跨域請求的來源列表
- **生產建議**: 設定具體的域名，避免使用 `*`
- **例子**:
  ```env
  # 開發環境 - 單一來源
  CORS_ORIGINS=http://localhost:4200

  # 多個允許的來源
  CORS_ORIGINS=http://localhost:4200,https://app.sugardaddy.com,https://admin.sugardaddy.com

  # 生產環境
  CORS_ORIGINS=https://app.sugardaddy.com,https://admin.sugardaddy.com
  ```

---

## 數據庫配置

### DB_HOST

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `localhost`
- **說明**: PostgreSQL 數據庫主機
- **例子**:
  ```env
  DB_HOST=localhost              # 開發環境
  DB_HOST=db.example.com         # 生產環境
  DB_HOST=rds-prod.aws.amazon.com
  ```

### DB_PORT

- **類型**: `number`
- **必需**: ❌ 否
- **默認**: `5432`
- **說明**: PostgreSQL 數據庫埠
- **例子**:
  ```env
  DB_PORT=5432                   # 標準埠
  DB_PORT=3306                   # 自定義埠
  ```

### DB_USERNAME

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `postgres`
- **說明**: 數據庫用戶名
- **安全提示**: 從不提交到代碼庫
- **例子**:
  ```env
  DB_USERNAME=postgres           # 開發環境
  DB_USERNAME=app_user           # 生產環境
  ```

### DB_PASSWORD

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `postgres`
- **說明**: 數據庫密碼
- **⚠️ 安全警告**: 務必從不提交到版本控制
- **祕密管理**:
  - 在 Docker/K8s 中使用 Secrets
  - 在 CI/CD 中使用環境祕密
  - 使用密鑰管理服務（AWS Secrets Manager、Azure Key Vault）
- **例子**:
  ```env
  DB_PASSWORD=secure_password_here
  ```

### DB_DATABASE

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `suggar_daddy`
- **說明**: PostgreSQL 數據庫名稱
- **例子**:
  ```env
  DB_DATABASE=suggar_daddy       # 開發/生產
  DB_DATABASE=suggar_daddy_test  # 測試
  ```

### DB_MASTER_HOST

- **類型**: `string` (可選)
- **必需**: ❌ 否（除非使用讀寫分離）
- **默認**: `null`
- **說明**: 主數據庫主機（用於寫操作）。設定此項以啟用讀寫分離
- **提示**: 若設定，必須同時設定 `DB_REPLICA_HOSTS`
- **例子**:
  ```env
  # 不使用讀寫分離
  # 保留未設定

  # 讀寫分離配置
  DB_MASTER_HOST=master.db.example.com
  ```

### DB_REPLICA_HOSTS

- **類型**: `string` (逗號分隔)
- **必需**: ❌ 否（除非使用讀寫分離）
- **默認**: `` (空)
- **說明**: 副本數據庫主機列表（用於讀操作）。啟用只讀副本擴展性能
- **格式**: 逗號分隔，支持多個副本以提高可用性
- **例子**:
  ```env
  # 單個副本
  DB_REPLICA_HOSTS=replica1.db.example.com

  # 多個副本（負載平衡）
  DB_REPLICA_HOSTS=replica1.db.example.com,replica2.db.example.com,replica3.db.example.com
  ```

### DB_POOL_MAX

- **類型**: `number`
- **必需**: ❌ 否
- **默認**: `20`
- **說明**: 數據庫連線池最大連線數
- **考慮因素**:
  - 增加以改善高流量性能
  - 務必確保數據庫可以處理該數量的連線
  - 典型值: 開發 5-10，生產 20-50
- **例子**:
  ```env
  DB_POOL_MAX=5        # 開發環境
  DB_POOL_MAX=20       # 中等負載
  DB_POOL_MAX=50       # 高負載生產
  ```

### DB_POOL_MIN

- **類型**: `number`
- **必需**: ❌ 否
- **默認**: `5`
- **說明**: 數據庫連線池最小連線數（保持打開的空閒連線）
- **建議**: 通常是 MAX 的 25%
- **例子**:
  ```env
  DB_POOL_MIN=5
  DB_POOL_MIN=10
  ```

### DB_POOL_IDLE_TIMEOUT_MS

- **類型**: `number`
- **必需**: ❌ 否
- **默認**: `30000` (30 秒)
- **說明**: 空閒連線在關閉前的超時時間（毫秒）
- **例子**:
  ```env
  DB_POOL_IDLE_TIMEOUT_MS=30000  # 30 秒
  DB_POOL_IDLE_TIMEOUT_MS=60000  # 1 分鐘
  ```

---

## Redis 配置

### REDIS_HOST

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `localhost`
- **說明**: Redis 伺服器主機
- **用途**: 快取、速率限制、會話儲存
- **例子**:
  ```env
  REDIS_HOST=localhost           # 開發環境
  REDIS_HOST=redis.example.com   # 生產環境
  REDIS_HOST=elasticache.aws.amazon.com
  ```

### REDIS_PORT

- **類型**: `number`
- **必需**: ❌ 否
- **默認**: `6379`
- **說明**: Redis 伺服器埠
- **例子**:
  ```env
  REDIS_PORT=6379               # 標準埠
  REDIS_PORT=6380               # 自定義埠
  ```

### REDIS_PASSWORD

- **類型**: `string` (可選)
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Redis 認證密碼
- **提示**: 如果 Redis 受嚴格密碼保護（生產環境強烈建議），則設定此選項
- **安全提示**: 務必使用強密碼，不要在版本控制中提交
- **例子**:
  ```env
  # 無密碼（僅開發）
  # 保留未設定

  # 帶密碼（生產）
  REDIS_PASSWORD=your_secure_redis_password
  ```

### REDIS_DB

- **類型**: `number`
- **必需**: ❌ 否
- **默認**: `0`
- **說明**: Redis 數據庫索引號（0-15）
- **使用案例**: 為不同服務或環境使用不同 DB
- **例子**:
  ```env
  REDIS_DB=0         # 生產環境
  REDIS_DB=1         # 測試環境
  REDIS_DB=15        # 開發環境（隔離）
  ```

---

## Kafka 配置

### KAFKA_BROKERS

- **類型**: `string` (逗號分隔)
- **必需**: ❌ 否
- **默認**: `localhost:9092`
- **說明**: Kafka 代理清單（用於事件流傳輸）
- **用途**: 事件發佈/訂閱、異步消息傳遞
- **例子**:
  ```env
  # 開發環境 - 單一代理
  KAFKA_BROKERS=localhost:9092

  # 生產環境 - 多個代理（高可用性）
  KAFKA_BROKERS=kafka1.example.com:9092,kafka2.example.com:9092,kafka3.example.com:9092

  # AWS MSK
  KAFKA_BROKERS=b-1.cluster.xxxxx.kafka.region.amazonaws.com:9092,b-2.cluster.xxxxx.kafka.region.amazonaws.com:9092
  ```

### KAFKA_CLIENT_ID

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `default-client`
- **說明**: Kafka 用戶端識別符
- **建議**: 為各個服務使用唯一的 ID（例如，`api-gateway-client`、`user-service-client`）
- **例子**:
  ```env
  KAFKA_CLIENT_ID=api-gateway-client
  KAFKA_CLIENT_ID=user-service-client
  KAFKA_CLIENT_ID=matching-service-client
  ```

### KAFKA_GROUP_ID

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `default-group`
- **說明**: Kafka 消費者群組 ID
- **重要**: 多個實例共享同一個群組 ID 才能進行負載平衡
- **例子**:
  ```env
  KAFKA_GROUP_ID=user-service-group
  KAFKA_GROUP_ID=matching-service-group
  ```

---

## JWT 認證配置

### JWT_SECRET

- **類型**: `string`
- **必需**: 
  - ❌ 否（開發環境使用默認值）
  - ✅ 是（生產環境 - 強制必需）
- **默認**: `fallback-secret-key-change-in-production`
- **說明**: 用於簽署 JWT 令牌的祕密密鑰
- **⚠️ 安全警告**: 
  - 必須是強隨機字串（最少 32 字符）
  - 務必在生產中更改
  - 從不提交到版本控制
  - 保持其祕密，絕不共享
- **生成安全祕密**:
  ```bash
  # 使用 Node.js 生成
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  # 或使用 OpenSSL
  openssl rand -base64 32
  ```
- **例子**:
  ```env
  # 開發環境
  JWT_SECRET=my-dev-secret-key

  # 生產環境（必須更改！）
  JWT_SECRET=your-long-random-security-string-here-at-least-32-chars
  ```

### JWT_EXPIRES_IN

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `7d`
- **說明**: JWT 令牌有效期
- **格式**: 支持 `ms` 庫格式 (例如: `1h`、`30m`、`7d`)
- **例子**:
  ```env
  JWT_EXPIRES_IN=1h      # 1 小時
  JWT_EXPIRES_IN=30m     # 30 分鐘
  JWT_EXPIRES_IN=7d      # 7 天
  JWT_EXPIRES_IN=24h     # 24 小時
  ```

---

## Stripe 支付配置

### STRIPE_SECRET_KEY

- **類型**: `string`
- **必需**: 
  - ❌ 否（開發環境 - 模式）
  - ✅ 是（生產環境 - 強制必需）
- **默認**: `null`
- **說明**: Stripe 祕密 API 金鑰（用於伺服器端支付處理）
- **取得方式**: 從 [Stripe 儀表板](https://dashboard.stripe.com/apikeys) 獲取
- **⚠️ 安全警告**:
  - 絕不在客戶端代碼中披露
  - 從不保存在版本控制中
  - 使用環境變數或祕密管理服務
- **生產要求**: 必須設定實時金鑰
- **例子**:
  ```env
  # 測試模式（開發）
  STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  # 實時模式（生產）
  STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

### STRIPE_WEBHOOK_SECRET

- **類型**: `string`
- **必需**: 
  - ❌ 否（開發環境）
  - ✅ 是（生產環境 - 強制必需以驗證 Webhook）
- **默認**: `null`
- **說明**: Stripe Webhook 終端祕密簽名金鑰
- **用途**: 驗證來自 Stripe 的 Webhook 事件的真實性
- **取得方式**: 從 Stripe 儀表板設定 Webhook 終端時
- **例子**:
  ```env
  STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

### STRIPE_PUBLISHABLE_KEY

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Stripe 可發佈的 API 金鑰（用於客戶端）
- **用途**: 在前端應用中嵌入支付表單
- **注意**: 此金鑰可以公開（與祕密金鑰不同）
- **例子**:
  ```env
  # 測試模式
  STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  # 實時模式
  STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

---

## Firebase 配置

### FIREBASE_PROJECT_ID

- **類型**: `string` (可選)
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Firebase 專案 ID
- **用途**: 推送通知、雲訊息傳遞
- **取得方式**: 從 Firebase 控制台
- **例子**:
  ```env
  FIREBASE_PROJECT_ID=my-app-project-id
  ```

### FIREBASE_CLIENT_EMAIL

- **類型**: `string` (可選)
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Firebase 服務帳戶電郵
- **格式**: `xxxx@xxxx.iam.gserviceaccount.com`
- **例子**:
  ```env
  FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@my-app-project.iam.gserviceaccount.com
  ```

### FIREBASE_PRIVATE_KEY

- **類型**: `string` (可選)
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Firebase 服務帳戶私鑰
- **⚠️ 安全警告**: 絕不提交到版本控制
- **格式**: PEM 編碼的私鑰（包括 `-----BEGIN` 和 `-----END`）
- **例子**:
  ```env
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...key content...\n-----END PRIVATE KEY-----\n"
  ```

---

## Cloudinary 圖片配置

### CLOUDINARY_CLOUD_NAME

- **類型**: `string` (可選)
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Cloudinary 雲名稱
- **用途**: 圖片上傳、儲存和變換
- **取得方式**: 從 Cloudinary 儀表板
- **例子**:
  ```env
  CLOUDINARY_CLOUD_NAME=my-cloud-name
  ```

### CLOUDINARY_API_KEY

- **類型**: `string` (可選)
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Cloudinary API 金鑰
- **例子**:
  ```env
  CLOUDINARY_API_KEY=123456789012345
  ```

### CLOUDINARY_API_SECRET

- **類型**: `string` (可選)
- **必需**: ❌ 否
- **默認**: `null`
- **說明**: Cloudinary API 祕密
- **⚠️ 安全警告**: 務必保密，不要在客戶端公開
- **例子**:
  ```env
  CLOUDINARY_API_SECRET=your-secret-key-here
  ```

---

## 前端配置

### NEXT_PUBLIC_API_URL

- **類型**: `string`
- **必需**: ❌ 否
- **默認**: `http://localhost:3000`
- **說明**: 前端應用程式用於 API 調用的 API 基礎 URL
- **💡 前綴 `NEXT_PUBLIC_`**: 表示此變數暴露給客戶端（不是祕密）
- **跨域注意**: 應與 `CORS_ORIGINS` 匹配的來源一致
- **例子**:
  ```env
  # 開發環境
  NEXT_PUBLIC_API_URL=http://localhost:3000

  # 生產環境
  NEXT_PUBLIC_API_URL=https://api.sugardaddy.com
  ```

---

## 設定範例

### 開發環境 `.env.local`

```env
# 核心
NODE_ENV=development
LOG_LEVEL=debug

# 伺服器
PORT=3000
CORS_ORIGINS=http://localhost:4200,http://localhost:3001

# 數據庫
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=local-client
KAFKA_GROUP_ID=local-group

# JWT
JWT_SECRET=my-dev-secret-key
JWT_EXPIRES_IN=7d

# Stripe（可選）
# STRIPE_SECRET_KEY=sk_test_xxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 前端
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 生產環境 `.env.production`

```env
# 核心
NODE_ENV=production
LOG_LEVEL=warn

# 伺服器
PORT=8080
CORS_ORIGINS=https://app.sugardaddy.com,https://admin.sugardaddy.com

# 數據庫
DB_HOST=rds-prod.aws.amazon.com
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=${PROD_DB_PASSWORD}  # 從祕密管理服務注入
DB_DATABASE=suggar_daddy
DB_MASTER_HOST=master.db.example.com
DB_REPLICA_HOSTS=replica1.db.example.com,replica2.db.example.com

# Redis
REDIS_HOST=elasticache.aws.amazon.com
REDIS_PORT=6379
REDIS_PASSWORD=${PROD_REDIS_PASSWORD}  # 從祕密管理服務注入
REDIS_DB=0

# Kafka
KAFKA_BROKERS=kafka1.aws.amazon.com:9092,kafka2.aws.amazon.com:9092,kafka3.aws.amazon.com:9092
KAFKA_CLIENT_ID=api-gateway-prod
KAFKA_GROUP_ID=prod-group

# JWT
JWT_SECRET=${PROD_JWT_SECRET}  # 從祕密管理服務注入
JWT_EXPIRES_IN=1h

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Firebase
FIREBASE_PROJECT_ID=my-app-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@my-app-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=${PROD_FIREBASE_PRIVATE_KEY}  # 從祕密管理服務注入

# Cloudinary
CLOUDINARY_CLOUD_NAME=my-cloud-name
CLOUDINARY_API_KEY=${PROD_CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${PROD_CLOUDINARY_API_SECRET}

# 前端
NEXT_PUBLIC_API_URL=https://api.sugardaddy.com
```

### 暫存環境（測試、預安裝） `.env.staging`

```env
# 核心
NODE_ENV=staging
LOG_LEVEL=info

# 伺服器
PORT=3000
CORS_ORIGINS=https://staging.sugardaddy.com,https://staging-admin.sugardaddy.com

# 數據庫（專用暫存 DB）
DB_HOST=db-staging.aws.amazon.com
DB_PORT=5432
DB_USERNAME=staging_user
DB_PASSWORD=${STAGING_DB_PASSWORD}
DB_DATABASE=suggar_daddy_staging

# Redis
REDIS_HOST=redis-staging.aws.amazon.com
REDIS_PORT=6379
REDIS_PASSWORD=${STAGING_REDIS_PASSWORD}

# Kafka
KAFKA_BROKERS=kafka-staging.aws.amazon.com:9092
KAFKA_CLIENT_ID=api-gateway-staging
KAFKA_GROUP_ID=staging-group

# JWT
JWT_SECRET=${STAGING_JWT_SECRET}
JWT_EXPIRES_IN=7d

# Stripe（使用測試金鑰）
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 前端
NEXT_PUBLIC_API_URL=https://api-staging.sugardaddy.com
```

---

## 最佳實踐

### 祕密管理

1. **絕不提交祕密到版本控制**
   - 使用 `.gitignore` 排除 `.env`、`.env.local`、`.env.*.local`
   - 提交 `.env.example` 作為模板

2. **使用 CI/CD 祕密**
   ```yaml
   # GitHub Actions 範例
   - name: Deploy
     env:
       DB_PASSWORD: ${{ secrets.PROD_DB_PASSWORD }}
       JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
   ```

3. **使用 Container Secrets**
   ```bash
   # Docker Secrets （Swarm）
   docker run --secret db_password ...

   # Kubernetes Secrets
   kubectl create secret generic app-secrets --from-literal=db-password=xxxxx
   ```

4. **使用專業祕密管理服務**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault
   - 1Password CLI

### 環境隔離

1. **為每個環境使用獨立的資源**
   - 不同的數據庫執行個體
   - 不同的 Redis 執行個體
   - 不同的 Stripe 帳戶（測試 vs. 實時）

2. **共享配置使用預設值**
   - 不需要為開發環境設定 Stripe 金鑰（可選）
   - Firebase 配置是可選的（除非使用推送通知）

3. **驗證生產設定**
   ```bash
   # 生產環境啟動前檢查
   npm run validate:env:production
   ```

### 驗證和錯誤處理

應用程式在啟動時自動驗證所有環境變數。如果發現問題，應用程式會失敗並顯示詳細錯誤訊息，例如：

```
環境驗證失敗:
  DB_HOST: "localhost" must be a string
  JWT_SECRET: JWT_SECRET is required in production environment
  STRIPE_SECRET_KEY: must be a string when provided
```

這可確保配置問題在開發時而不是運行時被發現。

---

## 常見問題解答

### Q: 如何在部署後更改環境變數？

**A:** 這取決於您的部署方法：

- **Docker**: 重新構建圖像或使用環境變數標誌傳遞
- **Kubernetes**: 更新 ConfigMap/Secret 並重新啟動 Pod
- **AWS**: 更新環境變數並重新開始應用程式
- **Heroku**: 使用 `heroku config:set KEY=VALUE`

### Q: 生產環境中遺漏環境變數時會發生什麼？

**A:** 應用程式啟動時會失敗，並顯示詳細錯誤訊息說明哪些變數遺失或無效。

### Q: 我可以在執行時更改環境變數嗎？

**A:** 環境變數在啟動時讀取和驗證。運行時更改不會自動反映（除非代碼明確檢查）。對於動態配置，請考慮使用 Redis 或數據庫。

### Q: 如何為本地開發設定所有變數？

**A:** 複製 `.env.example` 為 `.env.local`，並根據您的開發設定編輯值：

```bash
cp .env.example .env.local
# 編輯 .env.local
```

### Q: 環境變數優先順序是什麼？

**A:** 
1. 系統環境變數（最高優先順序）
2. `.env.{NODE_ENV}.local` 檔案
3. `.env.{NODE_ENV}` 檔案
4. `.env.local` 檔案
5. `.env` 檔案
6. 代碼中的預設值（最低優先順序）

---

## 相關檔案

- [`libs/common/src/config/env.validation.ts`](libs/common/src/config/env.validation.ts) - Joi 驗證架構定義
- [`libs/common/src/config/app.config.ts`](libs/common/src/config/app.config.ts) - 類型化配置服務
- [`libs/common/src/config/env-config.module.ts`](libs/common/src/config/env-config.module.ts) - 配置模組
- [`.env.example`](.env.example) - 環境變數模板

---

**最後更新**: 2024 年
**維護者**: Suggar Daddy 開發團隊
