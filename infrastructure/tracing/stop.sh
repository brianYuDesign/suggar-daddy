#!/bin/bash

# ==============================================================================
# Jaeger 分散式追蹤系統停止腳本
# ==============================================================================

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  停止 Jaeger 分散式追蹤系統${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 切換到 infrastructure/tracing 目錄
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 停止 Jaeger
echo -e "${BLUE}🛑 正在停止 Jaeger...${NC}"
docker-compose -f docker-compose.tracing.yml down

echo ""
echo -e "${GREEN}✅ Jaeger 已停止${NC}"
echo ""
