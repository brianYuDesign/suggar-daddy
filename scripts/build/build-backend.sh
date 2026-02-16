#!/bin/bash

# ==========================================
# 建構後端服務
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"

# 後端服務列表
BACKEND_SERVICES=(
  "api-gateway"
  "auth-service"
  "user-service"
  "payment-service"
  "subscription-service"
  "content-service"
  "notification-service"
  "messaging-service"
  "admin-service"
  "analytics-service"
  "search-service"
  "recommendation-service"
  "media-service"
)

# ==========================================
# 參數解析
# ==========================================

PRODUCTION=false
SERVICE=""

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS] [SERVICE]

Options:
  --production     生產環境建構
  -h, --help       顯示幫助信息

Arguments:
  SERVICE          指定要建構的服務（不指定則建構全部後端服務）

Available services:
  ${BACKEND_SERVICES[*]}

Examples:
  $0                      # 建構所有後端服務
  $0 --production        # 生產環境建構
  $0 api-gateway         # 只建構 api-gateway

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --production)
      PRODUCTION=true
      shift
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    -*)
      log_error "Unknown option: $1"
      show_usage
      exit 1
      ;;
    *)
      SERVICE=$1
      shift
      ;;
  esac
done

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "建構後端服務"
  
  cd "$PROJECT_ROOT"
  
  local services_to_build=()
  
  if [ -n "$SERVICE" ]; then
    # 驗證服務名稱
    if [[ " ${BACKEND_SERVICES[@]} " =~ " ${SERVICE} " ]]; then
      services_to_build=("$SERVICE")
    else
      log_error "Unknown service: $SERVICE"
      log_info "Available services: ${BACKEND_SERVICES[*]}"
      exit 1
    fi
  else
    services_to_build=("${BACKEND_SERVICES[@]}")
  fi
  
  log_info "建構 ${#services_to_build[@]} 個後端服務"
  
  local config=""
  if [ "$PRODUCTION" = true ]; then
    config="--configuration=production"
    log_info "環境: 生產"
  else
    log_info "環境: 開發"
  fi
  
  # 建構每個服務
  local failed=()
  local succeeded=()
  
  for service in "${services_to_build[@]}"; do
    log_step "建構 $service..."
    
    if npx nx build "$service" $config; then
      succeeded+=("$service")
      log_success "$service 建構完成"
    else
      failed+=("$service")
      log_error "$service 建構失敗"
    fi
  done
  
  # 顯示結果
  echo ""
  log_header "建構結果"
  
  if [ ${#succeeded[@]} -gt 0 ]; then
    log_success "成功: ${#succeeded[@]} 個服務"
    for service in "${succeeded[@]}"; do
      echo "  ✓ $service"
    done
  fi
  
  if [ ${#failed[@]} -gt 0 ]; then
    echo ""
    log_error "失敗: ${#failed[@]} 個服務"
    for service in "${failed[@]}"; do
      echo "  ✗ $service"
    done
    exit 1
  fi
  
  log_success "所有後端服務建構完成！"
}

# 執行主流程
main
