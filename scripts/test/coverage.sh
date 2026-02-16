#!/bin/bash

# ==========================================
# 生成測試覆蓋率報告
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"

# ==========================================
# 參數解析
# ==========================================

OPEN_REPORT=false
PROJECT=""

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS] [PROJECT]

Options:
  --open           自動開啟覆蓋率報告
  -h, --help       顯示幫助信息

Arguments:
  PROJECT          指定項目（不指定則生成全部）

Examples:
  $0                      # 生成所有項目的覆蓋率報告
  $0 --open              # 生成並開啟報告
  $0 api-gateway         # 只生成 api-gateway 的報告

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --open)
      OPEN_REPORT=true
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
  log_header "生成測試覆蓋率報告"
  
  cd "$PROJECT_ROOT"
  
  # 1. 運行測試並生成覆蓋率
  log_step "運行測試並收集覆蓋率..."
  
  local cmd="npx nx test"
  
  if [ -n "$PROJECT" ]; then
    cmd="$cmd $PROJECT"
    log_info "項目: $PROJECT"
  else
    cmd="$cmd --all"
    log_info "所有項目"
  fi
  
  cmd="$cmd --coverage --coverageReporters=html --coverageReporters=text --coverageReporters=lcov"
  
  if ! eval "$cmd"; then
    log_error "測試失敗"
    exit 1
  fi
  
  log_success "覆蓋率報告已生成"
  
  # 2. 顯示覆蓋率摘要
  log_step "覆蓋率摘要"
  
  if [ -f "coverage/lcov.info" ]; then
    if command -v lcov &> /dev/null; then
      lcov --summary coverage/lcov.info
    else
      log_info "安裝 lcov 以查看詳細摘要: brew install lcov"
    fi
  fi
  
  # 3. 顯示報告位置
  echo ""
  log_info "覆蓋率報告位置："
  
  if [ -n "$PROJECT" ]; then
    echo "  HTML: coverage/$PROJECT/index.html"
    echo "  LCOV: coverage/$PROJECT/lcov.info"
  else
    echo "  HTML: coverage/index.html"
    echo "  LCOV: coverage/lcov.info"
  fi
  
  # 4. 開啟報告（如果需要）
  if [ "$OPEN_REPORT" = true ]; then
    log_step "開啟覆蓋率報告..."
    
    if [ -n "$PROJECT" ]; then
      open "coverage/$PROJECT/index.html"
    else
      open "coverage/index.html"
    fi
  fi
  
  log_success "完成！"
}

# 執行主流程
main
