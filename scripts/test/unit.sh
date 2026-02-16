#!/bin/bash

# ==========================================
# 運行單元測試
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"

# ==========================================
# 參數解析
# ==========================================

WATCH=false
COVERAGE=false
PROJECT=""
PARALLEL=true
VERBOSE=false

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS] [PROJECT]

Options:
  --watch          監聽模式（自動重新運行）
  --coverage       生成覆蓋率報告
  --no-parallel    不使用並行運行
  --verbose        顯示詳細輸出
  -h, --help       顯示幫助信息

Arguments:
  PROJECT          指定要測試的項目（不指定則測試全部）

Examples:
  $0                           # 測試所有項目
  $0 api-gateway              # 只測試 api-gateway
  $0 --coverage               # 測試並生成覆蓋率報告
  $0 --watch api-gateway      # 監聽模式測試 api-gateway

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --watch)
      WATCH=true
      shift
      ;;
    --coverage)
      COVERAGE=true
      shift
      ;;
    --no-parallel)
      PARALLEL=false
      shift
      ;;
    --verbose)
      VERBOSE=true
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
  log_header "運行單元測試"
  
  cd "$PROJECT_ROOT"
  
  # 構建命令
  local cmd="npx nx test"
  
  if [ -n "$PROJECT" ]; then
    cmd="$cmd $PROJECT"
    log_info "測試項目: $PROJECT"
  else
    cmd="$cmd --all"
    log_info "測試所有項目"
  fi
  
  if [ "$WATCH" = true ]; then
    cmd="$cmd --watch"
    log_info "監聽模式"
  fi
  
  if [ "$COVERAGE" = true ]; then
    cmd="$cmd --coverage"
    log_info "生成覆蓋率報告"
  fi
  
  if [ "$PARALLEL" = true ] && [ -z "$PROJECT" ]; then
    cmd="$cmd --parallel=3"
    log_info "並行運行（3 個工作進程）"
  fi
  
  if [ "$VERBOSE" = true ]; then
    cmd="$cmd --verbose"
  fi
  
  # 執行測試
  log_step "執行測試..."
  
  if eval "$cmd"; then
    log_success "所有測試通過！"
    
    if [ "$COVERAGE" = true ]; then
      echo ""
      log_info "覆蓋率報告已生成"
      echo "  查看報告: coverage/index.html"
    fi
    
    exit 0
  else
    log_error "測試失敗"
    exit 1
  fi
}

# 執行主流程
main
