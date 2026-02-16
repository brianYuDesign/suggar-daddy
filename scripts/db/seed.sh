#!/bin/bash

# ==========================================
# 載入種子資料
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"
source "$CORE_DIR/wait-for-service.sh"

# ==========================================
# 配置
# ==========================================

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-suggar_daddy}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# ==========================================
# 參數解析
# ==========================================

POSTGRES_ONLY=false
REDIS_ONLY=false
FORCE=false

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --postgres-only  只載入 PostgreSQL 種子資料
  --redis-only     只載入 Redis 種子資料
  --force          強制載入（清除現有資料）
  -h, --help       顯示幫助信息

Environment Variables:
  POSTGRES_HOST      PostgreSQL 主機（預設: localhost）
  POSTGRES_PORT      PostgreSQL 端口（預設: 5432）
  POSTGRES_USER      PostgreSQL 用戶（預設: postgres）
  POSTGRES_PASSWORD  PostgreSQL 密碼（預設: postgres）
  POSTGRES_DB        資料庫名稱（預設: suggar_daddy）
  REDIS_HOST         Redis 主機（預設: localhost）
  REDIS_PORT         Redis 端口（預設: 6379）

Examples:
  $0                      # 載入所有種子資料
  $0 --postgres-only     # 只載入 PostgreSQL 資料
  $0 --redis-only        # 只載入 Redis 資料
  $0 --force             # 強制重新載入

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --postgres-only)
      POSTGRES_ONLY=true
      shift
      ;;
    --redis-only)
      REDIS_ONLY=true
      shift
      ;;
    --force)
      FORCE=true
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
# 主流程
# ==========================================

main() {
  log_header "載入種子資料"
  
  # 確認強制模式
  if [ "$FORCE" = true ]; then
    log_warn "強制模式：將清除現有資料"
    if ! confirm "確定要繼續嗎？"; then
      log_info "操作已取消"
      exit 0
    fi
  fi
  
  # 載入 PostgreSQL 種子資料
  if [ "$REDIS_ONLY" = false ]; then
    log_step "載入 PostgreSQL 種子資料..."
    
    # 等待 PostgreSQL 就緒
    wait_for_service postgres 60
    
    local seed_file="$PROJECT_ROOT/scripts/seed-test-users.sql"
    
    if [ -f "$seed_file" ]; then
      log_info "執行: $seed_file"
      
      PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        -f "$seed_file"
      
      log_success "PostgreSQL 種子資料已載入"
    else
      log_warn "PostgreSQL 種子文件不存在: $seed_file"
    fi
  fi
  
  # 載入 Redis 種子資料
  if [ "$POSTGRES_ONLY" = false ]; then
    log_step "載入 Redis 種子資料..."
    
    # 等待 Redis 就緒
    wait_for_service redis 60
    
    local seed_script="$PROJECT_ROOT/scripts/seed-redis-test-users.js"
    
    if [ -f "$seed_script" ]; then
      log_info "執行: $seed_script"
      
      REDIS_HOST="$REDIS_HOST" \
      REDIS_PORT="$REDIS_PORT" \
      node "$seed_script"
      
      log_success "Redis 種子資料已載入"
    else
      log_warn "Redis 種子腳本不存在: $seed_script"
    fi
  fi
  
  log_success "種子資料載入完成！"
  
  echo ""
  log_info "測試帳號："
  echo "  1. 訂閱者 - subscriber@test.com (密碼: password123)"
  echo "  2. 創作者 - creator@test.com (密碼: password123)"
  echo "  3. 管理員 - admin@test.com (密碼: password123)"
}

# 執行主流程
main
