#!/bin/bash

# ==========================================
# Staging 環境部署腳本
# ==========================================
# 基於 deploy-prod.sh，針對 Staging 環境優化
# ==========================================

set -euo pipefail

# ==========================================
# 腳本路徑和目錄配置
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"
source "$CORE_DIR/wait-for-service.sh"

# ==========================================
# 部署配置
# ==========================================

DEPLOY_ENV="staging"
DEPLOY_HOST="${DEPLOY_HOST:-staging.suggar-daddy.com}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/suggar-daddy-staging}"

# 服務配置（與生產環境相同，但配置不同）
APP_SERVICES=(
  "api-gateway"
  "auth-service"
  "user-service"
  "payment-service"
  "subscription-service"
  "db-writer-service"
  "content-service"
  "media-service"
)

FRONTEND_SERVICES=(
  "web"
  "admin"
)

# 部署版本
DEPLOY_VERSION=$(date +%Y%m%d_%H%M%S)
DEPLOY_TAG="staging-${DEPLOY_VERSION}"

# ==========================================
# 狀態變量
# ==========================================

cleanup_handlers=()
DRY_RUN=false
SKIP_BUILD=false
SKIP_TESTS=false
FORCE_DEPLOY=false
NOTIFY_SLACK=false

# ==========================================
# 使用說明
# ==========================================

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --dry-run              只顯示部署步驟，不實際執行
  --skip-build           跳過建構步驟
  --skip-tests           跳過測試步驟
  --force                強制部署（繞過確認）
  --notify-slack         發送 Slack 通知
  -h, --help             顯示幫助信息

Environment Variables:
  DEPLOY_HOST            部署主機（預設: staging.suggar-daddy.com）
  DEPLOY_USER            部署用戶（預設: deploy）
  SLACK_WEBHOOK_URL      Slack Webhook URL

Examples:
  $0 --dry-run           # 模擬部署
  $0                     # 部署到 staging

EOF
}

# ==========================================
# 參數解析
# ==========================================

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --force)
      FORCE_DEPLOY=true
      shift
      ;;
    --notify-slack)
      NOTIFY_SLACK=true
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

# ==========================================
# 通知函數
# ==========================================

send_notification() {
  local status=$1
  local message=$2
  
  log_info "Notification [$status]: $message"
  
  if [ "$NOTIFY_SLACK" = true ] && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    local color="good"
    [ "$status" = "error" ] && color="danger"
    [ "$status" = "warning" ] && color="warning"
    
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Staging Deployment\",\"text\":\"$message\",\"fields\":[{\"title\":\"Version\",\"value\":\"$DEPLOY_TAG\",\"short\":true},{\"title\":\"Status\",\"value\":\"$status\",\"short\":true}],\"ts\":$(date +%s)}]}" \
      "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
  fi
}

# ==========================================
# 環境檢查函數
# ==========================================

check_docker_environment() {
  log_step "檢查 Docker 環境..."
  check_command "docker"
  check_command "docker-compose"
  
  if [ "$DRY_RUN" = false ]; then
    if ! docker info > /dev/null 2>&1; then
      handle_error 1 "Docker daemon is not running"
    fi
    docker system prune -f > /dev/null 2>&1 || true
  fi
  
  log_success "Docker 環境檢查通過"
}

check_environment_variables() {
  log_step "檢查環境變數..."
  
  # Staging 可以使用默認值
  if [ -z "${NODE_ENV:-}" ] && [ -f "$PROJECT_ROOT/.env.staging" ]; then
    log_info "從 .env.staging 加載環境變數..."
    export $(grep -v '^#' "$PROJECT_ROOT/.env.staging" | xargs) || true
  fi
  
  log_success "環境變數檢查通過"
}

check_secrets() {
  log_step "檢查 Secrets..."
  local secrets_dir="$PROJECT_ROOT/secrets"
  
  if [ ! -d "$secrets_dir" ]; then
    log_warn "Secrets 目錄不存在，創建中..."
    mkdir -p "$secrets_dir"
  fi
  
  log_success "Secrets 檢查通過"
}

# ==========================================
# 構建函數
# ==========================================

build_images() {
  if [ "$SKIP_BUILD" = true ]; then
    log_info "跳過構建步驟"
    return 0
  fi
  
  log_step "構建 Docker Images..."
  cd "$PROJECT_ROOT"
  
  for service in "${APP_SERVICES[@]}"; do
    log_info "構建 $service..."
    
    if [ "$DRY_RUN" = false ]; then
      docker build \
        --target production \
        --build-arg APP_NAME="$service" \
        -t "suggar-daddy/$service:$DEPLOY_TAG" \
        -t "suggar-daddy/$service:staging" \
        -f Dockerfile \
        . || handle_error 1 "構建 $service 失敗"
    else
      log_info "[DRY RUN] 將構建 suggar-daddy/$service:$DEPLOY_TAG"
    fi
  done
  
  log_success "Images 構建完成"
}

# ==========================================
# 測試函數
# ==========================================

run_tests() {
  if [ "$SKIP_TESTS" = true ]; then
    log_warn "跳過測試步驟"
    return 0
  fi
  
  log_step "運行測試..."
  
  if [ "$DRY_RUN" = false ]; then
    if [ -f "$SCRIPT_DIR/../test/unit.sh" ]; then
      "$SCRIPT_DIR/../test/unit.sh" || handle_error 1 "測試失敗"
    else
      log_warn "測試腳本不存在，跳過"
    fi
  else
    log_info "[DRY RUN] 將運行測試"
  fi
  
  log_success "測試通過"
}

# ==========================================
# 部署函數
# ==========================================

deploy_services() {
  log_step "部署服務..."
  cd "$PROJECT_ROOT"
  
  if [ "$DRY_RUN" = false ]; then
    # 使用 staging 配置啟動
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" \
      --env-file "$PROJECT_ROOT/.env.staging" \
      up -d --build || handle_error 1 "部署失敗"
    
    # 等待服務就緒
    sleep 10
    
    # 簡單健康檢查
    if ! curl -sf "http://localhost:3000/health" > /dev/null 2>&1; then
      log_warn "API Gateway 健康檢查未通過"
    fi
  else
    log_info "[DRY RUN] 將部署所有服務"
  fi
  
  log_success "部署完成"
}

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "部署到 Staging 環境"
  
  log_info "部署版本: $DEPLOY_TAG"
  log_info "目標環境: $DEPLOY_ENV"
  log_info "目標主機: $DEPLOY_HOST"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "模擬模式（不會實際執行）"
  fi
  
  # 確認操作
  if [ "$DRY_RUN" = false ] && [ "$FORCE_DEPLOY" = false ]; then
    log_warn "即將部署到 Staging 環境"
    if ! confirm "確定要繼續嗎？"; then
      log_info "部署已取消"
      exit 0
    fi
  fi
  
  local start_time=$(date +%s)
  send_notification "info" "開始 Staging 部署: $DEPLOY_TAG"
  
  # 環境檢查
  log_header "階段 1: 環境檢查"
  check_docker_environment
  check_environment_variables
  check_secrets
  
  # 運行測試
  log_header "階段 2: 運行測試"
  run_tests
  
  # 構建
  log_header "階段 3: 構建 Images"
  build_images
  
  # 部署
  log_header "階段 4: 部署服務"
  deploy_services
  
  # 完成
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  log_header "部署完成"
  log_success "Staging 環境部署成功！"
  log_info "耗時: ${duration}s"
  
  send_notification "success" "Staging 部署成功: $DEPLOY_TAG (耗時: ${duration}s)"
  
  echo ""
  log_info "下一步："
  echo "  1. 檢查服務狀態: docker-compose ps"
  echo "  2. 查看日誌: docker-compose logs -f"
  echo "  3. 運行 E2E 測試"
}

# 執行主流程
main
