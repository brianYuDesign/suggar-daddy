#!/bin/bash
# QA-004: Pre-Deployment Checklist Verification
# 部署前檢查清單驗證

set -e

NAMESPACE="production"
SERVICE="recommendation-service"
REPORT_FILE="QA-004-CHECKLIST-VERIFICATION.md"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

check_pass() {
    echo -e "${GREEN}✓${NC} $@"
    ((PASS_COUNT++))
}

check_fail() {
    echo -e "${RED}✗${NC} $@"
    ((FAIL_COUNT++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $@"
    ((WARN_COUNT++))
}

section() {
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "  $@"
    echo "════════════════════════════════════════════════════════════"
}

# ============================================================================
# 環境檢查
# ============================================================================

verify_kubernetes() {
    section "1. Kubernetes 環境驗證"
    
    # 檢查 kubectl
    if command -v kubectl &> /dev/null; then
        check_pass "kubectl 已安裝"
    else
        check_fail "kubectl 未找到"
        return 1
    fi
    
    # 檢查集群連接
    if kubectl cluster-info &> /dev/null; then
        check_pass "Kubernetes 集群連接正常"
    else
        check_fail "無法連接到 Kubernetes 集群"
        return 1
    fi
    
    # 檢查版本
    local k8s_version=$(kubectl version --short 2>/dev/null | grep Server | awk '{print $NF}')
    echo "  - K8s 版本: $k8s_version"
    check_pass "K8s 版本信息已取得"
    
    # 檢查節點
    local nodes=$(kubectl get nodes --no-headers | wc -l)
    if [ $nodes -gt 0 ]; then
        check_pass "集群中有 $nodes 個節點"
    else
        check_fail "集群中無可用節點"
        return 1
    fi
    
    # 檢查命名空間
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        check_pass "命名空間 '$NAMESPACE' 存在"
    else
        check_fail "命名空間 '$NAMESPACE' 不存在"
        return 1
    fi
}

verify_storage() {
    section "2. 存儲和配置驗證"
    
    # 檢查 PVC
    if kubectl get pvc -n $NAMESPACE &> /dev/null; then
        local pvc_count=$(kubectl get pvc -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
        if [ $pvc_count -gt 0 ]; then
            check_pass "發現 $pvc_count 個 PVC 卷"
        else
            check_warn "未發現 PVC 卷（可能不需要）"
        fi
    else
        check_warn "無法讀取 PVC 信息"
    fi
    
    # 檢查 ConfigMap
    if kubectl get configmap -n $NAMESPACE &> /dev/null; then
        local cm_count=$(kubectl get configmap -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
        check_pass "發現 $cm_count 個 ConfigMap"
    else
        check_fail "無法讀取 ConfigMap 信息"
    fi
    
    # 檢查 Secrets
    if kubectl get secret -n $NAMESPACE &> /dev/null; then
        local secret_count=$(kubectl get secret -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
        if [ $secret_count -gt 0 ]; then
            check_pass "發現 $secret_count 個 Secret"
        else
            check_fail "未發現任何 Secret（部署將需要敏感信息）"
        fi
    else
        check_fail "無法讀取 Secret 信息"
    fi
}

# ============================================================================
# 依賴服務檢查
# ============================================================================

verify_dependencies() {
    section "3. 依賴服務驗證"
    
    # PostgreSQL
    if kubectl exec -it $(kubectl get pods -n $NAMESPACE -l app=postgres -o name | head -1 2>/dev/null) \
        -n $NAMESPACE -- \
        psql -h localhost -U postgres -d postgres -c "SELECT 1" &> /dev/null 2>&1; then
        check_pass "PostgreSQL 連接正常"
    else
        check_warn "無法驗證 PostgreSQL 連接（可能未部署或未啟動）"
    fi
    
    # Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            check_pass "Redis 連接正常"
        else
            check_warn "Redis 無響應"
        fi
    else
        check_warn "redis-cli 未安裝，跳過 Redis 檢查"
    fi
    
    # API Gateway
    if kubectl get service api-gateway -n $NAMESPACE &> /dev/null; then
        check_pass "API Gateway 服務已部署"
        
        # 檢查服務是否就緒
        local endpoints=$(kubectl get endpoints api-gateway -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null)
        if [ -n "$endpoints" ]; then
            check_pass "API Gateway 已就緒（有活躍端點）"
        else
            check_warn "API Gateway 無活躍端點"
        fi
    else
        check_warn "API Gateway 服務未找到"
    fi
    
    # 第三方 API 可訪問性
    if curl -s --connect-timeout 5 https://api.stripe.com/v1/charges &> /dev/null; then
        check_pass "外部 API（Stripe）可訪問"
    else
        check_warn "外部 API 不可訪問（網絡限制或服務不可用）"
    fi
}

# ============================================================================
# 監控系統檢查
# ============================================================================

verify_monitoring() {
    section "4. 監控系統驗證"
    
    # Prometheus
    if kubectl get service prometheus -n monitoring &> /dev/null 2>/dev/null; then
        check_pass "Prometheus 服務已部署"
        
        # 檢查 Prometheus 是否在線
        if curl -s http://prometheus:9090/-/healthy &> /dev/null || \
           curl -s http://localhost:9090/-/healthy &> /dev/null; then
            check_pass "Prometheus 健康檢查通過"
        else
            check_warn "無法驗證 Prometheus 健康狀態"
        fi
    else
        check_warn "Prometheus 未部署在 monitoring 命名空間"
    fi
    
    # Grafana
    if kubectl get service grafana -n monitoring &> /dev/null 2>/dev/null; then
        check_pass "Grafana 服務已部署"
    else
        check_warn "Grafana 未部署"
    fi
    
    # AlertManager
    if kubectl get service alertmanager -n monitoring &> /dev/null 2>/dev/null; then
        check_pass "AlertManager 服務已部署"
    else
        check_warn "AlertManager 未部署"
    fi
    
    # Elasticsearch
    if kubectl get service elasticsearch -n logging &> /dev/null 2>/dev/null; then
        check_pass "Elasticsearch 已部署"
    else
        check_warn "Elasticsearch 未部署"
    fi
    
    # Kibana
    if kubectl get service kibana -n logging &> /dev/null 2>/dev/null; then
        check_pass "Kibana 已部署"
    else
        check_warn "Kibana 未部署"
    fi
}

# ============================================================================
# 應用準備驗證
# ============================================================================

verify_application() {
    section "5. 應用準備驗證"
    
    # 檢查部署清單
    if kubectl get deployment $SERVICE -n $NAMESPACE &> /dev/null; then
        check_pass "部署 '$SERVICE' 已存在"
    else
        check_fail "部署 '$SERVICE' 不存在"
        return 1
    fi
    
    # 檢查當前副本數
    local replicas=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    if [ $replicas -gt 0 ]; then
        check_pass "已配置 $replicas 個副本"
    else
        check_warn "部署副本數為 0，需要擴展"
    fi
    
    # 檢查當前版本
    local current_image=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
    echo "  - 當前鏡像: $current_image"
    check_pass "當前版本已記錄"
    
    # 檢查就緒 Pod
    local ready_pods=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    local desired_pods=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.status.desiredReplicas}')
    
    if [ "$ready_pods" = "$desired_pods" ]; then
        check_pass "所有 Pod 已就緒 ($ready_pods/$desired_pods)"
    else
        check_warn "並非所有 Pod 就緒 ($ready_pods/$desired_pods)"
    fi
    
    # 檢查資源請求
    local cpu_req=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}')
    local mem_req=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.memory}')
    
    if [ -n "$cpu_req" ] && [ -n "$mem_req" ]; then
        check_pass "資源請求已配置 (CPU: $cpu_req, Memory: $mem_req)"
    else
        check_warn "資源請求未完全配置"
    fi
    
    # 檢查健康檢查探針
    local liveness=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}')
    if [ -n "$liveness" ]; then
        check_pass "Liveness 探針已配置"
    else
        check_warn "Liveness 探針未配置"
    fi
    
    local readiness=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}')
    if [ -n "$readiness" ]; then
        check_pass "Readiness 探針已配置"
    else
        check_warn "Readiness 探針未配置"
    fi
}

# ============================================================================
# 部署驗證腳本檢查
# ============================================================================

verify_scripts() {
    section "6. 部署腳本驗證"
    
    local script_dir="/Users/brianyu/.openclaw/workspace/deployment"
    
    # 檢查關鍵腳本
    local required_scripts=(
        "canary-deployment.sh"
        "auto-rollback-controller.sh"
        "pre-deployment-check.sh"
        "verify-deployment.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ -f "$script_dir/$script" ]; then
            check_pass "腳本 '$script' 存在"
        else
            check_warn "腳本 '$script' 未找到"
        fi
    done
    
    # 檢查文檔
    local required_docs=(
        "PRODUCTION-DEPLOYMENT-GUIDE.md"
        "AUTO-ROLLBACK-AND-SCALING.md"
        "BLUE-GREEN-DEPLOYMENT.md"
        "TROUBLESHOOTING-GUIDE.md"
    )
    
    for doc in "${required_docs[@]}"; do
        if [ -f "$script_dir/$doc" ]; then
            check_pass "文檔 '$doc' 存在"
        else
            check_warn "文檔 '$doc' 未找到"
        fi
    done
}

# ============================================================================
# 回滾計劃驗證
# ============================================================================

verify_rollback_plan() {
    section "7. 回滾計劃驗證"
    
    # 檢查部署歷史
    local revision_count=$(kubectl rollout history deployment/$SERVICE -n $NAMESPACE 2>/dev/null | tail -1 | awk '{print $1}' | wc -l)
    
    if [ $revision_count -gt 1 ]; then
        check_pass "部署歷史存在 (可用於回滾)"
    else
        check_warn "部署歷史較短，回滾選項有限"
    fi
    
    # 檢查 revisionHistoryLimit
    local revision_limit=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.revisionHistoryLimit}')
    if [ -n "$revision_limit" ] && [ "$revision_limit" -ge 10 ]; then
        check_pass "revisionHistoryLimit 已設置為 $revision_limit (足夠)"
    else
        check_warn "revisionHistoryLimit 設置不足 (當前: $revision_limit)"
    fi
    
    # 檢查 strategy
    local strategy=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.strategy.type}')
    if [ "$strategy" = "RollingUpdate" ]; then
        check_pass "部署策略為 RollingUpdate (支持回滾)"
    else
        check_warn "部署策略為 $strategy (回滾可能需要特殊處理)"
    fi
    
    # 檢查數據庫備份
    local backup_dir="/Users/brianyu/.openclaw/workspace/backups"
    if [ -d "$backup_dir" ] && [ "$(ls -A $backup_dir)" ]; then
        check_pass "數據庫備份目錄存在且非空"
    else
        check_warn "未發現最近的數據庫備份"
    fi
}

# ============================================================================
# 通知和文檔驗證
# ============================================================================

verify_notifications() {
    section "8. 通知和文檔驗證"
    
    # 檢查 Slack webhook
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        check_pass "Slack webhook 已配置"
    else
        check_warn "未配置 Slack webhook"
    fi
    
    # 檢查 PagerDuty 集成
    if kubectl get secret -n monitoring | grep -i pagerduty &> /dev/null; then
        check_pass "PagerDuty 集成已配置"
    else
        check_warn "未找到 PagerDuty 配置"
    fi
    
    # 檢查郵件通知
    if kubectl get secret -n monitoring | grep -i smtp &> /dev/null; then
        check_pass "郵件通知已配置"
    else
        check_warn "未找到郵件通知配置"
    fi
    
    # 檢查文檔
    local docs_dir="/Users/brianyu/.openclaw/workspace"
    
    if [ -f "$docs_dir/QA-004-CANARY-DEPLOYMENT-TESTING.md" ]; then
        check_pass "部署測試計劃文檔存在"
    else
        check_fail "部署測試計劃文檔不存在"
    fi
    
    if [ -f "$docs_dir/MEMORY.md" ]; then
        check_pass "項目文檔已更新"
    else
        check_warn "項目文檔不完整"
    fi
}

# ============================================================================
# 安全檢查
# ============================================================================

verify_security() {
    section "9. 安全檢查"
    
    # 檢查容器安全上下文
    local security_context=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.securityContext}')
    if [ -n "$security_context" ]; then
        check_pass "容器安全上下文已配置"
    else
        check_warn "容器安全上下文未配置"
    fi
    
    # 檢查鏡像拉取策略
    local image_pull_policy=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].imagePullPolicy}')
    if [ "$image_pull_policy" = "Always" ]; then
        check_pass "鏡像拉取策略為 Always (安全)"
    else
        check_warn "�鏡像拉取策略為 $image_pull_policy"
    fi
    
    # 檢查網絡策略
    if kubectl get networkpolicy -n $NAMESPACE &> /dev/null; then
        check_pass "網絡策略已配置"
    else
        check_warn "網絡策略未配置"
    fi
    
    # 檢查 Pod 安全策略
    if kubectl get psp &> /dev/null; then
        check_pass "Pod 安全策略可用"
    else
        check_warn "Pod 安全策略未啟用"
    fi
}

# ============================================================================
# 性能基準線驗證
# ============================================================================

verify_baseline() {
    section "10. 性能基準線驗證"
    
    local baseline_file="/Users/brianyu/.openclaw/workspace/PERFORMANCE-BASELINE-REPORT.md"
    
    if [ -f "$baseline_file" ]; then
        check_pass "性能基準線報告存在"
        
        # 檢查報告內容
        if grep -q "P99 Latency" "$baseline_file"; then
            check_pass "性能基準線包含延遲指標"
        else
            check_warn "性能基準線可能不完整"
        fi
    else
        check_warn "性能基準線報告不存在"
    fi
}

# ============================================================================
# 生成報告
# ============================================================================

generate_report() {
    section "生成檢查清單報告"
    
    cat > "$REPORT_FILE" << EOF
# 📋 QA-004 部署前檢查清單驗證報告

**生成時間**: $(date '+%Y-%m-%d %H:%M:%S')  
**檢查環境**: Kubernetes $NAMESPACE 命名空間  
**服務**: $SERVICE  

## 檢查統計

| 狀態 | 數量 |
|------|------|
| ✅ 通過 | $PASS_COUNT |
| ❌ 失敗 | $FAIL_COUNT |
| ⚠️  警告 | $WARN_COUNT |

**總體狀態**: 
EOF
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo "🟢 **就緒** (可以部署)" >> "$REPORT_FILE"
    elif [ $FAIL_COUNT -le 2 ]; then
        echo "🟡 **有保留意見** (可以部署，但需要監控)" >> "$REPORT_FILE"
    else
        echo "🔴 **不準備好** (需要解決失敗項)" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << 'EOF'

## 詳細檢查清單

### 1. Kubernetes 環境
- Kubernetes 集群連接
- 集群版本
- 節點狀態
- 命名空間創建

### 2. 存儲和配置
- PVC 卷掛載
- ConfigMap 配置
- Secrets 敏感信息

### 3. 依賴服務
- PostgreSQL 數據庫
- Redis 緩存
- API Gateway
- 第三方 API

### 4. 監控系統
- Prometheus 監控
- Grafana 儀表板
- AlertManager 告警
- Elasticsearch 日誌

### 5. 應用準備
- 部署清單存在
- 副本數配置
- 當前版本記錄
- Pod 就緒狀態
- 資源請求
- 健康檢查探針

### 6. 部署腳本
- 灰度部署腳本
- 自動回滾腳本
- 驗證腳本
- 相關文檔

### 7. 回滾計劃
- 部署歷史
- 版本保留限制
- 部署策略
- 數據庫備份

### 8. 通知和文檔
- Slack 通知
- PagerDuty 告警
- 郵件通知
- 部署文檔

### 9. 安全檢查
- 容器安全上下文
- 鏡像拉取策略
- 網絡策略
- Pod 安全策略

### 10. 性能基準線
- 基準線報告
- 延遲指標
- 吞吐量指標

## 建議

EOF
    
    if [ $FAIL_COUNT -gt 0 ]; then
        echo "⚠️ **必須解決的項目**:" >> "$REPORT_FILE"
        echo "- 所有標記為失敗 (❌) 的項目必須在部署前修復" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    if [ $WARN_COUNT -gt 0 ]; then
        echo "📌 **需要注意的項目**:" >> "$REPORT_FILE"
        echo "- 標記為警告 (⚠️) 的項目應在部署時特別監控" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    echo "✅ **部署就緒檢查**:" >> "$REPORT_FILE"
    echo "- 在部署前再次確認所有檢查項" >> "$REPORT_FILE"
    echo "- 確保備份已執行" >> "$REPORT_FILE"
    echo "- 通知所有相關人員" >> "$REPORT_FILE"
    echo "- 準備好應急聯絡方式" >> "$REPORT_FILE"
    
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**報告生成時間**: $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
}

# ============================================================================
# 主程序
# ============================================================================

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  QA-004 部署前檢查清單驗證                                 ║"
    echo "║  Kubernetes Deployment Pre-flight Checklist                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # 執行所有檢查
    verify_kubernetes || true
    verify_storage || true
    verify_dependencies || true
    verify_monitoring || true
    verify_application || true
    verify_scripts || true
    verify_rollback_plan || true
    verify_notifications || true
    verify_security || true
    verify_baseline || true
    
    # 生成報告
    generate_report
    
    # 輸出總結
    echo ""
    section "檢查結果總結"
    echo -e "${GREEN}✓ 通過${NC}: $PASS_COUNT"
    echo -e "${RED}✗ 失敗${NC}: $FAIL_COUNT"
    echo -e "${YELLOW}⚠ 警告${NC}: $WARN_COUNT"
    echo ""
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo -e "${GREEN}🟢 就緒 - 可以進行部署${NC}"
        echo ""
        echo "已生成檢查清單報告: $REPORT_FILE"
        return 0
    else
        echo -e "${RED}🔴 有 $FAIL_COUNT 個失敗項 - 請先解決再部署${NC}"
        echo ""
        echo "已生成檢查清單報告: $REPORT_FILE"
        return 1
    fi
}

# 執行主程序
main
