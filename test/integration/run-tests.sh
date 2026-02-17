#!/bin/bash

# 微服務整合測試執行腳本

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 印出帶顏色的訊息
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# 檢查 Docker 是否運行
check_docker() {
    print_info "檢查 Docker 是否運行..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未運行，請先啟動 Docker"
        exit 1
    fi
    print_success "Docker 正在運行"
}

# 啟動測試環境
start_test_environment() {
    print_header "啟動測試環境"
    
    cd "$(dirname "$0")/.."
    
    print_info "停止並清理舊的測試容器..."
    docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test down -v > /dev/null 2>&1 || true
    
    print_info "啟動測試服務..."
    docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test up -d
    
    print_info "等待服務啟動..."
    sleep 10
    
    # 檢查服務健康狀態
    print_info "檢查服務健康狀態..."
    
    services=("postgres-test" "redis-test" "kafka-test")
    for service in "${services[@]}"; do
        retries=0
        max_retries=30
        
        while [ $retries -lt $max_retries ]; do
            if docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test ps $service | grep -q "(healthy)"; then
                print_success "$service 已就緒"
                break
            fi
            
            retries=$((retries + 1))
            if [ $retries -eq $max_retries ]; then
                print_error "$service 啟動失敗"
                docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test logs $service
                exit 1
            fi
            
            sleep 1
        done
    done
    
    print_success "測試環境已啟動"
}

# 執行測試
run_tests() {
    print_header "執行整合測試"
    
    # 解析命令列參數
    TEST_PATTERN="$1"
    
    if [ -z "$TEST_PATTERN" ]; then
        print_info "執行所有整合測試..."
        npm run test:integration
    else
        print_info "執行測試: $TEST_PATTERN"
        npm run test:integration -- --testPathPattern="$TEST_PATTERN"
    fi
}

# 停止測試環境
stop_test_environment() {
    print_header "清理測試環境"
    
    print_info "停止測試容器..."
    docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test down -v
    
    print_success "測試環境已清理"
}

# 顯示幫助訊息
show_help() {
    cat << EOF
微服務整合測試執行腳本

使用方式:
    $0 [選項] [測試模式]

選項:
    -h, --help          顯示此幫助訊息
    -s, --start-only    只啟動測試環境，不執行測試
    -c, --cleanup       清理測試環境
    -k, --keep          執行測試後保留環境（不清理）

測試模式:
    不指定            執行所有整合測試
    auth              只執行認證服務測試
    payment           只執行付款服務測試
    content           只執行內容服務測試
    consistency       只執行數據一致性測試

範例:
    $0                      # 執行所有測試
    $0 auth                 # 只執行認證服務測試
    $0 -s                   # 只啟動環境，不執行測試
    $0 -k payment           # 執行付款測試並保留環境
    $0 -c                   # 清理測試環境

EOF
}

# 主函數
main() {
    local start_only=false
    local cleanup_only=false
    local keep_env=false
    local test_pattern=""
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -s|--start-only)
                start_only=true
                shift
                ;;
            -c|--cleanup)
                cleanup_only=true
                shift
                ;;
            -k|--keep)
                keep_env=true
                shift
                ;;
            auth|payment|content|consistency)
                test_pattern="$1"
                shift
                ;;
            *)
                print_error "未知選項: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 只清理
    if [ "$cleanup_only" = true ]; then
        stop_test_environment
        exit 0
    fi
    
    # 檢查 Docker
    check_docker
    
    # 啟動環境
    start_test_environment
    
    # 只啟動環境
    if [ "$start_only" = true ]; then
        print_success "測試環境已啟動，使用以下命令清理:"
        echo "  $0 -c"
        exit 0
    fi
    
    # 執行測試
    test_exit_code=0
    run_tests "$test_pattern" || test_exit_code=$?
    
    # 顯示測試結果
    echo ""
    if [ $test_exit_code -eq 0 ]; then
        print_success "所有測試通過！"
    else
        print_error "測試失敗（退出碼: $test_exit_code）"
    fi
    
    # 清理環境（除非指定保留）
    if [ "$keep_env" = false ]; then
        stop_test_environment
    else
        print_warning "測試環境保留運行中"
        print_info "使用以下命令清理:"
        echo "  $0 -c"
    fi
    
    exit $test_exit_code
}

# 執行主函數
main "$@"
