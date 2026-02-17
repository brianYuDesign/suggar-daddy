#!/bin/bash

# ==========================================
# PostgreSQL 資料庫備份腳本 (S3 版本)
# ==========================================
# 功能：
# - 備份 PostgreSQL 16 (Master-Replica 架構)
# - 壓縮備份檔案
# - 上傳到 S3
# - 清理舊備份 (保留 30 天)
# - 發送通知
# ==========================================

set -euo pipefail

# ==========================================
# 路徑和基礎配置
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 載入錯誤處理工具
source "$CORE_DIR/error-handler.sh"

# ==========================================
# 預設配置
# ==========================================

# 資料庫配置
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_DB="${POSTGRES_DB:-suggar_daddy}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-suggar-daddy-postgres-master}"

# 備份配置
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
BACKUP_PREFIX="${BACKUP_PREFIX:-postgres}"

# S3 配置
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
BACKUP_TO_S3="${BACKUP_TO_S3:-true}"
S3_STORAGE_CLASS="${S3_STORAGE_CLASS:-STANDARD_IA}"  # STANDARD, STANDARD_IA, GLACIER

# 通知配置
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
EMAIL_NOTIFICATION="${EMAIL_NOTIFICATION:-}"
NOTIFICATION_ON_SUCCESS="${NOTIFICATION_ON_SUCCESS:-false}"
NOTIFICATION_ON_FAILURE="${NOTIFICATION_ON_FAILURE:-true}"

# 日誌配置
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs/backup}"
BACKUP_LOG_FILE="$LOG_DIR/backup-$(date +%Y%m%d).log"

# ==========================================
# 命令行參數
# ==========================================

DRY_RUN=false
FULL_BACKUP=false
VERBOSE=false

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  -f, --full              執行完整備份 (包含 WAL 檔案)
  -d, --dry-run          測試模式，不實際執行備份
  -v, --verbose          顯示詳細輸出
  -h, --help             顯示幫助信息

Environment Variables:
  POSTGRES_HOST          PostgreSQL 主機 (預設: localhost)
  POSTGRES_PORT          PostgreSQL 端口 (預設: 5432)
  POSTGRES_USER          PostgreSQL 用戶名
  POSTGRES_PASSWORD      PostgreSQL 密碼
  POSTGRES_DB            資料庫名稱
  BACKUP_DIR             本地備份目錄
  RETENTION_DAYS         保留天數 (預設: 30)
  BACKUP_TO_S3           是否上傳到 S3 (true/false)
  BACKUP_S3_BUCKET       S3 Bucket 名稱
  AWS_REGION             AWS 區域
  SLACK_WEBHOOK_URL      Slack 通知 Webhook
  DISCORD_WEBHOOK_URL    Discord 通知 Webhook

Examples:
  $0                          # 執行標準備份
  $0 --full                   # 執行完整備份
  $0 --dry-run                # 測試模式
  POSTGRES_DB=mydb $0         # 備份指定資料庫

EOF
}

# 解析參數
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--full)
      FULL_BACKUP=true
      shift
      ;;
    -d|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      LOG_LEVEL="DEBUG"
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
# 初始化
# ==========================================

init() {
  log_header "PostgreSQL 資料庫備份"
  
  # 建立日誌目錄
  mkdir -p "$LOG_DIR"
  
  # 建立備份目錄
  mkdir -p "$BACKUP_DIR"
  
  log_info "備份目錄: $BACKUP_DIR"
  log_info "保留天數: $RETENTION_DAYS"
  log_info "S3 Bucket: ${BACKUP_S3_BUCKET:-未配置}"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "=== 測試模式 (DRY RUN) ==="
  fi
}

# ==========================================
# 前置檢查
# ==========================================

pre_checks() {
  log_step "執行前置檢查..."
  
  # 檢查必要命令
  check_command "docker"
  
  if [ "$BACKUP_TO_S3" = true ] && [ -n "$BACKUP_S3_BUCKET" ]; then
    check_command "aws"
    
    # 檢查 AWS 認證
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
      log_warn "AWS 認證未配置，嘗試使用 IAM Role 或 AWS CLI 配置"
    fi
    
    # 測試 S3 連接
    if [ "$DRY_RUN" = false ]; then
      if ! aws s3 ls "s3://$BACKUP_S3_BUCKET" > /dev/null 2>&1; then
        handle_error 1 "無法連接到 S3 Bucket: $BACKUP_S3_BUCKET" "請檢查 AWS 認證和 Bucket 權限"
      fi
      log_info "S3 連接測試通過"
    fi
  fi
  
  # 檢查 PostgreSQL 容器狀態
  if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    handle_error 1 "PostgreSQL 容器未運行: $POSTGRES_CONTAINER"
  fi
  
  # 檢查資料庫連接
  if ! docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
    handle_error 1 "無法連接到 PostgreSQL 資料庫"
  fi
  
  log_success "前置檢查通過"
}

# ==========================================
# 資料庫備份
# ==========================================

backup_database() {
  log_step "開始備份資料庫..."
  
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local date_dir=$(date +%Y%m%d)
  local backup_subdir="$BACKUP_DIR/$date_dir"
  
  mkdir -p "$backup_subdir"
  
  # 設定備份檔案名稱
  BACKUP_FILE="$backup_subdir/${BACKUP_PREFIX}_${POSTGRES_DB}_${timestamp}.sql"
  
  if [ "$FULL_BACKUP" = true ]; then
    log_info "執行完整備份 (pg_dumpall)..."
    
    if [ "$DRY_RUN" = false ]; then
      docker exec "$POSTGRES_CONTAINER" pg_dumpall -U "$POSTGRES_USER" > "$BACKUP_FILE"
    else
      log_info "[DRY RUN] 將執行: pg_dumpall -U $POSTGRES_USER"
      touch "$BACKUP_FILE"
    fi
  else
    log_info "執行資料庫備份 (pg_dump)..."
    
    if [ "$DRY_RUN" = false ]; then
      docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-owner \
        --no-privileges \
        > "$BACKUP_FILE"
    else
      log_info "[DRY RUN] 將執行: pg_dump -U $POSTGRES_USER -d $POSTGRES_DB"
      touch "$BACKUP_FILE"
    fi
  fi
  
  # 驗證備份檔案
  if [ "$DRY_RUN" = false ]; then
    if [ ! -s "$BACKUP_FILE" ]; then
      handle_error 1 "備份失敗：備份檔案為空"
    fi
    
    local file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "備份完成: $BACKUP_FILE ($file_size)"
  fi
  
  # 備份元數據
  backup_metadata "$backup_subdir" "$timestamp"
}

# ==========================================
# 備份元數據
# ==========================================

backup_metadata() {
  local backup_subdir=$1
  local timestamp=$2
  
  log_step "收集備份元數據..."
  
  local metadata_file="$backup_subdir/backup_metadata_${timestamp}.json"
  
  # 獲取資料庫統計信息
  local db_size=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -t -c "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));" 2>/dev/null | xargs || echo "unknown")
  
  local table_count=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
  
  local replication_status="disabled"
  if docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -c "SELECT pg_is_in_recovery();" 2>/dev/null | grep -q "f"; then
    replication_status="master"
  fi
  
  cat > "$metadata_file" <<EOF
{
  "backup_info": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "backup_date": "$(date +%Y-%m-%d)",
    "backup_time": "$timestamp",
    "backup_type": "$([ "$FULL_BACKUP" = true ] && echo "full" || echo "standard")",
    "database": "$POSTGRES_DB",
    "host": "$POSTGRES_HOST",
    "version": "$(docker exec "$POSTGRES_CONTAINER" psql -V 2>/dev/null | head -1 || echo 'unknown')"
  },
  "database_stats": {
    "database_size": "$db_size",
    "table_count": $table_count,
    "replication_status": "$replication_status"
  },
  "system_info": {
    "hostname": "$(hostname)",
    "container": "$POSTGRES_CONTAINER",
    "backup_host": "$(hostname -I | awk '{print $1}' || echo 'unknown')"
  },
  "files": {
    "backup_file": "$(basename "$BACKUP_FILE")",
    "compressed_file": "$(basename "$BACKUP_FILE").gz",
    "checksum": ""
  },
  "retention": {
    "days": $RETENTION_DAYS,
    "expires_at": "$(date -d "+$RETENTION_DAYS days" -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -v+${RETENTION_DAYS}d -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
  
  log_info "元數據已保存: $metadata_file"
  METADATA_FILE="$metadata_file"
}

# ==========================================
# 壓縮備份
# ==========================================

compress_backup() {
  log_step "壓縮備份檔案..."
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 將壓縮: $BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    return 0
  fi
  
  local original_size=$(du -h "$BACKUP_FILE" | cut -f1)
  
  # 使用 gzip 壓縮，-9 最大壓縮率
  gzip -9 "$BACKUP_FILE"
  
  COMPRESSED_FILE="${BACKUP_FILE}.gz"
  
  if [ ! -f "$COMPRESSED_FILE" ]; then
    handle_error 1 "壓縮失敗"
  fi
  
  local compressed_size=$(du -h "$COMPRESSED_FILE" | cut -f1)
  log_info "壓縮完成: $original_size -> $compressed_size"
  
  # 生成 checksum
  local checksum=$(md5sum "$COMPRESSED_FILE" | cut -d' ' -f1)
  log_info "MD5 Checksum: $checksum"
  
  # 更新元數據
  if [ -f "$METADATA_FILE" ]; then
    sed -i.bak "s/\"checksum\": \"\"/\"checksum\": \"$checksum\"/" "$METADATA_FILE"
    rm -f "$METADATA_FILE.bak"
  fi
}

# ==========================================
# 上傳到 S3
# ==========================================

upload_to_s3() {
  if [ "$BACKUP_TO_S3" != true ] || [ -z "$BACKUP_S3_BUCKET" ]; then
    log_info "跳過 S3 上傳 (未啟用或未配置)"
    return 0
  fi
  
  log_step "上傳到 S3..."
  
  local date_prefix=$(date +%Y/%m/%d)
  local s3_key="backups/postgres/$date_prefix/$(basename "$COMPRESSED_FILE")"
  local s3_metadata_key="backups/postgres/$date_prefix/$(basename "$METADATA_FILE")"
  
  log_info "S3 路徑: s3://$BACKUP_S3_BUCKET/$s3_key"
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 將上傳到 S3: $s3_key"
    return 0
  fi
  
  # 上傳備份檔案
  if ! aws s3 cp "$COMPRESSED_FILE" "s3://$BACKUP_S3_BUCKET/$s3_key" \
    --storage-class "$S3_STORAGE_CLASS" \
    --metadata "backup-date=$(date +%Y-%m-%d),database=$POSTGRES_DB"; then
    handle_error 1 "S3 上傳失敗"
  fi
  
  log_info "備份檔案已上傳"
  
  # 上傳元數據
  if [ -f "$METADATA_FILE" ]; then
    aws s3 cp "$METADATA_FILE" "s3://$BACKUP_S3_BUCKET/$s3_metadata_key" \
      --storage-class STANDARD > /dev/null 2>&1 || true
    log_info "元數據已上傳"
  fi
  
  S3_URL="s3://$BACKUP_S3_BUCKET/$s3_key"
  log_success "S3 上傳完成: $S3_URL"
}

# ==========================================
# 清理舊備份
# ==========================================

cleanup_old_backups() {
  log_step "清理舊備份..."
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 將清理超過 $RETENTION_DAYS 天的備份"
    return 0
  fi
  
  local local_deleted=0
  local s3_deleted=0
  
  # 清理本地備份
  while IFS= read -r -d '' file; do
    rm -f "$file"
    local_deleted=$((local_deleted + 1))
    log_debug "已刪除本地檔案: $file"
  done < <(find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null || true)
  
  if [ $local_deleted -gt 0 ]; then
    log_info "已刪除 $local_deleted 個本地舊備份"
  else
    log_info "沒有需要清理的本地舊備份"
  fi
  
  # 清理 S3 備份
  if [ "$BACKUP_TO_S3" = true ] && [ -n "$BACKUP_S3_BUCKET" ]; then
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)
    
    # 列出舊的 S3 對象並刪除
    local old_objects=$(aws s3api list-objects-v2 \
      --bucket "$BACKUP_S3_BUCKET" \
      --prefix "backups/postgres/" \
      --query "Contents[?LastModified<='$cutoff_date'].Key" \
      --output text 2>/dev/null || echo "")
    
    if [ -n "$old_objects" ] && [ "$old_objects" != "None" ]; then
      for key in $old_objects; do
        aws s3 rm "s3://$BACKUP_S3_BUCKET/$key" > /dev/null 2>&1 && s3_deleted=$((s3_deleted + 1))
      done
      log_info "已從 S3 刪除 $s3_deleted 個舊備份"
    else
      log_info "沒有需要清理的 S3 舊備份"
    fi
  fi
}

# ==========================================
# 發送通知
# ==========================================

send_notification() {
  local status=$1
  local message=$2
  
  # 檢查是否需要發送通知
  if [ "$status" = "success" ] && [ "$NOTIFICATION_ON_SUCCESS" != true ]; then
    return 0
  fi
  
  if [ "$status" = "failure" ] && [ "$NOTIFICATION_ON_FAILURE" != true ]; then
    return 0
  fi
  
  log_step "發送通知..."
  
  local emoji="✅"
  local color="good"
  if [ "$status" = "failure" ]; then
    emoji="❌"
    color="danger"
  fi
  
  local backup_size="未知"
  if [ -f "$COMPRESSED_FILE" ]; then
    backup_size=$(du -h "$COMPRESSED_FILE" | cut -f1)
  fi
  
  # Slack 通知
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    local payload=$(cat <<EOF
{
  "attachments": [{
    "color": "$color",
    "title": "${emoji} PostgreSQL 備份 $status",
    "fields": [
      {"title": "Database", "value": "$POSTGRES_DB", "short": true},
      {"title": "Size", "value": "$backup_size", "short": true},
      {"title": "Host", "value": "$(hostname)", "short": true},
      {"title": "Time", "value": "$(date '+%Y-%m-%d %H:%M:%S')", "short": true}
    ],
    "footer": "Suggar Daddy Backup System",
    "ts": $(date +%s)
  }]
}
EOF
)
    
    curl -s -X POST -H 'Content-type: application/json' \
      --data "$payload" "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || log_warn "Slack 通知發送失敗"
  fi
  
  # Discord 通知
  if [ -n "$DISCORD_WEBHOOK_URL" ]; then
    local discord_payload=$(cat <<EOF
{
  "embeds": [{
    "title": "${emoji} PostgreSQL 備份 $status",
    "color": $([ "$status" = "success" ] && echo "3066993" || echo "15158332"),
    "fields": [
      {"name": "Database", "value": "$POSTGRES_DB", "inline": true},
      {"name": "Size", "value": "$backup_size", "inline": true},
      {"name": "Host", "value": "$(hostname)", "inline": true}
    ],
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }]
}
EOF
)
    
    curl -s -X POST -H 'Content-type: application/json' \
      --data "$discord_payload" "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || log_warn "Discord 通知發送失敗"
  fi
  
  # 郵件通知 (使用 mail 命令)
  if [ -n "$EMAIL_NOTIFICATION" ] && command -v mail > /dev/null 2>&1; then
    echo "$message" | mail -s "[Backup] PostgreSQL $status - $POSTGRES_DB" "$EMAIL_NOTIFICATION" || true
  fi
}

# ==========================================
# 備份驗證
# ==========================================

verify_backup() {
  log_step "驗證備份..."
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 跳過驗證"
    return 0
  fi
  
  # 檢查壓縮檔案完整性
  if ! gzip -t "$COMPRESSED_FILE" 2>/dev/null; then
    handle_error 1 "備份檔案損壞"
  fi
  
  log_info "備份檔案完整性檢查通過"
  
  # 檢查檔案大小（警告如果太小）
  local file_size=$(stat -f%z "$COMPRESSED_FILE" 2>/dev/null || stat -c%s "$COMPRESSED_FILE" 2>/dev/null || echo "0")
  local min_size=1024  # 1KB
  
  if [ "$file_size" -lt "$min_size" ]; then
    log_warn "備份檔案異常小: $file_size bytes"
  fi
}

# ==========================================
# 生成報告
# ==========================================

generate_report() {
  log_step "生成備份報告..."
  
  local duration=$1
  local status=$2
  
  local report_file="$LOG_DIR/backup-report-$(date +%Y%m%d-%H%M%S).json"
  
  cat > "$report_file" <<EOF
{
  "report_type": "backup",
  "status": "$status",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "duration_seconds": $duration,
  "configuration": {
    "database": "$POSTGRES_DB",
    "host": "$POSTGRES_HOST",
    "full_backup": $FULL_BACKUP,
    "s3_enabled": $BACKUP_TO_S3,
    "s3_bucket": "$BACKUP_S3_BUCKET"
  },
  "backup_details": {
    "local_file": "$COMPRESSED_FILE",
    "s3_url": "${S3_URL:-null}",
    "metadata_file": "$METADATA_FILE"
  }
}
EOF
  
  log_info "報告已保存: $report_file"
}

# ==========================================
# 主流程
# ==========================================

main() {
  local start_time=$(date +%s)
  local exit_code=0
  
  init
  
  # 執行備份流程
  if ! pre_checks; then
    exit_code=1
  elif ! backup_database; then
    exit_code=1
  elif ! compress_backup; then
    exit_code=1
  elif ! verify_backup; then
    exit_code=1
  elif ! upload_to_s3; then
    exit_code=1
  elif ! cleanup_old_backups; then
    exit_code=1
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  if [ $exit_code -eq 0 ]; then
    log_success "備份完成！耗時: ${duration}秒"
    send_notification "success" "備份成功完成 - $POSTGRES_DB"
    generate_report "$duration" "success"
  else
    log_error "備份失敗！耗時: ${duration}秒"
    send_notification "failure" "備份失敗 - $POSTGRES_DB"
    generate_report "$duration" "failure"
  fi
  
  exit $exit_code
}

# 執行主流程
main
