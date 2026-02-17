#!/bin/bash
# Kimi Dispatch - 完整派發腳本
# 用法: dispatch-kimi.sh -p <提示詞> -n <任務名稱> [--group <群組ID>] [--temperature <溫度>] [--max-tokens <最大token數>]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
KIMI_DIR="$WORKSPACE_DIR/kimi-dispatch"
RESULTS_DIR="$KIMI_DIR/results"

# 默認值
PROMPT=""
TASK_NAME=""
TELEGRAM_GROUP=""
TEMPERATURE="0.3"
MAX_TOKENS="8000"
KIMI_MODEL="${KIMI_MODEL:-moonshot-v1-128k}"
KIMI_API_URL="${KIMI_API_URL:-https://api.moonshot.cn/v1}"
WEBHOOK_HOST="${WEBHOOK_HOST:-localhost}"
WEBHOOK_PORT="${WEBHOOK_PORT:-9001}"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 幫助信息
show_help() {
    cat << EOF
🚀 Kimi Dispatch - Token 省錢方案

用法: $0 -p <提示詞> -n <任務名稱> [選項]

必需參數:
  -p, --prompt <提示詞>        給 Kimi 的任務描述
  -n, --name <任務名稱>        任務識別符（用於追蹤）

可選參數:
  -g, --group <群組ID>         Telegram 群組 ID（完成後自動通知）
  -t, --temperature <溫度>     0.0-2.0，默認 0.3（越低越穩定）
  -m, --max-tokens <token數>   最多生成多少個 token，默認 8000
  -M, --model <模型>          Kimi 模型，默認 moonshot-v1-128k
  -h, --help                   顯示此幫助信息

環境變量:
  KIMI_API_KEY                 必需：你的 Kimi API Key
  KIMI_MODEL                   可選：指定模型
  WEBHOOK_HOST                 可選：Webhook 主機名，默認 localhost
  WEBHOOK_PORT                 可選：Webhook 端口，默認 9001

範例:
  # 基礎任務
  $0 -p "寫一個 Python 計算器" -n "calc"
  
  # 完整配置
  $0 \\
    -p "開發 FastAPI 認證系統" \\
    -n "auth-api" \\
    -g "-5298003529" \\
    -t 0.5 \\
    -m moonshot-v1-128k

EOF
}

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--prompt)
            PROMPT="$2"
            shift 2
            ;;
        -n|--name)
            TASK_NAME="$2"
            shift 2
            ;;
        -g|--group)
            TELEGRAM_GROUP="$2"
            shift 2
            ;;
        -t|--temperature)
            TEMPERATURE="$2"
            shift 2
            ;;
        -m|--max-tokens)
            MAX_TOKENS="$2"
            shift 2
            ;;
        -M|--model)
            KIMI_MODEL="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 未知參數: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 驗證必需參數
if [ -z "$PROMPT" ]; then
    echo -e "${RED}❌ 缺少 -p/--prompt 參數${NC}"
    show_help
    exit 1
fi

if [ -z "$TASK_NAME" ]; then
    echo -e "${RED}❌ 缺少 -n/--name 參數${NC}"
    show_help
    exit 1
fi

# 驗證 API Key
if [ -z "$KIMI_API_KEY" ]; then
    echo -e "${RED}❌ 未設定 KIMI_API_KEY 環境變量${NC}"
    echo -e "${YELLOW}💡 設定方式：${NC}"
    echo "  export KIMI_API_KEY='your-api-key'"
    exit 1
fi

# 創建結果目錄
mkdir -p "$RESULTS_DIR"

# 生成任務 ID
TASK_ID="kimi-$(date +%s)-$RANDOM"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo -e "${BLUE}🚀 Kimi 任務派發${NC}"
echo -e "${BLUE}═══════════════════════════════════${NC}"
echo -e "  ${YELLOW}任務 ID${NC}: $TASK_ID"
echo -e "  ${YELLOW}任務名稱${NC}: $TASK_NAME"
echo -e "  ${YELLOW}模型${NC}: $KIMI_MODEL"
echo -e "  ${YELLOW}溫度${NC}: $TEMPERATURE"
echo -e "  ${YELLOW}Max Tokens${NC}: $MAX_TOKENS"

if [ -n "$TELEGRAM_GROUP" ]; then
    echo -e "  ${YELLOW}通知群組${NC}: $TELEGRAM_GROUP"
fi

echo -e "  ${YELLOW}提示詞${NC}: ${PROMPT:0:60}..."
echo ""

# 準備 Webhook URL
WEBHOOK_URL="http://$WEBHOOK_HOST:$WEBHOOK_PORT/kimi/webhook/$TASK_ID"

# 準備 API 請求體
read -r -d '' API_PAYLOAD << EOF || true
{
  "model": "$KIMI_MODEL",
  "messages": [
    {
      "role": "user",
      "content": "$PROMPT"
    }
  ],
  "temperature": $TEMPERATURE,
  "max_tokens": $MAX_TOKENS,
  "stream": false,
  "metadata": {
    "task_id": "$TASK_ID",
    "task_name": "$TASK_NAME",
    "webhook_url": "$WEBHOOK_URL",
    "telegram_group": "$TELEGRAM_GROUP"
  }
}
EOF

# 保存待派發的任務信息
cat > "$RESULTS_DIR/pending-$TASK_ID.json" << EOF
{
  "task_id": "$TASK_ID",
  "task_name": "$TASK_NAME",
  "status": "pending",
  "model": "$KIMI_MODEL",
  "temperature": $TEMPERATURE,
  "max_tokens": $MAX_TOKENS,
  "prompt": "$PROMPT",
  "telegram_group": "$TELEGRAM_GROUP",
  "webhook_url": "$WEBHOOK_URL",
  "created_at": "$TIMESTAMP",
  "webhook_host": "$WEBHOOK_HOST",
  "webhook_port": $WEBHOOK_PORT
}
EOF

echo -e "${YELLOW}📡 正在派發任務到 Kimi API...${NC}"

# 調用 Kimi API（非阻塞）
RESPONSE=$(curl -s -X POST "$KIMI_API_URL/chat/completions" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$API_PAYLOAD")

# 檢查 API 響應
if echo "$RESPONSE" | grep -q '"id"'; then
    API_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ 任務已派發！${NC}"
    echo -e "  ${YELLOW}API ID${NC}: $API_ID"
    echo -e "  ${YELLOW}Webhook${NC}: $WEBHOOK_URL"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════${NC}"
    echo -e "${GREEN}✨ 任務正在 Kimi 中執行...${NC}"
    echo -e "   完成後會自動通知你！"
    echo -e "   預計等待時間：${YELLOW}30-120 秒${NC}"
    echo ""
    echo -e "${YELLOW}💡 提示：${NC}"
    echo "   • 不要輪詢檢查狀態"
    echo "   • Webhook 完成後會自動喚醒 Javis"
    echo "   • 查看結果：cat $RESULTS_DIR/latest.json"
    echo ""
    
    # 保存 API 響應用於調試
    echo "$RESPONSE" > "$RESULTS_DIR/api-response-$TASK_ID.json"
    
    # 更新任務狀態為 dispatched
    sed -i '' 's/"status": "pending"/"status": "dispatched"/' "$RESULTS_DIR/pending-$TASK_ID.json"
    
    exit 0
else
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "${RED}❌ API 請求失敗${NC}"
    echo -e "  ${RED}錯誤${NC}: $ERROR_MSG"
    echo ""
    echo -e "${YELLOW}完整響應：${NC}"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    
    # 記錄錯誤日誌
    echo "$RESPONSE" > "$RESULTS_DIR/error-$TASK_ID.json"
    
    exit 1
fi
