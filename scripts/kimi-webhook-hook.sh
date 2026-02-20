#!/bin/bash
# ============================================================
# Kimi Webhook Hook for Sugar-Daddy Project
# 被動接收 Kimi 任務完成通知（無輪詢）
# ============================================================

set -e

# 配置
PROJECT_NAME="suggar-daddy"
WEBHOOK_URL="http://localhost:9001/kimi/webhook"
RESULTS_DIR="$HOME/.openclaw/workspace/kimi-dispatch/results"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Kimi Webhook Hook for $PROJECT_NAME${NC}"
echo "============================================================"
echo ""

# 檢查 Webhook 伺服器狀態
echo -n "檢查 Webhook 伺服器... "
if curl -s http://localhost:9001/health > /dev/null; then
    echo -e "${GREEN}✅ 運行中${NC}"
else
    echo -e "${YELLOW}⚠️ 未運行，正在啟動...${NC}"
    cd "$HOME/.openclaw/workspace/kimi-dispatch"
    nohup node scripts/kimi-webhook.js > /tmp/kimi-webhook.log 2>&1 &
    sleep 2
    if curl -s http://localhost:9001/health > /dev/null; then
        echo -e "${GREEN}✅ 已啟動${NC}"
    else
        echo -e "${YELLOW}❌ 啟動失敗，請檢查日志: /tmp/kimi-webhook.log${NC}"
        exit 1
    fi
fi
echo ""

# 顯示使用說明
echo "📋 使用方式:"
echo "------------------------------------------------------------"
echo ""
echo "1. 派發 Kimi 任務（帶 webhook 回調）:"
echo "   export KIMI_WEBHOOK_URL=\"$WEBHOOK_URL/my-task-001\""
echo "   ./kimi-dispatch/run-kimi.sh \"你的任務描述\""
echo ""
echo "2. Kimi 完成後會自動通知到:"
echo "   - 本地 Webhook 伺服器 (Port 9001)"
echo "   - 結果保存到: $RESULTS_DIR"
echo "   - 自動喚醒 Javis"
echo ""
echo "3. 查看待處理任務:"
echo "   curl http://localhost:9001/pending"
echo ""
echo "4. 查看最新結果:"
echo "   curl http://localhost:9001/latest"
echo ""
echo "------------------------------------------------------------"
echo ""
echo -e "${GREEN}✅ Webhook Hook 配置完成！${NC}"
echo ""
echo "💡 提示: 這是「被動模式」，你不需要輪詢檢查狀態。"
echo "   Kimi 完成後會自動推送結果到本地伺服器。"
echo ""
