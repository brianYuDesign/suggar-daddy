#!/bin/bash

# ==========================================
# 自動備份 Cron 任務設定腳本
# ==========================================
# 功能：
# - 建立 crontab 任務
# - 每日 02:00 執行備份
# - 支持多種備份策略
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

BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 2 * * *}"
CRON_USER="${CRON_USER:-$(whoami)}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs/backup}"
BACKUP_STRATEGY="${BACKUP_STRATEGY:-daily}"
FULL_BACKUP_DAY="${FULL_BACKUP_DAY:-0}"

# ==========================================
# 命令行參數
# ==========================================

ACTION="install"

show_usage() {
  cat << 'EOF'
Usage: $0 [OPTIONS] [ACTION]

Actions:
  install                 安裝 cron 任務 [預設]
  remove                  移除 cron 任務
  status                  顯示當前狀態
  test                    測試備份腳本

Options:
  -s, --schedule "CRON"   設定自定義排程 [預設: "0 2 * * *"]
  -u, --user USER         設定執行用戶 [預設: 當前用戶]
  --strategy STRATEGY     備份策略: daily, weekly-full, incremental
  --full-day DAY          完整備份日期 [0=周日, 1=周一, ...]
  --show                  顯示當前 crontab
  -h, --help              顯示幫助信息

排程格式 [Cron]:
  分 時 日 月 星期
  0 2 * * *     = 每日 02:00
  0 2 * * 0     = 每週日 02:00
  0 */6 * * *   = 每 6 小時

Examples:
  $0                      # 安裝每日 02:00 備份
  $0 --strategy weekly-full --full-day 0   # 每週日完整備份
  $0 -s "0 3 * * *"       # 每日 03:00 備份
  $0 remove               # 移除所有備份任務
  $0 status               # 顯示當前狀態
  $0 test                 # 測試備份腳本

EOF
}

# 解析參數
while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--schedule)
      CRON_SCHEDULE="$2"
      shift 2
      ;;
    -u|--user)
      CRON_USER="$2"
      shift 2
      ;;
    --strategy)
      BACKUP_STRATEGY="$2"
      shift 2
      ;;
    --full-day)
      FULL_BACKUP_DAY="$2"
      shift 2
      ;;
    --show)
      shift
      ;;
    install|add|setup)
      ACTION="install"
      shift
      ;;
    remove|delete|uninstall)
      ACTION="remove"
      shift
      ;;
    status|show)
      ACTION="status"
      shift
      ;;
    test)
      ACTION="test"
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
      log_error "Unknown action: $1"
      show_usage
      exit 1
      ;;
  esac
done

# ==========================================
# 檢查環境
# ==========================================

check_environment() {
  log_step "檢查環境..."
  
  if [ ! -f "$BACKUP_SCRIPT" ]; then
    handle_error 1 "備份腳本不存在: $BACKUP_SCRIPT"
  fi
  
  if [ ! -x "$BACKUP_SCRIPT" ]; then
    log_warn "備份腳本沒有執行權限，正在添加..."
    chmod +x "$BACKUP_SCRIPT"
  fi
  
  check_command "crontab"
  
  if command -v systemctl > /dev/null 2>&1; then
    if ! systemctl is-active --quiet cron 2>/dev/null && ! systemctl is-active --quiet crond 2>/dev/null; then
      log_warn "Cron 服務可能未運行"
    fi
  fi
  
  mkdir -p "$LOG_DIR"
  log_success "環境檢查通過"
}

# ==========================================
# 驗證 cron 表達式
# ==========================================

validate_cron_schedule() {
  local schedule="$1"
  local field_count=$(echo "$schedule" | awk '{print NF}')
  if [ "$field_count" -ne 5 ]; then
    handle_error 1 "無效的 cron 排程格式: $schedule [需要 5 個字段]"
  fi
  log_info "Cron 排程驗證通過: $schedule"
}

# ==========================================
# 生成備份命令
# ==========================================

generate_backup_command() {
  local cron_cmd=""
  
  case "$BACKUP_STRATEGY" in
    daily)
      cron_cmd="$BACKUP_SCRIPT >> $LOG_DIR/cron-backup.log 2>&1"
      ;;
      
    weekly-full)
      local wrapper_script="$SCRIPT_DIR/backup-wrapper.sh"
      generate_wrapper_script "$wrapper_script"
      chmod +x "$wrapper_script"
      cron_cmd="$wrapper_script >> $LOG_DIR/cron-backup.log 2>&1"
      ;;
      
    incremental)
      log_warn "增量備份需要額外的 WAL 歸檔配置"
      cron_cmd="$BACKUP_SCRIPT >> $LOG_DIR/cron-backup.log 2>&1"
      ;;
      
    *)
      log_warn "未知的備份策略: $BACKUP_STRATEGY，使用預設 daily"
      cron_cmd="$BACKUP_SCRIPT >> $LOG_DIR/cron-backup.log 2>&1"
      ;;
  esac
  
  echo "$cron_cmd"
}

# ==========================================
# 生成包裝腳本
# ==========================================

generate_wrapper_script() {
  local wrapper_script="$1"
  
  echo "#!/bin/bash" > "$wrapper_script"
  echo "SCRIPT_DIR=\"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)\"" >> "$wrapper_script"
  echo "FULL_BACKUP_DAY=\"$FULL_BACKUP_DAY\"" >> "$wrapper_script"
  echo "BACKUP_SCRIPT=\"\$SCRIPT_DIR/backup-database.sh\"" >> "$wrapper_script"
  echo "LOG_DIR=\"$LOG_DIR\"" >> "$wrapper_script"
  echo "" >> "$wrapper_script"
  echo 'if [ "$(date +%w)" = "$FULL_BACKUP_DAY" ]; then' >> "$wrapper_script"
  echo '  $BACKUP_SCRIPT --full >> "$LOG_DIR/cron-backup.log" 2>&1' >> "$wrapper_script"
  echo 'else' >> "$wrapper_script"
  echo '  $BACKUP_SCRIPT >> "$LOG_DIR/cron-backup.log" 2>&1' >> "$wrapper_script"
  echo 'fi' >> "$wrapper_script"
}

# ==========================================
# 安裝 cron 任務
# ==========================================

install_cron() {
  log_header "安裝自動備份 Cron 任務"
  
  validate_cron_schedule "$CRON_SCHEDULE"
  
  local backup_cmd=$(generate_backup_command)
  local marker="# suggar-daddy-postgres-backup"
  
  log_info "排程: $CRON_SCHEDULE"
  log_info "策略: $BACKUP_STRATEGY"
  log_info "用戶: $CRON_USER"
  
  local current_crontab=""
  if crontab -l > /dev/null 2>&1; then
    current_crontab=$(crontab -l 2>/dev/null || echo "")
  fi
  
  if echo "$current_crontab" | grep -q "$marker"; then
    log_warn "備份任務已存在，正在更新..."
    current_crontab=$(echo "$current_crontab" | grep -v "$marker")
  fi
  
  # 獲取當前時間
  local install_time=$(date '+%Y-%m-%d %H:%M:%S')
  
  # 創建新的 crontab 內容
  local new_crontab_content="$current_crontab

# ==========================================
# Suggar Daddy PostgreSQL 自動備份
# 安裝時間: $install_time
# $marker
$marker
# 策略: $BACKUP_STRATEGY | 排程: $CRON_SCHEDULE
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
$CRON_SCHEDULE $backup_cmd
# end-$marker
# ==========================================
"
  
  echo "$new_crontab_content" | crontab -
  
  log_success "Cron 任務已安裝"
  show_current_cron
}

# ==========================================
# 移除 cron 任務
# ==========================================

remove_cron() {
  log_header "移除自動備份 Cron 任務"
  
  local marker="# suggar-daddy-postgres-backup"
  
  local current_crontab=""
  if crontab -l > /dev/null 2>&1; then
    current_crontab=$(crontab -l 2>/dev/null || echo "")
  else
    log_warn "沒有找到 crontab"
    return 0
  fi
  
  if ! echo "$current_crontab" | grep -q "$marker"; then
    log_warn "沒有找到備份任務"
    return 0
  fi
  
  local new_crontab=$(echo "$current_crontab" | sed "/$marker/,/# end-$marker/d")
  echo "$new_crontab" | crontab -
  
  log_success "Cron 任務已移除"
}

# ==========================================
# 顯示當前 cron 任務
# ==========================================

show_current_cron() {
  log_header "當前 Crontab"
  
  if crontab -l > /dev/null 2>&1; then
    echo ""
    crontab -l | grep -A 20 "suggar-daddy" || echo "沒有找到 suggar-daddy 相關任務"
    echo ""
  else
    log_warn "沒有找到 crontab"
  fi
}

# ==========================================
# 顯示狀態
# ==========================================

show_status() {
  log_header "備份系統狀態"
  
  echo ""
  echo "=== Cron 服務狀態 ==="
  if command -v systemctl > /dev/null 2>&1; then
    systemctl status cron 2>/dev/null || systemctl status crond 2>/dev/null || echo "無法獲取服務狀態"
  else
    echo "systemctl 不可用"
  fi
  
  echo ""
  echo "=== 當前 Crontab ==="
  show_current_cron
  
  echo ""
  echo "=== 備份腳本 ==="
  echo "路徑: $BACKUP_SCRIPT"
  echo "權限: $(ls -la "$BACKUP_SCRIPT" 2>/dev/null | awk '{print $1}' || echo 'N/A')"
  echo "大小: $(ls -lh "$BACKUP_SCRIPT" 2>/dev/null | awk '{print $5}' || echo 'N/A')"
  
  echo ""
  echo "=== 日誌目錄 ==="
  echo "路徑: $LOG_DIR"
  if [ -d "$LOG_DIR" ]; then
    echo "存在: 是"
    echo "最近日誌:"
    ls -lt "$LOG_DIR" 2>/dev/null | head -5 || echo "無日誌檔案"
  else
    echo "存在: 否"
  fi
  
  echo ""
  echo "=== 環境變數 ==="
  echo "POSTGRES_DB: ${POSTGRES_DB:-未設定}"
  echo "BACKUP_S3_BUCKET: ${BACKUP_S3_BUCKET:-未設定}"
  echo "BACKUP_TO_S3: ${BACKUP_TO_S3:-未設定}"
  echo "RETENTION_DAYS: ${RETENTION_DAYS:-未設定}"
}

# ==========================================
# 測試備份
# ==========================================

test_backup() {
  log_header "測試備份腳本"
  
  log_info "執行測試備份 [dry-run]..."
  
  if "$BACKUP_SCRIPT" --dry-run; then
    log_success "測試備份完成"
    
    echo ""
    log_info "執行真實備份測試..."
    if confirm "是否執行真實備份測試 [將創建實際備份]"; then
      if "$BACKUP_SCRIPT"; then
        log_success "真實備份測試完成"
      else
        log_error "真實備份測試失敗"
        return 1
      fi
    fi
  else
    log_error "測試備份失敗"
    return 1
  fi
}

# ==========================================
# 主流程
# ==========================================

main() {
  case "$ACTION" in
    install)
      check_environment
      install_cron
      
      echo ""
      log_info "備份策略: $BACKUP_STRATEGY"
      case "$BACKUP_STRATEGY" in
        daily)
          log_info "每日 $CRON_SCHEDULE 執行標準備份"
          ;;
        weekly-full)
          log_info "每週星期 $FULL_BACKUP_DAY 執行完整備份，其他日子執行標準備份"
          ;;
      esac
      
      echo ""
      log_info "日誌檔案: $LOG_DIR/cron-backup.log"
      log_info "使用 '$0 status' 查看狀態"
      log_info "使用 '$0 test' 測試備份"
      ;;
      
    remove)
      remove_cron
      ;;
      
    status)
      show_status
      ;;
      
    test)
      test_backup
      ;;
      
    *)
      log_error "未知操作: $ACTION"
      show_usage
      exit 1
      ;;
  esac
}

# 執行主流程
main
