#!/bin/bash

# ==========================================
# 資料庫遷移
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

MIGRATIONS_DIR="$PROJECT_ROOT/scripts/migrations"

# ==========================================
# 參數解析
# ==========================================

ROLLBACK=false
TARGET_VERSION=""
DRY_RUN=false

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --rollback       回滾最後一次遷移
  --to <version>   遷移到指定版本
  --dry-run        只顯示將執行的遷移，不實際執行
  -h, --help       顯示幫助信息

Environment Variables:
  POSTGRES_HOST      PostgreSQL 主機（預設: localhost）
  POSTGRES_PORT      PostgreSQL 端口（預設: 5432）
  POSTGRES_USER      PostgreSQL 用戶（預設: postgres）
  POSTGRES_PASSWORD  PostgreSQL 密碼（預設: postgres）
  POSTGRES_DB        資料庫名稱（預設: suggar_daddy）

Examples:
  $0                        # 運行所有待執行的遷移
  $0 --rollback            # 回滾最後一次遷移
  $0 --to 001              # 遷移到版本 001
  $0 --dry-run             # 查看待執行的遷移

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --rollback)
      ROLLBACK=true
      shift
      ;;
    --to)
      TARGET_VERSION=$2
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
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
# 輔助函數
# ==========================================

# 執行 SQL
run_sql() {
  local sql=$1
  
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -c "$sql"
}

# 執行 SQL 文件
run_sql_file() {
  local file=$1
  
  log_info "執行: $file"
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 將執行: $file"
    return 0
  fi
  
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f "$file"
}

# 獲取當前遷移版本
get_current_version() {
  run_sql "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null | grep -v "version" | grep -v "^-" | grep -v "^(" | tr -d ' ' || echo "000"
}

# 記錄遷移版本
record_migration() {
  local version=$1
  local direction=$2
  
  if [ "$direction" = "up" ]; then
    run_sql "INSERT INTO schema_migrations (version) VALUES ('$version');"
  else
    run_sql "DELETE FROM schema_migrations WHERE version = '$version';"
  fi
}

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "資料庫遷移"
  
  # 檢查必要工具
  check_command "psql"
  
  # 檢查遷移目錄
  if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "遷移目錄不存在: $MIGRATIONS_DIR"
    exit 1
  fi
  
  # 等待資料庫就緒
  log_step "連接資料庫..."
  wait_for_service postgres 60
  
  # 確保遷移表存在
  log_step "初始化遷移表..."
  run_sql "CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );" || handle_error $? "Failed to create migrations table"
  
  # 獲取當前版本
  local current_version=$(get_current_version)
  log_info "當前版本: $current_version"
  
  # 執行遷移
  if [ "$ROLLBACK" = true ]; then
    # 回滾最後一次遷移
    log_step "回滾遷移..."
    
    if [ "$current_version" = "000" ]; then
      log_warn "沒有可回滾的遷移"
      exit 0
    fi
    
    local downgrade_file="$MIGRATIONS_DIR/${current_version}_downgrade.sql"
    
    if [ ! -f "$downgrade_file" ]; then
      log_error "回滾文件不存在: $downgrade_file"
      exit 1
    fi
    
    if [ "$DRY_RUN" = false ]; then
      if ! confirm "確定要回滾到上一個版本嗎？"; then
        log_info "操作已取消"
        exit 0
      fi
    fi
    
    run_sql_file "$downgrade_file"
    record_migration "$current_version" "down"
    
    log_success "回滾完成"
    
  else
    # 向前遷移
    log_step "執行遷移..."
    
    # 獲取所有遷移文件
    local migrations=()
    for file in "$MIGRATIONS_DIR"/*_upgrade.sql; do
      if [ -f "$file" ]; then
        local version=$(basename "$file" | cut -d_ -f1)
        
        # 只執行比當前版本新的遷移
        if [ "$version" \> "$current_version" ]; then
          if [ -z "$TARGET_VERSION" ] || [ "$version" \<= "$TARGET_VERSION" ]; then
            migrations+=("$file")
          fi
        fi
      fi
    done
    
    if [ ${#migrations[@]} -eq 0 ]; then
      log_info "沒有待執行的遷移"
      exit 0
    fi
    
    log_info "待執行的遷移: ${#migrations[@]} 個"
    
    for migration in "${migrations[@]}"; do
      local version=$(basename "$migration" | cut -d_ -f1)
      
      log_info "遷移到版本: $version"
      run_sql_file "$migration"
      
      if [ "$DRY_RUN" = false ]; then
        record_migration "$version" "up"
      fi
    done
    
    if [ "$DRY_RUN" = false ]; then
      log_success "遷移完成"
    else
      log_info "[DRY RUN] 遷移預覽完成"
    fi
  fi
}

# 執行主流程
main
