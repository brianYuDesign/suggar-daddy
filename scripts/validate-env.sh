#!/usr/bin/env bash
# 環境變數驗證腳本
# 確保所有必需的環境變數都已設置

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Validating environment variables..."
echo ""

# 環境檢測
ENVIRONMENT="${NODE_ENV:-development}"
echo "📝 Environment: $ENVIRONMENT"
echo ""

# 必需的環境變數（所有環境）
REQUIRED_VARS=(
  "NODE_ENV"
  "POSTGRES_HOST"
  "POSTGRES_PORT"
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "POSTGRES_DB"
  "REDIS_HOST"
  "REDIS_PORT"
  "JWT_SECRET"
)

# 生產環境額外必需的變數
PRODUCTION_REQUIRED_VARS=(
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_S3_BUCKET"
)

# 可選但建議的變數
OPTIONAL_VARS=(
  "CLOUDINARY_CLOUD_NAME"
  "CLOUDINARY_API_KEY"
  "CLOUDINARY_API_SECRET"
  "FIREBASE_PROJECT_ID"
  "FIREBASE_CLIENT_EMAIL"
  "FIREBASE_PRIVATE_KEY"
)

# 檢查函數
check_var() {
  local var_name=$1
  local is_required=$2
  
  if [ -z "${!var_name}" ]; then
    if [ "$is_required" = "true" ]; then
      echo -e "${RED}❌ Missing required variable: $var_name${NC}"
      return 1
    else
      echo -e "${YELLOW}⚠️  Optional variable not set: $var_name${NC}"
      return 0
    fi
  else
    echo -e "${GREEN}✅ $var_name${NC}"
    return 0
  fi
}

# 檢查密碼強度
check_password_strength() {
  local var_name=$1
  local password="${!var_name}"
  
  if [ ${#password} -lt 12 ]; then
    echo -e "${YELLOW}⚠️  Warning: $var_name is less than 12 characters${NC}"
  fi
  
  # 檢查是否使用預設密碼
  case "$password" in
    "postgres"|"password"|"admin"|"root"|"123456")
      echo -e "${RED}❌ Error: $var_name uses a common/default password${NC}"
      return 1
      ;;
    *"change-in-production"*|*"your-"*|*"secret"*)
      echo -e "${RED}❌ Error: $var_name contains placeholder text${NC}"
      return 1
      ;;
  esac
  
  return 0
}

# 主要檢查邏輯
ERRORS=0

echo "📋 Checking required variables:"
for var in "${REQUIRED_VARS[@]}"; do
  if ! check_var "$var" "true"; then
    ((ERRORS++))
  fi
done

echo ""

# 生產環境額外檢查
if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "prod" ]; then
  echo "🔒 Production environment detected. Checking additional variables:"
  for var in "${PRODUCTION_REQUIRED_VARS[@]}"; do
    if ! check_var "$var" "true"; then
      ((ERRORS++))
    fi
  done
  echo ""
  
  # 檢查密碼強度
  echo "🔐 Checking password strength:"
  check_password_strength "POSTGRES_PASSWORD" || ((ERRORS++))
  check_password_strength "JWT_SECRET" || ((ERRORS++))
  echo ""
fi

# 可選變數檢查
echo "📦 Checking optional variables:"
for var in "${OPTIONAL_VARS[@]}"; do
  check_var "$var" "false"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 結果
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All environment variables are properly configured!${NC}"
  exit 0
else
  echo -e "${RED}❌ Found $ERRORS error(s) in environment configuration${NC}"
  echo ""
  echo "💡 Tips:"
  echo "  1. Copy .env.example to .env"
  echo "  2. Fill in all required values"
  echo "  3. Never commit .env to git"
  echo "  4. Use strong, unique passwords for production"
  exit 1
fi
