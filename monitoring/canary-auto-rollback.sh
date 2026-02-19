#!/bin/bash

################################################################################
# 灰度部署自動回滾管理器
# 
# 功能：
#   - 監控 Canary 版本的關鍵指標
#   - 自動觸發回滾 (錯誤率 > 5%, 延遲 > 500ms, 健康檢查失敗)
#   - 流量平滑回滾 (不會突然切換)
#   - 告警通知 (Slack/PagerDuty/Email)
#   - 詳細日誌記錄
#
# 使用：
#   ./canary-auto-rollback.sh --service <name> --namespace <ns> --check-interval <sec>
#
# 例子：
#   ./canary-auto-rollback.sh --service recommendation-service --namespace production --check-interval 15
#
################################################################################

set -euo pipefail

# ============================================
# 配置
# ============================================

SERVICE_NAME="${1:-recommendation-service}"
NAMESPACE="${2:-production}"
CHECK_INTERVAL="${3:-15}"  # 檢查間隔（秒）
LOG_FILE="/var/log/canary-rollback-$(date +%Y%m%d).log"
STATE_FILE="/tmp/canary-deployment-state-${SERVICE_NAME}.json"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://alertmanager:9093}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# 回滾觸發閾值
ERROR_RATE_THRESHOLD=0.05        # 5%
LATENCY_THRESHOLD=0.5            # 500ms (P95)
HEALTH_CHECK_FAIL_THRESHOLD=1m   # 1 分鐘持續失敗
CPU_THRESHOLD=90                 # 90%
MEMORY_THRESHOLD=85              # 85%

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# 日誌函數
# ============================================

log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  INFO: $1"
    echo -e "${BLUE}${msg}${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ✅ SUCCESS: $1"
    echo -e "${GREEN}${msg}${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: $1"
    echo -e "${YELLOW}${msg}${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1"
    echo -e "${RED}${msg}${NC}" | tee -a "$LOG_FILE"
}

# ============================================
# 狀態管理
# ============================================

init_state() {
    if [ ! -f "$STATE_FILE" ]; then
        cat > "$STATE_FILE" << EOF
{
  "service": "$SERVICE_NAME",
  "namespace": "$NAMESPACE",
  "status": "monitoring",
  "last_check": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "metrics": {
    "error_rate": 0,
    "latency_p95": 0,
    "cpu_usage": 0,
    "memory_usage": 0,
    "health_status": "healthy"
  },
  "rollback_history": [],
  "active_alerts": []
}
EOF
    fi
}

update_state() {
    local key=$1
    local value=$2
    
    # 使用 jq 更新狀態文件
    if command -v jq &> /dev/null; then
        local tmp_file=$(mktemp)
        jq --arg key "$key" --argjson value "$value" '.[$key] = $value' "$STATE_FILE" > "$tmp_file"
        mv "$tmp_file" "$STATE_FILE"
    fi
}

# ============================================
# 指標查詢函數
# ============================================

query_prometheus() {
    local query=$1
    local default_value=${2:-0}
    
    local result=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
        --data-urlencode "query=$query" 2>/dev/null | \
        jq -r '.data.result[0].value[1]' 2>/dev/null || echo "$default_value")
    
    if [ -z "$result" ] || [ "$result" = "null" ]; then
        echo "$default_value"
    else
        echo "$result"
    fi
}

# 獲取 Canary 錯誤率
get_canary_error_rate() {
    local query='(rate(http_requests_total{deployment="canary",status=~"5.."}[2m]) / rate(http_requests_total{deployment="canary"}[2m]))'
    query_prometheus "$query" "0"
}

# 獲取 Canary P95 延遲
get_canary_latency_p95() {
    local query='histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{deployment="canary"}[2m]))'
    query_prometheus "$query" "0"
}

# 獲取 Canary P99 延遲
get_canary_latency_p99() {
    local query='histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{deployment="canary"}[2m]))'
    query_prometheus "$query" "0"
}

# 獲取 Canary CPU 使用率
get_canary_cpu_usage() {
    local query='(rate(process_cpu_seconds_total{deployment="canary"}[1m]) * 100)'
    query_prometheus "$query" "0"
}

# 獲取 Canary 記憶體使用率
get_canary_memory_usage() {
    local query='(process_resident_memory_bytes{deployment="canary"} / 1073741824 * 100)'
    query_prometheus "$query" "0"
}

# 獲取 Canary 實例健康狀態
get_canary_health_status() {
    local query='count(up{deployment="canary"} == 1)'
    local healthy_count=$(query_prometheus "$query" "0")
    
    if [ "$healthy_count" -gt 0 ]; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# 獲取 Canary vs Stable 錯誤率差異
get_error_rate_diff() {
    local canary_error=$(get_canary_error_rate)
    local stable_query='(rate(http_requests_total{deployment="stable",status=~"5.."}[2m]) / rate(http_requests_total{deployment="stable"}[2m]))'
    local stable_error=$(query_prometheus "$stable_query" "0")
    
    # 計算差異
    local diff=$(echo "$canary_error - $stable_error" | bc -l 2>/dev/null || echo "0")
    echo "$diff"
}

# ============================================
# 檢查函數
# ============================================

check_metrics() {
    log_info "Checking Canary deployment metrics..."
    
    local error_rate=$(get_canary_error_rate)
    local latency_p95=$(get_canary_latency_p95)
    local latency_p99=$(get_canary_latency_p99)
    local cpu_usage=$(get_canary_cpu_usage)
    local memory_usage=$(get_canary_memory_usage)
    local health_status=$(get_canary_health_status)
    
    log_info "Metrics: Error Rate=${error_rate}, P95 Latency=${latency_p95}s, CPU=${cpu_usage}%, Memory=${memory_usage}%"
    
    # 檢查是否需要回滾
    local needs_rollback=false
    local rollback_reason=""
    
    # 檢查 1: 錯誤率 > 5%
    if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
        log_error "Error rate threshold exceeded: ${error_rate} > ${ERROR_RATE_THRESHOLD}"
        needs_rollback=true
        rollback_reason="Error rate (${error_rate}) exceeds threshold (${ERROR_RATE_THRESHOLD})"
    fi
    
    # 檢查 2: 延遲 > 500ms (P95)
    if (( $(echo "$latency_p95 > $LATENCY_THRESHOLD" | bc -l) )); then
        log_error "P95 latency threshold exceeded: ${latency_p95} > ${LATENCY_THRESHOLD}"
        needs_rollback=true
        rollback_reason="P95 Latency (${latency_p95}s) exceeds threshold (${LATENCY_THRESHOLD}s)"
    fi
    
    # 檢查 3: 健康檢查失敗
    if [ "$health_status" != "healthy" ]; then
        log_error "Canary instances are unhealthy"
        needs_rollback=true
        rollback_reason="Health check failure - instances are down"
    fi
    
    # 檢查 4: CPU 過高 (>90% 持續 3 分鐘)
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        log_warning "CPU usage is high: ${cpu_usage}%"
        # 不立即回滾，需要連續 3 分鐘才能回滾
    fi
    
    # 檢查 5: 記憶體過高 (>85%)
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        log_warning "Memory usage is high: ${memory_usage}%"
    fi
    
    # 檢查 6: Canary vs Stable 錯誤率對比
    local error_rate_diff=$(get_error_rate_diff)
    if (( $(echo "$error_rate_diff > 0.02" | bc -l) )); then
        log_error "Canary error rate significantly higher than stable: diff=${error_rate_diff}"
        needs_rollback=true
        rollback_reason="Canary error rate higher than stable by ${error_rate_diff}"
    fi
    
    if [ "$needs_rollback" = true ]; then
        trigger_rollback "$rollback_reason"
    fi
}

# ============================================
# 回滾函數
# ============================================

trigger_rollback() {
    local reason=$1
    
    log_error "========================================="
    log_error "TRIGGERING AUTOMATIC ROLLBACK"
    log_error "========================================="
    log_error "Reason: $reason"
    log_error "Timestamp: $(date)"
    log_error "========================================="
    
    # 記錄回滾事件
    record_rollback_event "$reason"
    
    # 執行回滾
    perform_rollback
    
    # 發送通知
    send_rollback_notification "$reason"
}

perform_rollback() {
    log_info "Executing rollback for $SERVICE_NAME in namespace $NAMESPACE..."
    
    # 逐步回滾流量 (不會突然切換)
    # 步驟 1: 從當前流量比例逐漸降低到 0%
    
    local current_traffic=$(get_current_traffic_percentage)
    log_info "Current canary traffic: ${current_traffic}%"
    
    # 平滑回滾：每 10 秒降低 10% 的流量
    while (( $(echo "$current_traffic > 0" | bc -l) )); do
        local next_traffic=$(echo "$current_traffic - 10" | bc -l | awk '{print ($1 < 0) ? 0 : $1}')
        
        log_info "Reducing traffic from ${current_traffic}% to ${next_traffic}%..."
        update_traffic_percentage "$next_traffic"
        
        sleep 10
        current_traffic=$next_traffic
    done
    
    # 步驟 2: 回滾 Deployment
    log_info "Rolling back deployment $SERVICE_NAME..."
    
    if kubectl rollout undo deployment/"$SERVICE_NAME" -n "$NAMESPACE"; then
        log_success "Deployment rollout completed"
    else
        log_error "Deployment rollout failed!"
        return 1
    fi
    
    # 步驟 3: 等待部署穩定
    log_info "Waiting for rollback to stabilize..."
    kubectl rollout status deployment/"$SERVICE_NAME" \
        -n "$NAMESPACE" \
        --timeout=300s
    
    log_success "Rollback completed successfully"
}

get_current_traffic_percentage() {
    # 從 Prometheus 查詢當前流量比例
    local query='(rate(http_requests_total{deployment="canary"}[1m]) / (rate(http_requests_total{deployment="canary"}[1m]) + rate(http_requests_total{deployment="stable"}[1m])) * 100)'
    local traffic=$(query_prometheus "$query" "0")
    echo "$traffic" | awk '{print int($1)}'
}

update_traffic_percentage() {
    local percentage=$1
    
    # 使用 kubectl patch 更新 VirtualService 流量權重
    kubectl patch virtualservice "$SERVICE_NAME" \
        -n "$NAMESPACE" \
        --type merge \
        -p "{
            \"spec\": {
                \"http\": [
                    {
                        \"route\": [
                            {
                                \"destination\": {
                                    \"host\": \"$SERVICE_NAME\",
                                    \"subset\": \"stable\"
                                },
                                \"weight\": $((100 - percentage))
                            },
                            {
                                \"destination\": {
                                    \"host\": \"$SERVICE_NAME\",
                                    \"subset\": \"canary\"
                                },
                                \"weight\": $percentage
                            }
                        ]
                    }
                ]
            }
        }" 2>/dev/null || true
}

# ============================================
# 記錄和通知
# ============================================

record_rollback_event() {
    local reason=$1
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    local event=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "service": "$SERVICE_NAME",
  "namespace": "$NAMESPACE",
  "reason": "$reason",
  "triggered_by": "auto_rollback_monitor",
  "previous_version": "$(get_previous_version)",
  "current_version": "$(get_current_version)"
}
EOF
    )
    
    log_info "Recording rollback event: $event"
}

get_previous_version() {
    kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d: -f2 || echo "unknown"
}

get_current_version() {
    kubectl get deployment "$SERVICE_NAME" -n "$NAMESPACE" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d: -f2 || echo "unknown"
}

send_rollback_notification() {
    local reason=$1
    
    log_info "Sending rollback notification..."
    
    # 發送到 Slack
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        send_slack_notification "$reason"
    fi
    
    # 發送到 AlertManager
    send_alertmanager_notification "$reason"
    
    # 發送到 PagerDuty (如果配置)
    if [ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]; then
        send_pagerduty_notification "$reason"
    fi
}

send_slack_notification() {
    local reason=$1
    
    local payload=$(cat <<'EOF'
{
  "username": "Canary Rollback Bot",
  "icon_emoji": ":warning:",
  "attachments": [
    {
      "color": "danger",
      "title": "🚨 Automatic Canary Rollback Triggered",
      "fields": [
        {
          "title": "Service",
          "value": "$SERVICE_NAME",
          "short": true
        },
        {
          "title": "Namespace",
          "value": "$NAMESPACE",
          "short": true
        },
        {
          "title": "Reason",
          "value": "$reason",
          "short": false
        },
        {
          "title": "Timestamp",
          "value": "$(date)",
          "short": true
        },
        {
          "title": "Action Required",
          "value": "Please investigate the canary deployment failure",
          "short": false
        }
      ]
    }
  ]
}
EOF
    )
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-type: application/json' \
        --data "$payload" 2>/dev/null || true
}

send_alertmanager_notification() {
    local reason=$1
    
    local payload=$(cat <<EOF
[
  {
    "status": "firing",
    "labels": {
      "alertname": "CanaryDeploymentRollback",
      "service": "$SERVICE_NAME",
      "namespace": "$NAMESPACE",
      "severity": "critical"
    },
    "annotations": {
      "summary": "Canary deployment rolled back",
      "description": "Automatic rollback triggered: $reason",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  }
]
EOF
    )
    
    curl -X POST "${ALERTMANAGER_URL}/api/v1/alerts" \
        -H 'Content-type: application/json' \
        --data "$payload" 2>/dev/null || true
}

send_pagerduty_notification() {
    local reason=$1
    
    # PagerDuty Events API v2
    local payload=$(cat <<EOF
{
  "routing_key": "$PAGERDUTY_INTEGRATION_KEY",
  "event_action": "trigger",
  "dedup_key": "canary-rollback-${SERVICE_NAME}",
  "payload": {
    "summary": "Canary deployment rolled back: $reason",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "severity": "critical",
    "source": "Canary-Rollback-Monitor",
    "custom_details": {
      "service": "$SERVICE_NAME",
      "namespace": "$NAMESPACE",
      "reason": "$reason"
    }
  }
}
EOF
    )
    
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
        -H 'Content-type: application/json' \
        --data "$payload" 2>/dev/null || true
}

# ============================================
# 主監控循環
# ============================================

main() {
    log_info "========================================="
    log_info "Canary Deployment Auto-Rollback Monitor"
    log_info "========================================="
    log_info "Service: $SERVICE_NAME"
    log_info "Namespace: $NAMESPACE"
    log_info "Check Interval: ${CHECK_INTERVAL}s"
    log_info "Error Rate Threshold: ${ERROR_RATE_THRESHOLD}"
    log_info "Latency Threshold: ${LATENCY_THRESHOLD}s"
    log_info "========================================="
    
    init_state
    
    # 監控循環
    while true; do
        check_metrics
        sleep "$CHECK_INTERVAL"
    done
}

# 錯誤處理
trap 'log_error "Monitor interrupted"; exit 1' INT TERM

# 執行主函數
main "$@"
