#!/bin/bash

# ==========================================
# PM2 服務重啟腳本
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ECOSYSTEM_FILE="$PROJECT_ROOT/ecosystem.config.js"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo -e "${BLUE}重啟 PM2 服務${NC}"
echo "========================================"
echo ""

# 檢查 PM2 是否安裝
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}錯誤: PM2 未安裝${NC}"
    exit 1
fi

# 切換到項目根目錄
cd "$PROJECT_ROOT"

# 如果沒有運行中的進程，直接啟動
if ! pm2 list | grep -q "online"; then
    echo -e "${YELLOW}沒有運行中的進程，將啟動新進程...${NC}"
    bash "$SCRIPT_DIR/start-services.sh"
    exit $?
fi

# 重啟所有進程
echo -e "${BLUE}重啟所有服務...${NC}"
pm2 restart "$ECOSYSTEM_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 所有服務已重啟${NC}"
    echo ""
    
    # 顯示服務狀態
    pm2 list
    
    echo ""
    echo -e "${GREEN}服務重啟完成${NC}"
else
    echo ""
    echo -e "${RED}✗ 服務重啟失敗${NC}"
    pm2 list
    exit 1
fi
