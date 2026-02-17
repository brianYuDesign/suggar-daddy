#!/bin/bash

# ==========================================
# PM2 服務日誌查看腳本
# ==========================================

# 顏色定義
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "========================================"
echo -e "${BLUE}PM2 服務日誌${NC}"
echo "========================================"
echo ""

# 檢查 PM2 是否安裝
if ! command -v pm2 &> /dev/null; then
    echo "錯誤: PM2 未安裝"
    exit 1
fi

# 如果提供了服務名稱參數
if [ ! -z "$1" ]; then
    echo -e "${GREEN}查看 $1 的日誌...${NC}"
    echo ""
    pm2 logs "$1" --lines 100
else
    # 顯示所有服務的最新日誌
    echo -e "${GREEN}查看所有服務的最新日誌...${NC}"
    echo ""
    echo "按 Ctrl+C 退出"
    echo ""
    pm2 logs --lines 50
fi
