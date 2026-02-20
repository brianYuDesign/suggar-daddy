#!/bin/bash
# ============================================================
# Kimi Webhook Task Dispatcher for Sugar-Daddy
# 被動模式：派發後等待 Webhook 回調，無需輪詢
# ============================================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
KIMI_DIR="$HOME/.openclaw/workspace/kimi-dispatch"
WEBHOOK_PORT="${WEBHOOK_PORT:-9001}"
WEBHOOK_URL="http://localhost:$WEBHOOK_PORT/kimi/webhook"

# 顏色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 用法
usage() {
    echo "🚀 Kimi Webhook Dispatcher - 被動接收模式"
    echo ""
    echo "用法: $0 <任務描述> [任務名稱]"
    echo ""
    echo "範例:"
    echo "  $0 '分析專案架構並生成文檔' 'architecture-analysis'"
    echo "  $0 '優化數據庫查詢' 'db-optimization'"
    echo ""
    exit 1
}

# 檢查參數
if [ $# -lt 1 ]; then
    usage
fi

PROMPT="$1"
TASK_NAME="${2:-task-$(date +%s)}"
WEBHOOK_CALLBACK="$WEBHOOK_URL/$TASK_NAME"

echo -e "${GREEN}🚀 派發 Kimi 任務（Webhook 模式）${NC}"
echo "============================================================"
echo ""
echo "📋 任務：$PROMPT"
echo "🏷️  名稱：$TASK_NAME"
echo "🔗 Webhook：$WEBHOOK_CALLBACK"
echo ""

# 檢查 Webhook 伺服器
echo -n "檢查 Webhook 伺服器... "
if ! curl -s http://localhost:$WEBHOOK_PORT/health > /dev/null; then
    echo -e "${YELLOW}未運行，正在啟動...${NC}"
    cd "$KIMI_DIR"
    nohup node scripts/kimi-webhook.js > /tmp/kimi-webhook.log 2>&1 &
    sleep 2
fi
echo -e "${GREEN}✅ 就緒${NC}"
echo ""

# 檢查 API Key
if [ -z "$KIMI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  未設置 KIMI_API_KEY 環境變量${NC}"
    echo "   請先執行：export KIMI_API_KEY='your-api-key'"
    exit 1
fi

echo "📤 發送請求到 Kimi API..."
echo ""

# 派發任務（帶 Webhook 回調）
curl -s -X POST "$KIMI_API_URL/chat/completions" \
    -H "Authorization: Bearer $KIMI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"model\": \"${KIMI_MODEL:-moonshot-v1-128k}\",
        \"messages\": [
            {\"role\": \"user\", \"content\": \"$PROMPT\"}
        ],
        \"temperature\": 0.3,
        \"max_tokens\": 8000,
        \"metadata\": {
            \"task_name\": \"$TASK_NAME\",
            \"webhook_url\": \"$WEBHOOK_CALLBACK\"
        }
    }" > /tmp/kimi-response.json &

REQUEST_PID=$!

echo -e "${GREEN}✅ 任務已派發！${NC}"
echo ""
echo "📡 被動接收模式啟動："
echo "   - 不需要輪詢檢查狀態"
echo "   - Kimi 完成後會自動推送結果到 http://localhost:$WEBHOOK_PORT"
echo "   - Javis 會被自動喚醒處理結果"
echo ""
echo "⏳ 等待 Kimi 處理中...（你可以關閉這個終端）"
echo ""
echo "📊 查看狀態："
echo "   curl http://localhost:$WEBHOOK_PORT/pending"
echo "   curl http://localhost:$WEBHOOK_PORT/latest"
echo ""
echo "📝 日志：tail -f /tmp/kimi-webhook.log"
echo ""

wait $REQUEST_PID 2>/dev/null || true
