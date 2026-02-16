#!/bin/bash

# ==========================================
# 統一錯誤處理和日誌工具
# ==========================================

# 顏色定義
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export MAGENTA='\033[0;35m'
export NC='\033[0m' # No Color

# 日誌級別
export LOG_LEVEL="${LOG_LEVEL:-INFO}" # DEBUG, INFO, WARN, ERROR

# 日誌目錄
export LOG_DIR="${LOG_DIR:-/tmp/suggar-daddy-logs}"
mkdir -p "$LOG_DIR"

# ==========================================
# 日誌函數
# ==========================================

log_debug() {
  if [ "$LOG_LEVEL" = "DEBUG" ]; then
    echo -e "${CYAN}[DEBUG]${NC} $1" >&2
    echo "[DEBUG] $(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/debug.log"
  fi
}

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1" >&2
  echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/info.log"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" >&2
  echo "[WARN] $(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/warn.log"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
  echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/error.log"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
  echo "[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/info.log"
}

log_step() {
  echo -e "${BLUE}[STEP]${NC} $1" >&2
  echo "[STEP] $(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_DIR/info.log"
}

log_header() {
  echo -e "\n${MAGENTA}========================================${NC}"
  echo -e "${MAGENTA}$1${NC}"
  echo -e "${MAGENTA}========================================${NC}\n"
}

# ==========================================
# 錯誤處理函數
# ==========================================

# 錯誤處理器
handle_error() {
  local exit_code=$1
  local error_msg=$2
  local context=$3
  
  log_error "$error_msg"
  
  if [ -n "$context" ]; then
    log_error "Context: $context"
  fi
  
  log_error "Exit code: $exit_code"
  
  # 保存錯誤到文件
  cat >> "$LOG_DIR/errors.log" <<EOF
========================================
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Error: $error_msg
Context: $context
Exit Code: $exit_code
========================================
EOF
  
  exit "$exit_code"
}

# 檢查命令是否存在
check_command() {
  local cmd=$1
  if ! command -v "$cmd" &> /dev/null; then
    handle_error 127 "Required command not found: $cmd" "Please install $cmd first"
  fi
}

# 檢查文件是否存在
check_file() {
  local file=$1
  if [ ! -f "$file" ]; then
    handle_error 2 "Required file not found: $file"
  fi
}

# 檢查目錄是否存在
check_directory() {
  local dir=$1
  if [ ! -d "$dir" ]; then
    handle_error 2 "Required directory not found: $dir"
  fi
}

# 確保命令成功執行
ensure_success() {
  local cmd=$1
  local error_msg=$2
  
  if ! eval "$cmd"; then
    handle_error $? "$error_msg" "Command: $cmd"
  fi
}

# ==========================================
# 進度顯示
# ==========================================

# 顯示進度條
show_progress() {
  local current=$1
  local total=$2
  local message=$3
  
  local percent=$((current * 100 / total))
  local filled=$((percent / 2))
  local empty=$((50 - filled))
  
  printf "\r${CYAN}[${NC}"
  printf "%${filled}s" | tr ' ' '='
  printf "%${empty}s" | tr ' ' ' '
  printf "${CYAN}]${NC} ${percent}%% - ${message}"
  
  if [ "$current" -eq "$total" ]; then
    echo ""
  fi
}

# 顯示旋轉器（用於長時間運行的任務）
show_spinner() {
  local pid=$1
  local message=$2
  local spinner=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  local i=0
  
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${CYAN}${spinner[$i]}${NC} ${message}"
    i=$(( (i + 1) % 10 ))
    sleep 0.1
  done
  
  printf "\r${GREEN}✓${NC} ${message}\n"
}

# ==========================================
# 清理函數
# ==========================================

# 註冊清理函數（在腳本退出時執行）
cleanup_handlers=()

register_cleanup() {
  local handler=$1
  cleanup_handlers+=("$handler")
}

# 執行所有清理函數
run_cleanup() {
  log_info "Running cleanup handlers..."
  for handler in "${cleanup_handlers[@]}"; do
    eval "$handler" || log_warn "Cleanup handler failed: $handler"
  done
}

# 設置 trap 來確保清理函數被執行
trap run_cleanup EXIT INT TERM

# ==========================================
# 工具函數
# ==========================================

# 確認用戶操作
confirm() {
  local message=$1
  local default=${2:-n}
  
  if [ "$default" = "y" ]; then
    read -p "$message [Y/n]: " response
    response=${response:-y}
  else
    read -p "$message [y/N]: " response
    response=${response:-n}
  fi
  
  case "$response" in
    [yY]|[yY][eE][sS])
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# 超時執行命令
timeout_command() {
  local timeout=$1
  local cmd=$2
  
  eval "timeout $timeout $cmd"
  local exit_code=$?
  
  if [ $exit_code -eq 124 ]; then
    log_error "Command timeout after ${timeout}s: $cmd"
    return 124
  fi
  
  return $exit_code
}

# 重試執行命令
retry_command() {
  local max_attempts=$1
  local delay=$2
  local cmd=$3
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    log_debug "Attempt $attempt/$max_attempts: $cmd"
    
    if eval "$cmd"; then
      return 0
    fi
    
    if [ $attempt -lt $max_attempts ]; then
      log_warn "Command failed, retrying in ${delay}s..."
      sleep "$delay"
    fi
    
    attempt=$((attempt + 1))
  done
  
  log_error "Command failed after $max_attempts attempts: $cmd"
  return 1
}

# ==========================================
# 導出所有函數
# ==========================================

export -f log_debug log_info log_warn log_error log_success log_step log_header
export -f handle_error check_command check_file check_directory ensure_success
export -f show_progress show_spinner
export -f register_cleanup run_cleanup
export -f confirm timeout_command retry_command
