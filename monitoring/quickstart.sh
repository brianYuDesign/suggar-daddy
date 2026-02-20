#!/bin/bash

# ==================================================
# Sugar Daddy Monitoring Stack Quick Start
# ==================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Sugar Daddy Monitoring Stack Quick Start"
echo "==========================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數: 打印彩色信息
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 檢查前置條件
log_info "檢查前置條件..."

if ! command -v docker &> /dev/null; then
    log_error "Docker 未安裝"
    exit 1
fi
log_success "Docker 已安裝"

if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose 未安裝"
    exit 1
fi
log_success "docker-compose 已安裝"

# 檢查磁盤空間
DISK_FREE=$(df /Users/brianyu/.openclaw/workspace | awk 'NR==2 {print $4}')
if [ "$DISK_FREE" -lt 5242880 ]; then  # 5GB in KB
    log_warning "磁盤空間不足 (小於 5GB)"
else
    log_success "磁盤空間充足 ($((DISK_FREE / 1024 / 1024))GB)"
fi

# 檢查埠
log_info "檢查埠可用性..."
PORTS=(9090 3010 9200 5601 3000 3001)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "埠 $port 已被占用"
    else
        log_success "埠 $port 可用"
    fi
done

# 創建日誌目錄
log_info "創建日誌目錄..."
mkdir -p /var/log/sugar-daddy
log_success "日誌目錄已準備"

# 啟動容器
log_info "啟動 Docker 容器..."
docker-compose up -d

# 等待服務啟動
log_info "等待服務啟動 (30 秒)..."
sleep 30

# 驗證服務
log_info "驗證服務狀態..."
echo ""

# 檢查容器
docker-compose ps

echo ""
log_info "驗證連接..."

# Prometheus
if curl -f -s http://localhost:9090/api/v1/targets > /dev/null 2>&1; then
    log_success "Prometheus: http://localhost:9090"
else
    log_error "Prometheus 無法連接"
fi

# Grafana
if curl -f -s http://localhost:3010/api/health > /dev/null 2>&1; then
    log_success "Grafana: http://localhost:3010 (admin/admin)"
else
    log_error "Grafana 無法連接"
fi

# Elasticsearch
if curl -f -s http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    log_success "Elasticsearch: http://localhost:9200"
else
    log_error "Elasticsearch 無法連接"
fi

# Kibana
if curl -f -s http://localhost:5601/api/status > /dev/null 2>&1; then
    log_success "Kibana: http://localhost:5601"
else
    log_error "Kibana 無法連接"
fi

# 應用健康檢查
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    log_success "Recommendation Service: http://localhost:3000"
else
    log_warning "Recommendation Service 尚未啟動 (正常，應用可能需要更多時間)"
fi

echo ""
log_success "🎉 監控棧啟動完成！"
echo ""
echo "📊 訪問服務:"
echo "  • Prometheus:     http://localhost:9090"
echo "  • Grafana:        http://localhost:3010 (admin/admin)"
echo "  • Kibana:         http://localhost:5601"
echo "  • Alertmanager:   http://localhost:9093"
echo ""
echo "📚 文檔:"
echo "  • 監控指南:       ./monitoring/MONITORING_GUIDE.md"
echo "  • 故障排查:       ./monitoring/TROUBLESHOOTING.md"
echo ""
echo "💡 下一步:"
echo "  1. 配置 Slack 告警: 編輯 .env.monitoring"
echo "  2. 訪問 Grafana 查看儀表板"
echo "  3. 訪問 Kibana 查看日誌"
echo ""
echo "❓ 需要幫助?"
echo "  • 檢查日誌: docker-compose logs -f <service>"
echo "  • 重啟服務: docker-compose restart <service>"
echo "  • 停止服務: docker-compose down"
echo ""
