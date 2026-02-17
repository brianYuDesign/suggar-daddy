#!/bin/bash

# 前端依賴檢查腳本
# 用於確保前端模組不依賴後端模組

set -e

BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== 前端模組依賴檢查 ===${NC}"
echo ""

# 定義前端模組
FRONTEND_MODULES=(
  "apps/admin"
  "apps/web"
  "libs/ui"
  "libs/api-client"
)

# 定義不允許的後端依賴
BACKEND_MODULES=(
  "@suggar-daddy/dto"
  "@suggar-daddy/common"
  "@suggar-daddy/database"
  "@suggar-daddy/kafka"
  "@suggar-daddy/redis"
  "@suggar-daddy/auth"
)

# 檢查函數
check_module() {
  local module=$1
  local violations=0
  
  echo -e "${BOLD}檢查 ${module}...${NC}"
  
  for backend_module in "${BACKEND_MODULES[@]}"; do
    local count=$(find "$module" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
      xargs grep -l "from ['\"]${backend_module}" 2>/dev/null | \
      grep -v "node_modules\|Mirrors\|avoids\|避免" | \
      wc -l | tr -d ' ')
    
    if [ "$count" -gt 0 ]; then
      echo -e "  ${RED}✗ 發現 $count 個檔案引用 ${backend_module}${NC}"
      violations=$((violations + count))
      
      # 顯示違規檔案
      find "$module" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
        xargs grep -l "from ['\"]${backend_module}" 2>/dev/null | \
        grep -v "node_modules\|Mirrors\|avoids\|避免" | \
        sed 's/^/    /'
    fi
  done
  
  if [ $violations -eq 0 ]; then
    echo -e "  ${GREEN}✓ 無不當的後端依賴${NC}"
  fi
  
  echo ""
  return $violations
}

# 執行檢查
total_violations=0

for module in "${FRONTEND_MODULES[@]}"; do
  if [ -d "$module" ]; then
    check_module "$module"
    total_violations=$((total_violations + $?))
  else
    echo -e "${YELLOW}⚠ 模組不存在: ${module}${NC}"
    echo ""
  fi
done

# 總結
echo -e "${BOLD}=== 檢查總結 ===${NC}"
if [ $total_violations -eq 0 ]; then
  echo -e "${GREEN}✓ 所有檢查通過！前端模組無不當的後端依賴${NC}"
  exit 0
else
  echo -e "${RED}✗ 發現 $total_violations 個違規依賴${NC}"
  echo ""
  echo "請修正以下問題："
  echo "1. 移除前端模組中對後端模組的直接引用"
  echo "2. 改用 @suggar-daddy/api-client 中的類型"
  echo "3. 如果需要新類型，請在 libs/api-client/src/types.ts 中添加"
  exit 1
fi
