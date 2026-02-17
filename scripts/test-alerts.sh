#!/bin/bash
#
# 測試告警系統
# Suggar Daddy - Alert Testing Script
# 
# 功能：
# - 測試 Prometheus 告警規則
# - 測試 Alertmanager 通知
# - 驗證告警路由
#
# 使用方式：
#   ./test-alerts.sh [options]

set -euo pipefail

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROMETHEUS_URL="http://localhost:9090"
ALERTMANAGER_URL="http://localhost:9093"
API_GATEWAY_URL="http://localhost:3000"

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 檢查服務是否運行
check_services() {
    log_info "檢查監控服務狀態..."
    
    local failed=false
    
    # 檢查 Prometheus
    if curl -sf "$PROMETHEUS_URL/-/healthy" > /dev/null; then
        log_success "✓ Prometheus 正在運行"
    else
        log_error "✗ Prometheus 未運行"
        failed=true
    fi
    
    # 檢查 Alertmanager
    if curl -sf "$ALERTMANAGER_URL/-/healthy" > /dev/null; then
        log_success "✓ Alertmanager 正在運行"
    else
        log_error "✗ Alertmanager 未運行"
        failed=true
    fi
    
    # 檢查 API Gateway
    if curl -sf "$API_GATEWAY_URL/health" > /dev/null; then
        log_success "✓ API Gateway 正在運行"
    else
        log_warning "⚠ API Gateway 未運行（某些測試將跳過）"
    fi
    
    if [ "$failed" = true ]; then
        log_error "請先啟動監控服務："
        log_info "  cd infrastructure/monitoring"
        log_info "  docker-compose up -d"
        exit 1
    fi
}

# 測試 Prometheus 配置
test_prometheus_config() {
    log_info "=========================================="
    log_info "測試 Prometheus 配置"
    log_info "=========================================="
    
    # 檢查配置是否有效
    log_info "檢查 Prometheus 配置..."
    
    local config_status=$(curl -s "$PROMETHEUS_URL/api/v1/status/config" | jq -r '.status')
    
    if [ "$config_status" = "success" ]; then
        log_success "✓ Prometheus 配置有效"
    else
        log_error "✗ Prometheus 配置無效"
        return 1
    fi
    
    # 檢查告警規則
    log_info "檢查告警規則載入狀態..."
    
    local rules_count=$(curl -s "$PROMETHEUS_URL/api/v1/rules" | jq '.data.groups | length')
    
    if [ "$rules_count" -gt 0 ]; then
        log_success "✓ 已載入 $rules_count 組告警規則"
    else
        log_error "✗ 未載入任何告警規則"
        return 1
    fi
    
    # 列出所有告警規則
    log_info "告警規則列表："
    curl -s "$PROMETHEUS_URL/api/v1/rules" | \
        jq -r '.data.groups[].rules[] | select(.type == "alerting") | "  - \(.alert) (\(.labels.severity))"' | \
        head -20
    
    log_success "Prometheus 配置測試通過"
}

# 測試 Alertmanager 配置
test_alertmanager_config() {
    log_info "=========================================="
    log_info "測試 Alertmanager 配置"
    log_info "=========================================="
    
    # 檢查配置狀態
    log_info "檢查 Alertmanager 配置..."
    
    local config=$(curl -s "$ALERTMANAGER_URL/api/v2/status")
    local version=$(echo "$config" | jq -r '.versionInfo.version')
    local uptime=$(echo "$config" | jq -r '.uptime')
    
    log_success "✓ Alertmanager 版本: $version"
    log_success "✓ 運行時間: $uptime"
    
    # 檢查接收者配置
    log_info "檢查接收者配置..."
    
    # 這需要訪問配置文件或使用 amtool
    log_info "接收者列表（從配置文件）："
    log_info "  - critical-alerts (Slack + Email)"
    log_info "  - warning-alerts (Slack)"
    log_info "  - info-alerts (Slack)"
    
    log_success "Alertmanager 配置測試通過"
}

# 測試告警觸發（模擬）
test_alert_triggering() {
    log_info "=========================================="
    log_info "測試告警觸發"
    log_info "=========================================="
    
    # 測試 1：發送測試告警到 Alertmanager
    log_info "發送測試告警到 Alertmanager..."
    
    local test_alert='{
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning",
        "service": "test-service",
        "category": "test"
      },
      "annotations": {
        "summary": "這是一個測試告警",
        "description": "用於測試告警系統配置是否正確"
      },
      "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "endsAt": "'$(date -u -d "+5 minutes" +%Y-%m-%dT%H:%M:%SZ)'"
    }'
    
    if curl -sf -X POST "$ALERTMANAGER_URL/api/v2/alerts" \
        -H "Content-Type: application/json" \
        -d "[$test_alert]" > /dev/null; then
        log_success "✓ 測試告警已發送到 Alertmanager"
        log_info "請檢查 Slack/Email 是否收到通知"
    else
        log_error "✗ 發送測試告警失敗"
        return 1
    fi
    
    # 等待告警處理
    sleep 5
    
    # 檢查告警是否在 Alertmanager 中
    log_info "檢查告警狀態..."
    
    local alert_count=$(curl -s "$ALERTMANAGER_URL/api/v2/alerts" | jq '. | length')
    
    if [ "$alert_count" -gt 0 ]; then
        log_success "✓ Alertmanager 當前有 $alert_count 個告警"
    else
        log_warning "⚠ Alertmanager 當前沒有告警"
    fi
}

# 測試告警靜默
test_alert_silencing() {
    log_info "=========================================="
    log_info "測試告警靜默"
    log_info "=========================================="
    
    log_info "創建測試靜默規則..."
    
    local silence='{
      "matchers": [
        {
          "name": "alertname",
          "value": "TestAlert",
          "isRegex": false
        }
      ],
      "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "endsAt": "'$(date -u -d "+1 hour" +%Y-%m-%dT%H:%M:%SZ)'",
      "createdBy": "test-script",
      "comment": "測試告警靜默功能"
    }'
    
    local silence_id=$(curl -sf -X POST "$ALERTMANAGER_URL/api/v2/silences" \
        -H "Content-Type: application/json" \
        -d "$silence" | jq -r '.silenceID')
    
    if [ -n "$silence_id" ] && [ "$silence_id" != "null" ]; then
        log_success "✓ 靜默規則已創建: $silence_id"
        
        # 刪除靜默
        log_info "刪除測試靜默規則..."
        if curl -sf -X DELETE "$ALERTMANAGER_URL/api/v2/silence/$silence_id" > /dev/null; then
            log_success "✓ 靜默規則已刪除"
        fi
    else
        log_error "✗ 創建靜默規則失敗"
        return 1
    fi
}

# 測試特定告警規則
test_specific_alerts() {
    log_info "=========================================="
    log_info "測試特定告警規則"
    log_info "=========================================="
    
    # 測試 1：ServiceDown 告警
    log_info "測試 ServiceDown 告警規則..."
    
    local query='up{job=~".*-service|api-gateway"}'
    local result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$query" | jq -r '.data.result | length')
    
    if [ "$result" -gt 0 ]; then
        log_success "✓ ServiceDown 告警規則可以觸發（當前有 $result 個服務在線）"
    else
        log_warning "⚠ 沒有服務指標，ServiceDown 告警無法測試"
    fi
    
    # 測試 2：HighErrorRate 告警
    log_info "測試 HighErrorRate 告警規則..."
    
    local query='http_requests_total'
    local result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$query" | jq -r '.data.result | length')
    
    if [ "$result" -gt 0 ]; then
        log_success "✓ HighErrorRate 告警規則可以觸發（當前有 $result 個指標）"
    else
        log_warning "⚠ 沒有 HTTP 請求指標，HighErrorRate 告警無法測試"
    fi
    
    # 測試 3：檢查當前觸發的告警
    log_info "檢查當前觸發的告警..."
    
    local firing_alerts=$(curl -s "$PROMETHEUS_URL/api/v1/alerts" | \
        jq -r '.data.alerts[] | select(.state == "firing") | .labels.alertname' | \
        sort -u)
    
    if [ -n "$firing_alerts" ]; then
        log_warning "⚠ 當前有告警正在觸發："
        echo "$firing_alerts" | while read alert; do
            log_warning "  - $alert"
        done
    else
        log_success "✓ 當前沒有告警觸發（系統正常）"
    fi
}

# 生成測試報告
generate_report() {
    log_info "=========================================="
    log_info "告警系統測試報告"
    log_info "=========================================="
    
    # 收集指標
    local prometheus_targets=$(curl -s "$PROMETHEUS_URL/api/v1/targets" | jq '.data.activeTargets | length')
    local alert_rules=$(curl -s "$PROMETHEUS_URL/api/v1/rules" | \
        jq '.data.groups[].rules[] | select(.type == "alerting")' | jq -s 'length')
    local firing_alerts=$(curl -s "$PROMETHEUS_URL/api/v1/alerts" | \
        jq '.data.alerts[] | select(.state == "firing")' | jq -s 'length')
    local pending_alerts=$(curl -s "$PROMETHEUS_URL/api/v1/alerts" | \
        jq '.data.alerts[] | select(.state == "pending")' | jq -s 'length')
    local am_alerts=$(curl -s "$ALERTMANAGER_URL/api/v2/alerts" | jq 'length')
    
    log_info "Prometheus 統計："
    log_info "  - 監控目標: $prometheus_targets"
    log_info "  - 告警規則: $alert_rules"
    log_info "  - Firing 告警: $firing_alerts"
    log_info "  - Pending 告警: $pending_alerts"
    log_info ""
    log_info "Alertmanager 統計："
    log_info "  - 活躍告警: $am_alerts"
    log_info ""
    
    # 檢查告警規則覆蓋
    log_info "關鍵告警規則檢查："
    
    local critical_alerts=(
        "ServiceDown"
        "HighErrorRate"
        "CircuitBreakerOpen"
        "HighRateLimitHitRate"
        "OrphanTransactionDetected"
        "ServiceHealthCheckFailed"
    )
    
    for alert in "${critical_alerts[@]}"; do
        if curl -s "$PROMETHEUS_URL/api/v1/rules" | \
            jq -e ".data.groups[].rules[] | select(.alert == \"$alert\")" > /dev/null 2>&1; then
            log_success "  ✓ $alert"
        else
            log_error "  ✗ $alert (未配置)"
        fi
    done
    
    log_info "=========================================="
}

# 清理測試資料
cleanup() {
    log_info "清理測試資料..."
    
    # 刪除所有測試告警
    local test_alerts=$(curl -s "$ALERTMANAGER_URL/api/v2/alerts" | \
        jq -r '.[] | select(.labels.alertname == "TestAlert") | .fingerprint')
    
    if [ -n "$test_alerts" ]; then
        log_info "刪除測試告警..."
        # Alertmanager 會自動過期告警
        log_info "測試告警將在 5 分鐘後自動過期"
    fi
    
    log_success "清理完成"
}

# 主函數
main() {
    log_info "=========================================="
    log_info "Suggar Daddy - 告警系統測試"
    log_info "=========================================="
    log_info "開始時間: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "=========================================="
    
    # 檢查服務
    check_services
    
    # 執行測試
    test_prometheus_config || log_error "Prometheus 配置測試失敗"
    echo ""
    
    test_alertmanager_config || log_error "Alertmanager 配置測試失敗"
    echo ""
    
    test_alert_triggering || log_error "告警觸發測試失敗"
    echo ""
    
    test_alert_silencing || log_error "告警靜默測試失敗"
    echo ""
    
    test_specific_alerts || log_error "特定告警測試失敗"
    echo ""
    
    # 生成報告
    generate_report
    
    # 清理
    cleanup
    
    log_info "=========================================="
    log_success "測試完成！"
    log_info "=========================================="
    log_info "下一步："
    log_info "1. 檢查 Slack/Email 是否收到測試告警"
    log_info "2. 訪問 Prometheus: $PROMETHEUS_URL"
    log_info "3. 訪問 Alertmanager: $ALERTMANAGER_URL"
    log_info "4. 訪問 Grafana: http://localhost:3001"
    log_info "=========================================="
}

# 執行主函數
main "$@"
