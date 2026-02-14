#!/bin/bash

# ==============================================================================
# Jaeger 分散式追蹤系統啟動腳本
# ==============================================================================
# 此腳本用於啟動 Jaeger all-in-one 容器
#
# 使用方式:
#   ./infrastructure/tracing/start.sh
#
# 停止 Jaeger:
#   ./infrastructure/tracing/stop.sh
# ==============================================================================

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Jaeger 分散式追蹤系統啟動${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 切換到 infrastructure/tracing 目錄
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 檢查 Docker 是否正在運行
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker 未運行，請先啟動 Docker${NC}"
    exit 1
fi

# 檢查網絡是否存在
if ! docker network inspect suggar-daddy-network > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  suggar-daddy-network 不存在，正在創建...${NC}"
    docker network create suggar-daddy-network
    echo -e "${GREEN}✅ 網絡創建成功${NC}"
fi

# 啟動 Jaeger
echo -e "${BLUE}📦 正在啟動 Jaeger...${NC}"
docker-compose -f docker-compose.tracing.yml up -d

# 等待 Jaeger 啟動
echo -e "${BLUE}⏳ 等待 Jaeger 啟動...${NC}"
sleep 5

# 檢查健康狀態
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s http://localhost:14269/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Jaeger 健康檢查通過${NC}"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${YELLOW}⚠️  Jaeger 健康檢查超時，但服務可能仍在啟動中${NC}"
        break
    fi
    
    sleep 1
done

echo ""
echo -e "${GREEN}✅ Jaeger 啟動成功！${NC}"
echo ""
echo -e "${BLUE}🌐 訪問地址:${NC}"
echo -e "   • Jaeger UI:        ${GREEN}http://localhost:16686${NC}"
echo -e "   • OTLP gRPC:        ${GREEN}http://localhost:4317${NC}"
echo -e "   • OTLP HTTP:        ${GREEN}http://localhost:4318${NC}"
echo -e "   • Health Check:     ${GREEN}http://localhost:14269${NC}"
echo ""
echo -e "${BLUE}📚 使用說明:${NC}"
echo -e "   1. 在瀏覽器打開 Jaeger UI"
echo -e "   2. 選擇服務名稱（如 api-gateway）"
echo -e "   3. 點擊 'Find Traces' 查看追蹤"
echo ""
echo -e "${BLUE}🔧 常用命令:${NC}"
echo -e "   • 查看日誌:    ${YELLOW}docker logs -f suggar-daddy-jaeger${NC}"
echo -e "   • 停止服務:    ${YELLOW}./infrastructure/tracing/stop.sh${NC}"
echo -e "   • 重啟服務:    ${YELLOW}docker-compose -f infrastructure/tracing/docker-compose.tracing.yml restart${NC}"
echo ""
