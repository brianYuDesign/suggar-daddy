# Kimi Dispatch 與 Javis 集成指南

## 🎯 目標

讓 Javis 能夠自動派發 Kimi 任務，並在完成時回報結果。全程 Token 消耗接近 0。

## 📋 集成清單

### ✅ 第一步：環境配置

#### 1. 設定 Kimi API Key

```bash
# 編輯 ~/.zshrc 或 ~/.bashrc
export KIMI_API_KEY="sk-xxx..."
export KIMI_API_URL="https://api.moonshot.cn/v1"
export KIMI_MODEL="moonshot-v1-128k"

# 驗證
echo $KIMI_API_KEY
```

#### 2. 啟動 Webhook 伺服器（背景）

```bash
# 開一個新終端
cd ~/.openclaw/workspace/kimi-dispatch

# 啟動 Node.js Webhook（如果有 Node.js）
node scripts/kimi-webhook.js

# 或用 nohup 背景執行
nohup node scripts/kimi-webhook.js > webhook.log 2>&1 &
```

#### 3. 檢查 Webhook 是否運行

```bash
# 在另一個終端
curl http://localhost:9001/health | jq
```

應該返回：
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T...",
  "results_dir": "/Users/brianyu/.openclaw/workspace/kimi-dispatch/results"
}
```

### ✅ 第二步：Javis 集成

#### 1. 更新 `TOOLS.md`

添加 Kimi 相關配置：

```markdown
## Kimi Dispatch

### 環境配置
- **API Key**: `$KIMI_API_KEY` (sk-xxx...)
- **API URL**: https://api.moonshot.cn/v1
- **默認模型**: moonshot-v1-128k
- **Webhook 端口**: 9001

### 快速命令
```bash
cd ~/.openclaw/workspace/kimi-dispatch
./run-kimi.sh "你的任務"
```

### Telegram 群組
- g-frontend: -5255123740
- g-backend-devops: -5298003529
```

#### 2. 更新 Heartbeat 檢查

編輯 `HEARTBEAT.md`：

```markdown
## 定期檢查 Kimi 任務

每次心跳檢查：
1. 是否有新完成的 Kimi 任務
2. 更新待派發任務的狀態
3. 如果有待通知的結果，發送給用戶

實現邏輯：
- 檢查 `~/.openclaw/workspace/kimi-dispatch/results/latest.json`
- 如果 status == "done" 且未被 acknowledged，回報結果
- 標記為已確認，避免重複通知
```

#### 3. 實現 Kimi 派發邏輯（偽代碼）

在你的 main session agent 中添加：

```javascript
// 監聽用戶消息，如果包含 Kimi 觸發詞
if (message.includes('kimi') || message.includes('dispatch')) {
  // 提取任務描述
  const task = extractKimiTask(message);
  
  if (task) {
    // 派發任務
    dispatchKimiTask(task);
    
    // 回覆用戶
    reply(`✅ Kimi 任務已派發：${task.name}\n待完成後會自動通知你！`);
  }
}

// 定期檢查結果（在 heartbeat 或 cron 中）
function checkKimiResults() {
  const latestPath = '~/.openclaw/workspace/kimi-dispatch/results/latest.json';
  const result = readJSON(latestPath);
  
  if (result.status === 'done' && !result.acknowledged) {
    const summary = summarize(result.output, 300);
    
    reply(`
✅ Kimi 任務完成！

📋 任務：${result.task_name}
🤖 模型：${result.model}
💾 Token：${result.tokens.total}

📝 結果：
${summary}

💡 完整結果：~/.openclaw/workspace/kimi-dispatch/results/latest.json
    `);
    
    // 標記為已通知
    result.acknowledged = true;
    writeJSON(latestPath, result);
  }
}
```

### ✅ 第三步：測試

#### 1. 手動派發任務

```bash
cd ~/.openclaw/workspace/kimi-dispatch

# 簡單測試
./run-kimi.sh "寫一個 Python 的費波那契函數，包含單元測試"
```

#### 2. 監控結果

```bash
# 新開一個終端，監控結果目錄
watch -n 1 'ls -lht ~/.openclaw/workspace/kimi-dispatch/results | head -10'

# 或查看最新結果
cat ~/.openclaw/workspace/kimi-dispatch/results/latest.json | jq
```

#### 3. 在 OpenClaw 聊天中測試

```
Kimi：寫一個 JavaScript 的字符串反轉函數，包含測試
```

Javis 應該會：
1. ✅ 派發任務到 Kimi
2. 📝 回覆「任務已派發」
3. ⏳ 等待 Webhook 回調（30-120 秒）
4. 🔔 收到結果後自動通知

---

## 🔄 完整工作流程

```
用戶在聊天說：
"Kimi：幫我開發一個 FastAPI 的用戶認證 API"

     ↓

Javis 的「監聽邏輯」：
  ├─ 檢測到 "Kimi:" 前綴
  ├─ 提取任務：「開發 FastAPI 用戶認證 API」
  └─ 調用 dispatch

     ↓

dispatch-kimi.sh 執行：
  ├─ 檢查 KIMI_API_KEY ✅
  ├─ 生成 Task ID: kimi-1707654321-12345
  ├─ 調用 Kimi API（非阻塞 ✅）
  ├─ 保存待派發狀態
  └─ 立即返回

     ↓

Javis 回覆用戶：
"✅ Kimi 任務已派發：auth-api
完成後會自動通知你！"

     ↓

Kimi 在後台處理（30-120 秒）
⏳ Javis 此時可以做其他事情

     ↓

Kimi 完成 → 發送 HTTP POST 到 Webhook：
POST http://localhost:9001/kimi/webhook/kimi-1707654321-12345
{
  "id": "cmpl-...",
  "model": "moonshot-v1-128k",
  "usage": {...},
  "choices": [{...}]
}

     ↓

Webhook（kimi-webhook.js）處理：
  ├─ 解析 Kimi 回應
  ├─ 保存結果到 results/latest.json
  ├─ 調用 curl /api/cron/wake 喚醒 Javis
  └─ （可選）發送 Telegram 通知

     ↓

Javis 被喚醒（心跳或 wake event）
檢查 results/latest.json

     ↓

Javis 回報給用戶：
"✅ Kimi 任務完成！

📋 任務：FastAPI 認證 API
🤖 模型：moonshot-v1-128k
💾 Token：1250 (提示) + 2890 (生成) = 4140

📝 結果摘要：
已實現完整的 FastAPI 用戶認證系統，包括：
- JWT Token 生成與驗證
- 密碼加鹽存儲
- 用戶註冊與登入端點
- 單元測試覆蓋率 95%

💡 完整結果保存於：~/.openclaw/workspace/kimi-dispatch/results/latest.json"

     ↓

✨ 完成！Token 消耗：0（派發 + Webhook）
      只在調用 Kimi API 時消耗 token（4140 個）
```

---

## 🎯 關鍵優化點

### 1. 零輪詢
- ❌ **不要**：每 5 秒檢查一次「任務完成了沒」
- ✅ **應該**：完成時自動通知（Webhook）

### 2. 非流式響應
- ❌ **流式 streaming=true**：會拆分成多個 token 計費
- ✅ **非流式 streaming=false**：一次性返回，費用更低

### 3. 背景執行
- 派發任務後立即回覆用戶，不阻塞主程序
- Webhook 異步處理，不佔用 Javis 資源

### 4. 結果緩存
- 保存到本地檔案，避免重複查詢 API
- Heartbeat 時檢查本地檔案，不查詢 API

---

## 📊 成本對比

假設每天 10 個任務，每個平均 1000 tokens：

| 方案 | 調用方式 | 輪詢次數 | Token 消耗 | 月度成本 |
|------|--------|--------|----------|---------|
| **傳統輪詢** | API 直接調用 | 每任務 10-20 次 | 100,000+ | ¥360 |
| **Webhook 方案** | API + Webhook 回調 | 0（自動通知） | 10,000 | ¥36 |
| **節省** | - | 100% | **90%** | **¥324** |

---

## 🧪 測試指令

### 基礎測試
```bash
./run-kimi.sh "寫一個 Python 函數計算階乘"
```

### 完整測試（帶通知）
```bash
./run-kimi.sh \
  "開發一個 FastAPI 的 TODO API，支援增刪改查，用 SQLite" \
  "todo-api" \
  "-5298003529"
```

### 監控 Webhook 日誌
```bash
tail -f ~/.openclaw/workspace/kimi-dispatch/webhook.log
```

### 查看所有待派發任務
```bash
curl http://localhost:9001/pending | jq
```

---

## 🛠️ 故障排查

### 問題 1：API Key 未設定

```
❌ 未設定 KIMI_API_KEY 環境變量
```

**解決方案：**
```bash
export KIMI_API_KEY="sk-你的-key"
echo $KIMI_API_KEY  # 驗證
```

### 問題 2：Webhook 伺服器未啟動

```
❌ Connection refused (localhost:9001)
```

**解決方案：**
```bash
cd ~/.openclaw/workspace/kimi-dispatch
node scripts/kimi-webhook.js  # 啟動伺服器

# 檢查是否運行
curl http://localhost:9001/health
```

### 問題 3：任務超時（>120 秒）

Kimi 通常 30-60 秒內回應，如果超過 120 秒：

1. 檢查 API 狀態：https://status.moonshot.cn
2. 檢查 API Key 配額
3. 查看 Webhook 日誌：`cat webhook.log`

### 問題 4：無法找到結果

```bash
# 查看所有結果檔案
ls -lh ~/.openclaw/workspace/kimi-dispatch/results/

# 查看最新結果
cat ~/.openclaw/workspace/kimi-dispatch/results/latest.json | jq

# 查看待派發任務
curl http://localhost:9001/pending | jq
```

---

## 📚 進階用法

### 1. 自定義模型溫度

```bash
./run-kimi.sh \
  "寫一首關於 AI 的詩歌" \
  "poetry" \
  "" \
  "0.8"  # 溫度 (創意度)
```

### 2. 指定不同的 Kimi 模型

```bash
KIMI_MODEL="moonshot-v1-32k" \
./run-kimi.sh "簡單任務，用 32k 模型節省成本"
```

### 3. 並發派發多個任務

```bash
# 派發 3 個並行任務
for i in {1..3}; do
  ./run-kimi.sh "任務 $i" "task-$i" &
done

wait  # 等待全部派發完成
```

---

## 🎓 學習資源

- [Kimi API 文檔](https://platform.moonshot.cn/docs)
- [Webhook 最佳實踐](https://webhook.guide/)
- [OpenClaw Gateway 文檔](https://docs.openclaw.ai)

---

_祝你使用愉快！有問題？查看日誌檔案或運行測試指令。_
