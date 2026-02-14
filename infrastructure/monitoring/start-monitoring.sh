#!/bin/bash

# Suggar Daddy 監控系統快速啟動腳本
# Version: 1.0.0
# Author: DevOps Team

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 腳本目錄
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MONITORING_DIR="$SCRIPT_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   Suggar Daddy 監控系統 - 快速啟動腳本   ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 功能選單
show_menu() {
    echo -e "${GREEN}請選擇操作：${NC}"
    echo ""
    echo "  1) 啟動監控系統"
    echo "  2) 停止監控系統"
    echo "  3) 重啟監控系統"
    echo "  4) 查看服務狀態"
    echo "  5) 查看服務日誌"
    echo "  6) 打開監控界面"
    echo "  7) 健康檢查"
    echo "  8) 清理數據並重置"
    echo "  0) 退出"
    echo ""
    read -p "請輸入選項 [0-8]: " choice
}

# 檢查 Docker
check_docker() {
    echo -e "${YELLOW}檢查 Docker...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安裝${NC}"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker daemon 未運行${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker 運行正常${NC}"
    echo ""
}

# 檢查網路
check_network() {
    echo -e "${YELLOW}檢查 Docker 網路...${NC}"
    if ! docker network inspect suggar-daddy-network &> /dev/null; then
        echo -e "${YELLOW}⚠️  suggar-daddy-network 不存在${NC}"
        echo -e "${YELLOW}   請先啟動主應用系統${NC}"
        read -p "是否繼續（監控系統可以獨立運行）? [y/N]: " continue_choice
        if [[ ! $continue_choice =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ suggar-daddy-network 存在${NC}"
    fi
    echo ""
}

# 啟動監控系統
start_monitoring() {
    echo -e "${GREEN}🚀 啟動監控系統...${NC}"
    echo ""
    
    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.monitoring.yml up -d
    
    echo ""
    echo -e "${GREEN}✅ 監控系統啟動成功！${NC}"
    echo ""
    echo -e "${BLUE}訪問地址：${NC}"
    echo -e "  📊 Grafana:       ${GREEN}http://localhost:3001${NC}"
    echo -e "  🔍 Prometheus:    ${GREEN}http://localhost:9090${NC}"
    echo -e "  🔔 Alertmanager:  ${GREEN}http://localhost:9093${NC}"
    echo ""
    echo -e "${YELLOW}預設帳號：${NC}"
    echo -e "  用戶名: ${GREEN}admin${NC}"
    echo -e "  密碼:   ${GREEN}admin123${NC}"
    echo ""
    echo -e "${YELLOW}💡 提示：首次登入 Grafana 會要求修改密碼${NC}"
    echo ""
}

# 停止監控系統
stop_monitoring() {
    echo -e "${YELLOW}⏹️  停止監控系統...${NC}"
    echo ""
    
    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.monitoring.yml down
    
    echo ""
    echo -e "${GREEN}✅ 監控系統已停止${NC}"
    echo ""
}

# 重啟監控系統
restart_monitoring() {
    echo -e "${YELLOW}🔄 重啟監控系統...${NC}"
    echo ""
    
    stop_monitoring
    sleep 2
    start_monitoring
}

# 查看服務狀態
show_status() {
    echo -e "${BLUE}📋 服務狀態：${NC}"
    echo ""
    
    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.monitoring.yml ps
    
    echo ""
}

# 查看日誌
show_logs() {
    echo -e "${GREEN}選擇服務：${NC}"
    echo ""
    echo "  1) Prometheus"
    echo "  2) Grafana"
    echo "  3) Alertmanager"
    echo "  4) Node Exporter"
    echo "  5) cAdvisor"
    echo "  6) Postgres Exporter"
    echo "  7) Redis Exporter"
    echo "  8) 所有服務"
    echo ""
    read -p "請輸入選項 [1-8]: " log_choice
    
    cd "$MONITORING_DIR"
    
    case $log_choice in
        1)
            docker-compose -f docker-compose.monitoring.yml logs -f prometheus
            ;;
        2)
            docker-compose -f docker-compose.monitoring.yml logs -f grafana
            ;;
        3)
            docker-compose -f docker-compose.monitoring.yml logs -f alertmanager
            ;;
        4)
            docker-compose -f docker-compose.monitoring.yml logs -f node-exporter
            ;;
        5)
            docker-compose -f docker-compose.monitoring.yml logs -f cadvisor
            ;;
        6)
            docker-compose -f docker-compose.monitoring.yml logs -f postgres-exporter
            ;;
        7)
            docker-compose -f docker-compose.monitoring.yml logs -f redis-exporter
            ;;
        8)
            docker-compose -f docker-compose.monitoring.yml logs -f
            ;;
        *)
            echo -e "${RED}無效選項${NC}"
            ;;
    esac
}

# 打開監控界面
open_ui() {
    echo -e "${BLUE}🌐 打開監控界面...${NC}"
    echo ""
    
    if command -v open &> /dev/null; then
        # macOS
        open http://localhost:3001
        echo -e "${GREEN}✅ 已在瀏覽器中打開 Grafana${NC}"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open http://localhost:3001
        echo -e "${GREEN}✅ 已在瀏覽器中打開 Grafana${NC}"
    else
        echo -e "${YELLOW}請手動訪問：${NC}"
        echo -e "  📊 Grafana: ${GREEN}http://localhost:3001${NC}"
    fi
    
    echo ""
}

# 健康檢查
health_check() {
    echo -e "${BLUE}🏥 健康檢查...${NC}"
    echo ""
    
    # Prometheus
    echo -n "Prometheus: "
    if curl -s http://localhost:9090/-/healthy &> /dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 不健康${NC}"
    fi
    
    # Grafana
    echo -n "Grafana: "
    if curl -s http://localhost:3001/api/health &> /dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 不健康${NC}"
    fi
    
    # Alertmanager
    echo -n "Alertmanager: "
    if curl -s http://localhost:9093/-/healthy &> /dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 不健康${NC}"
    fi
    
    # Node Exporter
    echo -n "Node Exporter: "
    if curl -s http://localhost:9100/metrics &> /dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 不健康${NC}"
    fi
    
    # cAdvisor
    echo -n "cAdvisor: "
    if curl -s http://localhost:8080/healthz &> /dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 不健康${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}檢查 Prometheus Targets...${NC}"
    echo -e "${YELLOW}訪問 http://localhost:9090/targets 查看詳情${NC}"
    echo ""
}

# 清理數據
clean_data() {
    echo -e "${RED}⚠️  警告：這將刪除所有監控數據！${NC}"
    echo ""
    read -p "確定要繼續嗎? [y/N]: " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}停止服務並刪除數據...${NC}"
        cd "$MONITORING_DIR"
        docker-compose -f docker-compose.monitoring.yml down -v
        echo -e "${GREEN}✅ 數據已清理${NC}"
    else
        echo -e "${YELLOW}已取消${NC}"
    fi
    echo ""
}

# 主循環
main() {
    check_docker
    
    while true; do
        show_menu
        
        case $choice in
            1)
                check_network
                start_monitoring
                ;;
            2)
                stop_monitoring
                ;;
            3)
                restart_monitoring
                ;;
            4)
                show_status
                ;;
            5)
                show_logs
                ;;
            6)
                open_ui
                ;;
            7)
                health_check
                ;;
            8)
                clean_data
                ;;
            0)
                echo -e "${GREEN}再見！👋${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}無效選項，請重試${NC}"
                echo ""
                ;;
        esac
        
        read -p "按 Enter 鍵繼續..."
        clear
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}   Suggar Daddy 監控系統 - 快速啟動腳本   ${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
    done
}

# 執行主程式
main
