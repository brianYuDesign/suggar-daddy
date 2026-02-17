#!/bin/bash

# ==========================================
# PM2 服務狀態查看腳本
# ==========================================

# 顏色定義
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo -e "${BLUE}PM2 服務狀態${NC}"
echo "========================================"
echo ""

# 檢查 PM2 是否安裝
if ! command -v pm2 &> /dev/null; then
    echo "錯誤: PM2 未安裝"
    exit 1
fi

# 顯示詳細狀態
pm2 list

echo ""
echo "詳細資訊:"
echo "  查看特定服務日誌: pm2 logs [service-name]"
echo "  查看所有日誌: npm run pm2:logs"
echo "  監控資源使用: pm2 monit"
echo ""
