#!/bin/bash

# ==========================================
# 建構前端應用
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"

# 前端應用列表
FRONTEND_APPS=(
  "web"
  "admin"
)

# ==========================================
# 參數解析
# ==========================================

PRODUCTION=false
APP=""

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS] [APP]

Options:
  --production     生產環境建構
  -h, --help       顯示幫助信息

Arguments:
  APP              指定要建構的應用（web 或 admin，不指定則建構全部）

Examples:
  $0                      # 建構所有前端應用
  $0 --production        # 生產環境建構
  $0 web                 # 只建構 web

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
      APP=$1
      shift
      ;;
  esac
done

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "建構前端應用"
  
  cd "$PROJECT_ROOT"
  
  local apps_to_build=()
  
  if [ -n "$APP" ]; then
    # 驗證應用名稱
    if [[ " ${FRONTEND_APPS[@]} " =~ " ${APP} " ]]; then
      apps_to_build=("$APP")
    else
      log_error "Unknown app: $APP"
      log_info "Available apps: ${FRONTEND_APPS[*]}"
      exit 1
    fi
  else
    apps_to_build=("${FRONTEND_APPS[@]}")
  fi
  
  log_info "建構 ${#apps_to_build[@]} 個前端應用"
  
  local config=""
  if [ "$PRODUCTION" = true ]; then
    config="--configuration=production"
    log_info "環境: 生產"
  else
    log_info "環境: 開發"
  fi
  
  # 建構每個應用
  local failed=()
  local succeeded=()
  
  for app in "${apps_to_build[@]}"; do
    log_step "建構 $app..."
    
    if npx nx build "$app" $config; then
      succeeded+=("$app")
      log_success "$app 建構完成"
    else
      failed+=("$app")
      log_error "$app 建構失敗"
    fi
  done
  
  # 顯示結果
  echo ""
  log_header "建構結果"
  
  if [ ${#succeeded[@]} -gt 0 ]; then
    log_success "成功: ${#succeeded[@]} 個應用"
    for app in "${succeeded[@]}"; do
      echo "  ✓ $app"
    done
  fi
  
  if [ ${#failed[@]} -gt 0 ]; then
    echo ""
    log_error "失敗: ${#failed[@]} 個應用"
    for app in "${failed[@]}"; do
      echo "  ✗ $app"
    done
    exit 1
  fi
  
  log_success "所有前端應用建構完成！"
}

# 執行主流程
main
