#!/bin/bash

# ==========================================
# 停止開發環境
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"
source "$CORE_DIR/port-checker.sh"
source "$CORE_DIR/parallel-start.sh"

# ==========================================
# 配置
# ==========================================

LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs/dev}"

# ==========================================
# 參數解析
# ==========================================

STOP_DOCKER=false
CLEAN_LOGS=false

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --docker       同時停止 Docker 容器
  --clean-logs   清理日誌文件
  -h, --help     顯示幫助信息

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --docker)
      STOP_DOCKER=true
      shift
      ;;
    --clean-logs)
      CLEAN_LOGS=true
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
  log_header "停止開發環境"
  
  # 1. 停止後台服務
  if [ -d "$LOG_DIR" ]; then
    log_step "停止後台服務..."
    stop_parallel_services "$LOG_DIR"
  else
    log_info "沒有找到運行中的服務"
  fi
  
  # 2. 停止 Docker 容器（如果需要）
  if [ "$STOP_DOCKER" = true ]; then
    log_step "停止 Docker 容器..."
    
    cd "$PROJECT_ROOT"
    
    if docker-compose ps | grep -q "Up"; then
      docker-compose down
      log_success "Docker 容器已停止"
    else
      log_info "Docker 容器未運行"
    fi
  fi
  
  # 3. 清理日誌（如果需要）
  if [ "$CLEAN_LOGS" = true ]; then
    log_step "清理日誌..."
    
    if [ -d "$LOG_DIR" ]; then
      rm -rf "$LOG_DIR"/*
      log_success "日誌已清理"
    fi
  fi
  
  log_success "開發環境已停止"
}

# 執行主流程
main
