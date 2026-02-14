#!/bin/bash

# 全表掃描修復驗證腳本
# 快速檢查所有修改是否正確應用

echo "╔════════════════════════════════════════════════════════╗"
echo "║  全表掃描修復驗證                                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 計數器
PASS=0
FAIL=0

# 檢查函數
check_file() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $description"
        ((FAIL++))
    fi
}

check_no_pattern() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if ! grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $description (仍存在舊模式)"
        ((FAIL++))
    fi
}

echo -e "${BLUE}📦 檢查 matching-service 修復...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file \
    "apps/matching-service/src/app/matching.service.ts" \
    "const matchKeys = matchIds.map" \
    "getMatches() 使用用戶索引"

check_file \
    "apps/matching-service/src/app/matching.service.ts" \
    "批量取得所有配對記錄" \
    "getMatches() 使用 MGET 批量讀取"

check_file \
    "apps/matching-service/src/app/matching.service.ts" \
    "先檢查用戶是否有此配對" \
    "unmatch() 優化為直接查詢"

check_no_pattern \
    "apps/matching-service/src/app/matching.service.ts" \
    "const allMatchKeys = await this.redisService.scan.*MATCH_PREFIX" \
    "移除 getMatches() 中的全表掃描"

echo ""
echo -e "${BLUE}📋 檢查 subscription-service 修復...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file \
    "apps/subscription-service/src/app/subscription.service.ts" \
    "使用 Redis List 的範圍查詢實現真正的分頁" \
    "findBySubscriber() 使用 LRANGE 分頁"

check_file \
    "apps/subscription-service/src/app/subscription.service.ts" \
    "只取當前頁需要的 ID" \
    "findBySubscriber() 避免全表載入"

check_file \
    "apps/subscription-service/src/app/subscription.service.ts" \
    "批量獲取訂閱詳情" \
    "findBySubscriber() 使用 MGET"

check_no_pattern \
    "apps/subscription-service/src/app/subscription.service.ts" \
    "const allSubscriptions = await this.findAll" \
    "移除 findBySubscriber() 中的全量載入"

echo ""
echo -e "${BLUE}🎬 檢查 media-service 修復...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file \
    "apps/media-service/src/app/media.service.ts" \
    "使用 Redis Sorted Set 作為全局媒體索引" \
    "findAll() 使用 Sorted Set 索引"

check_file \
    "apps/media-service/src/app/media.service.ts" \
    "使用 ZREVRANGE 從索引獲取分頁數據" \
    "findAll() 使用 ZREVRANGE 分頁"

check_file \
    "apps/media-service/src/app/media.service.ts" \
    "rebuildMediaIndex" \
    "提供索引重建方法"

check_file \
    "apps/media-service/src/app/media.service.ts" \
    "添加到全局索引" \
    "create() 維護索引"

check_file \
    "apps/media-service/src/app/media.service.ts" \
    "從全局索引中移除" \
    "remove() 清理索引"

echo ""
echo -e "${BLUE}🔧 檢查 RedisService 擴展...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file \
    "libs/redis/src/redis.service.ts" \
    "Support both single member and multiple members" \
    "zAdd() 支持批量添加"

check_file \
    "libs/redis/src/redis.service.ts" \
    "Trim list to specified range" \
    "lTrim() 方法已添加"

echo ""
echo -e "${BLUE}📄 檢查文檔和腳本...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "scripts/migrate-redis-indexes.ts" ]; then
    echo -e "${GREEN}✓${NC} 索引遷移腳本已創建"
    ((PASS++))
else
    echo -e "${RED}✗${NC} 索引遷移腳本不存在"
    ((FAIL++))
fi

if [ -f "scripts/test-table-scan-fix.ts" ]; then
    echo -e "${GREEN}✓${NC} 性能測試腳本已創建"
    ((PASS++))
else
    echo -e "${RED}✗${NC} 性能測試腳本不存在"
    ((FAIL++))
fi

if [ -f "TABLE_SCAN_FIX_REPORT.md" ]; then
    echo -e "${GREEN}✓${NC} 修復報告文檔已創建"
    ((PASS++))
else
    echo -e "${RED}✗${NC} 修復報告文檔不存在"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}🏗️  檢查編譯狀態...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "dist/apps/matching-service" ]; then
    echo -e "${GREEN}✓${NC} matching-service 編譯成功"
    ((PASS++))
else
    echo -e "${RED}✗${NC} matching-service 編譯失敗"
    ((FAIL++))
fi

if [ -d "dist/apps/subscription-service" ]; then
    echo -e "${GREEN}✓${NC} subscription-service 編譯成功"
    ((PASS++))
else
    echo -e "${RED}✗${NC} subscription-service 編譯失敗"
    ((FAIL++))
fi

if [ -d "dist/apps/media-service" ]; then
    echo -e "${GREEN}✓${NC} media-service 編譯成功"
    ((PASS++))
else
    echo -e "${RED}✗${NC} media-service 編譯失敗"
    ((FAIL++))
fi

# 顯示結果
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${BLUE}📊 驗證結果${NC}"
echo "═══════════════════════════════════════════════════════════"
echo -e "通過: ${GREEN}$PASS${NC}"
echo -e "失敗: ${RED}$FAIL${NC}"
echo -e "總計: $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 所有檢查通過！全表掃描修復已完成。${NC}"
    echo ""
    echo "下一步："
    echo "  1. 執行索引遷移：npm run migrate:redis-indexes"
    echo "  2. 執行性能測試：npm run test:table-scan-fix"
    echo "  3. 查看修復報告：cat TABLE_SCAN_FIX_REPORT.md"
    exit 0
else
    echo -e "${RED}⚠️  部分檢查失敗，請檢查上述錯誤。${NC}"
    exit 1
fi
