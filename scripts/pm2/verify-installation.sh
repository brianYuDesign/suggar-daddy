#!/bin/bash

# ==========================================
# PM2 E2E 安裝驗證腳本
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo -e "${BLUE}PM2 E2E 安裝驗證${NC}"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# 檢查函數
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 ${RED}不存在${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

check_executable() {
    if [ -x "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 ${GREEN}(可執行)${NC}"
    else
        echo -e "${YELLOW}⚠${NC} $1 ${YELLOW}不可執行${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
}

check_npm_script() {
    if grep -q "\"$1\"" "$PROJECT_ROOT/package.json"; then
        echo -e "${GREEN}✓${NC} npm run $1"
    else
        echo -e "${RED}✗${NC} npm run $1 ${RED}未定義${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

# 檢查配置檔案
echo -e "${BLUE}檢查配置檔案${NC}"
echo "----------------------------------------"
check_file "$PROJECT_ROOT/ecosystem.config.js"
check_file "$PROJECT_ROOT/package.json"
check_file "$PROJECT_ROOT/.gitignore"
echo ""

# 檢查腳本
echo -e "${BLUE}檢查 PM2 腳本${NC}"
echo "----------------------------------------"
check_executable "$SCRIPT_DIR/start-services.sh"
check_executable "$SCRIPT_DIR/stop-services.sh"
check_executable "$SCRIPT_DIR/restart-services.sh"
check_executable "$SCRIPT_DIR/status.sh"
check_executable "$SCRIPT_DIR/logs.sh"
check_executable "$SCRIPT_DIR/health-check.sh"
check_executable "$PROJECT_ROOT/scripts/e2e/pm2-e2e-test.sh"
echo ""

# 檢查文檔
echo -e "${BLUE}檢查文檔${NC}"
echo "----------------------------------------"
check_file "$PROJECT_ROOT/docs/PM2-E2E-GUIDE.md"
check_file "$PROJECT_ROOT/E2E-QUICKSTART.md"
check_file "$SCRIPT_DIR/README.md"
check_file "$PROJECT_ROOT/PM2-E2E-SUMMARY.md"
echo ""

# 檢查 npm scripts
echo -e "${BLUE}檢查 npm scripts${NC}"
echo "----------------------------------------"
check_npm_script "pm2:start"
check_npm_script "pm2:stop"
check_npm_script "pm2:restart"
check_npm_script "pm2:status"
check_npm_script "pm2:logs"
check_npm_script "pm2:health"
check_npm_script "e2e:pm2"
check_npm_script "e2e:pm2:web"
check_npm_script "e2e:pm2:admin"
echo ""

# 檢查目錄
echo -e "${BLUE}檢查目錄結構${NC}"
echo "----------------------------------------"
if [ -d "$PROJECT_ROOT/logs" ]; then
    echo -e "${GREEN}✓${NC} logs/ 目錄存在"
else
    echo -e "${YELLOW}⚠${NC} logs/ 目錄不存在 ${YELLOW}(將自動創建)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -d "$PROJECT_ROOT/scripts/pm2" ]; then
    echo -e "${GREEN}✓${NC} scripts/pm2/ 目錄存在"
else
    echo -e "${RED}✗${NC} scripts/pm2/ 目錄不存在"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "$PROJECT_ROOT/scripts/e2e" ]; then
    echo -e "${GREEN}✓${NC} scripts/e2e/ 目錄存在"
else
    echo -e "${RED}✗${NC} scripts/e2e/ 目錄不存在"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 檢查 PM2
echo -e "${BLUE}檢查 PM2 安裝${NC}"
echo "----------------------------------------"
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    echo -e "${GREEN}✓${NC} PM2 已全局安裝 (版本: $PM2_VERSION)"
elif npm list pm2 --depth=0 &> /dev/null; then
    echo -e "${GREEN}✓${NC} PM2 已本地安裝 (devDependencies)"
else
    echo -e "${YELLOW}⚠${NC} PM2 未安裝 ${YELLOW}(可能需要 npm install)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 結果摘要
echo "========================================"
echo -e "${BLUE}驗證結果${NC}"
echo "========================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有檢查通過！PM2 E2E 測試環境已正確安裝。${NC}"
    echo ""
    echo "下一步："
    echo "  1. 啟動服務: npm run pm2:start"
    echo "  2. 健康檢查: npm run pm2:health"
    echo "  3. 執行測試: npm run e2e:pm2"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ 驗證完成，有 $WARNINGS 個警告。${NC}"
    echo ""
    echo "警告不會影響功能，但建議檢查。"
    exit 0
else
    echo -e "${RED}✗ 驗證失敗，發現 $ERRORS 個錯誤和 $WARNINGS 個警告。${NC}"
    echo ""
    echo "請檢查上述錯誤並修復後再試。"
    exit 1
fi
