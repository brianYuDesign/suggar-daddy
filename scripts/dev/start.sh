#!/bin/bash

# ==========================================
# 啟動開發環境（兼容 bash 3.2+）
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"
source "$CORE_DIR/port-checker.sh"
source "$CORE_DIR/wait-for-service.sh"

# ==========================================
# 配置
# ==========================================

LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs/dev}"
mkdir -p "$LOG_DIR"

# 核心服務（必須啟動）
CORE_SERVICES="api-gateway auth-service user-service"

# 推薦服務（建議啟動）
RECOMMENDED_SERVICES="payment-service subscription-service content-service"

# 可選服務（使用 --all 時啟動）
OPTIONAL_SERVICES="notification-service messaging-service admin-service analytics-service search-service recommendation-service media-service"

# ==========================================
# 參數解析
# ==========================================

START_ALL=false
START_WEB=true
START_ADMIN=false
FORCE_RESTART=false
SKIP_DOCKER=false
SERVICES_TO_START=""

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --all              啟動所有服務（包含可選服務）
  --core-only        只啟動核心服務
  --no-web           不啟動 web 前端
  --admin            啟動 admin 前端
  --force            強制重啟（清理舊進程）
  --skip-docker      跳過 Docker 基礎設施啟動
  -h, --help         顯示幫助信息

Examples:
  $0                          # 啟動核心 + 推薦服務 + web
  $0 --all                    # 啟動所有服務
  $0 --core-only --no-web     # 只啟動核心服務，不啟動前端

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      START_ALL=true
      shift
      ;;
    --core-only)
      SERVICES_TO_START="$CORE_SERVICES"
      shift
      ;;
    --no-web)
      START_WEB=false
      shift
      ;;
    --admin)
      START_ADMIN=true
      shift
      ;;
    --force)
      FORCE_RESTART=true
      shift
      ;;
    --skip-docker)
      SKIP_DOCKER=true
      shift
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

# 決定要啟動的服務
if [ -z "$SERVICES_TO_START" ]; then
  if [ "$START_ALL" = true ]; then
    SERVICES_TO_START="$CORE_SERVICES $RECOMMENDED_SERVICES $OPTIONAL_SERVICES"
  else
    SERVICES_TO_START="$CORE_SERVICES $RECOMMENDED_SERVICES"
  fi
fi

# ==========================================
# 清理函數
# ==========================================

cleanup_on_exit() {
  log_info "Cleaning up..."
  
  # 停止所有後台進程
  for pid_file in "$LOG_DIR"/*.pid; do
    if [ -f "$pid_file" ]; then
      local pid=$(cat "$pid_file" 2>/dev/null)
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
      rm -f "$pid_file"
    fi
  done
}

register_cleanup cleanup_on_exit

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "Sugar Daddy 開發環境啟動"
  
  # 1. 檢查必要工具
  log_step "檢查必要工具..."
  check_command "node"
  check_command "npm"
  check_command "docker"
  check_command "docker-compose"
  
  # 2. 檢查項目目錄
  log_step "檢查項目結構..."
  check_directory "$PROJECT_ROOT/apps"
  check_directory "$PROJECT_ROOT/libs"
  check_file "$PROJECT_ROOT/package.json"
  
  # 3. 清理舊進程（如果需要）
  if [ "$FORCE_RESTART" = true ]; then
    log_step "清理舊進程..."
    
    # 清理常見端口
    for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 4200 4201; do
      if is_port_in_use "$port"; then
        log_warn "Killing process on port $port..."
        kill_process_on_port "$port" true || true
      fi
    done
  fi
  
  # 4. 啟動 Docker 基礎設施
  if [ "$SKIP_DOCKER" = false ]; then
    log_step "啟動 Docker 基礎設施..."
    
    cd "$PROJECT_ROOT"
    
    if ! docker-compose ps | grep -q "Up"; then
      log_info "Starting Docker Compose..."
      docker-compose up -d
    else
      log_info "Docker Compose already running"
    fi
    
    # 等待基礎設施就緒
    log_info "等待基礎設施就緒..."
    wait_for_services 120 postgres redis kafka
    
    log_success "基礎設施已就緒"
  else
    log_info "跳過 Docker 基礎設施啟動"
  fi
  
  # 5. 並行啟動後端服務
  log_step "啟動後端服務..."
  
  local service_count=0
  for service in $SERVICES_TO_START; do
    log_info "Starting $service..."
    cd "$PROJECT_ROOT"
    npx nx serve "$service" > "$LOG_DIR/${service}.log" 2>&1 &
    echo $! > "$LOG_DIR/${service}.pid"
    service_count=$((service_count + 1))
  done
  
  if [ $service_count -gt 0 ]; then
    log_info "已啟動 $service_count 個後端服務"
    
    # 等待所有服務就緒
    log_info "等待後端服務就緒..."
    wait_for_services 120 $SERVICES_TO_START
    
    log_success "所有後端服務已就緒"
  fi
  
  # 6. 啟動前端
  if [ "$START_WEB" = true ]; then
    log_step "啟動 Web 前端..."
    
    log_info "Starting web frontend..."
    cd "$PROJECT_ROOT"
    npx nx serve web > "$LOG_DIR/web.log" 2>&1 &
    echo $! > "$LOG_DIR/web.pid"
    
    wait_for_service web 90
    log_success "Web 前端已就緒"
  fi
  
  if [ "$START_ADMIN" = true ]; then
    log_step "啟動 Admin 前端..."
    
    log_info "Starting admin frontend..."
    cd "$PROJECT_ROOT"
    npx nx serve admin > "$LOG_DIR/admin-web.log" 2>&1 &
    echo $! > "$LOG_DIR/admin-web.pid"
    
    wait_for_service admin-web 90
    log_success "Admin 前端已就緒"
  fi
  
  # 7. 顯示服務狀態
  log_header "服務狀態"
  
  echo ""
  echo "🚀 開發環境已啟動！"
  echo ""
  echo "服務列表："
  echo "========================================="
  
  for service in $SERVICES_TO_START; do
    case $service in
      api-gateway) echo "  ✓ $service: http://localhost:3000" ;;
      user-service) echo "  ✓ $service: http://localhost:3001" ;;
      auth-service) echo "  ✓ $service: http://localhost:3002" ;;
      payment-service) echo "  ✓ $service: http://localhost:3003" ;;
      subscription-service) echo "  ✓ $service: http://localhost:3004" ;;
      content-service) echo "  ✓ $service: http://localhost:3005" ;;
      notification-service) echo "  ✓ $service: http://localhost:3006" ;;
      messaging-service) echo "  ✓ $service: http://localhost:3007" ;;
      admin-service) echo "  ✓ $service: http://localhost:3008" ;;
      analytics-service) echo "  ✓ $service: http://localhost:3009" ;;
      search-service) echo "  ✓ $service: http://localhost:3010" ;;
      recommendation-service) echo "  ✓ $service: http://localhost:3011" ;;
      media-service) echo "  ✓ $service: http://localhost:3012" ;;
      *) echo "  ✓ $service" ;;
    esac
  done
  
  if [ "$START_WEB" = true ]; then
    echo "  ✓ web: http://localhost:4200"
  fi
  
  if [ "$START_ADMIN" = true ]; then
    echo "  ✓ admin: http://localhost:4201"
  fi
  
  echo "========================================="
  echo ""
  echo "日誌目錄: $LOG_DIR"
  echo ""
  echo "停止服務: ./scripts/dev/stop.sh"
  echo "重置環境: ./scripts/dev/reset.sh"
  echo ""
  
  # 8. 保持運行
  log_info "按 Ctrl+C 停止所有服務"
  
  # 無限等待，直到被中斷
  while true; do
    sleep 3600
  done
}

# 執行主流程
main
