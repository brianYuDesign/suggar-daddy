#!/bin/bash
# 文檔與腳本清理執行腳本
# 基於 DOCUMENTATION_CLEANUP_PLAN.md

set -e  # 遇到錯誤立即停止

echo "=========================================="
echo "📋 文檔與腳本清理執行器"
echo "=========================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 確認執行
read -p "⚠️  此腳本將修改文檔結構，是否已閱讀 DOCUMENTATION_CLEANUP_PLAN.md？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 請先閱讀清理計劃後再執行"
    exit 1
fi

echo ""
echo "=========================================="
echo "Phase 1: 備份"
echo "=========================================="

# 創建備份目錄
BACKUP_DIR="backups/cleanup-$(date +%Y-%m-%d-%H%M%S)"
echo "📦 創建備份目錄: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 備份要修改/刪除的文件
echo "📋 備份角色系統文檔..."
cp docs/ROLE_SYSTEM_*.md "$BACKUP_DIR/" 2>/dev/null || true

echo "📋 備份 e2e 文檔..."
cp docs/e2e-rate*.md "$BACKUP_DIR/" 2>/dev/null || true

echo "📋 備份 testing 文檔..."
cp docs/testing/E2E-TESTING-GUIDE.md "$BACKUP_DIR/" 2>/dev/null || true

echo "📋 備份腳本..."
cp scripts/check-services.sh "$BACKUP_DIR/" 2>/dev/null || true
cp scripts/docker-manager.sh "$BACKUP_DIR/" 2>/dev/null || true
cp scripts/e2e-test.sh "$BACKUP_DIR/" 2>/dev/null || true
cp scripts/e2e-test-run.sh "$BACKUP_DIR/" 2>/dev/null || true

echo -e "${GREEN}✅ 備份完成: $BACKUP_DIR${NC}"
echo ""

# 列出備份內容
echo "備份內容:"
ls -lh "$BACKUP_DIR/"
echo ""

read -p "繼續執行清理？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""
echo "=========================================="
echo "Phase 2: 角色系統文檔整合"
echo "=========================================="

# Step 1: 合併 IMPLEMENTATION_SUMMARY → COMPLETION_REPORT
echo "📝 合併 IMPLEMENTATION_SUMMARY 到 COMPLETION_REPORT..."

if [ -f "docs/ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md" ]; then
    # 提取檔案清單部分
    echo "" >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md
    echo "---" >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md
    echo "" >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md
    echo "## 附錄：變更檔案清單" >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md
    echo "" >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md
    echo "以下是完整的檔案變更列表（來自 IMPLEMENTATION_SUMMARY）：" >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md
    echo "" >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md
    
    # 提取 IMPLEMENTATION_SUMMARY 的檔案列表部分（需要手動調整）
    sed -n '/## 變更檔案清單/,/^##/p' docs/ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md | sed '$d' >> docs/ROLE_SYSTEM_COMPLETION_REPORT.md || true
    
    echo -e "${GREEN}✅ 已合併檔案清單${NC}"
fi

# Step 2: 精簡 README → QUICK_REFERENCE
echo "📝 將 README 導航添加到 QUICK_REFERENCE..."

if [ -f "docs/ROLE_SYSTEM_README.md" ]; then
    # 創建臨時文件
    TMP_FILE=$(mktemp)
    
    # 添加導航區塊到頂部
    cat > "$TMP_FILE" << 'EOF'
# 角色系統快速參考

## 📚 文檔導航

**根據你的角色，選擇適合的文檔**：

| 角色 | 推薦文檔 | 說明 |
|------|---------|------|
| 👨‍💻 **開發者**（日常開發）| [本文檔] | 快速查閱 enum、使用範例、最佳實踐 |
| 📊 **PM/TL**（項目管理）| [COMPLETION_REPORT](./ROLE_SYSTEM_COMPLETION_REPORT.md) | 項目成果、Phase 狀態、效益分析 |
| 🏗️ **架構師**（技術規劃）| [REFACTORING](./ROLE_SYSTEM_REFACTORING.md) | 架構設計、風險評估、遷移計畫 |

**文檔結構**：
- 本文檔（Quick Reference）→ 日常開發手冊
- Completion Report → 項目完成總結
- Refactoring → 架構設計方案

---

EOF
    
    # 添加原始內容（跳過舊的標題和導航）
    sed '1,/^## /d' docs/ROLE_SYSTEM_QUICK_REFERENCE.md >> "$TMP_FILE"
    
    # 替換原文件
    mv "$TMP_FILE" docs/ROLE_SYSTEM_QUICK_REFERENCE.md
    
    echo -e "${GREEN}✅ 已更新 QUICK_REFERENCE${NC}"
fi

# Step 3: 刪除已合併的文件
echo "🗑️  刪除已合併的文件..."
git rm -f docs/ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md 2>/dev/null || rm -f docs/ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md
git rm -f docs/ROLE_SYSTEM_README.md 2>/dev/null || rm -f docs/ROLE_SYSTEM_README.md

echo -e "${GREEN}✅ Phase 2 完成${NC}"
echo ""

echo "=========================================="
echo "Phase 3: E2E 文檔清理"
echo "=========================================="

# 創建 archive 目錄
mkdir -p docs/archive/solutions

# 移動到 archive
echo "📦 移動 e2e-rate-limit-solution.md 到 archive..."
if [ -f "docs/e2e-rate-limit-solution.md" ]; then
    git mv docs/e2e-rate-limit-solution.md docs/archive/solutions/ 2>/dev/null || mv docs/e2e-rate-limit-solution.md docs/archive/solutions/
    echo -e "${GREEN}✅ 已移動${NC}"
fi

# 刪除摘要
echo "🗑️  刪除 e2e-rate-limit-fix-summary.md..."
if [ -f "docs/e2e-rate-limit-fix-summary.md" ]; then
    git rm -f docs/e2e-rate-limit-fix-summary.md 2>/dev/null || rm -f docs/e2e-rate-limit-fix-summary.md
    echo -e "${GREEN}✅ 已刪除${NC}"
fi

# 在 TESTING.md 添加參考連結
echo "📝 更新 TESTING.md 添加歷史記錄連結..."
if [ -f "docs/testing/TESTING.md" ]; then
    cat >> docs/testing/TESTING.md << 'EOF'

---

## 📜 歷史修復記錄

- [E2E Rate Limit 修復](../archive/solutions/e2e-rate-limit-solution.md) - 解決 E2E 測試速率限制問題的三層策略
EOF
    echo -e "${GREEN}✅ 已更新${NC}"
fi

echo -e "${GREEN}✅ Phase 3 完成${NC}"
echo ""

echo "=========================================="
echo "Phase 4: Testing 目錄清理"
echo "=========================================="

echo "🗑️  刪除舊版 E2E-TESTING-GUIDE.md..."
if [ -f "docs/testing/E2E-TESTING-GUIDE.md" ]; then
    git rm -f docs/testing/E2E-TESTING-GUIDE.md 2>/dev/null || rm -f docs/testing/E2E-TESTING-GUIDE.md
    echo -e "${GREEN}✅ 已刪除${NC}"
fi

echo -e "${GREEN}✅ Phase 4 完成${NC}"
echo ""

echo "=========================================="
echo "Phase 5: Scripts 整合"
echo "=========================================="

# 合併 check-services.sh 到 health-check.sh
echo "📝 合併 check-services.sh 到 health-check.sh..."
if [ -f "scripts/check-services.sh" ] && [ -f "scripts/health-check.sh" ]; then
    echo "" >> scripts/health-check.sh
    echo "# ========================================" >> scripts/health-check.sh
    echo "# 以下內容來自 check-services.sh" >> scripts/health-check.sh
    echo "# ========================================" >> scripts/health-check.sh
    cat scripts/check-services.sh >> scripts/health-check.sh
    echo -e "${GREEN}✅ 已合併${NC}"
    echo -e "${YELLOW}⚠️  請手動檢查並移除重複功能${NC}"
fi

# 刪除過時腳本
echo "🗑️  刪除過時腳本..."
for script in check-services.sh docker-manager.sh e2e-test.sh e2e-test-run.sh; do
    if [ -f "scripts/$script" ]; then
        git rm -f "scripts/$script" 2>/dev/null || rm -f "scripts/$script"
        echo "  - 已刪除 $script"
    fi
done

echo -e "${GREEN}✅ Phase 5 完成${NC}"
echo -e "${YELLOW}⚠️  請檢查 health-check.sh 並移除重複代碼${NC}"
echo ""

echo "=========================================="
echo "Phase 6: 更新文檔引用"
echo "=========================================="

echo "🔍 搜尋需要更新的連結..."

# 搜尋可能需要更新的引用
echo ""
echo "以下文件可能包含過時連結，請手動檢查："
grep -r "ROLE_SYSTEM_IMPLEMENTATION_SUMMARY\|ROLE_SYSTEM_README\|e2e-rate-limit-fix-summary\|E2E-TESTING-GUIDE.md" docs/ 2>/dev/null | cut -d: -f1 | sort -u || echo "  (未找到)"

echo ""
echo -e "${YELLOW}⚠️  Phase 6 需要手動完成${NC}"
echo ""

echo "=========================================="
echo "Phase 7: 驗證"
echo "=========================================="

echo "🧪 驗證腳本功能..."

# 檢查關鍵腳本是否存在
MISSING_SCRIPTS=()
for script in ci-check.sh commit.sh dev-start.sh e2e-admin-start.sh health-check.sh; do
    if [ ! -f "scripts/$script" ]; then
        MISSING_SCRIPTS+=("$script")
    fi
done

if [ ${#MISSING_SCRIPTS[@]} -ne 0 ]; then
    echo -e "${RED}❌ 缺少關鍵腳本: ${MISSING_SCRIPTS[*]}${NC}"
    exit 1
fi

# 檢查文檔是否存在
MISSING_DOCS=()
for doc in ROLE_SYSTEM_QUICK_REFERENCE.md ROLE_SYSTEM_COMPLETION_REPORT.md ROLE_SYSTEM_REFACTORING.md; do
    if [ ! -f "docs/$doc" ]; then
        MISSING_DOCS+=("$doc")
    fi
done

if [ ${#MISSING_DOCS[@]} -ne 0 ]; then
    echo -e "${RED}❌ 缺少核心文檔: ${MISSING_DOCS[*]}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 基本驗證通過${NC}"
echo ""

echo "=========================================="
echo "✅ 清理完成！"
echo "=========================================="
echo ""
echo "📊 結果統計："
echo "  - 角色系統文檔: 5 → 3"
echo "  - E2E 文檔: 2 → 0 (移到 archive)"
echo "  - Scripts: 19 → 15"
echo ""
echo "📝 後續步驟："
echo "  1. 檢查 health-check.sh，移除重複代碼"
echo "  2. 手動更新文檔中的過時連結 (Phase 6)"
echo "  3. 執行測試: npm run ci:check"
echo "  4. 提交變更: git add -A && git commit"
echo ""
echo "📦 備份位置: $BACKUP_DIR"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
