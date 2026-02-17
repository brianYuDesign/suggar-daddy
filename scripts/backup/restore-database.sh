#!/bin/bash

# ==========================================
# PostgreSQL 資料庫恢復腳本
# ==========================================
# 功能：
# - 從 S3 下載備份
# - 恢復到指定時間點
# - 驗證資料完整性
# - 包含安全確認機制
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

# 恢復配置
RESTORE_DIR="${RESTORE_DIR:-$PROJECT_ROOT/restore}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# 驗證配置
VALIDATE_AFTER_RESTORE="${VALIDATE_AFTER_RESTORE:-true}"
TEST_QUERY="${TEST_QUERY:-SELECT count(*) FROM information_schema.tables}"

# 日誌配置
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs/restore}"

# ==========================================
# 全局變量
# ==========================================

BACKUP_FILE=""
RESTORE_START_TIME=""
DRY_RUN=false
FORCE_RESTORE=false
SKIP_CONFIRM=false

# ==========================================
# 幫助信息
# ==========================================

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS] [BACKUP_SOURCE]

Options:
  -l, --list              列出可用的 S3 備份
  -f, --file FILE         使用本地備份檔案
  -s, --s3-key KEY        從 S3 下載指定備份
  -d, --date YYYYMMDD     恢復指定日期的最新備份
  -t, --target-db DB      恢復到指定資料庫 (預設: $POSTGRES_DB)
  --dry-run               測試模式，不實際執行恢復
  --force                 跳過確認提示 (危險！)
  --skip-validation       跳過恢復後驗證
  -y, --yes               自動確認所有提示
  -h, --help              顯示幫助信息

Arguments:
  BACKUP_SOURCE           備份來源 (本地檔案路徑或 S3 key)

Examples:
  $0 --list                               # 列出 S3 備份
  $0 -f /path/to/backup.sql.gz           # 從本地檔案恢復
  $0 -s "backups/postgres/2024/01/15/backup_xxx.sql.gz"  # 從 S3 恢復
  $0 -d 20240115                         # 恢復指定日期的最新備份
  $0 --dry-run -f backup.sql.gz          # 測試恢復流程

警告：
  此腳本將覆蓋現有資料庫數據！請確保已備份當前數據。

EOF
}

# ==========================================
# 參數解析
# ==========================================

LIST_BACKUPS=false
LOCAL_FILE=""
S3_KEY=""
TARGET_DATE=""
TARGET_DB="$POSTGRES_DB"

while [[ $# -gt 0 ]]; do
  case $1 in
    -l|--list)
      LIST_BACKUPS=true
      shift
      ;;
    -f|--file)
      LOCAL_FILE="$2"
      shift 2
      ;;
    -s|--s3-key)
      S3_KEY="$2"
      shift 2
      ;;
    -d|--date)
      TARGET_DATE="$2"
      shift 2
      ;;
    -t|--target-db)
      TARGET_DB="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE_RESTORE=true
      shift
      ;;
    --skip-validation)
      VALIDATE_AFTER_RESTORE=false
      shift
      ;;
    -y|--yes)
      SKIP_CONFIRM=true
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
      # 如果沒有指定 -f 或 -s，將參數視為備份來源
      if [ -z "$LOCAL_FILE" ] && [ -z "$S3_KEY" ]; then
        if [[ "$1" == s3://* ]]; then
          S3_KEY="${1#s3://*/}"
        elif [ -f "$1" ]; then
          LOCAL_FILE="$1"
        else
          S3_KEY="$1"
        fi
      fi
      shift
      ;;
  esac
done

# ==========================================
# 初始化
# ==========================================

init() {
  log_header "PostgreSQL 資料庫恢復"
  
  # 建立目錄
  mkdir -p "$RESTORE_DIR"
  mkdir -p "$LOG_DIR"
  
  RESTORE_START_TIME=$(date +%s)
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "=== 測試模式 (DRY RUN) - 不會實際修改數據 ==="
  fi
}

# ==========================================
# 列出可用備份
# ==========================================

list_available_backups() {
  log_header "可用備份列表 (S3)"
  
  if [ -z "$BACKUP_S3_BUCKET" ]; then
    handle_error 1 "未配置 BACKUP_S3_BUCKET"
  fi
  
  check_command "aws"
  
  log_info "正在獲取 S3 備份列表..."
  echo ""
  
  # 列出最近的 20 個備份
  aws s3api list-objects-v2 \
    --bucket "$BACKUP_S3_BUCKET" \
    --prefix "backups/postgres/" \
    --query "sort_by(Contents[?ends_with(Key, '.gz')], &LastModified)[-20:]" \
    --output table \
    --columns "Key:Key" "Size:Size" "LastModified:LastModified" 2>/dev/null || {
    log_error "無法獲取 S3 備份列表"
    exit 1
  }
  
  echo ""
  log_info "使用方式: $0 -s \"backups/postgres/YYYY/MM/DD/filename.sql.gz\""
}

# ==========================================
# 前置檢查
# ==========================================

pre_checks() {
  log_step "執行前置檢查..."
  
  # 檢查必要命令
  check_command "docker"
  
  if [ -n "$S3_KEY" ] || [ -n "$TARGET_DATE" ]; then
    check_command "aws"
  fi
  
  # 檢查 PostgreSQL 容器
  if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    handle_error 1 "PostgreSQL 容器未運行: $POSTGRES_CONTAINER"
  fi
  
  # 檢查資料庫連接
  if ! docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
    handle_error 1 "無法連接到 PostgreSQL 資料庫"
  fi
  
  log_info "PostgreSQL 連接正常"
  
  # 獲取當前資料庫信息
  local current_db_size=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" \
    -t -c "SELECT pg_size_pretty(pg_database_size('$TARGET_DB'));" 2>/dev/null | xargs || echo "unknown")
  
  log_info "目標資料庫: $TARGET_DB"
  log_info "當前大小: $current_db_size"
  
  log_success "前置檢查通過"
}

# ==========================================
# 安全確認
# ==========================================

safety_confirmation() {
  if [ "$FORCE_RESTORE" = true ] || [ "$DRY_RUN" = true ]; then
    return 0
  fi
  
  log_header "⚠️  警告：數據恢復確認"
  
  echo -e "${RED}此操作將覆蓋資料庫 '$TARGET_DB' 中的所有數據！${NC}"
  echo ""
  echo "恢復詳情："
  echo "  目標資料庫: $TARGET_DB"
  echo "  目標主機: $POSTGRES_HOST"
  echo "  備份來源: ${LOCAL_FILE:-$S3_KEY}"
  echo ""
  
  if [ "$SKIP_CONFIRM" = false ]; then
    echo -e "${YELLOW}請輸入資料庫名稱 '$TARGET_DB' 以確認恢復操作：${NC}"
    read -r confirmation
    
    if [ "$confirmation" != "$TARGET_DB" ]; then
      log_error "確認失敗，恢復操作已取消"
      exit 1
    fi
    
    echo ""
    if ! confirm "確定要繼續恢復操作嗎？此操作不可撤銷"; then
      log_info "恢復操作已取消"
      exit 0
    fi
  fi
  
  log_warn "已確認恢復操作"
}

# ==========================================
# 下載備份
# ==========================================

download_backup() {
  log_step "準備備份檔案..."
  
  # 如果使用本地檔案
  if [ -n "$LOCAL_FILE" ]; then
    if [ ! -f "$LOCAL_FILE" ]; then
      handle_error 1 "本地備份檔案不存在: $LOCAL_FILE"
    fi
    
    BACKUP_FILE="$LOCAL_FILE"
    log_info "使用本地備份: $BACKUP_FILE"
    return 0
  fi
  
  # 如果指定了日期，查找該日期的最新備份
  if [ -n "$TARGET_DATE" ]; then
    log_info "查找 $TARGET_DATE 的最新備份..."
    
    local year=${TARGET_DATE:0:4}
    local month=${TARGET_DATE:4:2}
    local day=${TARGET_DATE:6:2}
    
    S3_KEY=$(aws s3api list-objects-v2 \
      --bucket "$BACKUP_S3_BUCKET" \
      --prefix "backups/postgres/$year/$month/$day/" \
      --query "sort_by(Contents[?ends_with(Key, '.gz')], &LastModified)[-1].Key" \
      --output text 2>/dev/null || echo "")
    
    if [ -z "$S3_KEY" ] || [ "$S3_KEY" = "None" ]; then
      handle_error 1 "找不到 $TARGET_DATE 的備份"
    fi
    
    log_info "找到備份: $S3_KEY"
  fi
  
  # 從 S3 下載
  if [ -n "$S3_KEY" ]; then
    log_info "從 S3 下載備份..."
    
    local filename=$(basename "$S3_KEY")
    BACKUP_FILE="$RESTORE_DIR/$filename"
    
    if [ "$DRY_RUN" = true ]; then
      log_info "[DRY RUN] 將下載: s3://$BACKUP_S3_BUCKET/$S3_KEY"
      touch "$BACKUP_FILE"
      return 0
    fi
    
    if ! aws s3 cp "s3://$BACKUP_S3_BUCKET/$S3_KEY" "$BACKUP_FILE"; then
      handle_error 1 "S3 下載失敗"
    fi
    
    log_success "下載完成: $BACKUP_FILE"
  fi
  
  if [ -z "$BACKUP_FILE" ]; then
    handle_error 1 "未指定備份來源"
  fi
}

# ==========================================
# 解壓備份
# ==========================================

decompress_backup() {
  log_step "解壓備份檔案..."
  
  if [[ "$BACKUP_FILE" != *.gz ]]; then
    log_info "備份檔案未壓縮，跳過解壓"
    return 0
  fi
  
  local decompressed_file="${BACKUP_FILE%.gz}"
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 將解壓: $BACKUP_FILE"
    return 0
  fi
  
  log_info "解壓 $BACKUP_FILE ..."
  gunzip -c "$BACKUP_FILE" > "$decompressed_file"
  
  if [ ! -f "$decompressed_file" ]; then
    handle_error 1 "解壓失敗"
  fi
  
  BACKUP_FILE="$decompressed_file"
  log_success "解壓完成: $BACKUP_FILE"
}

# ==========================================
# 驗證備份檔案
# ==========================================

verify_backup_file() {
  log_step "驗證備份檔案..."
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 跳過驗證"
    return 0
  fi
  
  # 檢查檔案是否存在
  if [ ! -f "$BACKUP_FILE" ]; then
    handle_error 1 "備份檔案不存在: $BACKUP_FILE"
  fi
  
  # 檢查檔案大小
  local file_size=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "0")
  if [ "$file_size" -lt 1024 ]; then
    handle_error 1 "備份檔案異常小: $file_size bytes"
  fi
  
  # 檢查 SQL 檔案頭部
  local header=$(head -c 100 "$BACKUP_FILE" | strings | head -5)
  if ! echo "$header" | grep -qE "(PostgreSQL|pg_dump|CREATE|INSERT|SET)"; then
    log_warn "備份檔案格式可能不正確"
    if ! confirm "是否繼續"; then
      exit 1
    fi
  fi
  
  log_success "備份檔案驗證通過"
}

# ==========================================
# 執行恢復
# ==========================================

perform_restore() {
  log_step "執行資料庫恢復..."
  
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] 將執行恢復操作"
    return 0
  fi
  
  # 終止現有連接
  log_info "終止資料庫現有連接..."
  docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres <<EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$TARGET_DB' 
  AND pid <> pg_backend_pid();
EOF
  
  # 如果資料庫不存在則創建
  log_info "檢查並創建資料庫 (如果不存在)..."
  docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "
    SELECT 'CREATE DATABASE $TARGET_DB'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$TARGET_DB');
  " || true
  
  # 執行恢復
  log_info "正在恢復數據..."
  
  # 使用 pv 顯示進度 (如果可用)
  if command -v pv > /dev/null 2>&1; then
    pv "$BACKUP_FILE" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" 2>&1 | tee -a "$LOG_DIR/restore-$(date +%Y%m%d).log"
  else
    docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" < "$BACKUP_FILE" 2>&1 | tee -a "$LOG_DIR/restore-$(date +%Y%m%d).log"
  fi
  
  local exit_code=${PIPESTATUS[0]}
  
  if [ $exit_code -ne 0 ]; then
    handle_error $exit_code "恢復過程中發生錯誤"
  fi
  
  log_success "資料庫恢復完成"
}

# ==========================================
# 恢復後驗證
# ==========================================

validate_restore() {
  if [ "$VALIDATE_AFTER_RESTORE" != true ] || [ "$DRY_RUN" = true ]; then
    return 0
  fi
  
  log_step "驗證恢復結果..."
  
  # 檢查資料庫連接
  if ! docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$TARGET_DB" > /dev/null 2>&1; then
    handle_error 1 "恢復後無法連接到資料庫"
  fi
  
  # 執行測試查詢
  log_info "執行驗證查詢..."
  
  local table_count=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" \
    -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
  
  log_info "公共 schema 中的表數量: $table_count"
  
  if [ "$table_count" -eq 0 ]; then
    log_warn "資料庫中沒有表，可能恢復失敗"
  else
    log_success "驗證通過: 發現 $table_count 個表"
  fi
  
  # 檢查資料庫大小
  local db_size=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" \
    -t -c "SELECT pg_size_pretty(pg_database_size('$TARGET_DB'));" 2>/dev/null | xargs || echo "unknown")
  
  log_info "恢復後資料庫大小: $db_size"
  
  # 檢查是否有錯誤日誌
  if [ -f "$LOG_DIR/restore-$(date +%Y%m%d).log" ]; then
    local error_count=$(grep -i "error\|fatal\|failed" "$LOG_DIR/restore-$(date +%Y%m%d).log" | wc -l || echo "0")
    if [ "$error_count" -gt 0 ]; then
      log_warn "恢復過程中發現 $error_count 個錯誤/警告"
      log_info "請查看日誌: $LOG_DIR/restore-$(date +%Y%m%d).log"
    fi
  fi
}

# ==========================================
# 生成報告
# ==========================================

generate_restore_report() {
  log_step "生成恢復報告..."
  
  local end_time=$(date +%s)
  local duration=$((end_time - RESTORE_START_TIME))
  
  local db_size=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$TARGET_DB" \
    -t -c "SELECT pg_size_pretty(pg_database_size('$TARGET_DB'));" 2>/dev/null | xargs || echo "unknown")
  
  local report_file="$LOG_DIR/restore-report-$(date +%Y%m%d-%H%M%S).json"
  
  cat > "$report_file" <<EOF
{
  "report_type": "restore",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "duration_seconds": $duration,
  "source": {
    "type": "$([ -n "$LOCAL_FILE" ] && echo 'local' || echo 's3')",
    "file": "$BACKUP_FILE",
    "s3_key": "${S3_KEY:-null}"
  },
  "target": {
    "database": "$TARGET_DB",
    "host": "$POSTGRES_HOST",
    "container": "$POSTGRES_CONTAINER"
  },
  "result": {
    "database_size": "$db_size",
    "status": "success"
  }
}
EOF
  
  log_info "報告已保存: $report_file"
  
  echo ""
  log_header "恢復摘要"
  echo "  目標資料庫: $TARGET_DB"
  echo "  備份來源: ${LOCAL_FILE:-$S3_KEY}"
  echo "  恢復耗時: ${duration} 秒"
  echo "  當前大小: $db_size"
  echo "  報告檔案: $report_file"
}

# ==========================================
# 清理
# ==========================================

cleanup() {
  if [ "$DRY_RUN" = true ]; then
    return 0
  fi
  
  # 如果從 S3 下載的檔案，可以選擇保留或刪除
  if [ -n "$S3_KEY" ] && [ -f "$BACKUP_FILE" ]; then
    log_info "下載的備份檔案保留在: $BACKUP_FILE"
    # 如果需要自動刪除，取消下面的註釋
    # rm -f "$BACKUP_FILE"
  fi
}

# ==========================================
# 主流程
# ==========================================

main() {
  # 如果只是列出備份
  if [ "$LIST_BACKUPS" = true ]; then
    list_available_backups
    exit 0
  fi
  
  init
  
  # 檢查是否有備份來源
  if [ -z "$LOCAL_FILE" ] && [ -z "$S3_KEY" ] && [ -z "$TARGET_DATE" ]; then
    log_error "未指定備份來源"
    show_usage
    exit 1
  fi
  
  # 執行恢復流程
  pre_checks
  safety_confirmation
  download_backup
  verify_backup_file
  decompress_backup
  perform_restore
  validate_restore
  generate_restore_report
  cleanup
  
  log_success "恢復流程完成！"
}

# 執行主流程
main
