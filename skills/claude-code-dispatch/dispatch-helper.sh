#!/bin/bash
# Claude Code Dispatch Helper
# 由 Javis 在聊天中呼叫

set -euo pipefail

RESULT_DIR="$HOME/.openclaw/workspace/claude-code-results"
DISPATCH_SCRIPT="$HOME/.openclaw/workspace/claude-code-hooks/run-claude.sh"

# 檢查 dispatch 腳本是否存在
if [ ! -f "$DISPATCH_SCRIPT" ]; then
    echo "❌ 錯誤: Dispatch 腳本不存在"
    echo "請先執行設置: cd ~/.openclaw/workspace && git clone https://github.com/win4r/claude-code-hooks.git"
    exit 1
fi

# 預設值
PROMPT="$1"
TASK_NAME="${2:-task-$(date +%s)}"
TELEGRAM_GROUP="${3:-}"

if [ -z "$PROMPT" ]; then
    echo "用法: dispatch-helper.sh <任務描述> [任務名稱] [群組ID]"
    exit 1
fi

echo "🚀 啟動 Claude Code 任務"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 任務: $TASK_NAME"
echo "💬 提示: $PROMPT"
[ -n "$TELEGRAM_GROUP" ] && echo "📱 通知群組: $TELEGRAM_GROUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 執行 dispatch
"$DISPATCH_SCRIPT" "$PROMPT" "$TASK_NAME" "$TELEGRAM_GROUP"

echo ""
echo "✅ 任務已派發"
echo "📝 完成後會自動通知"
echo "📊 結果檔案: $RESULT_DIR/latest.json"
