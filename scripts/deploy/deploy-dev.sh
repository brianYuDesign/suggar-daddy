#!/bin/bash

# ==========================================
# 部署到開發環境
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"

# ==========================================
# 配置
# ==========================================

DEPLOY_ENV="dev"
DEPLOY_HOST="${DEPLOY_HOST:-localhost}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

# ==========================================
# 參數解析
# ==========================================

DRY_RUN=false
SKIP_BUILD=false

show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  --dry-run        只顯示部署步驟，不實際執行
  --skip-build     跳過建構步驟
  -h, --help       顯示幫助信息

Environment Variables:
  DEPLOY_HOST      部署主機（預設: localhost）
  DEPLOY_USER      部署用戶（預設: deploy）

Examples:
  $0                     # 部署到開發環境
  $0 --dry-run          # 模擬部署
  $0 --skip-build       # 跳過建構，只部署

EOF
}

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
  log_header "部署到開發環境"
  
  log_info "環境: $DEPLOY_ENV"
  log_info "主機: $DEPLOY_HOST"
  log_info "用戶: $DEPLOY_USER"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "模擬模式（不會實際執行）"
  fi
  
  cd "$PROJECT_ROOT"
  
  # 1. 建構（如果需要）
  if [ "$SKIP_BUILD" = false ]; then
    log_step "建構項目..."
    
    if [ "$DRY_RUN" = false ]; then
      "$SCRIPT_DIR/../build/build-all.sh" --production
    else
      log_info "[DRY RUN] 執行建構"
    fi
  else
    log_info "跳過建構步驟"
  fi
  
  # 2. 運行測試
  log_step "運行測試..."
  
  if [ "$DRY_RUN" = false ]; then
    if ! "$SCRIPT_DIR/../test/unit.sh"; then
      log_error "測試失敗，終止部署"
      exit 1
    fi
  else
    log_info "[DRY RUN] 運行測試"
  fi
  
  # 3. 建立部署包
  log_step "建立部署包..."
  
  if [ "$DRY_RUN" = false ]; then
    local deploy_package="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$deploy_package" dist/ package.json package-lock.json
    log_info "部署包: $deploy_package"
  else
    log_info "[DRY RUN] 建立部署包"
  fi
  
  # 4. 上傳部署包
  log_step "上傳部署包..."
  
  if [ "$DRY_RUN" = false ]; then
    if [ "$DEPLOY_HOST" != "localhost" ]; then
      scp "$deploy_package" "$DEPLOY_USER@$DEPLOY_HOST:/tmp/"
      log_success "部署包已上傳"
    else
      log_info "本地部署，跳過上傳"
    fi
  else
    log_info "[DRY RUN] 上傳部署包到 $DEPLOY_USER@$DEPLOY_HOST"
  fi
  
  # 5. 執行部署
  log_step "執行部署..."
  
  if [ "$DRY_RUN" = false ]; then
    if [ "$DEPLOY_HOST" != "localhost" ]; then
      ssh "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
        cd /var/www/suggar-daddy
        tar -xzf /tmp/deploy-*.tar.gz
        npm ci --production
        pm2 restart all
EOF
      log_success "部署完成"
    else
      log_info "本地部署，重啟服務..."
      "$SCRIPT_DIR/../dev/stop.sh"
      "$SCRIPT_DIR/../dev/start.sh"
    fi
  else
    log_info "[DRY RUN] 執行遠端部署命令"
  fi
  
  log_success "部署到開發環境完成！"
  
  echo ""
  log_info "下一步："
  echo "  1. 檢查服務狀態"
  echo "  2. 查看日誌"
  echo "  3. 運行煙霧測試"
}

# 執行主流程
main
