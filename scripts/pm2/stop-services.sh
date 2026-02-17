#!/bin/bash

# ==========================================
# PM2 服務停止腳本
# ==========================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo -e "${BLUE}停止 PM2 服務${NC}"
echo "========================================"
echo ""

# 檢查 PM2 是否安裝
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}錯誤: PM2 未安裝${NC}"
    exit 1
fi

# 檢查是否有運行中的進程
if ! pm2 list | grep -q "online"; then
    echo -e "${YELLOW}沒有運行中的 PM2 進程${NC}"
    pm2 list
    exit 0
fi

# 停止所有進程
echo -e "${BLUE}停止所有 PM2 進程...${NC}"
pm2 stop all

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 所有進程已停止${NC}"
    echo ""
    
    # 刪除所有進程
    echo -e "${BLUE}刪除所有 PM2 進程...${NC}"
    pm2 delete all
    
    echo -e "${GREEN}✓ 所有進程已刪除${NC}"
    echo ""
    
    # 顯示最終狀態
    pm2 list
    
    echo ""
    echo -e "${GREEN}所有服務已成功停止並清理${NC}"
else
    echo ""
    echo -e "${RED}✗ 停止服務失敗${NC}"
    pm2 list
    exit 1
fi
