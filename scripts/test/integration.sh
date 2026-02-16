#!/bin/bash

# ==========================================
# 運行整合測試
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"
source "$CORE_DIR/wait-for-service.sh"

# ==========================================
# 參數解析
# ==========================================

PROJECT=""
START_SERVICES=true

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS] [PROJECT]

Options:
  --no-start       不自動啟動服務
  -h, --help       顯示幫助信息

Arguments:
  PROJECT          指定要測試的項目

Examples:
  $0                      # 測試所有項目
  $0 api-gateway         # 只測試 api-gateway
  $0 --no-start          # 不啟動服務，直接測試

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-start)
      START_SERVICES=false
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
      PROJECT=$1
      shift
      ;;
  esac
done

# ==========================================
# 清理函數
# ==========================================

cleanup_services() {
  if [ "$START_SERVICES" = true ]; then
    log_info "停止測試服務..."
    "$SCRIPT_DIR/../dev/stop.sh" --docker || true
  fi
}

register_cleanup cleanup_services

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "運行整合測試"
  
  cd "$PROJECT_ROOT"
  
  # 1. 啟動服務（如果需要）
  if [ "$START_SERVICES" = true ]; then
    log_step "啟動測試環境..."
    
    # 啟動 Docker 基礎設施
    docker-compose up -d
    wait_for_services 120 postgres redis kafka
    
    log_success "測試環境已就緒"
  fi
  
  # 2. 運行整合測試
  log_step "運行整合測試..."
  
  local cmd="npx nx test:integration"
  
  if [ -n "$PROJECT" ]; then
    cmd="$cmd $PROJECT"
    log_info "測試項目: $PROJECT"
  else
    cmd="$cmd --all"
    log_info "測試所有項目"
  fi
  
  if eval "$cmd"; then
    log_success "所有整合測試通過！"
    exit 0
  else
    log_error "整合測試失敗"
    exit 1
  fi
}

# 執行主流程
main
