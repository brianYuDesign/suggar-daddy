#!/bin/bash

# Playwright E2E 測試快速啟動腳本

echo "🎬 Playwright E2E 測試工具"
echo "================================"
echo ""

# 檢查 Playwright 是否已安裝
if ! command -v playwright &> /dev/null; then
    echo "⚠️  Playwright 未安裝，正在安裝..."
    npm install -D @playwright/test
    npx playwright install
fi

echo ""
echo "請選擇操作："
echo "1) 執行所有測試"
echo "2) 僅測試 Web App (用戶前端)"
echo "3) 僅測試 Admin Dashboard (管理後台)"
echo "4) 執行完整用戶旅程測試"
echo "5) 使用 UI 模式執行測試 (推薦)"
echo "6) 使用 Headed 模式 (顯示瀏覽器)"
echo "7) 查看測試報告"
echo "8) 安裝 Playwright 瀏覽器"
echo "9) 生成測試程式碼 (Codegen)"
echo "0) 退出"
echo ""

read -p "請輸入選項 (0-9): " choice

case $choice in
    1)
        echo "🚀 執行所有測試..."
        npx playwright test
        ;;
    2)
        echo "🌐 測試 Web App..."
        npx playwright test e2e/web
        ;;
    3)
        echo "⚙️  測試 Admin Dashboard..."
        npx playwright test e2e/admin
        ;;
    4)
        echo "🎭 執行完整用戶旅程測試..."
        npx playwright test e2e/user-journeys.spec.ts
        ;;
    5)
        echo "🎨 啟動 UI 模式..."
        npx playwright test --ui
        ;;
    6)
        echo "👁️  啟動 Headed 模式..."
        npx playwright test --headed
        ;;
    7)
        echo "📊 開啟測試報告..."
        npx playwright show-report
        ;;
    8)
        echo "📥 安裝 Playwright 瀏覽器..."
        npx playwright install
        ;;
    9)
        echo "🎬 啟動 Codegen..."
        echo "請輸入要測試的 URL (預設: http://localhost:4200):"
        read -p "URL: " url
        url=${url:-http://localhost:4200}
        npx playwright codegen "$url"
        ;;
    0)
        echo "👋 再見！"
        exit 0
        ;;
    *)
        echo "❌ 無效選項"
        exit 1
        ;;
esac

echo ""
echo "✅ 完成！"
