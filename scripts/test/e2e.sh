#!/bin/bash

# ==========================================
# 運行 E2E 測試
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

HEADLESS=true
PROJECT="web"
DEBUG=false
UPDATE_SNAPSHOTS=false
START_SERVICES=true

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --headed             顯示瀏覽器（非 headless 模式）
  --debug              調試模式
  --update-snapshots   更新快照
  --no-start           不自動啟動服務（假設服務已運行）
  --project <name>     指定測試項目（web 或 admin）
  -h, --help           顯示幫助信息

Examples:
  $0                          # 運行 web E2E 測試
  $0 --project admin          # 運行 admin E2E 測試
  $0 --headed --debug         # 顯示瀏覽器並開啟調試模式
  $0 --no-start               # 不啟動服務，直接測試

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --headed)
      HEADLESS=false
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --update-snapshots)
      UPDATE_SNAPSHOTS=true
      shift
      ;;
    --no-start)
      START_SERVICES=false
      shift
      ;;
    --project)
      PROJECT=$2
      shift 2
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# ==========================================
# 清理函數
# ==========================================

cleanup_services() {
  if [ "$START_SERVICES" = true ]; then
    log_info "停止測試服務..."
    "$SCRIPT_DIR/../dev/stop.sh" || true
  fi
}

register_cleanup cleanup_services

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "運行 E2E 測試"
  
  cd "$PROJECT_ROOT"
  
  # 1. 啟動服務（如果需要）
  if [ "$START_SERVICES" = true ]; then
    log_step "啟動測試環境..."
    
    # 啟動基礎設施和後端服務
    "$SCRIPT_DIR/../dev/start.sh" --core-only &
    local start_pid=$!
    
    # 等待服務就緒
    sleep 10
    wait_for_services 120 postgres redis api-gateway auth-service user-service
    
    # 啟動前端
    if [ "$PROJECT" = "web" ]; then
      log_info "啟動 Web 前端..."
      npx nx serve web > /tmp/e2e-web.log 2>&1 &
      echo $! > /tmp/e2e-web.pid
      wait_for_service web 90
    elif [ "$PROJECT" = "admin" ]; then
      log_info "啟動 Admin 前端..."
      npx nx serve admin > /tmp/e2e-admin.log 2>&1 &
      echo $! > /tmp/e2e-admin.pid
      wait_for_service admin-web 90
    fi
    
    log_success "測試環境已就緒"
    
    # 載入測試資料
    log_step "載入測試資料..."
    node "$PROJECT_ROOT/scripts/seed-redis-test-users.js" || log_warn "Failed to seed test users"
  else
    log_info "跳過服務啟動（假設服務已運行）"
  fi
  
  # 2. 運行 E2E 測試
  log_step "運行 E2E 測試..."
  
  local cmd="npx playwright test"
  
  if [ "$HEADLESS" = false ]; then
    cmd="$cmd --headed"
  fi
  
  if [ "$DEBUG" = true ]; then
    cmd="$cmd --debug"
  fi
  
  if [ "$UPDATE_SNAPSHOTS" = true ]; then
    cmd="$cmd --update-snapshots"
  fi
  
  # 指定測試文件
  if [ "$PROJECT" = "admin" ]; then
    cmd="$cmd e2e/admin"
  else
    cmd="$cmd e2e/web"
  fi
  
  log_info "執行: $cmd"
  
  if eval "$cmd"; then
    log_success "所有 E2E 測試通過！"
    exit 0
  else
    log_error "E2E 測試失敗"
    
    # 顯示日誌位置
    if [ "$START_SERVICES" = true ]; then
      echo ""
      log_info "查看日誌以獲取更多信息："
      if [ "$PROJECT" = "web" ]; then
        echo "  Web: /tmp/e2e-web.log"
      elif [ "$PROJECT" = "admin" ]; then
        echo "  Admin: /tmp/e2e-admin.log"
      fi
    fi
    
    exit 1
  fi
}

# 執行主流程
main
