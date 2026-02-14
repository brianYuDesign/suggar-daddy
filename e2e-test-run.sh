#!/bin/bash

# E2E 測試執行指南
# 使用方式: ./e2e-test-run.sh [option]

set -e

echo "🎭 Playwright E2E 測試執行工具"
echo "================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查服務是否運行
check_service() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓${NC} $service_name 正在運行於端口 $port"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name 未運行於端口 $port"
        return 1
    fi
}

# 檢查依賴
check_dependencies() {
    echo "📦 檢查依賴..."
    
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}錯誤: npm/npx 未安裝${NC}"
        exit 1
    fi
    
    if [ ! -d "node_modules/@playwright" ]; then
        echo -e "${YELLOW}⚠${NC} Playwright 未安裝，正在安裝..."
        npm install --save-dev @playwright/test
        npx playwright install chromium
    fi
    
    echo -e "${GREEN}✓${NC} 依賴檢查完成"
    echo ""
}

# 檢查服務狀態
check_services() {
    echo "🔍 檢查服務狀態..."
    
    web_running=false
    api_running=false
    
    if check_service 4200 "Web App"; then
        web_running=true
    fi
    
    if check_service 3000 "API Gateway"; then
        api_running=true
    fi
    
    echo ""
    
    if [ "$web_running" = false ] || [ "$api_running" = false ]; then
        echo -e "${YELLOW}⚠ 警告: 部分服務未運行${NC}"
        echo ""
        echo "請在另一個終端機執行以下命令啟動服務："
        echo ""
        if [ "$web_running" = false ]; then
            echo "  npm run serve:web"
        fi
        if [ "$api_running" = false ]; then
            echo "  npm run serve:api-gateway"
        fi
        echo ""
        read -p "服務已啟動後按 Enter 繼續，或 Ctrl+C 取消..."
        echo ""
    fi
}

# 列出測試
list_tests() {
    echo "📋 可用的測試："
    echo ""
    npx playwright test --list | grep -E "tests/(auth|matching|subscription)" | head -20
    echo ""
    echo "（僅顯示前 20 個，使用 'npx playwright test --list' 查看完整列表）"
}

# 執行測試
run_tests() {
    local test_path=$1
    local options=$2
    
    echo "🚀 執行測試: $test_path"
    echo ""
    
    npx playwright test $test_path $options
}

# 顯示幫助
show_help() {
    echo "用法: ./e2e-test-run.sh [選項]"
    echo ""
    echo "選項:"
    echo "  list        列出所有新實作的測試"
    echo "  auth        執行認證測試 (27 cases)"
    echo "  matching    執行配對測試 (12 cases)"
    echo "  subscription 執行訂閱測試 (12 cases)"
    echo "  all         執行所有新測試 (51 cases)"
    echo "  ui          以 UI 模式執行測試"
    echo "  debug       以調試模式執行測試"
    echo "  headed      以有頭模式執行測試（顯示瀏覽器）"
    echo "  report      顯示測試報告"
    echo ""
    echo "範例:"
    echo "  ./e2e-test-run.sh list"
    echo "  ./e2e-test-run.sh auth"
    echo "  ./e2e-test-run.sh all ui"
    echo ""
}

# 主程序
main() {
    local command=${1:-help}
    
    case $command in
        list)
            check_dependencies
            list_tests
            ;;
        auth)
            check_dependencies
            check_services
            run_tests "tests/auth" "${@:2}"
            ;;
        matching)
            check_dependencies
            check_services
            run_tests "tests/matching" "${@:2}"
            ;;
        subscription)
            check_dependencies
            check_services
            run_tests "tests/subscription" "${@:2}"
            ;;
        all)
            check_dependencies
            check_services
            echo "執行所有新測試..."
            run_tests "tests/auth tests/matching tests/subscription" "${@:2}"
            ;;
        ui)
            check_dependencies
            echo "啟動 Playwright UI..."
            npx playwright test --ui
            ;;
        debug)
            check_dependencies
            check_services
            echo "啟動調試模式..."
            npx playwright test --debug "${@:2}"
            ;;
        headed)
            check_dependencies
            check_services
            run_tests "${2:-tests/auth}" "--headed ${@:3}"
            ;;
        report)
            echo "📊 顯示測試報告..."
            npx playwright show-report
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}錯誤: 未知的命令 '$command'${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 執行主程序
main "$@"
