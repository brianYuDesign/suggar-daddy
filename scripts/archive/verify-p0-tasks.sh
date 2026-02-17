#!/bin/bash

# P0 前端任務修改驗證腳本
# 用於快速檢查所有修改是否正確應用

echo "🔍 P0 前端任務修改驗證"
echo "======================="
echo ""

# 計數器
PASS=0
FAIL=0

# 檢查函數
check_file() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if [ -f "$file" ]; then
        if grep -q "$pattern" "$file"; then
            echo "✅ $description"
            ((PASS++))
        else
            echo "❌ $description - 找不到預期的修改"
            ((FAIL++))
        fi
    else
        echo "❌ $description - 檔案不存在"
        ((FAIL++))
    fi
}

echo "任務 1: Toast 通知應用"
echo "---------------------"
check_file "apps/web/app/(auth)/login/page.tsx" "useToast" "Login 頁面引入 useToast"
check_file "apps/web/app/(auth)/login/page.tsx" "toast.success" "Login 頁面使用 toast.success"
check_file "apps/web/app/(auth)/register/page.tsx" "useToast" "Register 頁面引入 useToast"
check_file "apps/web/app/(auth)/register/page.tsx" "toast.success" "Register 頁面使用 toast.success"
check_file "apps/web/app/(main)/feed/page.tsx" "toast.success" "Feed 頁面使用 toast.success"
check_file "apps/web/app/(main)/wallet/withdraw/page.tsx" "useToast" "Withdrawal 頁面引入 useToast"
echo ""

echo "任務 2: Tooltip 應用"
echo "-------------------"
check_file "apps/admin/app/(dashboard)/users/page.tsx" "Tooltip" "Admin users 頁面引入 Tooltip"
check_file "apps/admin/app/(dashboard)/users/page.tsx" "<Tooltip" "Admin users 頁面使用 Tooltip"
check_file "apps/web/app/(main)/feed/page.tsx" "Tooltip" "Feed 頁面引入 Tooltip"
check_file "apps/web/app/(main)/feed/page.tsx" "<Tooltip" "Feed 頁面使用 Tooltip"
check_file "apps/web/app/(main)/wallet/withdraw/page.tsx" "Tooltip" "Withdrawal 頁面引入 Tooltip"
check_file "apps/web/app/(main)/wallet/withdraw/page.tsx" "<Tooltip" "Withdrawal 頁面使用 Tooltip"
echo ""

echo "任務 3: 移動端表格優化"
echo "---------------------"
check_file "apps/admin/app/(dashboard)/users/page.tsx" "ResponsiveTable" "Admin users 頁面使用 ResponsiveTable"
check_file "apps/admin/app/(dashboard)/users/page.tsx" "Column<User>" "Admin users 頁面定義 Column 類型"
check_file "apps/admin/app/(dashboard)/users/page.tsx" "renderMobileCard" "Admin users 頁面定義 renderMobileCard"
check_file "apps/admin/app/(dashboard)/withdrawals/page.tsx" "ResponsiveTable" "Admin withdrawals 頁面使用 ResponsiveTable"
check_file "apps/admin/app/(dashboard)/withdrawals/page.tsx" "Column<Withdrawal>" "Admin withdrawals 頁面定義 Column 類型"
check_file "apps/admin/app/(dashboard)/withdrawals/page.tsx" "renderMobileCard" "Admin withdrawals 頁面定義 renderMobileCard"
echo ""

echo "文檔檢查"
echo "--------"
check_file "docs/reports/frontend/P0_TASK_COMPLETION_REPORT.md" "P0 前端任務完成報告" "完整報告文檔已生成"
check_file "docs/reports/frontend/P0_TASKS_SUMMARY.md" "P0 前端任務完成總結" "總結文檔已生成"
echo ""

echo "======================="
echo "驗證結果總結"
echo "======================="
echo "✅ 通過: $PASS"
echo "❌ 失敗: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 所有檢查通過！P0 任務修改已正確應用。"
    exit 0
else
    echo "⚠️  有 $FAIL 項檢查失敗，請檢查上述錯誤。"
    exit 1
fi
