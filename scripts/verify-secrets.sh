#!/bin/bash

# ============================================================
# Secrets 驗證腳本
# ============================================================
# 驗證所有 secrets 檔案是否正確設置
# ============================================================

set -e

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SECRETS_DIR="secrets"
ERRORS=0

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Secrets 驗證${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# 檢查 secrets 目錄
if [ ! -d "$SECRETS_DIR" ]; then
  echo -e "${RED}❌ secrets/ 目錄不存在${NC}"
  echo -e "${YELLOW}請執行: ./scripts/setup-secrets.sh${NC}"
  exit 1
fi

echo -e "${GREEN}✅ secrets/ 目錄存在${NC}"
echo ""

# 必須的 secrets 列表
REQUIRED_SECRETS=(
  "db_password.txt"
  "replication_password.txt"
  "jwt_secret.txt"
)

# 可選的 secrets 列表
OPTIONAL_SECRETS=(
  "redis_password.txt"
  "stripe_secret_key.txt"
  "stripe_webhook_secret.txt"
  "stripe_publishable_key.txt"
  "cloudinary_cloud_name.txt"
  "cloudinary_api_key.txt"
  "cloudinary_api_secret.txt"
  "firebase_private_key.txt"
  "smtp_password.txt"
)

echo -e "${BLUE}檢查必須的 secrets...${NC}"
for secret in "${REQUIRED_SECRETS[@]}"; do
  if [ -f "$SECRETS_DIR/$secret" ]; then
    # 檢查檔案是否為空
    if [ -s "$SECRETS_DIR/$secret" ]; then
      # 檢查檔案權限
      perms=$(stat -f "%Lp" "$SECRETS_DIR/$secret" 2>/dev/null || stat -c "%a" "$SECRETS_DIR/$secret" 2>/dev/null)
      if [ "$perms" = "600" ] || [ "$perms" = "400" ]; then
        echo -e "${GREEN}✅ $secret (權限: $perms)${NC}"
      else
        echo -e "${YELLOW}⚠️  $secret (權限: $perms, 建議改為 600)${NC}"
      fi
    else
      echo -e "${RED}❌ $secret (檔案為空)${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo -e "${RED}❌ $secret (檔案不存在)${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo -e "${BLUE}檢查可選的 secrets...${NC}"
for secret in "${OPTIONAL_SECRETS[@]}"; do
  if [ -f "$SECRETS_DIR/$secret" ]; then
    if [ -s "$SECRETS_DIR/$secret" ]; then
      perms=$(stat -f "%Lp" "$SECRETS_DIR/$secret" 2>/dev/null || stat -c "%a" "$SECRETS_DIR/$secret" 2>/dev/null)
      echo -e "${GREEN}✅ $secret (權限: $perms)${NC}"
    else
      echo -e "${YELLOW}⏭️  $secret (檔案為空，可選)${NC}"
    fi
  else
    echo -e "${YELLOW}⏭️  $secret (檔案不存在，可選)${NC}"
  fi
done

echo ""
echo -e "${BLUE}================================================${NC}"

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Secrets 驗證通過！${NC}"
  echo ""
  echo -e "${BLUE}下一步：${NC}"
  echo "1. 啟動 Docker Compose:"
  echo "   docker-compose up -d"
  echo ""
  echo "2. 檢查服務狀態:"
  echo "   docker-compose ps"
  echo ""
  echo "3. 查看日誌:"
  echo "   docker-compose logs -f"
else
  echo -e "${RED}❌ 發現 $ERRORS 個錯誤${NC}"
  echo ""
  echo -e "${YELLOW}修復方法：${NC}"
  echo "1. 重新執行設置腳本:"
  echo "   ./scripts/setup-secrets.sh --force"
  echo ""
  echo "2. 或手動創建缺少的檔案"
  exit 1
fi

echo -e "${BLUE}================================================${NC}"
