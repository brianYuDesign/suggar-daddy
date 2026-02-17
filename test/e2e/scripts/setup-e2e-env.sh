#!/bin/bash

# ==========================================
# E2E 測試環境設置腳本
# 使用 PM2 管理服務，Docker 管理依賴
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/e2e"
RECORDINGS_DIR="$PROJECT_ROOT/test/coverage/e2e-recordings"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo "========================================"
    echo -e "${BLUE}$1${NC}"
    echo "========================================"
    echo ""
}

# ==========================================
# 清理函數
# ==========================================

cleanup() {
    log_header "清理環境"
    
    # 停止 PM2 服務
    log_info "停止 PM2 服務..."
    cd "$PROJECT_ROOT"
    npx pm2 delete all 2>/dev/null || true
    
    log_success "清理完成"
}

# 設置清理陷阱
trap cleanup EXIT INT TERM

# ==========================================
# 主流程
# ==========================================

main() {
    log_header "E2E 測試環境設置"
    
    cd "$PROJECT_ROOT"
    
    # 1. 檢查必要工具
    log_info "檢查必要工具..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安裝"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安裝"
        exit 1
    fi
    
    log_success "必要工具檢查通過"
    
    # 2. 創建必要目錄
    log_info "創建必要目錄..."
    mkdir -p "$LOG_DIR"
    mkdir -p "$RECORDINGS_DIR"
    mkdir -p "$PROJECT_ROOT/logs/pm2"
    mkdir -p "$PROJECT_ROOT/test/coverage/e2e-report"
    mkdir -p "$PROJECT_ROOT/test/coverage/e2e-artifacts"
    log_success "目錄創建完成"
    
    # 3. 載入環境變數
    log_info "載入環境變數..."
    if [ -f "$PROJECT_ROOT/.env.development" ]; then
        set -a
        source "$PROJECT_ROOT/.env.development"
        set +a
        log_success "環境變數載入完成"
    else
        log_warn "未找到 .env.development 文件"
    fi
    
    # 4. 啟動 Docker 基礎設施
    log_header "啟動 Docker 基礎設施"
    
    log_info "檢查 Docker Compose 狀態..."
    
    # 檢查是否已有容器運行
    RUNNING_CONTAINERS=$(docker-compose ps -q 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$RUNNING_CONTAINERS" -gt 0 ]; then
        log_warn "發現已運行的容器，正在重啟..."
        docker-compose down
    fi
    
    log_info "啟動核心基礎設施 (Postgres, Redis, Kafka)..."
    docker-compose up -d postgres-master postgres-replica redis-master redis-replica-1 redis-replica-2 zookeeper kafka
    
    # 5. 等待基礎設施就緒
    log_header "等待基礎設施就緒"
    
    log_info "等待 PostgreSQL Master..."
    RETRIES=30
    while [ $RETRIES -gt 0 ]; do
        if docker-compose exec -T postgres-master pg_isready -U postgres > /dev/null 2>&1; then
            log_success "PostgreSQL Master 就緒"
            break
        fi
        RETRIES=$((RETRIES - 1))
        sleep 2
    done
    
    if [ $RETRIES -eq 0 ]; then
        log_error "PostgreSQL Master 啟動超時"
        exit 1
    fi
    
    log_info "等待 Redis Master..."
    RETRIES=30
    while [ $RETRIES -gt 0 ]; do
        if docker-compose exec -T redis-master redis-cli ping > /dev/null 2>&1; then
            log_success "Redis Master 就緒"
            break
        fi
        RETRIES=$((RETRIES - 1))
        sleep 2
    done
    
    if [ $RETRIES -eq 0 ]; then
        log_error "Redis Master 啟動超時"
        exit 1
    fi
    
    log_info "等待 Kafka..."
    RETRIES=60
    while [ $RETRIES -gt 0 ]; do
        if docker-compose exec -T kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
            log_success "Kafka 就緒"
            break
        fi
        RETRIES=$((RETRIES - 1))
        sleep 2
    done
    
    if [ $RETRIES -eq 0 ]; then
        log_error "Kafka 啟動超時"
        exit 1
    fi
    
    log_success "所有基礎設施已就緒"
    
    # 6. 執行數據庫遷移
    log_header "執行數據庫遷移"
    
    log_info "等待數據庫完全初始化..."
    sleep 5
    
    # 檢查是否需要執行遷移（根據項目結構決定）
    if [ -f "$PROJECT_ROOT/scripts/db/migrate.sh" ]; then
        log_info "執行數據庫遷移..."
        cd "$PROJECT_ROOT"
        NODE_ENV=development bash scripts/db/migrate.sh || log_warn "遷移腳本執行失敗，繼續執行..."
    else
        log_warn "未找到遷移腳本，跳過"
    fi
    
    # 7. 啟動 PM2 服務
    log_header "啟動 PM2 服務"
    
    log_info "構建後端服務..."
    cd "$PROJECT_ROOT"
    
    # 只啟動核心服務以加速啟動
    log_info "啟動核心服務..."
    
    # 使用 ecosystem.config.js 啟動
    npx pm2 start "$PROJECT_ROOT/ecosystem.config.js" --only api-gateway,auth-service,user-service,web
    
    # 8. 等待服務就緒
    log_header "等待服務就緒"
    
    SERVICES=(
        "api-gateway:3000"
        "auth-service:3002"
        "user-service:3001"
        "web:4200"
    )
    
    for service in "${SERVICES[@]}"; do
        IFS=':' read -r name port <<< "$service"
        log_info "等待 $name (port $port)..."
        
        RETRIES=60
        while [ $RETRIES -gt 0 ]; do
            if curl -s "http://localhost:$port" > /dev/null 2>&1 || curl -s "http://localhost:$port/api/health" > /dev/null 2>&1; then
                log_success "$name 就緒"
                break
            fi
            RETRIES=$((RETRIES - 1))
            sleep 2
        done
        
        if [ $RETRIES -eq 0 ]; then
            log_warn "$name 啟動可能未完成，繼續等待..."
        fi
    done
    
    # 額外等待確保服務穩定
    log_info "等待服務穩定..."
    sleep 5
    
    # 9. 顯示狀態
    log_header "服務狀態"
    
    echo ""
    echo -e "${GREEN}✓ E2E 測試環境已就緒${NC}"
    echo ""
    echo "服務列表："
    echo "========================================="
    echo "  • API Gateway:    http://localhost:3000"
    echo "  • Auth Service:   http://localhost:3002"
    echo "  • User Service:   http://localhost:3001"
    echo "  • Web Frontend:   http://localhost:4200"
    echo "========================================="
    echo ""
    
    npx pm2 list
    
    echo ""
    echo "錄影檔案將保存至: $RECORDINGS_DIR"
    echo ""
    
    log_success "環境設置完成！可以開始執行 E2E 測試"
    
    # 保持運行（如果不是被 source）
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        log_info "按 Ctrl+C 停止所有服務"
        while true; do
            sleep 3600
        done
    fi
}

# 執行主流程
main "$@"
