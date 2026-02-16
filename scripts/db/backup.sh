#!/bin/bash

# ==========================================
# 資料庫備份（增強版）
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"
source "$CORE_DIR/parallel-start.sh"

# ==========================================
# 配置
# ==========================================

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-suggar-daddy-postgres-master-1}"
REDIS_CONTAINER="${REDIS_CONTAINER:-suggar-daddy-redis-master-1}"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# ==========================================
# 參數解析
# ==========================================

POSTGRES_ONLY=false
REDIS_ONLY=false
COMPRESS=true
PARALLEL_BACKUP=true

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --postgres-only   只備份 PostgreSQL
  --redis-only      只備份 Redis
  --no-compress     不壓縮備份文件
  --no-parallel     不並行備份（順序執行）
  -h, --help        顯示幫助信息

Environment Variables:
  POSTGRES_CONTAINER  PostgreSQL 容器名稱
  REDIS_CONTAINER     Redis 容器名稱
  BACKUP_DIR          備份目錄（預設: backups/）
  RETENTION_DAYS      保留天數（預設: 7）

Examples:
  $0                     # 備份所有資料庫
  $0 --postgres-only    # 只備份 PostgreSQL
  $0 --no-compress      # 不壓縮備份

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
    --no-compress)
      COMPRESS=false
      shift
      ;;
    --no-parallel)
      PARALLEL_BACKUP=false
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
# 備份函數
# ==========================================

backup_postgres() {
  log_step "備份 PostgreSQL..."
  
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="$BACKUP_DIR/postgres_${timestamp}.sql"
  
  # 執行備份
  docker exec "$POSTGRES_CONTAINER" pg_dumpall -U postgres > "$backup_file"
  
  if [ ! -s "$backup_file" ]; then
    log_error "PostgreSQL 備份失敗：文件為空"
    return 1
  fi
  
  local size=$(du -h "$backup_file" | cut -f1)
  log_info "PostgreSQL 備份完成: $backup_file ($size)"
  
  # 壓縮（如果需要）
  if [ "$COMPRESS" = true ]; then
    log_info "壓縮備份..."
    gzip "$backup_file"
    backup_file="${backup_file}.gz"
    local compressed_size=$(du -h "$backup_file" | cut -f1)
    log_info "壓縮後大小: $compressed_size"
  fi
  
  log_success "PostgreSQL 備份完成: $backup_file"
}

backup_redis() {
  log_step "備份 Redis..."
  
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="$BACKUP_DIR/redis_${timestamp}.rdb"
  
  # 觸發 Redis 保存
  docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
  
  # 等待保存完成
  local max_wait=60
  local elapsed=0
  
  while [ $elapsed -lt $max_wait ]; do
    local last_save=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
    sleep 2
    local current_save=$(docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE)
    
    if [ "$current_save" -gt "$last_save" ]; then
      break
    fi
    
    elapsed=$((elapsed + 2))
  done
  
  if [ $elapsed -ge $max_wait ]; then
    log_warn "Redis BGSAVE 超時，使用當前 dump.rdb"
  fi
  
  # 複製 RDB 文件
  docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$backup_file"
  
  if [ ! -s "$backup_file" ]; then
    log_error "Redis 備份失敗：文件為空"
    return 1
  fi
  
  local size=$(du -h "$backup_file" | cut -f1)
  log_info "Redis 備份完成: $backup_file ($size)"
  
  # 壓縮（如果需要）
  if [ "$COMPRESS" = true ]; then
    log_info "壓縮備份..."
    gzip "$backup_file"
    backup_file="${backup_file}.gz"
    local compressed_size=$(du -h "$backup_file" | cut -f1)
    log_info "壓縮後大小: $compressed_size"
  fi
  
  log_success "Redis 備份完成: $backup_file"
}

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "資料庫備份"
  
  # 檢查必要工具
  check_command "docker"
  
  # 建立備份目錄
  mkdir -p "$BACKUP_DIR"
  
  log_info "備份目錄: $BACKUP_DIR"
  log_info "保留天數: $RETENTION_DAYS"
  
  # 執行備份
  if [ "$PARALLEL_BACKUP" = true ] && [ "$POSTGRES_ONLY" = false ] && [ "$REDIS_ONLY" = false ]; then
    # 並行備份
    log_info "並行備份模式"
    
    backup_postgres &
    local pg_pid=$!
    
    backup_redis &
    local redis_pid=$!
    
    # 等待兩個備份完成
    local pg_result=0
    local redis_result=0
    
    wait $pg_pid || pg_result=$?
    wait $redis_pid || redis_result=$?
    
    if [ $pg_result -ne 0 ] || [ $redis_result -ne 0 ]; then
      log_error "備份過程中出現錯誤"
      exit 1
    fi
  else
    # 順序備份
    if [ "$REDIS_ONLY" = false ]; then
      backup_postgres
    fi
    
    if [ "$POSTGRES_ONLY" = false ]; then
      backup_redis
    fi
  fi
  
  # 清理舊備份
  log_step "清理舊備份..."
  
  local deleted=0
  while IFS= read -r -d '' file; do
    rm -f "$file"
    deleted=$((deleted + 1))
  done < <(find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -print0)
  
  if [ $deleted -gt 0 ]; then
    log_info "刪除了 $deleted 個超過 ${RETENTION_DAYS} 天的備份"
  else
    log_info "沒有需要清理的舊備份"
  fi
  
  # 顯示備份統計
  log_step "備份統計"
  
  local total_backups=$(find "$BACKUP_DIR" -type f | wc -l | tr -d ' ')
  local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
  
  echo "  備份文件數: $total_backups"
  echo "  總大小: $total_size"
  
  log_success "備份完成！"
}

# 執行主流程
main
