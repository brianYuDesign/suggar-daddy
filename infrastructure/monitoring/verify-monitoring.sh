#!/bin/bash

# Prometheus + Grafana 監控系統 - 快速驗證腳本
# Version: 1.0.0

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   監控系統快速驗證腳本   ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 記錄結果
PASSED=0
FAILED=0
WARNINGS=0

# 檢查函數
check_item() {
    local name="$1"
    local command="$2"
    
    echo -n "檢查 $name ... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 通過${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ 失敗${NC}"
        ((FAILED++))
        return 1
    fi
}

check_warning() {
    local name="$1"
    local command="$2"
    
    echo -n "檢查 $name ... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 通過${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${YELLOW}⚠️  警告${NC}"
        ((WARNINGS++))
        return 1
    fi
}

echo -e "${YELLOW}1. 檢查配置文件${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_item "Docker Compose 配置文件" "test -f docker-compose.monitoring.yml"
check_item "Prometheus 配置" "test -f prometheus/prometheus.yml"
check_item "Prometheus 告警規則" "test -f prometheus/alerts.yml"
check_item "Alertmanager 配置" "test -f alertmanager/alertmanager.yml"
check_item "Grafana 數據源配置" "test -f grafana/datasources.yml"
check_item "啟動腳本" "test -f start-monitoring.sh && test -x start-monitoring.sh"
echo ""

echo -e "${YELLOW}2. 驗證配置語法${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_item "Docker Compose 語法" "docker-compose -f docker-compose.monitoring.yml config --quiet"
echo ""

echo -e "${YELLOW}3. 檢查 Docker 環境${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_item "Docker 已安裝" "command -v docker"
check_item "Docker Compose 已安裝" "command -v docker-compose"
check_item "Docker daemon 運行中" "docker info"
echo ""

echo -e "${YELLOW}4. 檢查服務狀態（如果已啟動）${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker ps | grep -q "suggar-daddy-prometheus"; then
    check_item "Prometheus 容器運行中" "docker ps | grep -q 'suggar-daddy-prometheus.*Up'"
    check_item "Grafana 容器運行中" "docker ps | grep -q 'suggar-daddy-grafana.*Up'"
    check_item "Alertmanager 容器運行中" "docker ps | grep -q 'suggar-daddy-alertmanager.*Up'"
    check_item "Node Exporter 容器運行中" "docker ps | grep -q 'suggar-daddy-node-exporter.*Up'"
    check_item "cAdvisor 容器運行中" "docker ps | grep -q 'suggar-daddy-cadvisor.*Up'"
    echo ""
    
    echo -e "${YELLOW}5. 檢查服務健康狀態${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    check_item "Prometheus 健康檢查" "curl -sf http://localhost:9090/-/healthy"
    check_item "Grafana 健康檢查" "curl -sf http://localhost:3001/api/health"
    check_item "Alertmanager 健康檢查" "curl -sf http://localhost:9093/-/healthy"
    echo ""
    
    echo -e "${YELLOW}6. 檢查 Prometheus Targets${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    check_warning "Prometheus 目標可達" "curl -sf http://localhost:9090/api/v1/targets | grep -q 'up'"
    echo ""
    
    echo -e "${YELLOW}7. 檢查告警規則${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    check_item "告警規則已載入" "curl -sf http://localhost:9090/api/v1/rules | grep -q 'ServiceDown'"
    echo ""
else
    echo -e "${YELLOW}⚠️  監控系統未運行，跳過運行時檢查${NC}"
    echo ""
fi

echo -e "${YELLOW}8. 檢查網路${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_warning "主應用網路存在" "docker network inspect suggar-daddy-network"
echo ""

echo -e "${YELLOW}9. 檢查文檔${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_item "README.md" "test -f README.md"
check_item "完整文檔 (docs/MONITORING.md)" "test -f ../../docs/MONITORING.md"
check_item "部署驗證報告" "test -f DEPLOYMENT-VERIFICATION-REPORT.md"
echo ""

# 輸出結果
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}驗證結果統計${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "✅ 通過: ${GREEN}$PASSED${NC}"
echo -e "⚠️  警告: ${YELLOW}$WARNINGS${NC}"
echo -e "❌ 失敗: ${RED}$FAILED${NC}"
echo ""

# 總結
if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}🎉 所有檢查通過！監控系統配置完美！${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  檢查通過，但有 $WARNINGS 個警告項${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ 有 $FAILED 個檢查失敗，請修復後重試${NC}"
    exit 1
fi
