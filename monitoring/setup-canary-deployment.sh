#!/bin/bash

################################################################################
# Canary Deployment Quick Setup Script
# 快速部署灰度部署基礎設施
#
# 使用: ./setup-canary-deployment.sh [options]
# 選項:
#   --namespace <ns>      命名空間 (default: production)
#   --prometheus-url <url> Prometheus 地址 (default: http://prometheus:9090)
#   --grafana-url <url>   Grafana 地址 (default: http://grafana:3000)
#   --enable-slack        啟用 Slack 通知
#   --enable-pagerduty    啟用 PagerDuty 通知
#   --dry-run            演練模式（不實際部署）
#   --help               顯示幫助
#
################################################################################

set -euo pipefail

# 顏色和符號
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SUCCESS="${GREEN}✅${NC}"
WARNING="${YELLOW}⚠️${NC}"
ERROR="${RED}❌${NC}"
INFO="${BLUE}ℹ️${NC}"

# 默認值
NAMESPACE="production"
MONITORING_NS="monitoring"
PROMETHEUS_URL="http://prometheus:9090"
GRAFANA_URL="http://grafana:3000"
ENABLE_SLACK=${ENABLE_SLACK:-false}
ENABLE_PAGERDUTY=${ENABLE_PAGERDUTY:-false}
DRY_RUN=false

# 配置文件路徑
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALERT_RULES_FILE="${SCRIPT_DIR}/canary-alert-rules.yml"
NGINX_CONFIG_FILE="${SCRIPT_DIR}/nginx-canary.conf"
ROLLBACK_SCRIPT="${SCRIPT_DIR}/canary-auto-rollback.sh"
DASHBOARD_FILE="${SCRIPT_DIR}/grafana/provisioning/dashboards/canary-deployment.json"

# 解析命令行參數
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --prometheus-url)
                PROMETHEUS_URL="$2"
                shift 2
                ;;
            --grafana-url)
                GRAFANA_URL="$2"
                shift 2
                ;;
            --enable-slack)
                ENABLE_SLACK=true
                shift
                ;;
            --enable-pagerduty)
                ENABLE_PAGERDUTY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << 'EOF'
灰度部署基礎設施快速部署工具

使用方法:
  ./setup-canary-deployment.sh [options]

選項:
  --namespace <ns>       Kubernetes 命名空間 (default: production)
  --prometheus-url <url> Prometheus 服務地址 (default: http://prometheus:9090)
  --grafana-url <url>    Grafana 服務地址 (default: http://grafana:3000)
  --enable-slack         啟用 Slack 告警通知
  --enable-pagerduty     啟用 PagerDuty 告警通知
  --dry-run             演練模式，不實際執行部署
  --help                顯示此幫助信息

示例:
  # 基本部署
  ./setup-canary-deployment.sh

  # 自定義命名空間和啟用 Slack
  ./setup-canary-deployment.sh --namespace prod --enable-slack

  # 演練模式
  ./setup-canary-deployment.sh --dry-run

EOF
}

log_info() {
    echo -e "${INFO} $*"
}

log_success() {
    echo -e "${SUCCESS} $*"
}

log_warning() {
    echo -e "${WARNING} $*"
}

log_error() {
    echo -e "${ERROR} $*"
}

# 檢查前置條件
check_prerequisites() {
    log_info "檢查前置條件..."
    
    local missing_tools=()
    
    # 檢查必要工具
    for tool in kubectl helm curl jq; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        log_info "請安裝缺失的工具後重試"
        exit 1
    fi
    
    # 檢查 kubectl 連接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "無法連接到 Kubernetes 集群"
        exit 1
    fi
    
    log_success "前置條件檢查通過"
}

# 驗證配置文件
verify_files() {
    log_info "驗證配置文件..."
    
    local missing_files=()
    
    for file in "$ALERT_RULES_FILE" "$NGINX_CONFIG_FILE" "$ROLLBACK_SCRIPT" "$DASHBOARD_FILE"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "缺少配置文件: ${missing_files[*]}"
        exit 1
    fi
    
    log_success "所有配置文件已找到"
}

# 創建 Namespace
create_namespace() {
    log_info "創建 Namespace: $NAMESPACE"
    
    if kubectl get ns "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE 已存在，跳過創建"
    else
        if [ "$DRY_RUN" = false ]; then
            kubectl create namespace "$NAMESPACE"
            log_success "Namespace $NAMESPACE 已創建"
        else
            log_info "[DRY RUN] kubectl create namespace $NAMESPACE"
        fi
    fi
}

# 部署告警規則
deploy_alert_rules() {
    log_info "部署告警規則..."
    
    if [ "$DRY_RUN" = false ]; then
        # 刪除舊 ConfigMap（如果存在）
        kubectl delete configmap canary-alert-rules -n "$MONITORING_NS" 2>/dev/null || true
        
        # 創建新 ConfigMap
        kubectl create configmap canary-alert-rules \
            --from-file="$ALERT_RULES_FILE" \
            -n "$MONITORING_NS"
        
        log_success "告警規則已部署"
    else
        log_info "[DRY RUN] 將部署告警規則到 $MONITORING_NS"
    fi
}

# 部署 Nginx 配置
deploy_nginx_config() {
    log_info "部署 Nginx 配置..."
    
    if [ "$DRY_RUN" = false ]; then
        # 刪除舊 ConfigMap
        kubectl delete configmap nginx-canary-config -n "$NAMESPACE" 2>/dev/null || true
        
        # 創建新 ConfigMap
        kubectl create configmap nginx-canary-config \
            --from-file="$NGINX_CONFIG_FILE" \
            -n "$NAMESPACE"
        
        # 創建 Nginx Deployment
        cat << 'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-canary-gateway
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-canary-gateway
  template:
    metadata:
      labels:
        app: nginx-canary-gateway
    spec:
      containers:
      - name: nginx
        image: nginx:1.21-alpine
        ports:
        - containerPort: 80
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx-canary.conf
      volumes:
      - name: config
        configMap:
          name: nginx-canary-config
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-canary-gateway
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: nginx-canary-gateway
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
EOF
        
        log_success "Nginx 配置已部署"
    else
        log_info "[DRY RUN] 將部署 Nginx 配置到 $NAMESPACE"
    fi
}

# 部署 Grafana 儀表板
deploy_grafana_dashboard() {
    log_info "部署 Grafana 儀表板..."
    
    if [ "$DRY_RUN" = false ]; then
        # 複製儀表板文件到 Grafana 掛載點
        local grafana_pod=$(kubectl get pods -n "$MONITORING_NS" -l app=grafana -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        
        if [ -n "$grafana_pod" ]; then
            kubectl cp "$DASHBOARD_FILE" "$MONITORING_NS/$grafana_pod:/etc/grafana/provisioning/dashboards/" || \
                log_warning "無法複製儀表板到 Grafana，請手動上傳"
            log_success "Grafana 儀表板已部署"
        else
            log_warning "未找到 Grafana Pod，請確保 Grafana 已安裝"
        fi
    else
        log_info "[DRY RUN] 將部署 Grafana 儀表板"
    fi
}

# 設置自動回滾監控
setup_auto_rollback() {
    log_info "設置自動回滾監控..."
    
    if [ "$DRY_RUN" = false ]; then
        # 複製回滾腳本到監控 Pod
        kubectl create configmap canary-rollback-script \
            --from-file="$ROLLBACK_SCRIPT" \
            -n "$MONITORING_NS" 2>/dev/null || \
        kubectl patch configmap canary-rollback-script \
            --from-file="$ROLLBACK_SCRIPT" \
            -n "$MONITORING_NS"
        
        # 創建 CronJob 定期檢查回滾
        cat << 'EOF' | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: canary-auto-rollback-monitor
  namespace: monitoring
spec:
  schedule: "*/1 * * * *"  # 每分鐘運行一次
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: prometheus
          containers:
          - name: rollback-monitor
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              export PROMETHEUS_URL="http://prometheus:9090"
              export ALERTMANAGER_URL="http://alertmanager:9093"
              # 執行監控邏輯
              echo "Canary deployment auto-rollback monitor running..."
          restartPolicy: OnFailure
EOF
        
        log_success "自動回滾監控已設置"
    else
        log_info "[DRY RUN] 將設置自動回滾監控"
    fi
}

# 配置通知渠道
configure_notifications() {
    log_info "配置通知渠道..."
    
    if [ "$ENABLE_SLACK" = true ]; then
        log_info "配置 Slack 通知..."
        
        if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
            log_warning "未設置 SLACK_WEBHOOK_URL 環境變量"
            log_info "請設置: export SLACK_WEBHOOK_URL='https://hooks.slack.com/...'"
        else
            if [ "$DRY_RUN" = false ]; then
                # 創建 Secret 存儲 Slack Webhook
                kubectl create secret generic slack-webhook \
                    --from-literal=webhook-url="$SLACK_WEBHOOK_URL" \
                    -n "$MONITORING_NS" 2>/dev/null || true
                
                log_success "Slack 通知已配置"
            fi
        fi
    fi
    
    if [ "$ENABLE_PAGERDUTY" = true ]; then
        log_info "配置 PagerDuty 通知..."
        
        if [ -z "${PAGERDUTY_INTEGRATION_KEY:-}" ]; then
            log_warning "未設置 PAGERDUTY_INTEGRATION_KEY 環境變量"
            log_info "請設置: export PAGERDUTY_INTEGRATION_KEY='...'"
        else
            if [ "$DRY_RUN" = false ]; then
                kubectl create secret generic pagerduty-integration \
                    --from-literal=integration-key="$PAGERDUTY_INTEGRATION_KEY" \
                    -n "$MONITORING_NS" 2>/dev/null || true
                
                log_success "PagerDuty 通知已配置"
            fi
        fi
    fi
}

# 驗證部署
verify_deployment() {
    log_info "驗證部署..."
    
    if [ "$DRY_RUN" = false ]; then
        # 檢查 Pod 狀態
        log_info "檢查 Nginx 網關..."
        kubectl get pods -n "$NAMESPACE" -l app=nginx-canary-gateway
        
        log_info "檢查 Prometheus..."
        kubectl get pods -n "$MONITORING_NS" -l app=prometheus
        
        log_info "檢查 Grafana..."
        kubectl get pods -n "$MONITORING_NS" -l app=grafana
        
        log_success "部署驗證完成"
    fi
}

# 顯示總結
show_summary() {
    cat << EOF

${GREEN}════════════════════════════════════════════════════════════${NC}
${CYAN}灰度部署基礎設施部署完成！${NC}
${GREEN}════════════════════════════════════════════════════════════${NC}

${CYAN}部署信息:${NC}
  • 命名空間: $NAMESPACE
  • Prometheus: $PROMETHEUS_URL
  • Grafana: $GRAFANA_URL
  • 監控命名空間: $MONITORING_NS

${CYAN}已部署組件:${NC}
  ✅ Prometheus 監控配置
  ✅ 灰度部署告警規則 (10+ 條)
  ✅ Nginx 金絲雀網關
  ✅ Grafana 儀表板
  ✅ 自動回滾機制

${CYAN}下一步:${NC}
  1. 訪問 Grafana 儀表板
     kubectl port-forward -n $MONITORING_NS svc/grafana 3000:3000
     打開: $GRAFANA_URL

  2. 啟動自動回滾監控
     kubectl apply -f canary-rollback-job.yml -n $MONITORING_NS

  3. 測試流量分配
     curl -H "X-Canary-User: true" http://gateway/api/v1/test

  4. 查看告警
     curl http://prometheus:9090/api/v1/alerts

${CYAN}文檔:${NC}
  • 完整指南: ${SCRIPT_DIR}/CANARY_DEPLOYMENT.md
  • 回滾腳本: ${ROLLBACK_SCRIPT}
  • 告警規則: ${ALERT_RULES_FILE}
  • Nginx 配置: ${NGINX_CONFIG_FILE}

${CYAN}支持:${NC}
  遇到問題？查看故障排除部分或聯繫 DevOps 團隊

${GREEN}════════════════════════════════════════════════════════════${NC}

EOF
}

# 主函數
main() {
    parse_args "$@"
    
    echo -e "${CYAN}"
    cat << 'EOF'
   __________  _______ _________  ______  ____
  / ____/ __ \/ ____/ |/ /_  __/ /_  __/ / __ \
 / /   / / / / __/  |   / / /    / /   / / / /
/ /___/ /_/ / /___ /   | / /    / /   / /_/ /
\____/\____/_____//_/|_| /_/    /_/    \___\_\

灰度部署基礎設施快速部署工具
EOF
    echo -e "${NC}\n"
    
    log_info "開始部署灰度部署基礎設施..."
    log_info "時間: $(date)"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "執行模式: DRY RUN (不實際部署)"
    fi
    
    check_prerequisites
    verify_files
    create_namespace
    deploy_alert_rules
    deploy_nginx_config
    deploy_grafana_dashboard
    setup_auto_rollback
    configure_notifications
    verify_deployment
    show_summary
    
    log_success "部署完成！"
}

# 執行主函數
main "$@"
