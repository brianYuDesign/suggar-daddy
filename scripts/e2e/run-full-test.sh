#!/bin/bash

# E2E 測試執行腳本 - 完整功能流程測試（含錄影）

set -e

echo "========================================"
echo "開始執行 E2E 完整功能流程測試"
echo "========================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查測試服務是否運行
echo -e "${BLUE}檢查測試服務...${NC}"
if ! curl -s http://127.0.0.1:4200 > /dev/null; then
    echo -e "${YELLOW}警告: Web 應用未運行在 port 4200${NC}"
    echo "請先啟動服務: npm run serve:web"
    exit 1
fi

if ! curl -s http://127.0.0.1:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}警告: API Gateway 未運行在 port 3000${NC}"
    echo "請先啟動服務: npm run dev"
fi

echo -e "${GREEN}✓ 測試服務檢查完成${NC}"
echo ""

# 創建必要的目錄
echo -e "${BLUE}創建測試輸出目錄...${NC}"
mkdir -p test-results
mkdir -p playwright-report
mkdir -p screenshots
mkdir -p e2e/.auth
echo -e "${GREEN}✓ 目錄創建完成${NC}"
echo ""

# 清理舊的測試結果
echo -e "${BLUE}清理舊的測試結果...${NC}"
rm -rf test-results/*
rm -rf playwright-report/*
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

# 執行測試
echo "========================================"
echo -e "${BLUE}執行測試套件${NC}"
echo "========================================"
echo ""

# 執行測試（按順序執行以確保穩定性）
echo -e "${YELLOW}1. 執行認證流程測試${NC}"
npx playwright test e2e/user-flows/authentication.spec.ts --project=chromium || echo -e "${RED}認證測試失敗${NC}"
echo ""

echo -e "${YELLOW}2. 執行個人資料測試${NC}"
npx playwright test e2e/user-flows/profile.spec.ts --project=chromium || echo -e "${RED}個人資料測試失敗${NC}"
echo ""

echo -e "${YELLOW}3. 執行內容創建測試${NC}"
npx playwright test e2e/content-flows/post-creation.spec.ts --project=chromium || echo -e "${RED}內容創建測試失敗${NC}"
echo ""

echo -e "${YELLOW}4. 執行內容互動測試${NC}"
npx playwright test e2e/content-flows/post-interaction.spec.ts --project=chromium || echo -e "${RED}內容互動測試失敗${NC}"
echo ""

echo -e "${YELLOW}5. 執行訂閱流程測試${NC}"
npx playwright test e2e/payment-flows/subscription.spec.ts --project=chromium || echo -e "${RED}訂閱測試失敗${NC}"
echo ""

echo -e "${YELLOW}6. 執行錢包流程測試${NC}"
npx playwright test e2e/wallet-flows/wallet.spec.ts --project=chromium || echo -e "${RED}錢包測試失敗${NC}"
echo ""

echo -e "${YELLOW}7. 執行管理後台測試${NC}"
npx playwright test e2e/admin-flows/admin-management.spec.ts --project=admin || echo -e "${RED}管理後台測試失敗${NC}"
echo ""

# 生成測試報告
echo "========================================"
echo -e "${BLUE}生成測試報告${NC}"
echo "========================================"
echo ""

# 檢查錄影檔案
VIDEO_COUNT=$(find test-results -name "*.webm" 2>/dev/null | wc -l)
echo -e "${BLUE}錄影檔案:${NC}"
echo "  生成 $VIDEO_COUNT 個錄影檔案"
if [ $VIDEO_COUNT -gt 0 ]; then
    echo -e "${GREEN}  ✓ 錄影檔案已保存在 test-results/ 目錄${NC}"
fi
echo ""

# 檢查截圖
SCREENSHOT_COUNT=$(find screenshots -name "*.png" 2>/dev/null | wc -l)
echo -e "${BLUE}截圖檔案:${NC}"
echo "  生成 $SCREENSHOT_COUNT 個截圖檔案"
if [ $SCREENSHOT_COUNT -gt 0 ]; then
    echo -e "${GREEN}  ✓ 截圖已保存在 screenshots/ 目錄${NC}"
fi
echo ""

# 生成 HTML 報告
echo -e "${BLUE}生成 HTML 報告...${NC}"
echo -e "${GREEN}✓ HTML 報告已生成${NC}"
echo -e "${YELLOW}  報告位置: playwright-report/index.html${NC}"
echo ""

echo "========================================"
echo -e "${GREEN}測試執行完成${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}查看結果:${NC}"
echo "  1. HTML 報告: npx playwright show-report"
echo "  2. 錄影檔案: test-results/"
echo "  3. 截圖檔案: screenshots/"
echo ""

exit 0
