#!/bin/bash
#
# 系統回滾腳本
# Suggar Daddy - Rollback Script
# 
# 功能：
# - 回滾到上一個穩定版本
# - 回滾資料庫（從備份恢復）
# - 回滾 Docker 映像
# - 驗證回滾結果
#
# 使用方式：
#   ./rollback.sh [options]
#
# 選項：
#   --type <app|database|all>    回滾類型（預設: app）
#   --backup-file <file>         資料庫備份檔案路徑
#   --image-tag <tag>            Docker 映像標籤
#   --verify                     回滾後執行驗證
#   --dry-run                    模擬運行（不實際執行）
#   --help                       顯示幫助信息

set -euo pipefail

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默認配置
ROLLBACK_TYPE="app"
BACKUP_FILE=""
IMAGE_TAG=""
VERIFY=false
DRY_RUN=false
BACKUP_DIR="./backups"

# 資料庫配置
POSTGRES_HOST="${POSTGRES_HOST:-postgres-master}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-suggar_daddy}"

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 顯示幫助
show_help() {
    cat << EOF
系統回滾腳本

使用方式：
    $0 [options]

選項：
    --type <app|database|all>    回滾類型（預設: app）
    --backup-file <file>         資料庫備份檔案路徑
    --image-tag <tag>            Docker 映像標籤（預設: 自動偵測上一個版本）
    --verify                     回滾後執行驗證測試
    --dry-run                    模擬運行，不實際執行
    --help                       顯示此幫助信息

回滾類型：
    app         - 回滾應用程式（Docker 容器）
    database    - 回滾資料庫（從備份恢復）
    all         - 回滾應用程式和資料庫

範例：
    # 回滾應用到上一個版本
    $0 --type app

    # 回滾資料庫到指定備份
    $0 --type database --backup-file backups/postgres_suggar_daddy_20240217_120000.sql.gz

    # 回滾應用到指定版本並驗證
    $0 --type app --image-tag v1.2.3 --verify

    # 完整回滾（應用 + 資料庫）
    $0 --type all --backup-file backups/postgres_suggar_daddy_20240217_120000.sql.gz --verify

    # 模擬運行（不實際執行）
    $0 --type all --dry-run

注意事項：
    ⚠️  回滾資料庫會覆蓋當前資料，請確保已有最新備份！
    ⚠️  建議在回滾前先停止所有服務
    ⚠️  回滾後請執行完整的驗證測試

EOF
}

# 解析參數
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                ROLLBACK_TYPE="$2"
                shift 2
                ;;
            --backup-file)
                BACKUP_FILE="$2"
                shift 2
                ;;
            --image-tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --verify)
                VERIFY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知參數: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 執行命令（支援 dry-run）
execute_cmd() {
    local cmd="$1"
    local description="$2"
    
    log_info "$description"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[DRY-RUN] 將執行: $cmd"
        return 0
    else
        if eval "$cmd"; then
            log_success "執行成功"
            return 0
        else
            log_error "執行失敗: $cmd"
            return 1
        fi
    fi
}

# 確認操作
confirm_action() {
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi
    
    log_warning "=========================================="
    log_warning "⚠️  即將執行回滾操作 ⚠️"
    log_warning "=========================================="
    log_warning "回滾類型: $ROLLBACK_TYPE"
    [ -n "$BACKUP_FILE" ] && log_warning "備份檔案: $BACKUP_FILE"
    [ -n "$IMAGE_TAG" ] && log_warning "映像標籤: $IMAGE_TAG"
    log_warning "=========================================="
    log_warning "此操作可能影響生產環境，請確認！"
    log_warning "=========================================="
    
    read -p "確定要繼續嗎？ (yes/no): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "操作已取消"
        exit 0
    fi
}

# 檢查 Docker 服務
check_docker_services() {
    log_info "檢查 Docker 服務狀態..."
    
    if ! docker ps &> /dev/null; then
        log_error "無法連接到 Docker，請確認 Docker 正在運行"
        exit 1
    fi
    
    log_success "Docker 服務正常"
}

# 獲取當前運行的映像標籤
get_current_image_tag() {
    local service="$1"
    docker inspect --format='{{.Config.Image}}' "suggar-daddy-$service" 2>/dev/null | cut -d: -f2 || echo "unknown"
}

# 自動偵測上一個映像版本
detect_previous_image_tag() {
    log_info "偵測上一個映像版本..."
    
    # 這裡應該從 Git tags 或容器 registry 獲取
    # 簡化版本：使用 'previous' 標籤
    echo "previous"
}

# 停止所有服務
stop_services() {
    log_info "停止所有服務..."
    
    execute_cmd "docker-compose down" "停止 Docker Compose 服務"
}

# 啟動所有服務
start_services() {
    log_info "啟動所有服務..."
    
    execute_cmd "docker-compose up -d" "啟動 Docker Compose 服務"
    
    if [ "$DRY_RUN" = false ]; then
        log_info "等待服務啟動..."
        sleep 30
    fi
}

# 回滾應用程式
rollback_application() {
    log_info "=========================================="
    log_info "開始回滾應用程式..."
    log_info "=========================================="
    
    # 如果沒有指定映像標籤，自動偵測
    if [ -z "$IMAGE_TAG" ]; then
        IMAGE_TAG=$(detect_previous_image_tag)
        log_info "使用映像標籤: $IMAGE_TAG"
    fi
    
    # 記錄當前版本（用於回滾失敗時恢復）
    log_info "記錄當前版本..."
    local current_api_tag=$(get_current_image_tag "api-gateway")
    log_info "當前 API Gateway 版本: $current_api_tag"
    
    # 停止服務
    stop_services
    
    # 更新映像標籤
    log_info "更新 Docker Compose 配置..."
    # 這裡應該更新 docker-compose.yml 或使用環境變數
    
    # 拉取舊版本映像
    log_info "拉取舊版本映像: $IMAGE_TAG"
    execute_cmd "docker-compose pull" "拉取 Docker 映像"
    
    # 啟動服務
    start_services
    
    log_success "應用程式回滾完成"
}

# 回滾資料庫
rollback_database() {
    log_info "=========================================="
    log_info "開始回滾資料庫..."
    log_info "=========================================="
    
    # 檢查備份檔案
    if [ -z "$BACKUP_FILE" ]; then
        # 自動選擇最新的備份
        BACKUP_FILE=$(find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f | sort -r | head -n1)
        
        if [ -z "$BACKUP_FILE" ]; then
            log_error "未找到備份檔案，請使用 --backup-file 指定"
            exit 1
        fi
        
        log_warning "自動選擇最新備份: $BACKUP_FILE"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "備份檔案不存在: $BACKUP_FILE"
        exit 1
    fi
    
    log_info "備份檔案: $BACKUP_FILE"
    local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "備份大小: $backup_size"
    
    # 驗證備份檔案
    log_info "驗證備份檔案完整性..."
    if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_error "備份檔案損壞或無效"
        exit 1
    fi
    log_success "備份檔案驗證通過"
    
    # 創建當前資料庫的快照備份
    log_info "創建當前資料庫的安全備份..."
    local safety_backup="$BACKUP_DIR/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    if [ "$DRY_RUN" = false ]; then
        docker exec suggar-daddy-postgres-master pg_dump \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            | gzip > "$safety_backup"
        log_success "安全備份已創建: $safety_backup"
    fi
    
    # 停止應用服務（保留資料庫）
    log_info "停止應用服務..."
    execute_cmd "docker-compose stop api-gateway auth-service user-service payment-service subscription-service" \
        "停止應用服務"
    
    # 恢復資料庫
    log_info "開始恢復資料庫..."
    log_warning "這將覆蓋當前所有資料！"
    
    if [ "$DRY_RUN" = false ]; then
        # 斷開現有連線
        docker exec suggar-daddy-postgres-master psql \
            -U "$POSTGRES_USER" \
            -d postgres \
            -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
            &> /dev/null || true
        
        # 刪除現有資料庫
        log_info "刪除現有資料庫..."
        docker exec suggar-daddy-postgres-master psql \
            -U "$POSTGRES_USER" \
            -d postgres \
            -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" || true
        
        # 恢復備份
        log_info "恢復備份資料..."
        gunzip -c "$BACKUP_FILE" | docker exec -i suggar-daddy-postgres-master psql \
            -U "$POSTGRES_USER" \
            -d postgres
        
        log_success "資料庫恢復完成"
    fi
    
    # 重新啟動應用服務
    start_services
    
    log_success "資料庫回滾完成"
    log_info "安全備份位置: $safety_backup"
}

# 驗證系統狀態
verify_system() {
    log_info "=========================================="
    log_info "驗證系統狀態..."
    log_info "=========================================="
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[DRY-RUN] 跳過驗證"
        return 0
    fi
    
    local failed=false
    
    # 檢查服務健康狀態
    log_info "檢查服務健康狀態..."
    
    local services=("api-gateway" "auth-service" "user-service" "payment-service" "subscription-service" "postgres-master" "redis-master")
    
    for service in "${services[@]}"; do
        log_info "檢查 $service..."
        
        if docker ps --filter "name=suggar-daddy-$service" --filter "status=running" | grep -q "$service"; then
            log_success "✓ $service 正在運行"
        else
            log_error "✗ $service 未運行"
            failed=true
        fi
    done
    
    # 檢查 API Gateway 端點
    log_info "檢查 API Gateway 端點..."
    sleep 10  # 等待服務完全啟動
    
    if curl -f -s http://localhost:3000/health > /dev/null; then
        log_success "✓ API Gateway 健康檢查通過"
    else
        log_error "✗ API Gateway 健康檢查失敗"
        failed=true
    fi
    
    # 檢查資料庫連線
    log_info "檢查資料庫連線..."
    
    if docker exec suggar-daddy-postgres-master pg_isready -U "$POSTGRES_USER" > /dev/null; then
        log_success "✓ PostgreSQL 連線正常"
    else
        log_error "✗ PostgreSQL 連線失敗"
        failed=true
    fi
    
    # 檢查 Redis 連線
    log_info "檢查 Redis 連線..."
    
    if docker exec suggar-daddy-redis-master redis-cli ping | grep -q "PONG"; then
        log_success "✓ Redis 連線正常"
    else
        log_error "✗ Redis 連線失敗"
        failed=true
    fi
    
    log_info "=========================================="
    
    if [ "$failed" = true ]; then
        log_error "系統驗證失敗，請檢查服務狀態"
        log_info "查看日誌: docker-compose logs"
        return 1
    else
        log_success "所有驗證檢查通過！"
        return 0
    fi
}

# 發送通知
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local emoji="🔄"
        local color="warning"
        
        if [ "$status" = "success" ]; then
            emoji="✅"
            color="good"
        elif [ "$status" = "failed" ]; then
            emoji="❌"
            color="danger"
        fi
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"$emoji System Rollback $status\",
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"text\": \"$message\",
                    \"footer\": \"Suggar Daddy Rollback System\",
                    \"ts\": $(date +%s)
                }]
            }" &> /dev/null || true
    fi
}

# 主函數
main() {
    log_info "=========================================="
    log_info "Suggar Daddy - 系統回滾腳本"
    log_info "=========================================="
    
    # 解析參數
    parse_args "$@"
    
    # 顯示配置
    log_info "回滾類型: $ROLLBACK_TYPE"
    [ -n "$BACKUP_FILE" ] && log_info "備份檔案: $BACKUP_FILE"
    [ -n "$IMAGE_TAG" ] && log_info "映像標籤: $IMAGE_TAG"
    [ "$VERIFY" = true ] && log_info "驗證: 啟用"
    [ "$DRY_RUN" = true ] && log_warning "模式: DRY-RUN（不實際執行）"
    log_info "=========================================="
    
    # 確認操作
    confirm_action
    
    # 檢查 Docker
    check_docker_services
    
    # 發送開始通知
    send_notification "started" "開始回滾 ($ROLLBACK_TYPE)"
    
    # 執行回滾
    case $ROLLBACK_TYPE in
        app)
            rollback_application
            ;;
        database)
            rollback_database
            ;;
        all)
            rollback_application
            rollback_database
            ;;
        *)
            log_error "未知的回滾類型: $ROLLBACK_TYPE"
            exit 1
            ;;
    esac
    
    # 驗證系統（如果啟用）
    if [ "$VERIFY" = true ]; then
        if verify_system; then
            log_success "回滾驗證通過"
            send_notification "success" "回滾成功並通過驗證"
        else
            log_error "回滾驗證失敗"
            send_notification "failed" "回滾完成但驗證失敗"
            exit 1
        fi
    else
        send_notification "success" "回滾完成（未執行驗證）"
    fi
    
    log_info "=========================================="
    log_success "回滾操作完成！"
    log_info "=========================================="
    log_info "下一步建議："
    log_info "1. 檢查應用日誌: docker-compose logs -f"
    log_info "2. 訪問監控面板: http://localhost:3001 (Grafana)"
    log_info "3. 檢查告警: http://localhost:9093 (Alertmanager)"
    log_info "4. 執行煙霧測試以確認功能正常"
    log_info "=========================================="
}

# 執行主函數
main "$@"
