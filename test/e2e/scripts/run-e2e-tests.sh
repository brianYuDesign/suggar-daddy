#!/bin/bash

# ==========================================
# E2E 測試執行腳本
# 自動設置環境、運行測試、生成報告
# ==========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SETUP_SCRIPT="$SCRIPT_DIR/setup-e2e-env.sh"
LOG_DIR="$PROJECT_ROOT/logs/e2e"
RECORDINGS_DIR="$PROJECT_ROOT/test/coverage/e2e-recordings"
REPORT_DIR="$PROJECT_ROOT/test/coverage/e2e-report"

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
# 參數解析
# ==========================================

SKIP_SETUP=false
SKIP_TEARDOWN=false
UI_MODE=false
DEBUG_MODE=false
PROJECT=""
TEST_PATTERN=""

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  --skip-setup       跳過環境設置（假設環境已準備好）
  --skip-teardown    測試完成後不清理環境
  --ui               使用 Playwright UI 模式
  --debug            使用 Playwright Debug 模式
  --project NAME     指定 Playwright project（chromium/firefox/webkit）
  --grep PATTERN     只運行匹配的測試
  -h, --help         顯示幫助信息

Examples:
  $0                                    # 運行所有測試
  $0 --skip-setup                       # 使用現有環境運行測試
  $0 --ui                               # 使用 UI 模式
  $0 --project chromium                 # 只在 Chromium 運行
  $0 --grep "login"                     # 只運行登入相關測試

EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-setup)
            SKIP_SETUP=true
            shift
            ;;
        --skip-teardown)
            SKIP_TEARDOWN=true
            shift
            ;;
        --ui)
            UI_MODE=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        --project)
            PROJECT="$2"
            shift 2
            ;;
        --grep)
            TEST_PATTERN="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "未知選項: $1"
            show_usage
            exit 1
            ;;
    esac
done

# ==========================================
# 清理函數
# ==========================================

cleanup() {
    if [ "$SKIP_TEARDOWN" = false ]; then
        log_header "清理測試環境"
        
        cd "$PROJECT_ROOT"
        
        log_info "停止 PM2 服務..."
        npx pm2 delete all 2>/dev/null || true
        
        log_info "停止 Docker 容器..."
        docker-compose down 2>/dev/null || true
        
        log_success "清理完成"
    else
        log_info "跳過清理（--skip-teardown）"
    fi
}

# 設置清理陷阱
trap cleanup EXIT INT TERM

# ==========================================
# 主流程
# ==========================================

main() {
    log_header "E2E 測試執行"
    
    cd "$PROJECT_ROOT"
    
    # 創建目錄
    mkdir -p "$LOG_DIR"
    mkdir -p "$RECORDINGS_DIR"
    mkdir -p "$REPORT_DIR"
    
    # 1. 設置環境
    if [ "$SKIP_SETUP" = false ]; then
        log_header "步驟 1: 設置測試環境"
        
        # 執行設置腳本（後台運行）
        log_info "啟動測試環境..."
        bash "$SETUP_SCRIPT" &
        SETUP_PID=$!
        
        # 等待設置完成
        log_info "等待環境準備就緒..."
        
        # 簡單等待後檢查服務
        sleep 30
        
        # 檢查關鍵服務
        SERVICES_READY=false
        RETRIES=60
        while [ $RETRIES -gt 0 ]; do
            if curl -s "http://localhost:3000" > /dev/null 2>&1 && curl -s "http://localhost:4200" > /dev/null 2>&1; then
                SERVICES_READY=true
                break
            fi
            RETRIES=$((RETRIES - 1))
            sleep 3
        done
        
        if [ "$SERVICES_READY" = false ]; then
            log_error "服務啟動超時"
            exit 1
        fi
        
        log_success "測試環境就緒"
    else
        log_header "步驟 1: 跳過環境設置"
        log_info "使用現有環境"
    fi
    
    # 2. 運行測試
    log_header "步驟 2: 運行 E2E 測試"
    
    # 構建 Playwright 命令
    PLAYWRIGHT_CMD="npx playwright test"
    
    if [ "$UI_MODE" = true ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --ui"
        log_info "使用 UI 模式"
    elif [ "$DEBUG_MODE" = true ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
        log_info "使用 Debug 模式"
    else
        # 標準模式：啟用錄影
        log_info "錄影將自動保存到: $RECORDINGS_DIR"
    fi
    
    if [ -n "$PROJECT" ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$PROJECT"
        log_info "指定 project: $PROJECT"
    fi
    
    if [ -n "$TEST_PATTERN" ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --grep='$TEST_PATTERN'"
        log_info "過濾模式: $TEST_PATTERN"
    fi
    
    # 添加輸出目錄
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --output=$PROJECT_ROOT/test/coverage/e2e-artifacts"
    
    log_info "執行命令: $PLAYWRIGHT_CMD"
    echo ""
    
    # 執行測試
    cd "$PROJECT_ROOT"
    eval "$PLAYWRIGHT_CMD" || TEST_EXIT_CODE=$?
    
    if [ -n "$TEST_EXIT_CODE" ] && [ "$TEST_EXIT_CODE" -ne 0 ]; then
        log_warn "測試有失敗項目 (exit code: $TEST_EXIT_CODE)"
    else
        log_success "測試執行完成"
    fi
    
    # 3. 生成報告
    log_header "步驟 3: 測試報告"
    
    # 複製錄影到統一目錄
    if [ -d "$PROJECT_ROOT/test/coverage/e2e-artifacts" ]; then
        log_info "整理錄影檔案..."
        find "$PROJECT_ROOT/test/coverage/e2e-artifacts" -name "*.webm" -exec cp {} "$RECORDINGS_DIR/" \; 2>/dev/null || true
        log_success "錄影已保存至: $RECORDINGS_DIR"
    fi
    
    # 顯示報告位置
    echo ""
    echo "測試報告位置："
    echo "========================================="
    echo "  HTML 報告: $REPORT_DIR/index.html"
    echo "  JSON 報告: $PROJECT_ROOT/test/coverage/e2e-results.json"
    echo "  測試錄影:  $RECORDINGS_DIR"
    echo "  測試截圖:  $PROJECT_ROOT/test/coverage/e2e-artifacts"
    echo "========================================="
    echo ""
    
    # 打開報告（如果在本地）
    if [ "$UI_MODE" = false ] && [ "$DEBUG_MODE" = false ]; then
        log_info "打開 HTML 報告..."
        npx playwright show-report "$REPORT_DIR" 2>/dev/null || true
    fi
    
    # 返回測試結果
    if [ -n "$TEST_EXIT_CODE" ]; then
        exit "$TEST_EXIT_CODE"
    fi
    
    log_success "E2E 測試流程完成！"
}

# 執行主流程
main "$@"
