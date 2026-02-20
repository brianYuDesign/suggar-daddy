#!/bin/bash
# Kimi Dispatch - 快速啟動脚本
# 用法：
#   ./run-kimi.sh "寫一個 Python 計算器"
#   ./run-kimi.sh "開發網頁爬蟲" "scraper-task" "-5298003529"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISPATCH_SCRIPT="$SCRIPT_DIR/scripts/dispatch-kimi.sh"

PROMPT="${1:-}"
TASK_NAME="${2:-task-$(date +%s)}"
TELEGRAM_GROUP="${3:-}"

if [ -z "$PROMPT" ]; then
    echo "❌ 用法: $0 <任務描述> [任務名稱] [Telegram群組ID]"
    echo ""
    echo "📝 範例："
    echo "  $0 '實現一個 Python 計算器'"
    echo "  $0 '開發網頁爬蟲' 'scraper' '-5298003529'"
    echo ""
    exit 1
fi

# 檢查 dispatch 腳本是否存在
if [ ! -f "$DISPATCH_SCRIPT" ]; then
    echo "❌ 缺少 dispatch 腳本: $DISPATCH_SCRIPT"
    echo "💡 請先執行安裝步驟"
    exit 1
fi

# 準備參數
ARGS=(-p "$PROMPT" -n "$TASK_NAME")

if [ -n "$TELEGRAM_GROUP" ]; then
    ARGS+=(--group "$TELEGRAM_GROUP")
fi

# 添加默認配置
ARGS+=(--temperature 0.3 --max-tokens 8000)

# 執行 dispatch
exec "$DISPATCH_SCRIPT" "${ARGS[@]}"
