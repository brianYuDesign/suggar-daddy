#!/bin/bash

# ==========================================
# PM2 服務健康檢查腳本
# ==========================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
MAX_WAIT_TIME=${MAX_WAIT_TIME:-120}  # 最大等待時間（秒）
CHECK_INTERVAL=5                      # 檢查間隔（秒）
RETRY_COUNT=$((MAX_WAIT_TIME / CHECK_INTERVAL))

echo "========================================"
echo -e "${BLUE}PM2 服務健康檢查${NC}"
echo "========================================"
echo ""
echo "最大等待時間: ${MAX_WAIT_TIME}秒"
echo "檢查間隔: ${CHECK_INTERVAL}秒"
echo ""

# ==========================================
# 健康檢查函數
# ==========================================

check_service() {
    local service_name=$1
    local service_url=$2
    local retry_count=$3
    
    echo -e "${BLUE}檢查 $service_name...${NC}"
    
    for i in $(seq 1 $retry_count); do
        if curl -s -f "$service_url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name 就緒 (嘗試 $i/$retry_count)${NC}"
            return 0
        fi
        
        if [ $i -lt $retry_count ]; then
            echo -e "${YELLOW}  等待中... ($i/$retry_count)${NC}"
            sleep $CHECK_INTERVAL
        fi
    done
    
    echo -e "${RED}✗ $service_name 健康檢查失敗${NC}"
    return 1
}

check_pm2_service() {
    local service_name=$1
    local retry_count=$2
    
    echo -e "${BLUE}檢查 PM2 進程: $service_name...${NC}"
    
    for i in $(seq 1 $retry_count); do
        if pm2 list | grep "$service_name" | grep -q "online"; then
            echo -e "${GREEN}✓ $service_name 進程運行中 (嘗試 $i/$retry_count)${NC}"
            return 0
        fi
        
        if [ $i -lt $retry_count ]; then
            echo -e "${YELLOW}  等待中... ($i/$retry_count)${NC}"
            sleep $CHECK_INTERVAL
        fi
    done
    
    echo -e "${RED}✗ $service_name 進程未運行${NC}"
    return 1
}

# ==========================================
# 主檢查流程
# ==========================================

FAILED_SERVICES=()

echo -e "${BLUE}階段 1: 檢查 PM2 進程${NC}"
echo "========================================"

# 檢查所有 PM2 進程是否啟動
SERVICES=(
    "api-gateway"
    "auth-service"
    "user-service"
    "payment-service"
    "subscription-service"
    "content-service"
    "media-service"
    "db-writer-service"
    "web"
    "admin"
)

for service in "${SERVICES[@]}"; do
    if ! check_pm2_service "$service" 5; then
        FAILED_SERVICES+=("$service (PM2進程)")
    fi
done

echo ""
echo -e "${BLUE}階段 2: 檢查 HTTP 端點${NC}"
echo "========================================"

# 檢查 API Gateway
if ! check_service "API Gateway" "http://127.0.0.1:3000/health" $RETRY_COUNT; then
    FAILED_SERVICES+=("API Gateway (HTTP)")
fi

# 檢查 Web 前端
if ! check_service "Web Frontend" "http://127.0.0.1:4200" $RETRY_COUNT; then
    FAILED_SERVICES+=("Web Frontend (HTTP)")
fi

# 檢查 Admin 前端
if ! check_service "Admin Frontend" "http://127.0.0.1:4300" $RETRY_COUNT; then
    FAILED_SERVICES+=("Admin Frontend (HTTP)")
fi

# ==========================================
# 結果報告
# ==========================================

echo ""
echo "========================================"
echo -e "${BLUE}健康檢查結果${NC}"
echo "========================================"
echo ""

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ 所有服務健康檢查通過！${NC}"
    echo ""
    
    # 顯示服務狀態
    pm2 list
    
    echo ""
    echo "服務端點:"
    echo "  API Gateway:    http://localhost:3000"
    echo "  Web Frontend:   http://localhost:4200"
    echo "  Admin Frontend: http://localhost:4300"
    echo ""
    
    exit 0
else
    echo -e "${RED}✗ 健康檢查失敗${NC}"
    echo ""
    echo "失敗的服務:"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "  - $service"
    done
    echo ""
    
    echo "調試建議:"
    echo "  1. 查看服務狀態: npm run pm2:status"
    echo "  2. 查看服務日誌: npm run pm2:logs"
    echo "  3. 查看特定服務日誌: pm2 logs [service-name]"
    echo "  4. 重啟服務: npm run pm2:restart"
    echo ""
    
    # 顯示當前 PM2 狀態
    pm2 list
    
    exit 1
fi
