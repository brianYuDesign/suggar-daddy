#!/bin/bash

# ==========================================
# 生產環境部署腳本 (Production-Grade)
# ==========================================
# 功能：
#   - 環境檢查 (環境變數、secrets)
#   - 構建 production Docker images
#   - 資料庫遷移
#   - 滾動部署 (zero-downtime)
#   - 健康檢查
#   - 自動回滾機制
#   - 通知機制
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

DEPLOY_ENV="production"
DEPLOY_HOST="${DEPLOY_HOST:-prod.suggar-daddy.com}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/suggar-daddy}"

# 服務配置
CORE_SERVICES=(
  "postgres-master"
  "postgres-replica"
  "redis-master"
  "redis-replica-1"
  "redis-replica-2"
  "zookeeper"
  "kafka"
)

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

OPTIONAL_SERVICES=(
  "matching-service"
  "notification-service"
  "messaging-service"
  "admin-service"
)

FRONTEND_SERVICES=(
  "web"
  "admin"
)

# 健康檢查配置
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10
ROLLOUD_DELAY=10

# 備份配置
BACKUP_RETENTION_DAYS=30

# 部署版本
DEPLOY_VERSION=$(date +%Y%m%d_%H%M%S)
DEPLOY_TAG="prod-${DEPLOY_VERSION}"

# ==========================================
# 狀態變量
# ==========================================

cleanup_handlers=()
DRY_RUN=false
SKIP_BUILD=false
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE_DEPLOY=false
ROLLBACK_MODE=false
NOTIFY_SLACK=false
NOTIFY_DISCORD=false

# ==========================================
# 使用說明
# ==========================================

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

⚠️  WARNING: This deploys to PRODUCTION!

Options:
  --dry-run              只顯示部署步驟，不實際執行
  --skip-build           跳過建構步驟
  --skip-backup          跳過備份步驟（不建議）
  --skip-tests           跳過測試步驟（不建議）
  --force                強制部署（繞過部分確認）
  --rollback             執行回滾操作
  --notify-slack         發送 Slack 通知
  --notify-discord       發送 Discord 通知
  -h, --help             顯示幫助信息

Environment Variables:
  DEPLOY_HOST            部署主機（預設: prod.suggar-daddy.com）
  DEPLOY_USER            部署用戶（預設: deploy）
  DEPLOY_DIR             部署目錄（預設: /var/www/suggar-daddy）
  SLACK_WEBHOOK_URL      Slack Webhook URL
  DISCORD_WEBHOOK_URL    Discord Webhook URL
  JWT_SECRET             JWT 密鑰（用於驗證）

Examples:
  $0 --dry-run                    # 模擬部署（強烈建議先執行）
  $0                              # 標準生產部署
  $0 --skip-tests                 # 跳過測試（緊急修復時）
  $0 --rollback                   # 回滾到上一個版本
  $0 --notify-slack               # 部署並發送 Slack 通知

部署流程:
  1. 環境檢查 (docker, env, secrets)
  2. 前置備份（資料庫）
  3. 運行測試
  4. 構建 Production Docker Images
  5. 資料庫遷移
  6. 滾動部署服務
  7. 健康檢查
  8. 通知

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
    --skip-backup)
      SKIP_BACKUP=true
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
    --rollback)
      ROLLBACK_MODE=true
      shift
      ;;
    --notify-slack)
      NOTIFY_SLACK=true
      shift
      ;;
    --notify-discord)
      NOTIFY_DISCORD=true
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

send_slack_notification() {
  local status=$1
  local message=$2
  
  if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
    log_debug "SLACK_WEBHOOK_URL not set, skipping Slack notification"
    return 0
  fi
  
  local color="good"
  if [ "$status" = "error" ]; then
    color="danger"
  elif [ "$status" = "warning" ]; then
    color="warning"
  fi
  
  local payload=$(cat <<EOF
{
  "attachments": [{
    "color": "$color",
    "title": "Suggar Daddy Production Deployment",
    "text": "$message",
    "fields": [
      {"title": "Version", "value": "$DEPLOY_TAG", "short": true},
      {"title": "Host", "value": "$DEPLOY_HOST", "short": true},
      {"title": "Status", "value": "$status", "short": true}
    ],
    "footer": "Deploy Script",
    "ts": $(date +%s)
  }]
}
EOF
)
  
  if [ "$DRY_RUN" = false ]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "$payload" \
      "$SLACK_WEBHOOK_URL" > /dev/null || log_warn "Failed to send Slack notification"
  else
    log_info "[DRY RUN] Would send Slack notification: $message"
  fi
}

send_discord_notification() {
  local status=$1
  local message=$2
  
  if [ -z "${DISCORD_WEBHOOK_URL:-}" ]; then
    log_debug "DISCORD_WEBHOOK_URL not set, skipping Discord notification"
    return 0
  fi
  
  local color=3066993  # Green
  if [ "$status" = "error" ]; then
    color=15158332  # Red
  elif [ "$status" = "warning" ]; then
    color=16776960  # Yellow
  fi
  
  local payload=$(cat <<EOF
{
  "embeds": [{
    "title": "Suggar Daddy Production Deployment",
    "description": "$message",
    "color": $color,
    "fields": [
      {"name": "Version", "value": "$DEPLOY_TAG", "inline": true},
      {"name": "Host", "value": "$DEPLOY_HOST", "inline": true},
      {"name": "Status", "value": "$status", "inline": true}
    ],
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }]
}
EOF
)
  
  if [ "$DRY_RUN" = false ]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "$payload" \
      "$DISCORD_WEBHOOK_URL" > /dev/null || log_warn "Failed to send Discord notification"
  else
    log_info "[DRY RUN] Would send Discord notification: $message"
  fi
}

send_notification() {
  local status=$1
  local message=$2
  
  log_info "Notification [$status]: $message"
  
  if [ "$NOTIFY_SLACK" = true ]; then
    send_slack_notification "$status" "$message"
  fi
  
  if [ "$NOTIFY_DISCORD" = true ]; then
    send_discord_notification "$status" "$message"
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
    # 檢查 Docker daemon
    if ! docker info > /dev/null 2>&1; then
      handle_error 1 "Docker daemon is not running"
    fi
    
    # 檢查磁碟空間
    local disk_usage=$(docker system df --format '{{.Size}}' | head -1)
    log_info "Docker disk usage: $disk_usage"
    
    # 清理未使用的資源
    log_info "清理未使用的 Docker 資源..."
    docker system prune -f --volumes > /dev/null 2>&1 || true
  fi
  
  log_success "Docker 環境檢查通過"
}

check_environment_variables() {
  log_step "檢查環境變數..."
  
  # 必須的環境變數
  local required_vars=(
    "NODE_ENV"
    "POSTGRES_HOST"
    "POSTGRES_PASSWORD"
    "REDIS_HOST"
    "JWT_SECRET"
  )
  
  local missing_vars=()
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      missing_vars+=("$var")
    fi
  done
  
  if [ ${#missing_vars[@]} -gt 0 ]; then
    log_error "缺少必需的環境變數:"
    for var in "${missing_vars[@]}"; do
      echo "  - $var"
    done
    
    # 嘗試從 .env.production 加載
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
      log_info "嘗試從 .env.production 加載環境變數..."
      export $(grep -v '^#' "$PROJECT_ROOT/.env.production" | xargs) || true
    fi
    
    # 再次檢查
    missing_vars=()
    for var in "${required_vars[@]}"; do
      if [ -z "${!var:-}" ]; then
        missing_vars+=("$var")
      fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
      handle_error 1 "仍缺少環境變數: ${missing_vars[*]}"
    fi
  fi
  
  log_success "環境變數檢查通過"
}

check_secrets() {
  log_step "檢查 Secrets..."
  
  local secrets_dir="$PROJECT_ROOT/secrets"
  local required_secrets=(
    "db_password.txt"
    "jwt_secret.txt"
  )
  
  if [ ! -d "$secrets_dir" ]; then
    handle_error 1 "Secrets 目錄不存在: $secrets_dir"
  fi
  
  local missing_secrets=()
  for secret in "${required_secrets[@]}"; do
    if [ ! -f "$secrets_dir/$secret" ]; then
      missing_secrets+=("$secret")
    fi
  done
  
  if [ ${#missing_secrets[@]} -gt 0 ]; then
    log_error "缺少必需的 secrets:"
    for secret in "${missing_secrets[@]}"; do
      echo "  - $secret"
    done
    log_info "請執行: ./scripts/setup-secrets.sh --production"
    handle_error 1 "Secrets 檢查失敗"
  fi
  
  # 檢查檔案權限
  local insecure_files=()
  for secret in "$secrets_dir"/*.txt; do
    if [ -f "$secret" ]; then
      local perms=$(stat -f "%Lp" "$secret" 2>/dev/null || stat -c "%a" "$secret" 2>/dev/null)
      if [ "$perms" != "600" ] && [ "$perms" != "400" ]; then
        insecure_files+=("$(basename "$secret") (權限: $perms)")
      fi
    fi
  done
  
  if [ ${#insecure_files[@]} -gt 0 ]; then
    log_warn "以下 secrets 檔案權限不安全:"
    for file in "${insecure_files[@]}"; do
      echo "  - $file"
    done
    log_info "建議執行: chmod 600 secrets/*.txt"
  fi
  
  log_success "Secrets 檢查通過"
}

check_network_connectivity() {
  log_step "檢查網路連通性..."
  
  # 檢查外部服務連通性
  if [ "$DRY_RUN" = false ]; then
    # 檢查 PostgreSQL
    if ! nc -z "${POSTGRES_HOST}" 5432 2>/dev/null; then
      log_warn "無法連接到 PostgreSQL (${POSTGRES_HOST}:5432)"
    else
      log_info "PostgreSQL 連接正常"
    fi
    
    # 檢查 Redis
    if ! nc -z "${REDIS_HOST}" 6379 2>/dev/null; then
      log_warn "無法連接到 Redis (${REDIS_HOST}:6379)"
    else
      log_info "Redis 連接正常"
    fi
  fi
  
  log_success "網路連通性檢查完成"
}

# ==========================================
# 備份函數
# ==========================================

create_backup() {
  if [ "$SKIP_BACKUP" = true ]; then
    log_warn "跳過備份步驟（--skip-backup 已設置）"
    return 0
  fi
  
  log_step "創建部署前備份..."
  
  local backup_dir="$PROJECT_ROOT/backups/pre-deploy-${DEPLOY_VERSION}"
  mkdir -p "$backup_dir"
  
  # 備份資料庫
  log_info "備份 PostgreSQL..."
  if [ "$DRY_RUN" = false ]; then
    if ! "$SCRIPT_DIR/../db/backup.sh" --postgres-only; then
      if [ "$FORCE_DEPLOY" = false ]; then
        handle_error 1 "資料庫備份失敗，使用 --force 跳過備份"
      else
        log_warn "資料庫備份失敗，但 --force 已設置，繼續部署"
      fi
    fi
  else
    log_info "[DRY RUN] 將備份 PostgreSQL"
  fi
  
  # 備份當前 Docker Compose 配置
  log_info "備份 Docker Compose 配置..."
  if [ "$DRY_RUN" = false ]; then
    cp "$PROJECT_ROOT/docker-compose.yml" "$backup_dir/"
    cp "$PROJECT_ROOT/.env.production" "$backup_dir/" 2>/dev/null || true
    
    # 記錄當前運行的容器狀態
    docker-compose ps > "$backup_dir/docker-compose-ps.txt" 2>/dev/null || true
    docker images --format "{{.Repository}}:{{.Tag}}" > "$backup_dir/docker-images.txt" 2>/dev/null || true
  else
    log_info "[DRY RUN] 將備份 Docker Compose 配置"
  fi
  
  # 保存當前鏡像標籤
  if [ "$DRY_RUN" = false ]; then
    echo "$DEPLOY_VERSION" > "$PROJECT_ROOT/.last-deploy-version"
  fi
  
  log_success "備份完成: $backup_dir"
}

# ==========================================
# 構建函數
# ==========================================

build_production_images() {
  if [ "$SKIP_BUILD" = true ]; then
    log_info "跳過構建步驟（--skip-build 已設置）"
    return 0
  fi
  
  log_step "構建 Production Docker Images..."
  
  cd "$PROJECT_ROOT"
  
  # 構建後端服務
  for service in "${APP_SERVICES[@]}"; do
    log_info "構建 $service..."
    
    if [ "$DRY_RUN" = false ]; then
      if ! docker build \
        --target production \
        --build-arg APP_NAME="$service" \
        -t "suggar-daddy/$service:$DEPLOY_TAG" \
        -t "suggar-daddy/$service:latest" \
        -f Dockerfile \
        .; then
        handle_error 1 "構建 $service 失敗"
      fi
    else
      log_info "[DRY RUN] 將構建 suggar-daddy/$service:$DEPLOY_TAG"
    fi
  done
  
  log_success "Production images 構建完成"
}

# ==========================================
# 測試函數
# ==========================================

run_tests() {
  if [ "$SKIP_TESTS" = true ]; then
    log_warn "跳過測試步驟（--skip-tests 已設置）"
    return 0
  fi
  
  log_step "運行測試..."
  
  if [ "$DRY_RUN" = false ]; then
    # 運行單元測試
    log_info "運行單元測試..."
    if ! "$SCRIPT_DIR/../test/unit.sh"; then
      handle_error 1 "單元測試失敗"
    fi
    
    # 運行集成測試（如果存在）
    if [ -f "$SCRIPT_DIR/../test/integration.sh" ]; then
      log_info "運行集成測試..."
      if ! "$SCRIPT_DIR/../test/integration.sh"; then
        log_warn "集成測試失敗"
        if [ "$FORCE_DEPLOY" = false ]; then
          if ! confirm "集成測試失敗，是否繼續部署？"; then
            handle_error 1 "部署中止"
          fi
        fi
      fi
    fi
  else
    log_info "[DRY RUN] 將運行測試"
  fi
  
  log_success "測試通過"
}

# ==========================================
# 資料庫遷移函數
# ==========================================

run_database_migrations() {
  log_step "執行資料庫遷移..."
  
  if [ "$DRY_RUN" = false ]; then
    # 等待資料庫就緒
    wait_for_service "postgres" 60 || handle_error 1 "PostgreSQL 未就緒"
    
    # 運行遷移
    if ! "$SCRIPT_DIR/../db/migrate.sh"; then
      handle_error 1 "資料庫遷移失敗"
    fi
  else
    log_info "[DRY RUN] 將執行資料庫遷移"
  fi
  
  log_success "資料庫遷移完成"
}

# ==========================================
# 滾動部署函數
# ==========================================

rolling_deploy_service() {
  local service=$1
  local health_url=$2
  local max_wait=${3:-300}
  
  log_info "部署 $service..."
  
  if [ "$DRY_RUN" = false ]; then
    # 使用 docker-compose 部署單個服務
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" \
      --env-file "$PROJECT_ROOT/.env.production" \
      up -d --no-deps --build "$service" || return 1
    
    # 等待服務健康檢查通過
    local elapsed=0
    local interval=5
    
    while [ $elapsed -lt $max_wait ]; do
      if curl -sf "$health_url" > /dev/null 2>&1; then
        log_success "$service 健康檢查通過"
        return 0
      fi
      
      sleep $interval
      elapsed=$((elapsed + interval))
      
      if [ $((elapsed % 15)) -eq 0 ]; then
        log_info "等待 $service 就緒... (${elapsed}s)"
      fi
    done
    
    log_error "$service 健康檢查超時"
    return 1
  else
    log_info "[DRY RUN] 將部署 $service"
    return 0
  fi
}

rolling_deploy() {
  log_step "開始滾動部署..."
  
  cd "$PROJECT_ROOT"
  
  # 1. 部署基礎設施服務（如果尚未運行）
  log_info "確保基礎設施服務運行..."
  if [ "$DRY_RUN" = false ]; then
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" \
      --env-file "$PROJECT_ROOT/.env.production" \
      up -d postgres-master postgres-replica redis-master redis-replica-1 redis-replica-2 zookeeper kafka
    
    # 等待基礎設施就緒
    sleep 10
  fi
  
  # 2. 滾動部署後端服務
  log_info "部署後端服務..."
  
  local failed_services=()
  
  for service in "${APP_SERVICES[@]}"; do
    local port=$(get_service_port "$service")
    local health_url="http://localhost:${port}/health"
    
    if ! rolling_deploy_service "$service" "$health_url"; then
      failed_services+=("$service")
      
      if [ "$FORCE_DEPLOY" = false ]; then
        log_error "$service 部署失敗"
        
        # 詢問是否繼續
        if ! confirm "$service 部署失敗，是否繼續部署其他服務？"; then
          return 1
        fi
      else
        log_warn "$service 部署失敗，但 --force 已設置，繼續部署"
      fi
    fi
    
    # 滾動延遲，避免同時重啟所有服務
    if [ "$DRY_RUN" = false ]; then
      log_info "等待 $ROLLOUD_DELAY 秒後繼續..."
      sleep $ROLLOUD_DELAY
    fi
  done
  
  if [ ${#failed_services[@]} -gt 0 ]; then
    log_warn "以下服務部署失敗: ${failed_services[*]}"
    
    if [ "$FORCE_DEPLOY" = false ]; then
      return 1
    fi
  fi
  
  # 3. 部署前端服務
  log_info "部署前端服務..."
  for service in "${FRONTEND_SERVICES[@]}"; do
    if [ "$DRY_RUN" = false ]; then
      docker-compose -f "$PROJECT_ROOT/docker-compose.yml" \
        --env-file "$PROJECT_ROOT/.env.production" \
        up -d --no-deps --build "$service" || log_warn "$service 部署失敗"
    else
      log_info "[DRY RUN] 將部署 $service"
    fi
  done
  
  log_success "滾動部署完成"
}

get_service_port() {
  local service=$1
  case "$service" in
    api-gateway) echo "3000" ;;
    user-service) echo "3001" ;;
    auth-service) echo "3002" ;;
    payment-service) echo "3007" ;;
    subscription-service) echo "3009" ;;
    db-writer-service) echo "3010" ;;
    content-service) echo "3006" ;;
    media-service) echo "3008" ;;
    matching-service) echo "3003" ;;
    notification-service) echo "3004" ;;
    messaging-service) echo "3005" ;;
    admin-service) echo "3011" ;;
    *) echo "3000" ;;
  esac
}

# ==========================================
# 健康檢查函數
# ==========================================

perform_health_checks() {
  log_step "執行部署後健康檢查..."
  
  local failed_checks=()
  
  # 檢查核心服務
  if [ "$DRY_RUN" = false ]; then
    # 檢查 API Gateway
    if ! curl -sf "http://localhost:3000/health" > /dev/null 2>&1; then
      failed_checks+=("api-gateway")
    fi
    
    # 檢查 Auth Service
    if ! curl -sf "http://localhost:3002/health" > /dev/null 2>&1; then
      failed_checks+=("auth-service")
    fi
    
    # 檢查 User Service
    if ! curl -sf "http://localhost:3001/health" > /dev/null 2>&1; then
      failed_checks+=("user-service")
    fi
    
    # 檢查 Payment Service
    if ! curl -sf "http://localhost:3007/health" > /dev/null 2>&1; then
      failed_checks+=("payment-service")
    fi
    
    # 檢查資料庫連接
    if ! docker-compose exec -T postgres-master pg_isready -U postgres > /dev/null 2>&1; then
      failed_checks+=("postgres-master")
    fi
    
    # 檢查 Redis
    if ! docker-compose exec -T redis-master redis-cli ping > /dev/null 2>&1; then
      failed_checks+=("redis-master")
    fi
  else
    log_info "[DRY RUN] 將執行健康檢查"
  fi
  
  if [ ${#failed_checks[@]} -gt 0 ]; then
    log_error "以下健康檢查失敗: ${failed_checks[*]}"
    return 1
  fi
  
  log_success "所有健康檢查通過"
}

# ==========================================
# 回滾函數
# ==========================================

perform_rollback() {
  log_header "執行回滾"
  
  # 查找上一次部署版本
  local last_version=""
  if [ -f "$PROJECT_ROOT/.last-deploy-version" ]; then
    last_version=$(cat "$PROJECT_ROOT/.last-deploy-version")
  fi
  
  # 列出可用的備份
  log_info "可用的備份版本:"
  ls -1t "$PROJECT_ROOT/backups/" 2>/dev/null | head -10 || log_warn "沒有找到備份"
  
  if [ -n "$last_version" ]; then
    log_info "上一次部署版本: $last_version"
  fi
  
  if [ "$DRY_RUN" = false ]; then
    if ! confirm "確定要回滾到上一個版本嗎？"; then
      log_info "回滾已取消"
      exit 0
    fi
    
    # 使用 docker-compose 回滾
    log_info "正在回滾服務..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down
    
    # 恢復備份的鏡像標籤
    if [ -n "$last_version" ]; then
      for service in "${APP_SERVICES[@]}"; do
        docker tag "suggar-daddy/$service:$last_version" "suggar-daddy/$service:latest" 2>/dev/null || true
      done
    fi
    
    # 重新啟動服務
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d
    
    log_success "回滾完成"
    send_notification "warning" "生產環境已回滾到上一個版本"
  else
    log_info "[DRY RUN] 將執行回滾"
  fi
}

# ==========================================
# 清理函數
# ==========================================

cleanup() {
  log_step "清理資源..."
  
  if [ "$DRY_RUN" = false ]; then
    # 清理舊的 Docker 鏡像（保留最近 5 個版本）
    local images_to_remove=$(docker images "suggar-daddy/*" --format "{{.Repository}}:{{.Tag}}" | grep -v "latest" | tail -n +20)
    if [ -n "$images_to_remove" ]; then
      echo "$images_to_remove" | xargs -r docker rmi > /dev/null 2>&1 || true
      log_info "已清理舊的 Docker 鏡像"
    fi
    
    # 清理備份（保留 30 天）
    find "$PROJECT_ROOT/backups" -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
  fi
  
  log_success "清理完成"
}

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "生產環境部署"
  
  # 顯示部署信息
  log_info "部署版本: $DEPLOY_TAG"
  log_info "目標環境: $DEPLOY_ENV"
  log_info "目標主機: $DEPLOY_HOST"
  log_info "部署目錄: $DEPLOY_DIR"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "========== 模擬模式（不會實際執行）=========="
  fi
  
  # 回滾模式
  if [ "$ROLLBACK_MODE" = true ]; then
    perform_rollback
    exit 0
  fi
  
  # ====================
  # 1. 多重確認
  # ====================
  if [ "$DRY_RUN" = false ] && [ "$FORCE_DEPLOY" = false ]; then
    echo ""
    log_error "⚠️  即將部署到生產環境！"
    log_warn "這將影響線上用戶，請確保："
    echo "  1. 已經在低環境測試過"
    echo "  2. 已通知相關團隊成員"
    echo "  3. 已準備好回滾計劃"
    echo ""
    
    if ! confirm "你確定要部署到生產環境嗎？"; then
      log_info "部署已取消"
      exit 0
    fi
    
    log_warn "最後確認："
    if ! confirm "真的要部署到生產環境嗎？（請再次確認）"; then
      log_info "部署已取消"
      exit 0
    fi
  fi
  
  # 記錄開始時間
  local start_time=$(date +%s)
  
  # 發送開始通知
  send_notification "info" "開始生產環境部署: $DEPLOY_TAG"
  
  # ====================
  # 2. 環境檢查
  # ====================
  log_header "階段 1: 環境檢查"
  
  check_docker_environment
  check_environment_variables
  check_secrets
  check_network_connectivity
  
  # ====================
  # 3. 前置備份
  # ====================
  log_header "階段 2: 前置備份"
  
  create_backup
  
  # ====================
  # 4. 運行測試
  # ====================
  log_header "階段 3: 運行測試"
  
  run_tests
  
  # ====================
  # 5. 構建 Production Images
  # ====================
  log_header "階段 4: 構建 Production Images"
  
  build_production_images
  
  # ====================
  # 6. 資料庫遷移
  # ====================
  log_header "階段 5: 資料庫遷移"
  
  run_database_migrations
  
  # ====================
  # 7. 滾動部署
  # ====================
  log_header "階段 6: 滾動部署"
  
  if ! rolling_deploy; then
    log_error "部署過程中出現錯誤"
    
    if [ "$FORCE_DEPLOY" = false ]; then
      if confirm "部署部分失敗，是否執行回滾？"; then
        perform_rollback
      fi
      send_notification "error" "生產環境部署失敗: $DEPLOY_TAG"
      exit 1
    fi
  fi
  
  # ====================
  # 8. 健康檢查
  # ====================
  log_header "階段 7: 健康檢查"
  
  if ! perform_health_checks; then
    log_error "健康檢查失敗"
    
    if [ "$FORCE_DEPLOY" = false ]; then
      if confirm "健康檢查失敗，是否執行回滾？"; then
        perform_rollback
      fi
      send_notification "error" "生產環境部署健康檢查失敗: $DEPLOY_TAG"
      exit 1
    fi
  fi
  
  # ====================
  # 9. 清理
  # ====================
  log_header "階段 8: 清理"
  
  cleanup
  
  # 計算部署時間
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  local minutes=$((duration / 60))
  local seconds=$((duration % 60))
  
  # ====================
  # 10. 完成
  # ====================
  log_header "部署完成"
  
  log_success "生產環境部署成功！"
  log_info "版本: $DEPLOY_TAG"
  log_info "耗時: ${minutes}m ${seconds}s"
  
  # 發送成功通知
  send_notification "success" "生產環境部署成功: $DEPLOY_TAG (耗時: ${minutes}m ${seconds}s)"
  
  echo ""
  log_info "下一步："
  echo "  1. 監控錯誤率: docker-compose logs -f --tail=100"
  echo "  2. 檢查 APM 儀表板 (New Relic/DataDog)"
  echo "  3. 運行煙霧測試"
  echo "  4. 通知團隊部署完成"
  echo ""
  log_info "如需回滾，請執行: $0 --rollback"
}

# 執行主流程
main
