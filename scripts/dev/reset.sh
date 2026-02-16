#!/bin/bash

# ==========================================
# 重置開發環境
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"

# ==========================================
# 參數解析
# ==========================================

RESET_DB=false
RESET_REDIS=false
RESET_KAFKA=false
RESET_ALL=false
CLEAN_DEPS=false

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --all          重置所有（資料庫、Redis、Kafka、依賴）
  --db           重置資料庫
  --redis        重置 Redis
  --kafka        重置 Kafka
  --deps         清理並重新安裝依賴
  -h, --help     顯示幫助信息

Warning: 這將刪除所有開發資料！

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      RESET_ALL=true
      shift
      ;;
    --db)
      RESET_DB=true
      shift
      ;;
    --redis)
      RESET_REDIS=true
      shift
      ;;
    --kafka)
      RESET_KAFKA=true
      shift
      ;;
    --deps)
      CLEAN_DEPS=true
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

# 如果使用 --all，啟用所有選項
if [ "$RESET_ALL" = true ]; then
  RESET_DB=true
  RESET_REDIS=true
  RESET_KAFKA=true
  CLEAN_DEPS=true
fi

# 如果沒有指定任何選項，顯示幫助
if [ "$RESET_DB" = false ] && [ "$RESET_REDIS" = false ] && [ "$RESET_KAFKA" = false ] && [ "$CLEAN_DEPS" = false ]; then
  show_usage
  exit 1
fi

# ==========================================
# 主流程
# ==========================================

main() {
  log_header "重置開發環境"
  
  # 確認操作
  log_warn "這將刪除以下資料："
  [ "$RESET_DB" = true ] && echo "  - PostgreSQL 資料庫"
  [ "$RESET_REDIS" = true ] && echo "  - Redis 快取"
  [ "$RESET_KAFKA" = true ] && echo "  - Kafka 訊息"
  [ "$CLEAN_DEPS" = true ] && echo "  - node_modules"
  echo ""
  
  if ! confirm "確定要繼續嗎？"; then
    log_info "操作已取消"
    exit 0
  fi
  
  # 1. 停止所有服務
  log_step "停止所有服務..."
  "$SCRIPT_DIR/stop.sh" --docker
  
  cd "$PROJECT_ROOT"
  
  # 2. 重置 Docker 容器
  if [ "$RESET_DB" = true ] || [ "$RESET_REDIS" = true ] || [ "$RESET_KAFKA" = true ]; then
    log_step "重置 Docker 容器..."
    
    # 停止並刪除容器
    docker-compose down -v
    
    # 刪除指定的 volume
    if [ "$RESET_DB" = true ]; then
      log_info "刪除 PostgreSQL volume..."
      docker volume rm suggar-daddy_postgres_data 2>/dev/null || true
    fi
    
    if [ "$RESET_REDIS" = true ]; then
      log_info "刪除 Redis volume..."
      docker volume rm suggar-daddy_redis_data 2>/dev/null || true
    fi
    
    if [ "$RESET_KAFKA" = true ]; then
      log_info "刪除 Kafka volume..."
      docker volume rm suggar-daddy_kafka_data 2>/dev/null || true
      docker volume rm suggar-daddy_zookeeper_data 2>/dev/null || true
    fi
    
    log_success "Docker 容器已重置"
  fi
  
  # 3. 清理依賴
  if [ "$CLEAN_DEPS" = true ]; then
    log_step "清理依賴..."
    
    # 刪除 node_modules
    log_info "刪除 node_modules..."
    rm -rf "$PROJECT_ROOT/node_modules"
    
    # 刪除 .nx cache
    log_info "清理 Nx cache..."
    rm -rf "$PROJECT_ROOT/.nx"
    
    # 刪除 dist
    log_info "清理 dist..."
    rm -rf "$PROJECT_ROOT/dist"
    
    # 重新安裝依賴
    log_info "重新安裝依賴..."
    npm ci
    
    log_success "依賴已重新安裝"
  fi
  
  # 4. 清理日誌
  log_step "清理日誌..."
  rm -rf "$PROJECT_ROOT/logs"
  
  log_success "開發環境已重置"
  
  echo ""
  echo "下一步："
  echo "  1. 啟動開發環境: ./scripts/dev/start.sh"
  echo "  2. 初始化資料庫: ./scripts/db/migrate.sh"
  echo "  3. 載入種子資料: ./scripts/db/seed.sh"
  echo ""
}

# 執行主流程
main
