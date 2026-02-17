#!/bin/bash

# ==========================================
# PM2 服務啟動腳本
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
echo -e "${BLUE}啟動 PM2 服務${NC}"
echo "========================================"
echo ""

# 檢查 PM2 是否安裝
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}錯誤: PM2 未安裝${NC}"
    echo "請執行: npm install -g pm2"
    exit 1
fi

# 檢查 ecosystem.config.js 是否存在
if [ ! -f "$ECOSYSTEM_FILE" ]; then
    echo -e "${RED}錯誤: 找不到 ecosystem.config.js${NC}"
    echo "路徑: $ECOSYSTEM_FILE"
    exit 1
fi

# 切換到項目根目錄
cd "$PROJECT_ROOT"

# 創建日誌目錄
echo -e "${BLUE}創建日誌目錄...${NC}"
mkdir -p logs/pm2
echo -e "${GREEN}✓ 日誌目錄已創建${NC}"
echo ""

# 停止並刪除所有現有的 PM2 進程
echo -e "${BLUE}清理現有的 PM2 進程...${NC}"
pm2 delete all 2>/dev/null || echo -e "${YELLOW}沒有運行中的 PM2 進程${NC}"
echo ""

# 啟動所有服務
echo -e "${BLUE}啟動所有服務...${NC}"
pm2 start "$ECOSYSTEM_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 所有服務已啟動${NC}"
    echo ""
    
    # 顯示服務狀態
    pm2 list
    
    echo ""
    echo "========================================"
    echo -e "${GREEN}服務管理命令${NC}"
    echo "========================================"
    echo "查看狀態: npm run pm2:status"
    echo "查看日誌: npm run pm2:logs"
    echo "重啟服務: npm run pm2:restart"
    echo "停止服務: npm run pm2:stop"
    echo ""
    echo "PM2 直接命令:"
    echo "  pm2 list           - 列出所有進程"
    echo "  pm2 logs           - 查看所有日誌"
    echo "  pm2 logs [name]    - 查看特定服務日誌"
    echo "  pm2 restart [name] - 重啟特定服務"
    echo "  pm2 stop [name]    - 停止特定服務"
    echo ""
else
    echo ""
    echo -e "${RED}✗ 服務啟動失敗${NC}"
    echo ""
    pm2 list
    exit 1
fi
