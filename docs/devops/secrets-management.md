# Docker Secrets 管理指南

## 📋 目錄

- [概述](#概述)
- [為什麼使用 Docker Secrets](#為什麼使用-docker-secrets)
- [快速開始](#快速開始)
- [Secrets 架構](#secrets-架構)
- [本地開發配置](#本地開發配置)
- [生產環境配置](#生產環境配置)
- [最佳實踐](#最佳實踐)
- [故障排除](#故障排除)

---

## 概述

本專案使用 **Docker Secrets** 來管理敏感資料，如：
- 資料庫密碼
- API Keys（Stripe、Cloudinary、Firebase）
- JWT 簽名密鑰
- SMTP 認證資訊

Docker Secrets 提供安全的方式來存儲和使用敏感資料，避免將密碼硬編碼在代碼中或明文儲存在環境變數檔案中。

---

## 為什麼使用 Docker Secrets

### ❌ 不好的做法

```typescript
// 硬編碼 secret（絕對不要這樣做！）
const JWT_SECRET = 'my-secret-key-123';

// 直接在 docker-compose.yml 中明文儲存
environment:
  - POSTGRES_PASSWORD=mysecretpassword
```

### ✅ 好的做法

```typescript
// 使用 secrets 工具函數
import { getSecret } from '@common/utils/secrets.util';

const JWT_SECRET = getSecret('JWT_SECRET', 'default-for-dev');
```

```yaml
# docker-compose.yml
secrets:
  - jwt_secret

environment:
  - JWT_SECRET_FILE=/run/secrets/jwt_secret
```

### 優點

1. **安全性**：Secrets 不會出現在版本控制中
2. **靈活性**：開發/測試/生產環境可以使用不同的 secrets
3. **標準化**：統一的 secrets 管理方式
4. **可審計**：可以追蹤誰在何時存取 secrets
5. **自動化**：與 CI/CD 流程整合

---

## 快速開始

### 1. 生成 Secrets

執行設置腳本自動生成所有需要的 secrets：

```bash
# 開發環境（使用簡單密碼）
./scripts/setup-secrets.sh

# 生產環境（使用強密碼）
./scripts/setup-secrets.sh --production

# 覆蓋現有 secrets
./scripts/setup-secrets.sh --force
```

### 2. 驗證 Secrets

確認所有 secrets 檔案都已創建：

```bash
ls -la secrets/
```

應該看到以下檔案：
```
secrets/
├── .gitkeep
├── README.md
├── db_password.txt
├── jwt_secret.txt
├── stripe_secret_key.txt
├── stripe_webhook_secret.txt
├── stripe_publishable_key.txt
├── cloudinary_cloud_name.txt
├── cloudinary_api_key.txt
├── cloudinary_api_secret.txt
└── ...
```

### 3. 啟動服務

```bash
docker-compose up -d
```

---

## Secrets 架構

### 目錄結構

```
suggar-daddy/
├── secrets/                    # Secrets 目錄（Git ignored）
│   ├── .gitkeep               # 保持目錄在 Git 中
│   ├── README.md              # Secrets 文檔
│   ├── db_password.txt        # PostgreSQL 密碼
│   ├── jwt_secret.txt         # JWT 簽名密鑰
│   └── ...                    # 其他 secrets
├── scripts/
│   └── setup-secrets.sh       # Secrets 設置腳本
├── docker-compose.yml         # Docker Compose 配置
└── .gitignore                 # 包含 secrets/ 目錄
```

### Secrets 列表

| Secret 名稱 | 用途 | 必須 | 使用的服務 |
|------------|------|------|-----------|
| `db_password` | PostgreSQL 密碼 | ✅ | 所有服務 |
| `replication_password` | PostgreSQL 複製密碼 | ✅ | postgres-master, postgres-replica |
| `redis_password` | Redis 密碼 | ❌ | 所有需要 Redis 的服務 |
| `jwt_secret` | JWT 簽名密鑰 | ✅ | auth-service, api-gateway |
| `stripe_secret_key` | Stripe Secret Key | ✅ | payment-service |
| `stripe_webhook_secret` | Stripe Webhook Secret | ✅ | payment-service |
| `stripe_publishable_key` | Stripe Publishable Key | ✅ | payment-service, web |
| `cloudinary_cloud_name` | Cloudinary Cloud Name | ❌ | user-service, media-service |
| `cloudinary_api_key` | Cloudinary API Key | ❌ | user-service, media-service |
| `cloudinary_api_secret` | Cloudinary API Secret | ❌ | user-service, media-service |
| `firebase_private_key` | Firebase Private Key | ❌ | auth-service |
| `smtp_password` | SMTP 密碼 | ❌ | auth-service |

---

## 本地開發配置

### 自動設置（推薦）

```bash
./scripts/setup-secrets.sh
```

這會生成所有需要的 secrets，使用開發友好的預設值。

### 手動設置

如果你需要手動設置某些 secrets：

```bash
# 1. 設置資料庫密碼
echo "postgres" > secrets/db_password.txt
echo "replicator_password" > secrets/replication_password.txt

# 2. 生成 JWT Secret
openssl rand -base64 48 > secrets/jwt_secret.txt

# 3. 設置 Stripe 測試金鑰
echo "sk_test_your_stripe_key" > secrets/stripe_secret_key.txt
echo "whsec_test_webhook" > secrets/stripe_webhook_secret.txt
echo "pk_test_your_key" > secrets/stripe_publishable_key.txt

# 4. 設置檔案權限
chmod 600 secrets/*.txt
```

### 使用 Secrets 工具函數

在應用程式代碼中使用 secrets：

```typescript
import { 
  getSecret, 
  getDatabaseConfig, 
  getJwtConfig,
  maskSecret 
} from '@common/utils/secrets.util';

// 讀取單個 secret
const jwtSecret = getSecret('JWT_SECRET');

// 讀取資料庫配置
const dbConfig = getDatabaseConfig();
console.log('Connecting to:', dbConfig.host);

// 讀取 JWT 配置
const jwtConfig = getJwtConfig();

// 安全地記錄 secret（遮罩處理）
console.log('JWT Secret:', maskSecret(jwtSecret));
// 輸出: JWT Secret: abcd****xyz1
```

---

## 生產環境配置

### 1. 生成強密碼

```bash
# 使用 --production 旗標生成強密碼
./scripts/setup-secrets.sh --production
```

這會生成符合以下標準的密碼：
- 至少 32 字元
- 包含大小寫字母、數字和特殊符號
- 使用加密安全的隨機數生成器

### 2. 設置真實的 API Keys

**重要**：生產環境必須使用真實的 API keys，不能使用測試金鑰。

#### Stripe

1. 登入 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 前往 **Developers → API keys**
3. 複製 Secret key 和 Publishable key
4. 前往 **Developers → Webhooks** 設置 webhook endpoint
5. 複製 Webhook signing secret

```bash
echo "sk_live_YOUR_REAL_KEY" > secrets/stripe_secret_key.txt
echo "whsec_YOUR_REAL_SECRET" > secrets/stripe_webhook_secret.txt
echo "pk_live_YOUR_REAL_KEY" > secrets/stripe_publishable_key.txt
```

#### Cloudinary

1. 登入 [Cloudinary Console](https://cloudinary.com/console)
2. 前往 **Dashboard**
3. 複製 Cloud name, API Key 和 API Secret

```bash
echo "your-cloud-name" > secrets/cloudinary_cloud_name.txt
echo "123456789012345" > secrets/cloudinary_api_key.txt
echo "your_api_secret" > secrets/cloudinary_api_secret.txt
```

#### Firebase

1. 登入 [Firebase Console](https://console.firebase.google.com/)
2. 前往 **Project Settings → Service Accounts**
3. 點擊 **Generate new private key**
4. 下載 JSON 檔案並提取 private_key

```bash
# 從 Firebase service account JSON 提取 private_key
cat firebase-service-account.json | jq -r '.private_key' > secrets/firebase_private_key.txt
```

### 3. 設置檔案權限

確保 secrets 檔案只能由 owner 讀取：

```bash
chmod 600 secrets/*.txt
chown $USER:$USER secrets/*.txt
```

### 4. 驗證生產環境 Secrets

在應用程式啟動時驗證必要的 secrets：

```typescript
import { validateProductionSecrets } from '@common/utils/secrets.util';

// 在應用程式啟動時執行
if (process.env.NODE_ENV === 'production') {
  validateProductionSecrets([
    'POSTGRES_PASSWORD',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ]);
}
```

### 5. Secrets 輪換策略

建議定期更換 secrets（每 90 天）：

```bash
# 1. 生成新的 secrets
./scripts/setup-secrets.sh --production --force

# 2. 更新資料庫密碼
docker-compose exec postgres-master psql -U postgres -c "ALTER USER postgres PASSWORD 'new_password';"

# 3. 重啟服務
docker-compose restart

# 4. 驗證服務運行正常
docker-compose ps
docker-compose logs -f
```

---

## 最佳實踐

### ✅ 應該做的事

1. **使用 Docker Secrets**
   - 所有敏感資料都使用 secrets
   - 不要在代碼中硬編碼

2. **適當的權限**
   ```bash
   chmod 600 secrets/*.txt
   ```

3. **加入 .gitignore**
   ```gitignore
   secrets/
   !secrets/.gitkeep
   !secrets/README.md
   ```

4. **生產環境使用強密碼**
   - 至少 32 字元
   - 包含特殊字元
   - 定期輪換

5. **使用工具函數**
   ```typescript
   import { getSecret } from '@common/utils/secrets.util';
   const secret = getSecret('MY_SECRET');
   ```

6. **安全記錄**
   ```typescript
   import { maskSecret } from '@common/utils/secrets.util';
   console.log('Secret:', maskSecret(secret)); // abcd****xyz1
   ```

### ❌ 不應該做的事

1. **不要提交 secrets 到 Git**
   ```bash
   # 檢查是否有 secrets 被追蹤
   git status secrets/
   ```

2. **不要在日誌中記錄完整的 secrets**
   ```typescript
   // ❌ 錯誤
   console.log('JWT Secret:', jwtSecret);
   
   // ✅ 正確
   console.log('JWT Secret:', maskSecret(jwtSecret));
   ```

3. **不要在生產環境使用測試金鑰**
   ```bash
   # ❌ 錯誤
   echo "sk_test_..." > secrets/stripe_secret_key.txt
   
   # ✅ 正確
   echo "sk_live_..." > secrets/stripe_secret_key.txt
   ```

4. **不要共享 secrets 檔案**
   - 使用安全的密碼管理器
   - 透過加密通道傳輸

5. **不要使用預設密碼**
   ```bash
   # ❌ 錯誤
   echo "postgres" > secrets/db_password.txt
   
   # ✅ 正確
   openssl rand -base64 32 > secrets/db_password.txt
   ```

---

## 故障排除

### 問題 1: 服務無法啟動，顯示 "secret not found"

**原因**：Secrets 檔案不存在或路徑錯誤

**解決方案**：
```bash
# 1. 檢查 secrets 目錄
ls -la secrets/

# 2. 重新生成 secrets
./scripts/setup-secrets.sh --force

# 3. 驗證檔案權限
chmod 600 secrets/*.txt

# 4. 重啟服務
docker-compose restart
```

### 問題 2: 無法讀取 secret 檔案

**原因**：檔案權限問題

**解決方案**：
```bash
# 設置正確的權限
chmod 600 secrets/*.txt
chown $USER:$USER secrets/*.txt

# 在 Docker 容器中，確保使用正確的使用者
# 檢查 docker-compose.yml 中的 user 設定
```

### 問題 3: JWT 驗證失敗

**原因**：JWT_SECRET 不一致或未設置

**解決方案**：
```bash
# 1. 檢查 JWT secret
cat secrets/jwt_secret.txt

# 2. 確保所有服務使用同一個 JWT secret
docker-compose exec auth-service cat /run/secrets/jwt_secret
docker-compose exec api-gateway cat /run/secrets/jwt_secret

# 3. 如果不一致，重新生成並重啟
openssl rand -base64 48 > secrets/jwt_secret.txt
docker-compose restart auth-service api-gateway
```

### 問題 4: Stripe webhook 驗證失敗

**原因**：Webhook secret 不正確

**解決方案**：
```bash
# 1. 從 Stripe Dashboard 取得正確的 webhook secret
# 2. 更新 secret 檔案
echo "whsec_correct_secret" > secrets/stripe_webhook_secret.txt

# 3. 重啟 payment service
docker-compose restart payment-service

# 4. 在 Stripe Dashboard 測試 webhook
```

### 問題 5: 資料庫連線失敗

**原因**：資料庫密碼不匹配

**解決方案**：
```bash
# 1. 重設資料庫密碼
docker-compose exec postgres-master psql -U postgres -c \
  "ALTER USER postgres PASSWORD 'new_password';"

# 2. 更新 secret 檔案
echo "new_password" > secrets/db_password.txt

# 3. 重啟所有服務
docker-compose restart
```

### 除錯技巧

```bash
# 1. 檢查 secrets 是否正確掛載
docker-compose exec auth-service ls -la /run/secrets/

# 2. 檢查 secret 內容（小心！只在除錯時使用）
docker-compose exec auth-service cat /run/secrets/jwt_secret

# 3. 檢查環境變數
docker-compose exec auth-service env | grep JWT

# 4. 檢查服務日誌
docker-compose logs -f auth-service

# 5. 驗證 secrets 工具函數
docker-compose exec auth-service node -e "
  const { getSecret } = require('./dist/libs/common/src/utils/secrets.util');
  console.log('JWT_SECRET:', getSecret('JWT_SECRET'));
"
```

---

## 相關文檔

- [Docker Secrets 官方文檔](https://docs.docker.com/engine/swarm/secrets/)
- [環境設置指南](../development.md)
- [部署指南](../deployment.md)
- [安全最佳實踐](./security-best-practices.md)

---

## 聯絡與支援

如有問題，請聯繫：
- DevOps 團隊：devops@suggar-daddy.com
- 技術支援：support@suggar-daddy.com
