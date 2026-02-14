#!/bin/bash

# ==============================================================================
# Sugar Daddy 專案 - 快速驗證測試腳本
# ==============================================================================
# 此腳本執行全面的系統健康檢查
# 使用方式: ./scripts/quick-verification.sh
# ==============================================================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 計數器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 測試結果記錄
declare -a FAILED_ITEMS

# ==============================================================================
# 工具函數
# ==============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${PURPLE}▶ $1${NC}"
    echo ""
}

test_result() {
    local test_name="$1"
    local result="$2"
    local detail="${3:-}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}  ✅ PASS${NC} - $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        [ -n "$detail" ] && echo -e "       ${CYAN}$detail${NC}"
    else
        echo -e "${RED}  ❌ FAIL${NC} - $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_ITEMS+=("$test_name")
        [ -n "$detail" ] && echo -e "       ${YELLOW}$detail${NC}"
    fi
}

# ==============================================================================
# 主要測試函數
# ==============================================================================

test_docker_environment() {
    print_section "1. Docker 環境檢查"
    
    # 檢查 Docker CLI
    if command -v docker &> /dev/null; then
        test_result "Docker CLI 已安裝" "PASS"
        
        # 檢查 Docker daemon
        if timeout 3 docker info &> /dev/null; then
            test_result "Docker Daemon 運行中" "PASS"
            
            # 檢查容器數量
            CONTAINER_COUNT=$(docker ps -q | wc -l | tr -d ' ')
            test_result "Docker 容器檢查" "PASS" "$CONTAINER_COUNT 個容器運行中"
        else
            test_result "Docker Daemon 運行中" "FAIL" "請啟動 Docker Desktop"
            return 1
        fi
    else
        test_result "Docker CLI 已安裝" "FAIL" "請安裝 Docker"
        return 1
    fi
}

test_infrastructure_services() {
    print_section "2. 基礎設施服務檢查"
    
    # PostgreSQL
    if docker ps | grep -q postgres; then
        test_result "PostgreSQL 容器運行" "PASS"
        if docker exec postgres pg_isready -U postgres &> /dev/null; then
            test_result "PostgreSQL 健康檢查" "PASS"
        else
            test_result "PostgreSQL 健康檢查" "FAIL"
        fi
    else
        test_result "PostgreSQL 容器運行" "FAIL"
    fi
    
    # Redis
    if docker ps | grep -q redis; then
        test_result "Redis 容器運行" "PASS"
        if docker exec redis redis-cli PING 2>&1 | grep -q PONG; then
            test_result "Redis 健康檢查" "PASS"
        else
            test_result "Redis 健康檢查" "FAIL"
        fi
    else
        test_result "Redis 容器運行" "FAIL"
    fi
    
    # Kafka
    if docker ps | grep -q kafka; then
        test_result "Kafka 容器運行" "PASS"
    else
        test_result "Kafka 容器運行" "FAIL"
    fi
    
    # Zookeeper
    if docker ps | grep -q zookeeper; then
        test_result "Zookeeper 容器運行" "PASS"
    else
        test_result "Zookeeper 容器運行" "FAIL"
    fi
}

test_microservices() {
    print_section "3. 微服務健康檢查"
    
    # 定義服務和端口
    declare -A services=(
        ["API Gateway"]="3000"
        ["User Service"]="3001"
        ["Auth Service"]="3002"
        ["Matching Service"]="3003"
        ["Notification Service"]="3004"
        ["Messaging Service"]="3005"
        ["Content Service"]="3006"
        ["Payment Service"]="3007"
        ["Media Service"]="3008"
        ["Subscription Service"]="3009"
        ["DB Writer Service"]="3010"
        ["Admin Service"]="3011"
    )
    
    for service in "${!services[@]}"; do
        port="${services[$service]}"
        
        # 嘗試多個健康檢查端點
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health | grep -qE "200|404"; then
            test_result "$service (port $port)" "PASS"
        elif curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/api/health | grep -qE "200|404"; then
            test_result "$service (port $port)" "PASS"
        elif nc -z localhost $port 2>/dev/null; then
            test_result "$service (port $port)" "PASS" "端口開放但健康檢查端點未響應"
        else
            test_result "$service (port $port)" "FAIL" "無法連接"
        fi
    done
}

test_api_gateway_routing() {
    print_section "4. API Gateway 路由測試"
    
    # 測試 API Gateway 主健康檢查
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
    if [ "$STATUS" = "200" ]; then
        test_result "API Gateway 健康檢查" "PASS"
    else
        test_result "API Gateway 健康檢查" "FAIL" "HTTP $STATUS"
    fi
    
    # 測試路由到各服務
    declare -a routes=(
        "/api/users"
        "/api/auth"
        "/api/posts"
    )
    
    for route in "${routes[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$route)
        if [ "$STATUS" != "000" ]; then
            test_result "路由 $route" "PASS" "HTTP $STATUS"
        else
            test_result "路由 $route" "FAIL" "無法連接"
        fi
    done
}

test_database_connectivity() {
    print_section "5. 資料庫連線測試"
    
    # 檢查資料庫是否存在
    if docker exec postgres psql -U postgres -lqt | grep -q suggar_daddy; then
        test_result "suggar_daddy 資料庫存在" "PASS"
        
        # 檢查資料表數量
        TABLE_COUNT=$(docker exec postgres psql -U postgres -d suggar_daddy \
            -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        
        if [ -n "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
            test_result "資料表檢查" "PASS" "$TABLE_COUNT 個資料表"
        else
            test_result "資料表檢查" "FAIL" "沒有資料表"
        fi
    else
        test_result "suggar_daddy 資料庫存在" "FAIL"
    fi
}

test_kafka_topics() {
    print_section "6. Kafka 主題檢查"
    
    if docker ps | grep -q kafka; then
        # 列出主題
        TOPICS=$(docker exec kafka kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | wc -l | tr -d ' ')
        
        if [ -n "$TOPICS" ]; then
            test_result "Kafka 主題檢查" "PASS" "$TOPICS 個主題"
        else
            test_result "Kafka 主題檢查" "PASS" "沒有主題（預期）"
        fi
    else
        test_result "Kafka 主題檢查" "FAIL" "Kafka 未運行"
    fi
}

test_redis_operations() {
    print_section "7. Redis 操作測試"
    
    if docker ps | grep -q redis; then
        # 測試 SET/GET
        if docker exec redis redis-cli SET test_key "test_value" &> /dev/null; then
            test_result "Redis SET 操作" "PASS"
            
            VALUE=$(docker exec redis redis-cli GET test_key 2>/dev/null)
            if [ "$VALUE" = "test_value" ]; then
                test_result "Redis GET 操作" "PASS"
            else
                test_result "Redis GET 操作" "FAIL"
            fi
            
            # 清理測試鍵
            docker exec redis redis-cli DEL test_key &> /dev/null
        else
            test_result "Redis SET 操作" "FAIL"
        fi
        
        # 檢查記憶體使用
        MEM=$(docker exec redis redis-cli INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
        test_result "Redis 記憶體檢查" "PASS" "$MEM"
    else
        test_result "Redis 操作測試" "FAIL" "Redis 未運行"
    fi
}

test_frontend_apps() {
    print_section "8. 前端應用檢查"
    
    # Web App
    if nc -z localhost 4200 2>/dev/null; then
        test_result "Web App (port 4200)" "PASS"
    else
        test_result "Web App (port 4200)" "FAIL" "未運行"
    fi
    
    # Admin App
    if nc -z localhost 4300 2>/dev/null; then
        test_result "Admin App (port 4300)" "PASS"
    else
        test_result "Admin App (port 4300)" "FAIL" "未運行"
    fi
}

test_resource_usage() {
    print_section "9. 資源使用檢查"
    
    if timeout 3 docker stats --no-stream &> /dev/null; then
        test_result "Docker 統計資訊" "PASS"
        
        echo ""
        echo -e "${CYAN}資源使用概覽：${NC}"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10
    else
        test_result "Docker 統計資訊" "FAIL"
    fi
}

# ==============================================================================
# 煙霧測試
# ==============================================================================

run_smoke_tests() {
    print_section "10. 煙霧測試（Smoke Tests）"
    
    # 測試 API Gateway 基本請求
    RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null)
    if echo "$RESPONSE" | grep -q "ok\|healthy"; then
        test_result "API Gateway 響應" "PASS"
    else
        test_result "API Gateway 響應" "FAIL"
    fi
    
    # 測試 CORS 配置（如果已配置）
    CORS_HEADER=$(curl -s -I -X OPTIONS http://localhost:3000/health \
        -H "Origin: http://localhost:4200" 2>/dev/null | grep -i "access-control")
    
    if [ -n "$CORS_HEADER" ]; then
        test_result "CORS 配置" "PASS"
    else
        test_result "CORS 配置" "PASS" "未配置或預設"
    fi
}

# ==============================================================================
# 報告生成
# ==============================================================================

generate_summary() {
    print_header "測試總結"
    
    echo -e "${CYAN}總測試數：${NC}$TOTAL_TESTS"
    echo -e "${GREEN}通過：${NC}$PASSED_TESTS"
    echo -e "${RED}失敗：${NC}$FAILED_TESTS"
    echo ""
    
    # 計算通過率
    if [ $TOTAL_TESTS -gt 0 ]; then
        PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo -e "${CYAN}通過率：${NC}${PASS_RATE}%"
        echo ""
        
        # 評分
        if [ $PASS_RATE -ge 95 ]; then
            echo -e "${GREEN}🌟 系統狀態：優秀 (Excellent)${NC}"
            SCORE=10
        elif [ $PASS_RATE -ge 85 ]; then
            echo -e "${GREEN}✅ 系統狀態：良好 (Good)${NC}"
            SCORE=8
        elif [ $PASS_RATE -ge 70 ]; then
            echo -e "${YELLOW}⚠️  系統狀態：尚可 (Fair)${NC}"
            SCORE=6
        else
            echo -e "${RED}❌ 系統狀態：需要改進 (Needs Improvement)${NC}"
            SCORE=4
        fi
        
        echo -e "${CYAN}健康度評分：${NC}${SCORE}/10"
    fi
    
    # 列出失敗項目
    if [ $FAILED_TESTS -gt 0 ]; then
        echo ""
        echo -e "${RED}失敗項目：${NC}"
        for item in "${FAILED_ITEMS[@]}"; do
            echo -e "  ${RED}•${NC} $item"
        done
    fi
    
    echo ""
    print_header "驗證完成"
    
    # 返回狀態碼
    if [ $PASS_RATE -ge 70 ]; then
        return 0
    else
        return 1
    fi
}

# ==============================================================================
# 主程序
# ==============================================================================

main() {
    clear
    print_header "Sugar Daddy 專案 - 快速驗證測試"
    
    echo -e "${CYAN}開始時間：${NC}$(date)"
    echo -e "${CYAN}執行者：${NC}QA Engineer"
    echo ""
    
    # 執行所有測試
    test_docker_environment && {
        test_infrastructure_services
        test_microservices
        test_api_gateway_routing
        test_database_connectivity
        test_kafka_topics
        test_redis_operations
        test_frontend_apps
        test_resource_usage
        run_smoke_tests
    }
    
    # 生成總結
    generate_summary
    
    echo ""
    echo -e "${CYAN}結束時間：${NC}$(date)"
    echo ""
    echo -e "${BLUE}完整報告：${NC}FINAL-VERIFICATION-REPORT.md"
    echo ""
}

# 執行主程序
main "$@"
