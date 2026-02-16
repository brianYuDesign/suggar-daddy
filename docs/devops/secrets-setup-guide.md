# Secrets 設置快速指南

## 🚀 5 分鐘快速設置

### 步驟 1: 生成 Secrets

```bash
cd /path/to/suggar-daddy
./scripts/setup-secrets.sh
```

### 步驟 2: 驗證

```bash
ls -la secrets/
```

你應該看到以下檔案：
- ✅ `db_password.txt`
- ✅ `jwt_secret.txt`
- ✅ `stripe_secret_key.txt`
- ✅ 其他 secrets...

### 步驟 3: 啟動服務

```bash
docker-compose up -d
```

### 步驟 4: 檢查狀態

```bash
docker-compose ps
```

所有服務應該處於 `healthy` 狀態。

---

## 📝 詳細說明

### 開發環境

使用預設的開發配置：

```bash
./scripts/setup-secrets.sh
```

這會生成：
- 簡單的密碼（例如 `postgres`）
- 測試用的 API keys
- 隨機生成的 JWT secret

### 生產環境

使用強密碼：

```bash
./scripts/setup-secrets.sh --production
```

然後手動更新真實的 API keys：

```bash
# Stripe
echo "sk_live_YOUR_KEY" > secrets/stripe_secret_key.txt
echo "whsec_YOUR_SECRET" > secrets/stripe_webhook_secret.txt

# Cloudinary
echo "your-cloud-name" > secrets/cloudinary_cloud_name.txt
echo "your-api-key" > secrets/cloudinary_api_key.txt
echo "your-api-secret" > secrets/cloudinary_api_secret.txt
```

---

## 🔧 常見問題

### Q: 我需要手動創建所有 secrets 嗎？

**A**: 不需要！執行 `./scripts/setup-secrets.sh` 會自動創建所有需要的 secrets。

### Q: 如何更新某個 secret？

**A**: 直接編輯對應的檔案，然後重啟服務：

```bash
echo "new_secret_value" > secrets/jwt_secret.txt
docker-compose restart auth-service
```

### Q: secrets 目錄會被提交到 Git 嗎？

**A**: 不會！`secrets/` 目錄已加入 `.gitignore`，只有 `.gitkeep` 和 `README.md` 會被追蹤。

### Q: 如何在程式碼中使用 secrets？

**A**: 使用 `@common/utils/secrets.util` 工具函數：

```typescript
import { getSecret, getDatabaseConfig } from '@common/utils/secrets.util';

const jwtSecret = getSecret('JWT_SECRET');
const dbConfig = getDatabaseConfig();
```

### Q: 本地開發時可以不設置真實的 API keys 嗎？

**A**: 可以！開發環境會使用測試金鑰和預設值。但如果需要測試支付功能，需要設置 Stripe 測試金鑰。

---

## 📚 更多資訊

詳細文檔請參考：
- [完整的 Secrets 管理指南](secrets-management.md)
- [環境設置文檔](../development.md)
- [部署指南](../deployment.md)

---

## ⚠️ 安全提醒

- ❌ **絕對不要**提交 secrets 檔案到 Git
- ❌ **絕對不要**在日誌中記錄完整的 secrets
- ✅ 使用 `maskSecret()` 函數安全地記錄
- ✅ 生產環境使用強密碼
- ✅ 定期輪換 secrets（建議每 90 天）

---

**需要幫助？** 請查看 [故障排除](secrets-management.md#故障排除) 章節。
