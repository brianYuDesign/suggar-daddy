# Kimi Dispatch - 零輪詢模式（省 Token 方案）

模仿 Claude Code Hook，用 **Kimi API 異步調用 + Webhook 回調** 的方式，Token 消耗幾乎為 0。

## 🎯 核心概念

| 傳統方案 | Hook 方案 |
|--------|---------|
| 📊 每 5 秒輪詢一次 | ⚡ 完成時自動通知 |
| 🔴 Token 爆炸 | 🟢 Token 幾乎為 0 |
| 📉 響應慢 | ⚡ 秒級反應 |

## 🛠️ 架構

```
用戶在聊天中：
  "幫我用 Kimi 開發一個 Python API"
     ↓
Javis 派發任務 → 調用 Kimi API（帶回調 URL）
     ↓
Kimi 處理中（Javis 完全不理 ✅）
     ↓
Kimi 完成 → 發送 POST 到 Webhook
     ↓
Webhook 保存結果 → 喚醒 Javis
     ↓
Javis 讀取結果 → 回報用戶
```

## 📁 目錄結構

```
~/.openclaw/workspace/kimi-dispatch/
├── README.md                    # 本檔案
├── run-kimi.sh                  # 快速啟動腳本
├── scripts/
│   ├── dispatch-kimi.sh         # Kimi 派發腳本
│   ├── kimi-webhook.js          # Express webhook 伺服器
│   └── kimi-client.js           # Kimi API 客戶端
├── hooks/
│   ├── notify-agi.sh            # 喚醒通知
│   └── webhook-handler.sh       # Webhook 處理器
└── results/                     # 結果目錄
    ├── latest.json              # 最新任務結果
    ├── task-output.txt          # 任務輸出
    └── pending-wake.json        # 待喚醒標記
```

## 🚀 使用方式

### 方式 1：在聊天中下達任務

```
幫我用 Kimi 開發一個 Python 計算器

用 Kimi dispatch 一個任務：實現 FastAPI + SQLite 的 TODO API

Kimi：寫一個 Node.js 爬蟲，抓取 HN 首頁的文章
```

### 方式 2：手動執行命令

```bash
cd ~/.openclaw/workspace/kimi-dispatch

# 基礎任務
./run-kimi.sh "實現一個 Python 計算器"

# 指定任務名稱
./run-kimi.sh "開發網頁爬蟲" "scraper-task"

# 指定目標群組（自動通知）
./run-kimi.sh "實現 FastAPI 認證" "auth-api" "-5298003529"

# 完整版本（更多選項）
cd scripts
./dispatch-kimi.sh \
  -p "開發一個 Markdown 轉 HTML 工具" \
  -n "md-to-html" \
  -g "-5255123740" \
  --temperature 0.3 \
  --max-tokens 8000
```

## 📋 Kimi API 配置

### 環境變量

```bash
export KIMI_API_KEY="your-kimi-api-key"
export KIMI_API_URL="https://api.moonshot.cn/v1"
export WEBHOOK_URL="https://your-domain.com/webhook/kimi"  # 自己的 webhook
export OPENCLAW_GATEWAY_URL="http://localhost:8888"         # OpenClaw Gateway
```

### Kimi 模型列表

| 模型 | 用途 | Token 限制 |
|------|------|----------|
| `moonshot-v1-8k` | 快速任務 | 8K |
| `moonshot-v1-32k` | 中等任務 | 32K |
| `moonshot-v1-128k` | 大型任務 | 128K |
| `kimi-k2.5` | 最新高性能 | 2M 上下文 |

## 📊 與 Claude Code Hook 對比

| 特性 | Claude Code | Kimi Dispatch |
|------|-------------|--------------|
| 調用方式 | CLI 命令 | API 請求 |
| 回調機制 | Hook 腳本 | HTTP Webhook |
| 支援上下文 | 檔案系統 | 提示詞注入 |
| 成本 | 按 token 計費 | 按 token 計費 |
| 響應時間 | 秒級 | 秒級 |
| 並發能力 | 單個進程 | 完全並發 |

## 🔄 工作流程細節

### 派發階段（Dispatch）

```bash
# 1. 生成任務 ID
TASK_ID="kimi-$(date +%s)-$RANDOM"

# 2. 準備 Webhook URL（指向自己的 OpenClaw）
WEBHOOK="$OPENCLAW_GATEWAY_URL/api/kimi/webhook/$TASK_ID"

# 3. 調用 Kimi API（非阻塞）
curl -X POST "$KIMI_API_URL/chat/completions" \
  -H "Authorization: Bearer $KIMI_API_KEY" \
  -d '{
    "model": "moonshot-v1-128k",
    "messages": [{"role": "user", "content": "'"$PROMPT"'"}],
    "stream": false,
    "metadata": {
      "webhook_url": "'"$WEBHOOK"'",
      "task_id": "'"$TASK_ID"'",
      "task_name": "'"$TASK_NAME"'"
    }
  }'

# 4. 立即回傳給用戶
echo "✅ Kimi 任務已派發：$TASK_ID"
```

### 回調階段（Webhook）

當 Kimi 完成時：

```bash
# 1. 接收 Webhook POST
POST /api/kimi/webhook/$TASK_ID
Body: {
  "id": "cmpl-...",
  "model": "moonshot-v1-128k",
  "usage": { "prompt_tokens": 200, "completion_tokens": 500 },
  "choices": [{ "message": { "content": "..." } }],
  "metadata": { "task_id": "...", "task_name": "..." }
}

# 2. 保存結果
cat > ~/.openclaw/workspace/kimi-dispatch/results/latest.json <<EOF
{
  "task_id": "$TASK_ID",
  "task_name": "$TASK_NAME",
  "status": "done",
  "model": "moonshot-v1-128k",
  "output": "...",
  "tokens": {
    "prompt": 200,
    "completion": 500,
    "total": 700
  },
  "completed_at": "2026-02-17T15:30:00Z"
}
EOF

# 3. 喚醒 Javis
curl -X POST "$OPENCLAW_GATEWAY_URL/api/cron/wake" \
  -d '{"text":"Kimi 任務完成：'"$TASK_NAME"'"}'
```

### 結果處理階段（Reply）

當 Javis 被喚醒時：

```javascript
// 1. 檢查是否有待處理的 Kimi 任務
const result = readFile('~/.openclaw/workspace/kimi-dispatch/results/latest.json');

// 2. 解析結果
if (result.status === 'done') {
  const summary = summarize(result.output, 300);
  const tokenUsage = result.tokens.total;
  
  // 3. 回報給用戶
  reply(`
✅ Kimi 任務完成！

📋 任務名稱：${result.task_name}
🤖 使用模型：${result.model}
💾 Token 消耗：${result.tokens.prompt} (提示) + ${result.tokens.completion} (生成) = ${tokenUsage}
⏱️ 完成時間：${result.completed_at}

📝 結果摘要：
${summary}

💡 完整結果保存於：~/.openclaw/workspace/kimi-dispatch/results/latest.json
  `);
}
```

## ⚙️ 安裝步驟

### 1. 創建目錄結構

```bash
mkdir -p ~/.openclaw/workspace/kimi-dispatch/{scripts,hooks,results}
cd ~/.openclaw/workspace/kimi-dispatch
```

### 2. 配置環境變量

```bash
cat > ~/.openclaw/workspace/.env.kimi <<'EOF'
KIMI_API_KEY="your-kimi-api-key-here"
KIMI_API_URL="https://api.moonshot.cn/v1"
KIMI_MODEL="moonshot-v1-128k"
WEBHOOK_PORT=9001
WEBHOOK_SECRET="your-webhook-secret"
EOF

chmod 600 ~/.openclaw/workspace/.env.kimi
```

### 3. 啟動 Webhook 伺服器

```bash
# 背景運行
nohup node ~/.openclaw/workspace/kimi-dispatch/scripts/kimi-webhook.js > \
  ~/.openclaw/workspace/kimi-dispatch/webhook.log 2>&1 &
```

### 4. 設定 OpenClaw Gateway 代理（可選）

如果想用 OpenClaw 的 Gateway 接收 Webhook，編輯 gateway config：

```yaml
api:
  routes:
    - path: /api/kimi/webhook/:taskId
      handler: kimi-webhook
      methods: [POST]
```

## 🧠 Javis 的集成邏輯

在 Javis 的 HEARTBEAT.md 中添加：

```markdown
## 定期檢查 Kimi 任務

- 每個心跳檢查 `~/.openclaw/workspace/kimi-dispatch/results/latest.json`
- 如果有新完成的任務，自動回報給用戶
- 更新任務狀態為 "acknowledged"
```

## 🔐 安全考慮

1. **API Key 保護**：使用 `.env` 檔案，**永不提交到 Git**
2. **Webhook 驗證**：所有回調都帶簽名驗證
3. **速率限制**：默認每分鐘最多 10 個任務
4. **超時處理**：超過 1 小時未完成的任務自動超時

## 📊 監控與調試

```bash
# 查看最新任務狀態
cat ~/.openclaw/workspace/kimi-dispatch/results/latest.json | jq

# 看 Webhook 日誌
tail -f ~/.openclaw/workspace/kimi-dispatch/webhook.log

# 查看待喚醒任務
cat ~/.openclaw/workspace/kimi-dispatch/results/pending-wake.json | jq

# 手動觸發喚醒（測試用）
curl -X POST http://localhost:8888/api/cron/wake \
  -d '{"text":"Manual Kimi test"}'
```

## 🧪 測試

```bash
# 在 OpenClaw 聊天中
Kimi：寫一個 Python 的費波那契函數，包含單元測試

# 或手動測試
cd ~/.openclaw/workspace/kimi-dispatch
./run-kimi.sh "寫一個 JavaScript 的 Hello World" "hello-test"

# 查看結果
sleep 5 && cat results/latest.json | jq
```

## ⚡ 省 Token 的關鍵

1. **零輪詢**：不主動檢查狀態，完全由 Webhook 驅動
2. **單次調用**：派發後就完事，不再交互
3. **非流式**：完整結果一次返回（不浪費 stream token）
4. **緩存結果**：結果保存到本地，避免重複查詢

## 📝 成本估算

假設每天 10 個任務，每個 1000 tokens：

| 方式 | 每日消耗 | 月度成本（¥0.06/1K token） |
|------|--------|---------------------------|
| 傳統輪詢（5 秒檢查） | 72,000 | ¥259 |
| Hook 方案 | 10,000 | ¥18 |
| **節省** | **86%** | **¥241** |

---

_準備好了？執行 `./run-kimi.sh "你的任務"` 開始吧！_
