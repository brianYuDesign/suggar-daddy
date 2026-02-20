#!/bin/bash
# QA-004: Chaos Engineering & Fault Injection for Testing
# 故障注入和混沌工程測試工具

set -e

NAMESPACE="production"
SERVICE="recommendation-service"
PROMETHEUS_URL="http://prometheus:9090"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $@"
}

echo_success() {
    echo -e "${GREEN}[✓]${NC} $@"
}

echo_error() {
    echo -e "${RED}[✗]${NC} $@"
}

echo_warn() {
    echo -e "${YELLOW}[!]${NC} $@"
}

# ============================================================================
# 延遲注入 (Latency Injection)
# ============================================================================

inject_latency() {
    local latency_ms=${1:-500}
    echo_info "注入 ${latency_ms}ms 延遲..."
    
    # 方式 1: 使用 tc (traffic control) - Linux 內核級別
    if command -v tc &> /dev/null; then
        # 獲取 Pod 的網絡接口 (需要 nsenter)
        kubectl get pods -n $NAMESPACE -l app=$SERVICE -o name | head -1 | while read pod; do
            pod_name=$(echo $pod | cut -d'/' -f2)
            echo_info "為 Pod $pod_name 添加 ${latency_ms}ms 延遲"
            
            # 在 Pod 內執行 tc 命令
            kubectl exec -it -n $NAMESPACE $pod_name -- \
                tc qdisc add dev eth0 root netem delay "${latency_ms}ms" 2>/dev/null || true
        done
    fi
    
    # 方式 2: 使用 Istio VirtualService (更優雅)
    kubectl patch virtualservice $SERVICE \
        -n $NAMESPACE \
        --type merge \
        -p "{\"spec\":{\"http\":[{\"fault\":{\"delay\":{\"percentage\":100,\"fixedDelay\":\"${latency_ms}ms\"}},\"route\":[{\"destination\":{\"host\":\"$SERVICE\"}}]}]}}" \
        2>/dev/null || echo_warn "VirtualService 補丁失敗（可能未使用 Istio）"
    
    echo_success "延遲注入完成"
}

clear_latency() {
    echo_info "清除延遲注入..."
    
    # 清除 tc 設置
    kubectl get pods -n $NAMESPACE -l app=$SERVICE -o name | while read pod; do
        pod_name=$(echo $pod | cut -d'/' -f2)
        kubectl exec -it -n $NAMESPACE $pod_name -- \
            tc qdisc del dev eth0 root 2>/dev/null || true
    done
    
    # 清除 Istio VirtualService
    kubectl patch virtualservice $SERVICE \
        -n $NAMESPACE \
        --type merge \
        -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$SERVICE'"}}]}]}}' \
        2>/dev/null || true
    
    echo_success "延遲注入已清除"
}

# ============================================================================
# 錯誤注入 (Error Injection)
# ============================================================================

inject_errors() {
    local error_percent=${1:-50}
    echo_info "注入 ${error_percent}% 的 HTTP 500 錯誤..."
    
    # 使用 Istio 的故障注入
    kubectl patch virtualservice $SERVICE \
        -n $NAMESPACE \
        --type merge \
        -p "{\"spec\":{\"http\":[{\"fault\":{\"abort\":{\"percentage\":${error_percent},\"grpc\":\"UNAVAILABLE\"}},\"route\":[{\"destination\":{\"host\":\"$SERVICE\"}}]}]}}" \
        2>/dev/null || echo_warn "錯誤注入失敗（Istio 可能未安裝）"
    
    echo_success "錯誤注入完成（$error_percent%）"
}

clear_errors() {
    echo_info "清除錯誤注入..."
    
    kubectl patch virtualservice $SERVICE \
        -n $NAMESPACE \
        --type merge \
        -p '{"spec":{"http":[{"route":[{"destination":{"host":"'$SERVICE'"}}]}]}}' \
        2>/dev/null || true
    
    echo_success "錯誤注入已清除"
}

# ============================================================================
# 流量分割 (Traffic Splitting)
# ============================================================================

split_traffic() {
    local stable_percent=$1
    local canary_percent=$((100 - stable_percent))
    
    echo_info "設置流量分割: 穩定版本 ${stable_percent}% / 灰度版本 ${canary_percent}%"
    
    # 使用 Istio DestinationRule 和 VirtualService
    cat << EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: $SERVICE
  namespace: $NAMESPACE
spec:
  host: $SERVICE
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http1MaxPendingRequests: 1000
        http2MaxRequests: 1000
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: $SERVICE
  namespace: $NAMESPACE
spec:
  hosts:
  - $SERVICE
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: $SERVICE
        subset: stable
      weight: $stable_percent
    - destination:
        host: $SERVICE
        subset: canary
      weight: $canary_percent
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
EOF
    
    echo_success "流量分割已設置"
}

# ============================================================================
# Pod 故障注入
# ============================================================================

simulate_pod_crash() {
    echo_info "模擬 Pod 崩潰..."
    
    # 獲取第一個 Pod
    local pod=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE -o name | head -1 | cut -d'/' -f2)
    
    if [ -z "$pod" ]; then
        echo_error "未找到目標 Pod"
        return 1
    fi
    
    echo_info "終止 Pod: $pod"
    kubectl delete pod $pod -n $NAMESPACE
    
    echo_success "Pod 已終止，kubelet 將自動重啟"
}

simulate_pod_startup_failure() {
    echo_info "模擬 Pod 啟動失敗..."
    
    # 臨時修改 readiness probe，使其總是失敗
    kubectl patch deployment $SERVICE -n $NAMESPACE --type='json' -p='[
        {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe", "value": {
            "exec": {"command": ["sh", "-c", "exit 1"]},
            "initialDelaySeconds": 5,
            "periodSeconds": 5
        }}
    ]'
    
    # 等待 Pod 無法就緒
    sleep 30
    
    echo_success "Pod 啟動失敗已模擬"
}

clear_pod_startup_failure() {
    echo_info "恢復 Pod 啟動..."
    
    # 恢復原始 readiness probe
    kubectl patch deployment $SERVICE -n $NAMESPACE --type='json' -p='[
        {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe", "value": {
            "httpGet": {"path": "/ready", "port": 3000},
            "initialDelaySeconds": 10,
            "periodSeconds": 5,
            "timeoutSeconds": 3,
            "failureThreshold": 3
        }}
    ]'
    
    echo_success "Pod 啟動已恢復"
}

simulate_oom() {
    echo_info "模擬 Out of Memory (OOM) 狀況..."
    
    # 設置超低的內存限制
    kubectl set resources deployment/$SERVICE \
        -n $NAMESPACE \
        --limits memory=128Mi \
        2>/dev/null || true
    
    echo_success "內存限制已設置為 128Mi（將觸發 OOM）"
}

clear_oom() {
    echo_info "恢復正常的內存限制..."
    
    # 恢復正常內存限制
    kubectl set resources deployment/$SERVICE \
        -n $NAMESPACE \
        --limits memory=1Gi \
        2>/dev/null || true
    
    echo_success "內存限制已恢復為 1Gi"
}

# ============================================================================
# 數據庫故障
# ============================================================================

simulate_db_connection_error() {
    echo_info "模擬數據庫連接錯誤..."
    
    # 設置錯誤的數據庫 HOST
    kubectl set env deployment/$SERVICE \
        -n $NAMESPACE \
        DATABASE_HOST=invalid-db-host.invalid \
        --overwrite
    
    # 重新部署以應用更改
    kubectl rollout restart deployment/$SERVICE -n $NAMESPACE
    
    echo_success "數據庫連接已配置為失敗"
}

clear_db_connection_error() {
    echo_info "修復數據庫連接..."
    
    # 設置正確的數據庫 HOST
    kubectl set env deployment/$SERVICE \
        -n $NAMESPACE \
        DATABASE_HOST=postgres.production.internal \
        --overwrite
    
    # 重新部署
    kubectl rollout restart deployment/$SERVICE -n $NAMESPACE
    
    echo_success "數據庫連接已修復"
}

# ============================================================================
# 監控和驗證
# ============================================================================

check_metrics() {
    echo_info "檢查關鍵指標..."
    
    # 檢查錯誤率
    local error_rate=$(curl -s "${PROMETHEUS_URL}/api/query" \
        --data-urlencode "query=rate(http_requests_total{status=~\"5..\",namespace=\"$NAMESPACE\"}[5m])" | \
        jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    
    # 檢查 P99 延遲
    local latency=$(curl -s "${PROMETHEUS_URL}/api/query" \
        --data-urlencode "query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{namespace=\"$NAMESPACE\"}[5m]))" | \
        jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    
    # 檢查 Pod 就緒率
    local ready_pods=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE \
        -o jsonpath='{.items[?(@.status.conditions[?(@.type=="Ready")].status=="True")].metadata.name}' | wc -w)
    
    local total_pods=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE \
        -o jsonpath='{.items[*].metadata.name}' | wc -w)
    
    local ready_ratio=$(echo "scale=2; $ready_pods / $total_pods * 100" | bc 2>/dev/null || echo "0")
    
    echo "═══════════════════════════════════════"
    echo "錯誤率 (5m):        ${error_rate} (目標: < 0.01)"
    echo "P99 延遲 (5m):      ${latency} ms (目標: < 500ms)"
    echo "Pod 就緒率:         ${ready_ratio}% ($ready_pods/$total_pods)"
    echo "═══════════════════════════════════════"
    
    # 返回是否健康
    if (( $(echo "$error_rate < 0.05" | bc -l) )) && \
       (( $(echo "$latency < 2000" | bc -l) )) && \
       (( $(echo "$ready_ratio >= 50" | bc -l) )); then
        echo_success "所有指標正常"
        return 0
    else
        echo_warn "檢測到異常指標"
        return 1
    fi
}

watch_metrics() {
    local duration=${1:-300}  # 默認 5 分鐘
    local interval=${2:-30}   # 默認 30 秒
    
    echo_info "監控指標 ($((duration/60)) 分鐘，每 $interval 秒更新一次)..."
    
    local end_time=$(($(date +%s) + duration))
    
    while [ $(date +%s) -lt $end_time ]; do
        clear
        echo "═══════════════════════════════════════"
        echo "QA-004 實時監控 - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "═══════════════════════════════════════"
        
        check_metrics
        
        echo ""
        echo "下次更新: $interval 秒後 (或按 Ctrl+C 停止)"
        sleep "$interval"
    done
}

# ============================================================================
# 負載測試
# ============================================================================

generate_load() {
    local qps=${1:-100}
    local duration=${2:-60}
    
    echo_info "生成負載測試 (QPS: $qps, 時長: $duration 秒)..."
    
    # 使用 Apache Bench 或 wrk 進行負載測試
    if command -v ab &> /dev/null; then
        ab -n $((qps * duration)) -c $qps "http://api.sugar-daddy.com/health" 2>/dev/null || true
    elif command -v wrk &> /dev/null; then
        timeout "$duration" wrk -c $qps -t 4 "http://api.sugar-daddy.com/health" 2>/dev/null || true
    else
        # 使用 curl 簡單循環
        echo_warn "未找到 ab 或 wrk，使用簡單 curl 循環"
        for i in $(seq 1 $((qps * duration))); do
            curl -s "http://api.sugar-daddy.com/health" > /dev/null &
            if [ $((i % qps)) -eq 0 ]; then
                echo_info "已發送 $i 個請求"
            fi
        done
        wait
    fi
    
    echo_success "負載測試完成"
}

# ============================================================================
# 測試場景執行
# ============================================================================

scenario_high_latency() {
    echo_info "執行場景: 高延遲告警測試"
    
    # 注入延遲
    inject_latency 600
    
    # 生成負載
    generate_load 100 60 &
    local load_pid=$!
    
    # 監控 2 分鐘
    watch_metrics 120 30 &
    local monitor_pid=$!
    
    # 等待完成
    wait $load_pid $monitor_pid 2>/dev/null || true
    
    # 清除延遲
    clear_latency
    
    # 驗證恢復
    check_metrics
    
    echo_success "高延遲場景測試完成"
}

scenario_high_error_rate() {
    echo_info "執行場景: 高錯誤率告警測試"
    
    # 注入 10% 錯誤
    inject_errors 10
    
    # 生成負載
    generate_load 100 60 &
    local load_pid=$!
    
    # 監控 2 分鐘
    watch_metrics 120 30 &
    local monitor_pid=$!
    
    # 等待完成
    wait $load_pid $monitor_pid 2>/dev/null || true
    
    # 清除錯誤
    clear_errors
    
    # 驗證恢復
    check_metrics
    
    echo_success "高錯誤率場景測試完成"
}

scenario_pod_crash() {
    echo_info "執行場景: Pod 崩潰自動回滾"
    
    # 記錄當前版本
    local version=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
    echo_info "當前版本: $version"
    
    # 模擬 Pod 崩潰
    simulate_pod_crash
    
    # 監控恢復
    watch_metrics 300 30
    
    # 驗證版本未變
    local new_version=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
    if [ "$version" = "$new_version" ]; then
        echo_success "Pod 已自動恢復，版本未變"
    else
        echo_warn "版本已變更: $version → $new_version"
    fi
}

scenario_startup_failure() {
    echo_info "執行場景: Pod 啟動失敗自動回滾"
    
    # 模擬啟動失敗
    simulate_pod_startup_failure
    
    # 監控告警觸發
    watch_metrics 300 30 &
    local monitor_pid=$!
    
    # 等待回滾
    sleep 120
    
    # 清除故障
    clear_pod_startup_failure
    
    # 等待恢復
    wait $monitor_pid 2>/dev/null || true
    
    # 驗證恢復
    check_metrics
    
    echo_success "啟動失敗場景測試完成"
}

scenario_database_failure() {
    echo_info "執行場景: 數據庫故障熔斷"
    
    # 模擬數據庫連接錯誤
    simulate_db_connection_error
    
    # 監控熔斷器
    watch_metrics 300 30 &
    local monitor_pid=$!
    
    # 生成負載測試
    generate_load 50 120 &
    local load_pid=$!
    
    # 等待完成
    wait $monitor_pid $load_pid 2>/dev/null || true
    
    # 修復數據庫
    clear_db_connection_error
    
    # 驗證恢復
    check_metrics
    
    echo_success "數據庫故障場景測試完成"
}

# ============================================================================
# 命令行接口
# ============================================================================

show_help() {
    cat << 'EOF'
QA-004 故障注入和混沌工程測試工具

使用方法:
  ./qa-004-chaos-testing.sh <command> [arguments]

命令:

  延遲注入:
    inject-latency [ms]          注入指定毫秒數的延遲（默認 500ms）
    clear-latency                清除延遲注入

  錯誤注入:
    inject-errors [percent]      注入指定百分比的 HTTP 500 錯誤
    clear-errors                 清除錯誤注入

  流量分割:
    split-traffic <percent>      設置流量分割（穩定版本百分比）

  Pod 故障:
    simulate-crash               模擬 Pod 崩潰
    simulate-startup-failure     模擬 Pod 啟動失敗
    clear-startup-failure        清除啟動失敗模擬
    simulate-oom                 模擬 Out of Memory
    clear-oom                    清除 OOM 限制

  數據庫:
    simulate-db-error            模擬數據庫連接錯誤
    clear-db-error               清除數據庫連接錯誤

  監控:
    check-metrics                檢查關鍵指標
    watch-metrics [duration]     監控指標（默認 5 分鐘）

  負載:
    generate-load [qps] [sec]    生成負載測試

  場景:
    scenario-high-latency        執行高延遲測試場景
    scenario-high-error-rate     執行高錯誤率測試場景
    scenario-pod-crash           執行 Pod 崩潰場景
    scenario-startup-failure     執行啟動失敗場景
    scenario-database-failure    執行數據庫故障場景

  其他:
    help                         顯示此幫助信息

示例:
  ./qa-004-chaos-testing.sh inject-latency 500
  ./qa-004-chaos-testing.sh generate-load 100 60
  ./qa-004-chaos-testing.sh watch-metrics 300
  ./qa-004-chaos-testing.sh scenario-high-latency

EOF
}

# 主程序
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

case "$1" in
    inject-latency)
        inject_latency "${2:-500}"
        ;;
    clear-latency)
        clear_latency
        ;;
    inject-errors)
        inject_errors "${2:-10}"
        ;;
    clear-errors)
        clear_errors
        ;;
    split-traffic)
        split_traffic "$2"
        ;;
    simulate-crash)
        simulate_pod_crash
        ;;
    simulate-startup-failure)
        simulate_pod_startup_failure
        ;;
    clear-startup-failure)
        clear_pod_startup_failure
        ;;
    simulate-oom)
        simulate_oom
        ;;
    clear-oom)
        clear_oom
        ;;
    simulate-db-error)
        simulate_db_connection_error
        ;;
    clear-db-error)
        clear_db_connection_error
        ;;
    check-metrics)
        check_metrics
        ;;
    watch-metrics)
        watch_metrics "${2:-300}" "${3:-30}"
        ;;
    generate-load)
        generate_load "${2:-100}" "${3:-60}"
        ;;
    scenario-high-latency)
        scenario_high_latency
        ;;
    scenario-high-error-rate)
        scenario_high_error_rate
        ;;
    scenario-pod-crash)
        scenario_pod_crash
        ;;
    scenario-startup-failure)
        scenario_startup_failure
        ;;
    scenario-database-failure)
        scenario_database_failure
        ;;
    help)
        show_help
        ;;
    *)
        echo_error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
