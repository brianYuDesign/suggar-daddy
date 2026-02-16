#!/bin/bash

# ==========================================
# 建構所有項目
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"
source "$CORE_DIR/parallel-start.sh"

# ==========================================
# 參數解析
# ==========================================

PARALLEL=true
PRODUCTION=false
PROJECT=""

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS] [PROJECT]

Options:
  --production     生產環境建構
  --no-parallel    不使用並行建構
  -h, --help       顯示幫助信息

Arguments:
  PROJECT          指定要建構的項目（不指定則建構全部）

Examples:
  $0                      # 建構所有項目
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
    --no-parallel)
      PARALLEL=false
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
# 主流程
# ==========================================

main() {
  log_header "建構項目"
  
  cd "$PROJECT_ROOT"
  
  # 構建命令
  local cmd="npx nx build"
  
  if [ -n "$PROJECT" ]; then
    cmd="$cmd $PROJECT"
    log_info "建構項目: $PROJECT"
  else
    cmd="$cmd --all"
    log_info "建構所有項目"
  fi
  
  if [ "$PRODUCTION" = true ]; then
    cmd="$cmd --configuration=production"
    log_info "環境: 生產"
  else
    log_info "環境: 開發"
  fi
  
  if [ "$PARALLEL" = true ] && [ -z "$PROJECT" ]; then
    cmd="$cmd --parallel=3"
    log_info "並行建構（3 個工作進程）"
  fi
  
  # 執行建構
  log_step "執行建構..."
  
  local start_time=$(date +%s)
  
  if eval "$cmd"; then
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "建構完成！耗時: ${duration}s"
    
    # 顯示建構產物
    echo ""
    log_info "建構產物位置:"
    echo "  dist/"
    
    exit 0
  else
    log_error "建構失敗"
    exit 1
  fi
}

# 執行主流程
main
