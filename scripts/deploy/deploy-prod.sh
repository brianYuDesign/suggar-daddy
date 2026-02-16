#!/bin/bash

# ==========================================
# 部署到生產環境
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(cd "$SCRIPT_DIR/../core" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$CORE_DIR/error-handler.sh"

# ==========================================
# 配置
# ==========================================

DEPLOY_ENV="production"
DEPLOY_HOST="${DEPLOY_HOST:-prod.suggar-daddy.com}"
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
  DEPLOY_HOST      部署主機（預設: prod.suggar-daddy.com）
  DEPLOY_USER      部署用戶（預設: deploy）

⚠️  WARNING: This deploys to PRODUCTION!

Examples:
  $0 --dry-run          # 模擬部署（強烈建議先執行）
  $0                     # 部署到生產環境

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
  log_header "部署到生產環境"
  
  # 多重確認
  log_error "⚠️  即將部署到生產環境！"
  log_warn "這將影響線上用戶"
  
  if [ "$DRY_RUN" = false ]; then
    if ! confirm "你確定要部署到生產環境嗎？"; then
      log_info "部署已取消"
      exit 0
    fi
    
    log_warn "最後確認："
    if ! confirm "真的要部署到生產環境嗎？（請再次確認）"; then
      log_info "部署已取消"
      exit 0
    fi
  fi
  
  # TODO: 實作生產環境部署邏輯
  log_info "生產環境部署尚未實作"
  log_info "請參考 deploy-dev.sh 實作"
  log_info "建議使用 CI/CD 自動化部署"
}

# 執行主流程
main
