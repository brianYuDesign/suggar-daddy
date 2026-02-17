#!/bin/bash

# 清理整合測試環境和資料

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

print_header "清理整合測試環境"

cd "$(dirname "$0")/.."

# 停止容器
print_info "停止測試容器..."
docker-compose -f test/integration/docker-compose.test.yml -p suggar-daddy-test down -v 2>/dev/null || true
print_success "容器已停止"

# 清理 volumes
print_info "清理 Docker volumes..."
docker volume rm suggar-daddy-test_postgres_test_data 2>/dev/null || true
print_success "Volumes 已清理"

# 清理網路
print_info "清理 Docker 網路..."
docker network rm suggar-daddy-test_test-network 2>/dev/null || true
print_success "網路已清理"

# 清理測試覆蓋率報告
if [ -d "test/coverage/integration" ]; then
    print_info "清理測試覆蓋率報告..."
    rm -rf test/coverage/integration
    print_success "覆蓋率報告已清理"
fi

print_success "清理完成！"
