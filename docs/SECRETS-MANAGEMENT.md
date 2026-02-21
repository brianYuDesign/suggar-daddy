# 📦 生產環境 - Secrets 管理配置

## 🔐 Secrets Management 文件結構

此目錄包含生產環境的機密信息管理。

**重要**: 所有包含敏感信息的文件應該：
- ✅ 添加到 `.gitignore`
- ✅ 使用 Vault/AWS Secrets Manager 管理
- ✅ 定期輪換
- ✅ 啟用存取日誌審計

---

## 📋 文件說明

### 1. `.env.production` (核心生產環境變量)
- 數據庫連接信息
- Redis 配置
- AWS 認證信息
- 第三方服務 API 密鑰

### 2. `.env.production.secrets` (加密的敏感信息)
- 數據庫密碼
- API 密鑰
- JWT 簽名密鑰
- 加密金鑰

### 3. `vault-config.json` (HashiCorp Vault 配置)
- KV 引擎配置
- 密鑰策略
- 密鑰輪換規則

### 4. `aws-secrets-config.json` (AWS Secrets Manager 配置)
- 密鑰存儲位置
- IAM 角色配置
- 自動輪換規則

---

## 🛡️ 最佳實踐

1. **分層管理**
   - Development: 提交到版本控制 (.env.dev)
   - Staging: Vault/AWS Secrets Manager
   - Production: AWS Secrets Manager + 加密

2. **定期輪換**
   - 數據庫密碼: 每季度
   - API 密鑰: 每月
   - SSL 證書: 每年
   - JWT 密鑰: 每 6 個月

3. **存取控制**
   - 使用 IAM 角色限制存取
   - 啟用 CloudTrail 審計日誌
   - 多人審批流程

4. **應急措施**
   - 定期備份 (加密)
   - 應急恢復計劃
   - 密鑰淘汰清單

---

## 🚀 快速開始

```bash
# 1. 生成加密密鑰
openssl rand -base64 32 > ./security/encryption.key

# 2. 創建生產 .env 文件
cp .env.example .env.production

# 3. 編輯敏感信息 (使用編輯器)
vim .env.production

# 4. 加密敏感信息
./scripts/encrypt-secrets.sh .env.production

# 5. 驗證配置
./scripts/validate-secrets.sh

# 6. 部署到應用
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📝 環境變量模板

### 數據庫 (PostgreSQL)

```env
# PostgreSQL
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>
POSTGRES_DB=sugar_daddy_prod
POSTGRES_HOST=postgres.prod.internal
POSTGRES_PORT=5432
POSTGRES_SSL_MODE=require
POSTGRES_BACKUP_RETENTION_DAYS=30
POSTGRES_BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
```

### Redis (Cache & Session)

```env
# Redis
REDIS_HOST=redis.prod.internal
REDIS_PORT=6379
REDIS_PASSWORD=<STRONG_PASSWORD_HERE>
REDIS_DB=0
REDIS_TLS_ENABLED=true
REDIS_CLUSTER_ENABLED=false
REDIS_REPLICATION_ENABLED=true
```

### AWS S3 & CloudFront

```env
# AWS
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=<YOUR_ACCOUNT_ID>
AWS_ACCESS_KEY_ID=<IAM_KEY_ID>
AWS_SECRET_ACCESS_KEY=<IAM_SECRET_KEY>
AWS_S3_BUCKET=sugar-daddy-prod-content
AWS_S3_REGION=us-east-1
AWS_CLOUDFRONT_DISTRIBUTION_ID=<DIST_ID>
AWS_CLOUDFRONT_DOMAIN=d123456.cloudfront.net
```

### Application

```env
# Application
NODE_ENV=production
APP_NAME=sugar-daddy
APP_VERSION=1.0.0
LOG_LEVEL=info
DEBUG=false

# Security
JWT_SECRET=<RANDOM_32_CHAR_STRING>
JWT_EXPIRES_IN=24h
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY=<RANDOM_32_BYTE_KEY_BASE64>
HASHING_ALGORITHM=bcrypt

# Service URLs
RECOMMENDATION_SERVICE_URL=https://rec.sugar-daddy.com
CONTENT_SERVICE_URL=https://content.sugar-daddy.com
AUTH_SERVICE_URL=https://auth.sugar-daddy.com
PAYMENT_SERVICE_URL=https://payment.sugar-daddy.com
```

### 第三方服務

```env
# Stripe Payment
STRIPE_SECRET_KEY=sk_live_<KEY>
STRIPE_PUBLISHABLE_KEY=pk_live_<KEY>
STRIPE_WEBHOOK_SECRET=whsec_<SECRET>

# Sendgrid Email
SENDGRID_API_KEY=SG.<KEY>
SENDGRID_FROM_EMAIL=noreply@sugar-daddy.com

# Twilio SMS
TWILIO_ACCOUNT_SID=<SID>
TWILIO_AUTH_TOKEN=<TOKEN>
TWILIO_PHONE_NUMBER=<PHONE>

# Slack Notifications
SLACK_BOT_TOKEN=xoxb-<TOKEN>
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/<WEBHOOK>
```

### 監控 & 日誌

```env
# Datadog
DATADOG_API_KEY=<KEY>
DATADOG_APP_KEY=<KEY>
DATADOG_SITE=datadoghq.com

# Sentry Error Tracking
SENTRY_DSN=https://<KEY>@<PROJECT>.ingest.sentry.io/<ID>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# CloudWatch
CLOUDWATCH_LOG_GROUP=/aws/sugar-daddy/prod
CLOUDWATCH_LOG_RETENTION_DAYS=30
```

---

## 🔒 Secrets 輪換計劃

### 月度輪換

- [ ] API 密鑰 (Stripe, Twilio, Sendgrid)
- [ ] 監控密鑰 (Datadog, Sentry)
- [ ] 檢查未使用的密鑰並刪除

### 季度輪換

- [ ] 數據庫密碼
- [ ] Redis 密碼
- [ ] AWS IAM 密鑰
- [ ] JWT 密鑰

### 年度輪換

- [ ] SSL/TLS 證書
- [ ] 主加密密鑰
- [ ] Root credentials

---

## 📊 Secrets Inventory

記錄所有的 secrets 和它們的用途：

| 密鑰名稱 | 用途 | 輪換週期 | 上次輪換 | 下次輪換 |
|---------|------|---------|---------|---------|
| POSTGRES_PASSWORD | 數據庫 | 季度 | 2024-01-15 | 2024-04-15 |
| REDIS_PASSWORD | Cache | 季度 | 2024-01-15 | 2024-04-15 |
| JWT_SECRET | 身份驗證 | 季度 | 2024-01-15 | 2024-04-15 |
| STRIPE_SECRET_KEY | 支付 | 月度 | 2024-02-19 | 2024-03-19 |
| AWS_ACCESS_KEY_ID | AWS IAM | 季度 | 2024-01-15 | 2024-04-15 |

---

## 🚨 安全檢查清單

在生產部署前檢查：

- [ ] 所有 secrets 都已設置（無默認值）
- [ ] 沒有 secrets 提交到 Git
- [ ] .gitignore 包含所有敏感文件
- [ ] IAM 角色配置正確
- [ ] CloudTrail 審計已啟用
- [ ] 監控告警已配置
- [ ] 備份策略已實施
- [ ] 故障恢復計劃已制定

---

**管理員責任**: 定期審計和輪換所有 secrets
