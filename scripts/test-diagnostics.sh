#!/bin/bash

# E2E 測試診斷腳本
# 用於診斷和修復失敗的測試

echo "🔍 E2E 測試診斷工具"
echo "===================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查 Node.js 版本
echo "📋 檢查環境..."
NODE_VERSION=$(node -v)
echo "  Node.js 版本: $NODE_VERSION"

# 檢查 Playwright 安裝
if command -v npx playwright --version &> /dev/null; then
    PLAYWRIGHT_VERSION=$(npx playwright --version)
    echo "  Playwright 版本: $PLAYWRIGHT_VERSION"
else
    echo -e "${RED}  ⚠️  Playwright 未安裝${NC}"
    echo "  請運行: npm install -D @playwright/test"
    exit 1
fi

echo ""
echo "🧪 運行測試診斷..."
echo ""

# 選項
echo "請選擇診斷模式："
echo "1) 運行所有測試"
echo "2) 只運行失敗的測試"
echo "3) 運行新增的測試"
echo "4) 運行支付測試"
echo "5) 運行訂閱測試"
echo "6) 運行安全測試"
echo "7) 運行效能測試"
echo "8) 生成測試報告"

read -p "請輸入選項 (1-8): " option

case $option in
  1)
    echo -e "${GREEN}運行所有測試...${NC}"
    npx playwright test --reporter=html,list
    ;;
  2)
    echo -e "${YELLOW}運行失敗的測試（需要先運行過測試）...${NC}"
    npx playwright test --last-failed --reporter=html,list
    ;;
  3)
    echo -e "${GREEN}運行新增的測試...${NC}"
    npx playwright test e2e/payment e2e/subscription e2e/security e2e/performance --reporter=html,list
    ;;
  4)
    echo -e "${GREEN}運行支付測試...${NC}"
    npx playwright test e2e/payment --reporter=html,list
    ;;
  5)
    echo -e "${GREEN}運行訂閱測試...${NC}"
    npx playwright test e2e/subscription --reporter=html,list
    ;;
  6)
    echo -e "${GREEN}運行安全測試...${NC}"
    npx playwright test e2e/security --reporter=html,list
    ;;
  7)
    echo -e "${GREEN}運行效能測試...${NC}"
    npx playwright test e2e/performance --reporter=html,list
    ;;
  8)
    echo -e "${GREEN}生成測試報告...${NC}"
    npx playwright show-report
    ;;
  *)
    echo -e "${RED}無效的選項${NC}"
    exit 1
    ;;
esac

echo ""
echo "✅ 診斷完成！"
echo ""
echo "📊 查看報告："
echo "  HTML 報告: npx playwright show-report"
echo "  或打開: playwright-report/index.html"
echo ""
echo "🐛 調試失敗的測試："
echo "  npx playwright test --debug"
echo "  npx playwright test --trace on"
echo ""
echo "📸 查看截圖："
echo "  ls screenshots/"
echo ""
echo "🎥 查看錄影："
echo "  ls test-results/"
