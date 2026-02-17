#!/bin/bash

# ============================================================
# Grafana Dashboard 驗證與啟動腳本
# ============================================================
# 用途: 驗證 Dashboard 配置並啟動監控系統
# 版本: 1.0.0
# ============================================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：打印標題
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# 函數：打印成功
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 函數：打印警告
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 函數：打印錯誤
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 函數：打印訊息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================
# 主選單
# ============================================================

show_menu() {
    clear
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════╗"
    echo "║  Grafana Dashboard 驗證與啟動工具          ║"
    echo "║  Suggar Daddy Monitoring System           ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "請選擇操作："
    echo ""
    echo "  1) 驗證 Dashboard JSON 文件"
    echo "  2) 檢查監控服務狀態"
    echo "  3) 啟動監控系統"
    echo "  4) 重啟監控系統並載入 Dashboard"
    echo "  5) 驗證 Prometheus Targets"
    echo "  6) 測試 PostgreSQL 連線"
    echo "  7) 查看 Grafana 日誌"
    echo "  8) 打開監控界面（瀏覽器）"
    echo "  9) 顯示 Dashboard 列表"
    echo " 10) 生成測試數據"
    echo "  0) 退出"
    echo ""
    echo -n "請輸入選項 [0-10]: "
}

# ============================================================
# 功能 1: 驗證 Dashboard JSON 文件
# ============================================================

validate_dashboards() {
    print_header "驗證 Dashboard JSON 文件"
    
    DASHBOARD_DIR="grafana/dashboards"
    
    if [ ! -d "$DASHBOARD_DIR" ]; then
        print_error "Dashboard 目錄不存在: $DASHBOARD_DIR"
        return 1
    fi
    
    echo "檢查 Dashboard 文件..."
    echo ""
    
    TOTAL=0
    SUCCESS=0
    FAILED=0
    
    for file in "$DASHBOARD_DIR"/*.json; do
        if [ -f "$file" ]; then
            TOTAL=$((TOTAL + 1))
            filename=$(basename "$file")
            
            # 使用 jq 驗證 JSON 語法
            if command -v jq &> /dev/null; then
                if jq empty "$file" 2>/dev/null; then
                    print_success "$filename - JSON 語法正確"
                    
                    # 檢查必要欄位
                    if jq -e '.title' "$file" >/dev/null 2>&1; then
                        title=$(jq -r '.title' "$file")
                        panels=$(jq '.panels | length' "$file")
                        print_info "  標題: $title"
                        print_info "  面板數: $panels"
                    fi
                    
                    SUCCESS=$((SUCCESS + 1))
                else
                    print_error "$filename - JSON 語法錯誤"
                    FAILED=$((FAILED + 1))
                fi
            else
                # 如果沒有 jq，使用 python
                if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
                    print_success "$filename - JSON 語法正確"
                    SUCCESS=$((SUCCESS + 1))
                else
                    print_error "$filename - JSON 語法錯誤"
                    FAILED=$((FAILED + 1))
                fi
            fi
            echo ""
        fi
    done
    
    echo "========================================"
    echo "總計: $TOTAL 個文件"
    echo -e "${GREEN}成功: $SUCCESS${NC}"
    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}失敗: $FAILED${NC}"
    fi
    echo "========================================"
    
    if [ $FAILED -eq 0 ]; then
        print_success "所有 Dashboard 文件驗證通過！"
        return 0
    else
        print_error "部分 Dashboard 文件驗證失敗！"
        return 1
    fi
}

# ============================================================
# 功能 2: 檢查監控服務狀態
# ============================================================

check_services() {
    print_header "檢查監控服務狀態"
    
    echo "檢查 Docker 服務..."
    echo ""
    
    # 檢查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安裝或未在 PATH 中"
        return 1
    fi
    
    # 檢查各個服務
    services=(
        "suggar-daddy-prometheus:Prometheus"
        "suggar-daddy-grafana:Grafana"
        "suggar-daddy-postgres-master:PostgreSQL"
        "suggar-daddy-redis-master:Redis"
        "suggar-daddy-alertmanager:Alertmanager"
    )
    
    RUNNING=0
    STOPPED=0
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r container_name display_name <<< "$service_info"
        
        if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
            print_success "$display_name 正在運行"
            RUNNING=$((RUNNING + 1))
        else
            print_error "$display_name 未運行"
            STOPPED=$((STOPPED + 1))
        fi
    done
    
    echo ""
    echo "========================================"
    echo -e "${GREEN}運行中: $RUNNING${NC}"
    if [ $STOPPED -gt 0 ]; then
        echo -e "${RED}已停止: $STOPPED${NC}"
    fi
    echo "========================================"
    
    if [ $STOPPED -gt 0 ]; then
        echo ""
        print_warning "部分服務未運行，請執行選項 3 啟動監控系統"
        return 1
    else
        print_success "所有監控服務正常運行！"
        return 0
    fi
}

# ============================================================
# 功能 3: 啟動監控系統
# ============================================================

start_monitoring() {
    print_header "啟動監控系統"
    
    if [ ! -f "docker-compose.monitoring.yml" ]; then
        print_error "找不到 docker-compose.monitoring.yml"
        print_info "請確認您在 infrastructure/monitoring 目錄下"
        return 1
    fi
    
    echo "啟動監控服務..."
    docker-compose -f docker-compose.monitoring.yml up -d
    
    echo ""
    print_success "監控系統啟動成功！"
    
    echo ""
    echo "等待服務初始化（15 秒）..."
    sleep 15
    
    # 檢查服務健康狀態
    check_services
}

# ============================================================
# 功能 4: 重啟監控系統並載入 Dashboard
# ============================================================

restart_and_reload() {
    print_header "重啟監控系統並載入 Dashboard"
    
    echo "重啟 Grafana 以載入新 Dashboard..."
    
    if docker ps --format '{{.Names}}' | grep -q "^suggar-daddy-grafana$"; then
        docker restart suggar-daddy-grafana
        print_success "Grafana 重啟成功"
        
        echo ""
        echo "等待 Grafana 初始化（10 秒）..."
        sleep 10
        
        # 檢查 Grafana 健康狀態
        if curl -s http://localhost:3001/api/health > /dev/null; then
            print_success "Grafana 健康檢查通過"
        else
            print_warning "Grafana 健康檢查失敗，請稍後重試"
        fi
    else
        print_error "Grafana 容器未運行"
        return 1
    fi
}

# ============================================================
# 功能 5: 驗證 Prometheus Targets
# ============================================================

verify_prometheus_targets() {
    print_header "驗證 Prometheus Targets"
    
    if ! curl -s http://localhost:9090/api/v1/targets > /dev/null; then
        print_error "無法連接到 Prometheus（http://localhost:9090）"
        print_info "請確認 Prometheus 服務正在運行"
        return 1
    fi
    
    echo "獲取 Targets 狀態..."
    echo ""
    
    # 獲取 targets 數據
    targets=$(curl -s http://localhost:9090/api/v1/targets | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['status'] == 'success':
    active = data['data']['activeTargets']
    for target in active:
        job = target.get('labels', {}).get('job', 'unknown')
        health = target.get('health', 'unknown')
        print(f'{job}:{health}')
" 2>/dev/null)
    
    if [ -z "$targets" ]; then
        print_warning "無法解析 Prometheus targets 數據"
        print_info "請手動訪問: http://localhost:9090/targets"
        return 1
    fi
    
    UP=0
    DOWN=0
    
    while IFS=':' read -r job health; do
        if [ "$health" == "up" ]; then
            print_success "$job"
            UP=$((UP + 1))
        else
            print_error "$job - $health"
            DOWN=$((DOWN + 1))
        fi
    done <<< "$targets"
    
    echo ""
    echo "========================================"
    echo -e "${GREEN}UP: $UP${NC}"
    if [ $DOWN -gt 0 ]; then
        echo -e "${RED}DOWN: $DOWN${NC}"
    fi
    echo "========================================"
    
    if [ $DOWN -eq 0 ]; then
        print_success "所有 Prometheus Targets 正常！"
    else
        print_warning "部分 Targets 不可用"
    fi
}

# ============================================================
# 功能 6: 測試 PostgreSQL 連線
# ============================================================

test_postgres() {
    print_header "測試 PostgreSQL 連線"
    
    echo "嘗試連接 PostgreSQL..."
    
    # 從環境變數或預設值獲取連線資訊
    POSTGRES_HOST=${POSTGRES_HOST:-localhost}
    POSTGRES_PORT=${POSTGRES_PORT:-5432}
    POSTGRES_USER=${POSTGRES_USER:-postgres}
    POSTGRES_DB=${POSTGRES_DB:-suggar_daddy}
    
    # 測試連線
    if command -v psql &> /dev/null; then
        if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;" > /dev/null 2>&1; then
            print_success "PostgreSQL 連線成功"
            
            # 獲取表格數量
            table_count=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)
            print_info "資料庫表格數量: $table_count"
        else
            print_error "PostgreSQL 連線失敗"
            print_info "連線資訊: $POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
        fi
    else
        print_warning "psql 命令未安裝"
        print_info "使用 Docker 測試連線..."
        
        if docker exec suggar-daddy-postgres-master psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;" > /dev/null 2>&1; then
            print_success "PostgreSQL 連線成功（通過 Docker）"
        else
            print_error "PostgreSQL 連線失敗"
        fi
    fi
}

# ============================================================
# 功能 7: 查看 Grafana 日誌
# ============================================================

show_grafana_logs() {
    print_header "Grafana 日誌（最近 50 行）"
    
    if docker ps --format '{{.Names}}' | grep -q "^suggar-daddy-grafana$"; then
        docker logs --tail 50 suggar-daddy-grafana
    else
        print_error "Grafana 容器未運行"
    fi
}

# ============================================================
# 功能 8: 打開監控界面
# ============================================================

open_dashboards() {
    print_header "打開監控界面"
    
    urls=(
        "http://localhost:3001:Grafana Dashboard"
        "http://localhost:9090:Prometheus"
        "http://localhost:9093:Alertmanager"
    )
    
    echo "可用的監控界面："
    echo ""
    
    for url_info in "${urls[@]}"; do
        IFS=':' read -r url name <<< "$url_info"
        echo "  - $name: $url"
    done
    
    echo ""
    echo -n "是否在瀏覽器中打開這些 URL？ (y/N): "
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        for url_info in "${urls[@]}"; do
            IFS=':' read -r url name <<< "$url_info"
            
            # 嘗試使用不同的命令打開瀏覽器
            if command -v open &> /dev/null; then
                open "$url"  # macOS
            elif command -v xdg-open &> /dev/null; then
                xdg-open "$url"  # Linux
            elif command -v start &> /dev/null; then
                start "$url"  # Windows
            else
                print_warning "無法自動打開瀏覽器，請手動訪問: $url"
            fi
            
            sleep 1
        done
        
        print_success "已在瀏覽器中打開監控界面"
    fi
}

# ============================================================
# 功能 9: 顯示 Dashboard 列表
# ============================================================

list_dashboards() {
    print_header "Dashboard 列表"
    
    DASHBOARD_DIR="grafana/dashboards"
    
    if [ ! -d "$DASHBOARD_DIR" ]; then
        print_error "Dashboard 目錄不存在"
        return 1
    fi
    
    echo "可用的 Dashboard："
    echo ""
    
    for file in "$DASHBOARD_DIR"/*.json; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            
            if command -v jq &> /dev/null; then
                title=$(jq -r '.title // "Unknown"' "$file" 2>/dev/null)
                panels=$(jq '.panels | length' "$file" 2>/dev/null)
                uid=$(jq -r '.uid // "N/A"' "$file" 2>/dev/null)
                
                echo "  📊 $filename"
                echo "     標題: $title"
                echo "     面板數: $panels"
                echo "     UID: $uid"
                echo ""
            else
                echo "  📊 $filename"
                echo ""
            fi
        fi
    done
}

# ============================================================
# 功能 10: 生成測試數據
# ============================================================

generate_test_data() {
    print_header "生成測試數據"
    
    print_warning "此功能將生成模擬的業務數據用於測試"
    echo ""
    echo -n "確定要繼續嗎？ (y/N): "
    read -r response
    
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_info "已取消"
        return 0
    fi
    
    echo ""
    echo "生成測試數據..."
    
    # 這裡可以添加生成測試數據的邏輯
    # 例如: 插入測試用戶、交易、內容等
    
    print_warning "測試數據生成功能待實施"
    print_info "請參考 DATA_QUERIES.md 中的範例手動插入測試數據"
}

# ============================================================
# 主程式
# ============================================================

main() {
    # 檢查是否在正確的目錄
    if [ ! -f "docker-compose.monitoring.yml" ]; then
        print_error "請在 infrastructure/monitoring 目錄下執行此腳本"
        exit 1
    fi
    
    while true; do
        show_menu
        read -r choice
        
        case $choice in
            1)
                validate_dashboards
                ;;
            2)
                check_services
                ;;
            3)
                start_monitoring
                ;;
            4)
                restart_and_reload
                ;;
            5)
                verify_prometheus_targets
                ;;
            6)
                test_postgres
                ;;
            7)
                show_grafana_logs
                ;;
            8)
                open_dashboards
                ;;
            9)
                list_dashboards
                ;;
            10)
                generate_test_data
                ;;
            0)
                echo ""
                print_info "感謝使用，再見！"
                exit 0
                ;;
            *)
                print_error "無效選項，請重新選擇"
                ;;
        esac
        
        echo ""
        echo -n "按 Enter 繼續..."
        read -r
    done
}

# 執行主程式
main
