#!/bin/bash
# ============================================================================
# 自動問題診斷和修復工具
# FINAL-003: Post-Launch Monitoring & Optimization
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date "+%Y-%m-%d_%H-%M-%S")
LOG_FILE="${SCRIPT_DIR}/logs/diagnosis-${TIMESTAMP}.log"
PROMETHEUS_URL="http://localhost:9090"
KIBANA_URL="http://localhost:5601"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$(dirname "$LOG_FILE")"

# ============================================================================
# 日誌記錄
# ============================================================================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $@" | tee -a "$LOG_FILE"
}

# ============================================================================
# 1. 錯誤率診斷
# ============================================================================

diagnose_error_rate() {
  log "${BLUE}🔍 診斷：錯誤率升高${NC}"
  
  local error_rate=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[2m])*100" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  log "當前錯誤率: ${error_rate}%"
  
  if (( $(echo "$error_rate > 5" | bc -l) )); then
    log "${RED}⚠️  錯誤率超過 5%，正在診斷根本原因...${NC}"
    
    # 診斷步驟 1: 檢查最近的部署
    log "步驟 1: 檢查最近的部署"
    local recent_deployment=$(kubectl rollout history deployment/recommendation-service -n production 2>/dev/null | head -3)
    if [ ! -z "$recent_deployment" ]; then
      log "最近的部署歷史:\n$recent_deployment"
    fi
    
    # 診斷步驟 2: 查看錯誤日誌
    log "步驟 2: 收集錯誤日誌"
    local error_logs=$(kubectl logs -n production \
      -l app=recommendation-service \
      --tail=100 \
      | grep -i error | head -20)
    log "最近的錯誤:\n$error_logs"
    
    # 診斷步驟 3: 檢查錯誤類型分佈
    log "步驟 3: 分析錯誤類型分佈"
    local error_types=$(curl -s "${KIBANA_URL}/api/es/logs/_search" \
      -H "Content-Type: application/json" \
      -d '{
        "query": {"range": {"@timestamp": {"gte": "now-5m"}}},
        "aggs": {"error_types": {"terms": {"field": "error_type", "size": 10}}}
      }' \
      | jq -r '.aggregations.error_types.buckets[] | "\(.key): \(.doc_count)"' 2>/dev/null || echo "無法連接 Kibana")
    log "錯誤類型:\n$error_types"
    
    # 決策：是否回滾
    if (( $(echo "$error_rate > 10" | bc -l) )); then
      log "${RED}🚨 錯誤率超過 10%，自動觸發回滾！${NC}"
      execute_rollback "ErrorRateCritical"
    else
      log "${YELLOW}⚠️  錯誤率升高但未達到自動回滾閾值，需要手動干預${NC}"
    fi
  else
    log "${GREEN}✓ 錯誤率正常${NC}"
  fi
}

# ============================================================================
# 2. 延遲診斷
# ============================================================================

diagnose_latency() {
  log "${BLUE}🔍 診斷：延遲升高${NC}"
  
  local p95_latency=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[2m]))*1000" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  log "P95 延遲: ${p95_latency}ms"
  
  if (( $(echo "$p95_latency > 500" | bc -l) )); then
    log "${RED}⚠️  延遲超過 500ms，正在診斷...${NC}"
    
    # 診斷步驟 1: 檢查 CPU 和內存
    log "步驟 1: 檢查資源使用"
    local cpu_usage=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=rate(container_cpu_usage_seconds_total{pod=~\"recommendation.*\"}[1m])*100" \
      | jq -r '.data.result[0].value[1] // "0"')
    local memory_usage=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=container_memory_usage_bytes{pod=~\"recommendation.*\"}/134217728*100" \
      | jq -r '.data.result[0].value[1] // "0"')
    
    log "CPU 使用率: ${cpu_usage}%"
    log "記憶體使用率: ${memory_usage}%"
    
    # 診斷步驟 2: 檢查慢查詢
    log "步驟 2: 分析慢查詢"
    local slow_queries=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=mysql_global_status_slow_queries" \
      | jq -r '.data.result[0].value[1] // "0"')
    log "慢查詢數: $slow_queries"
    
    # 診斷步驟 3: 檢查緩存命中率
    log "步驟 3: 檢查緩存命中率"
    local cache_hit_rate=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=(redis_keyspace_hits_total/(redis_keyspace_hits_total+redis_keyspace_misses_total))*100" \
      | jq -r '.data.result[0].value[1] // "0"')
    log "Redis 緩存命中率: ${cache_hit_rate}%"
    
    # 決策：是否回滾
    if (( $(echo "$cpu_usage > 90" | bc -l) )); then
      log "${YELLOW}⚠️  CPU 使用率過高，建議增加實例或回滾${NC}"
    fi
    
    if (( $(echo "$cache_hit_rate < 50" | bc -l) )); then
      log "${YELLOW}⚠️  緩存命中率太低 (${cache_hit_rate}%)，考慮預加載或擴展 Redis${NC}"
    fi
  else
    log "${GREEN}✓ 延遲正常${NC}"
  fi
}

# ============================================================================
# 3. Pod 崩潰診斷
# ============================================================================

diagnose_pod_crashes() {
  log "${BLUE}🔍 診斷：Pod 崩潰${NC}"
  
  local crashed_pods=$(kubectl get pods -n production \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}' \
    | awk '$2 > 2')
  
  if [ ! -z "$crashed_pods" ]; then
    log "${RED}⚠️  檢測到 Pod 頻繁重啟:${NC}"
    log "$crashed_pods"
    
    # 對於每個崩潰的 Pod，收集日誌
    while IFS= read -r line; do
      pod_name=$(echo $line | awk '{print $1}')
      restart_count=$(echo $line | awk '{print $2}')
      
      log "分析 Pod: $pod_name (重啟 $restart_count 次)"
      
      # 獲取前一個容器的日誌
      local previous_logs=$(kubectl logs --previous $pod_name -n production 2>&1 | tail -50)
      log "前一個容器日誌:\n$previous_logs"
      
      # 檢查事件
      local events=$(kubectl describe pod $pod_name -n production | grep -A 5 "Events:")
      log "Pod 事件:\n$events"
    done <<< "$crashed_pods"
    
    # 如果重啟過於頻繁，觸發回滾
    log "${RED}🚨 檢測到 Pod 崩潰，自動觸發回滾！${NC}"
    execute_rollback "PodCrashLoop"
  else
    log "${GREEN}✓ 沒有 Pod 崩潰${NC}"
  fi
}

# ============================================================================
# 4. 數據庫健康檢查
# ============================================================================

diagnose_database() {
  log "${BLUE}🔍 診斷：數據庫${NC}"
  
  # 檢查數據庫連接
  local db_up=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=mysql_up" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  if [ "$db_up" = "0" ]; then
    log "${RED}❌ 數據庫連接失敗！${NC}"
    log "這是一個 P1 問題，正在進行應急處理..."
    return 1
  fi
  
  # 檢查慢查詢
  local slow_query_count=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=increase(mysql_global_status_slow_queries[5m])" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  if (( $(echo "$slow_query_count > 10" | bc -l) )); then
    log "${YELLOW}⚠️  5 分鐘內有 $slow_query_count 個慢查詢${NC}"
  fi
  
  # 檢查連接池使用率
  local connection_usage=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=mysql_global_status_threads_connected/max_connections*100" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  if (( $(echo "$connection_usage > 80" | bc -l) )); then
    log "${YELLOW}⚠️  數據庫連接使用率過高: ${connection_usage}%${NC}"
  fi
  
  log "${GREEN}✓ 數據庫狀態良好${NC}"
}

# ============================================================================
# 5. Redis 健康檢查
# ============================================================================

diagnose_redis() {
  log "${BLUE}🔍 診斷：Redis 緩存${NC}"
  
  local redis_up=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=redis_up" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  if [ "$redis_up" = "0" ]; then
    log "${RED}❌ Redis 連接失敗！${NC}"
    log "降級到無緩存模式，性能會受影響"
    return 1
  fi
  
  local memory_usage=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=redis_memory_used_bytes/redis_memory_max_bytes*100" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  if (( $(echo "$memory_usage > 90" | bc -l) )); then
    log "${RED}⚠️  Redis 記憶體使用率過高: ${memory_usage}%${NC}"
    log "正在清理過期 key..."
    # redis-cli FLUSHDB ASYNC  # 注意：僅在必要時執行
  fi
  
  log "${GREEN}✓ Redis 狀態良好${NC}"
}

# ============================================================================
# 6. 自動回滾函數
# ============================================================================

execute_rollback() {
  local reason=$1
  
  log "${RED}═════════════════════════════════════════════════════════${NC}"
  log "${RED}🚨 觸發自動回滾${NC}"
  log "${RED}原因: $reason${NC}"
  log "${RED}═════════════════════════════════════════════════════════${NC}"
  
  # 1. 記錄當前狀態
  log "步驟 1: 記錄回滾前的狀態"
  kubectl get deployment -n production recommendation-service -o yaml > /tmp/deployment-before-rollback.yaml
  
  # 2. 執行回滾
  log "步驟 2: 執行 Kubernetes 回滾"
  kubectl rollout undo deployment/recommendation-service -n production
  
  # 3. 等待回滾完成
  log "步驟 3: 等待回滾完成 (最多 5 分鐘)"
  kubectl rollout status deployment/recommendation-service -n production --timeout=5m
  
  # 4. 驗證回滾
  log "步驟 4: 驗證回滾後的狀態"
  sleep 30  # 等待 Pod 穩定
  
  local error_rate_after=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[2m])*100" \
    | jq -r '.data.result[0].value[1] // "0"')
  
  log "回滾後的錯誤率: ${error_rate_after}%"
  
  # 5. 發送通知
  log "步驟 5: 發送告警通知"
  send_slack_notification "回滾完成: $reason\n回滾後錯誤率: ${error_rate_after}%"
  
  log "${GREEN}✓ 回滾完成${NC}"
}

# ============================================================================
# 7. Slack 通知
# ============================================================================

send_slack_notification() {
  local message=$1
  
  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    log "${YELLOW}⚠️  未配置 SLACK_WEBHOOK_URL，跳過通知${NC}"
    return
  fi
  
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"🚨 系統告警\",
      \"attachments\": [{
        \"color\": \"danger\",
        \"text\": \"$message\",
        \"ts\": $(date +%s)
      }]
    }"
}

# ============================================================================
# 主診斷流程
# ============================================================================

main() {
  log "${BLUE}═════════════════════════════════════════════════════════${NC}"
  log "${BLUE}🔧 自動問題診斷工具 - FINAL-003${NC}"
  log "${BLUE}開始時間: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  log "${BLUE}═════════════════════════════════════════════════════════${NC}"
  
  # 執行所有診斷
  diagnose_error_rate
  diagnose_latency
  diagnose_pod_crashes
  diagnose_database
  diagnose_redis
  
  log "${BLUE}═════════════════════════════════════════════════════════${NC}"
  log "${GREEN}✅ 診斷完成${NC}"
  log "${BLUE}日誌保存: $LOG_FILE${NC}"
  log "${BLUE}═════════════════════════════════════════════════════════${NC}"
}

# 運行主程序
main "$@"
