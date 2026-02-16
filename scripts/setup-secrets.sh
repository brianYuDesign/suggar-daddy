#!/bin/bash

# ============================================================
# Docker Secrets 設置腳本
# ============================================================
# 此腳本自動生成開發環境所需的所有 secrets
# 
# 使用方式：
#   ./scripts/setup-secrets.sh
#
# 選項：
#   --production    生成生產環境用的強密碼
#   --force         覆蓋現有的 secrets
# ============================================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SECRETS_DIR="secrets"
FORCE=false
PRODUCTION=false

# 解析參數
while [[ $# -gt 0 ]]; do
  case $1 in
    --production)
      PRODUCTION=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --production    生成生產環境用的強密碼"
      echo "  --force         覆蓋現有的 secrets"
      echo "  --help          顯示此幫助訊息"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Docker Secrets 設置${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# 檢查 secrets 目錄
if [ ! -d "$SECRETS_DIR" ]; then
  echo -e "${YELLOW}創建 secrets 目錄...${NC}"
  mkdir -p "$SECRETS_DIR"
fi

# 生成隨機字串的函數
generate_password() {
  local length=${1:-32}
  if [ "$PRODUCTION" = true ]; then
    # 生產環境：使用強密碼（包含特殊字元）
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9!@#$%^&*' | head -c "$length"
  else
    # 開發環境：使用簡單密碼
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c "$length"
  fi
}

# 寫入 secret 的函數
write_secret() {
  local file="$1"
  local value="$2"
  local description="$3"
  
  if [ -f "$SECRETS_DIR/$file" ] && [ "$FORCE" = false ]; then
    echo -e "${YELLOW}⏭️  跳過 $file (已存在)${NC}"
  else
    echo "$value" > "$SECRETS_DIR/$file"
    chmod 600 "$SECRETS_DIR/$file"
    echo -e "${GREEN}✅ 創建 $file${NC} - $description"
  fi
}

# 生成 secrets
echo -e "${BLUE}生成 secrets...${NC}"
echo ""

# 1. 資料庫密碼
if [ "$PRODUCTION" = true ]; then
  DB_PASSWORD=$(generate_password 32)
  REPLICATION_PASSWORD=$(generate_password 32)
else
  DB_PASSWORD="postgres"
  REPLICATION_PASSWORD="replicator_password"
fi
write_secret "db_password.txt" "$DB_PASSWORD" "PostgreSQL 密碼"
write_secret "replication_password.txt" "$REPLICATION_PASSWORD" "PostgreSQL 複製密碼"

# 2. Redis 密碼（可選）
if [ "$PRODUCTION" = true ]; then
  REDIS_PASSWORD=$(generate_password 32)
  write_secret "redis_password.txt" "$REDIS_PASSWORD" "Redis 密碼"
else
  # 開發環境可以不設置 Redis 密碼
  if [ "$FORCE" = true ]; then
    write_secret "redis_password.txt" "" "Redis 密碼（開發環境為空）"
  fi
fi

# 3. JWT Secret
JWT_SECRET=$(openssl rand -base64 48)
write_secret "jwt_secret.txt" "$JWT_SECRET" "JWT 簽名密鑰"

# 4. Stripe Keys
if [ "$PRODUCTION" = true ]; then
  echo -e "${YELLOW}⚠️  Stripe keys: 請手動從 Stripe Dashboard 複製生產環境金鑰${NC}"
  write_secret "stripe_secret_key.txt" "sk_live_REPLACE_WITH_REAL_KEY" "Stripe Secret Key (生產)"
  write_secret "stripe_webhook_secret.txt" "whsec_REPLACE_WITH_REAL_SECRET" "Stripe Webhook Secret (生產)"
  write_secret "stripe_publishable_key.txt" "pk_live_REPLACE_WITH_REAL_KEY" "Stripe Publishable Key (生產)"
else
  write_secret "stripe_secret_key.txt" "sk_test_REPLACE_WITH_TEST_KEY" "Stripe Secret Key (測試)"
  write_secret "stripe_webhook_secret.txt" "whsec_test_webhook_secret_mock" "Stripe Webhook Secret (測試)"
  write_secret "stripe_publishable_key.txt" "pk_test_51QeKDeDtnPiAKkXYTestMock" "Stripe Publishable Key (測試)"
fi

# 5. Cloudinary (開發環境使用佔位符)
if [ "$PRODUCTION" = true ]; then
  echo -e "${YELLOW}⚠️  Cloudinary: 請手動從 Cloudinary Dashboard 複製金鑰${NC}"
  write_secret "cloudinary_cloud_name.txt" "REPLACE_WITH_CLOUD_NAME" "Cloudinary Cloud Name"
  write_secret "cloudinary_api_key.txt" "REPLACE_WITH_API_KEY" "Cloudinary API Key"
  write_secret "cloudinary_api_secret.txt" "REPLACE_WITH_API_SECRET" "Cloudinary API Secret"
else
  write_secret "cloudinary_cloud_name.txt" "dev-cloud" "Cloudinary Cloud Name (測試)"
  write_secret "cloudinary_api_key.txt" "123456789012345" "Cloudinary API Key (測試)"
  write_secret "cloudinary_api_secret.txt" "mock_api_secret_for_dev" "Cloudinary API Secret (測試)"
fi

# 6. Firebase (可選)
if [ "$PRODUCTION" = true ]; then
  echo -e "${YELLOW}⚠️  Firebase: 請手動從 Firebase Console 複製 Private Key${NC}"
  write_secret "firebase_private_key.txt" "REPLACE_WITH_FIREBASE_PRIVATE_KEY" "Firebase Private Key"
else
  write_secret "firebase_private_key.txt" "" "Firebase Private Key (測試，留空)"
fi

# 7. SMTP 密碼（可選）
if [ "$PRODUCTION" = true ]; then
  echo -e "${YELLOW}⚠️  SMTP: 請手動設置郵件服務密碼${NC}"
  write_secret "smtp_password.txt" "REPLACE_WITH_SMTP_PASSWORD" "SMTP 密碼"
else
  write_secret "smtp_password.txt" "" "SMTP 密碼（開發環境為空）"
fi

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ Secrets 設置完成！${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}📋 下一步：${NC}"
echo ""
if [ "$PRODUCTION" = true ]; then
  echo "1. 🔐 請手動更新以下檔案中的實際金鑰："
  echo "   - secrets/stripe_secret_key.txt"
  echo "   - secrets/stripe_webhook_secret.txt"
  echo "   - secrets/stripe_publishable_key.txt"
  echo "   - secrets/cloudinary_cloud_name.txt"
  echo "   - secrets/cloudinary_api_key.txt"
  echo "   - secrets/cloudinary_api_secret.txt"
  echo "   - secrets/firebase_private_key.txt (如使用)"
  echo "   - secrets/smtp_password.txt (如使用)"
  echo ""
  echo "2. ✅ 確認檔案權限："
  echo "   chmod 600 secrets/*.txt"
  echo ""
  echo "3. ⚠️  妥善保管 secrets/"
  echo "   - 使用密碼管理器或 secrets 管理服務"
  echo "   - 絕不提交到 Git"
  echo "   - 定期輪換密碼（建議每 90 天）"
else
  echo "1. 🚀 啟動 Docker Compose："
  echo "   docker-compose up -d"
  echo ""
  echo "2. 🔍 驗證服務狀態："
  echo "   docker-compose ps"
  echo ""
  echo "3. 📝 查看日誌："
  echo "   docker-compose logs -f"
fi
echo ""
echo -e "${BLUE}================================================${NC}"

# 創建 .env 檔案（如果不存在）
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}創建 .env 檔案（從 .env.example 複製）...${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ 已創建 .env 檔案${NC}"
  else
    echo -e "${RED}❌ .env.example 不存在，請手動創建 .env 檔案${NC}"
  fi
fi

# 列出創建的檔案
echo ""
echo -e "${BLUE}已創建的 secrets 檔案：${NC}"
ls -lh "$SECRETS_DIR"/*.txt 2>/dev/null || echo -e "${YELLOW}沒有 .txt 檔案${NC}"
echo ""
