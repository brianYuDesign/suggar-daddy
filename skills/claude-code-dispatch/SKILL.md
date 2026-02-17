---
name: claude-code-dispatch
description: Dispatch Claude Code tasks with zero-polling (Hook-based callback). Optimized for token savings.
metadata:
  {
    "openclaw": { "emoji": "🚀", "requires": { "anyBins": ["claude"] } },
  }
---

# Claude Code Dispatch - 零輪詢模式

使用 Hook 回調機制，讓 Claude Code 完成後自動通知，Token 消耗幾乎為 0。

## 🎯 使用方式

### 在聊天中下達任務

你可以直接在聊天中說：

```
幫我用 Claude Code 開發一個 Python 計算器
```

```
dispatch 一個任務：實現一個 Markdown 轉 HTML 的工具
```

```
用 Claude Code 做一個 TODO 列表 API，用 FastAPI + SQLite
```

Javis 會自動：
1. 建立任務元數據
2. 啟動 Claude Code（背景執行）
3. 等待 Hook 回調
4. 處理結果並回報

---

## 🛠️ 技術實現

### Dispatch 命令格式

```bash
cd ~/.openclaw/workspace/claude-code-hooks && \
./run-claude.sh "<任務描述>" "<任務名稱>" "<Telegram群組ID>"
```

### 參數說明

| 參數 | 說明 | 範例 |
|------|------|------|
| 任務描述 | 給 Claude Code 的 prompt | "開發一個網頁爬蟲" |
| 任務名稱 | 用於追蹤的任務 ID | "scraper-task" |
| 群組 ID | 通知目標群組（可選） | "-5255123740" |

### 可用的群組

| 群組名稱 | 群組 ID | 適用任務 |
|---------|---------|---------|
| g-frontend | `-5255123740` | 前端相關 |
| g-backend-devops | `-5298003529` | 後端/DevOps |
| g-sa-specs | `-5112586079` | 系統架構 |
| g-ai-news | `-5222197646` | AI 相關 |
| g-crypto-news | `-5224275409` | 區塊鏈相關 |

---

## 📋 任務範例

### 基礎任務（不發通知）
```bash
./run-claude.sh "實現一個 Python 函數計算費波那契數列，包含測試" "fib-test"
```

### 前端任務（通知到前端群組）
```bash
./run-claude.sh "開發一個響應式的登入表單，HTML/CSS/JS" "login-form" "-5255123740"
```

### 後端任務（通知到後端群組）
```bash
./run-claude.sh "實現一個 FastAPI 的用戶認證 API，包含 JWT" "auth-api" "-5298003529"
```

### 使用完整版 dispatch（更多選項）
```bash
cd ~/.openclaw/workspace/claude-code-hooks/scripts
./dispatch-claude-code.sh \
  -p "重構整個測試套件" \
  -n "test-refactor" \
  -g "-5298003529" \
  --agent-teams \
  --teammate-mode auto \
  --permission-mode "bypassPermissions" \
  --workdir "$HOME/projects/myapp"
```

---

## 🔄 工作流程

```
用戶在聊天中說：
  "幫我用 Claude Code 開發一個 Python 計算器"
     ↓
Javis 解析意圖 → 生成任務名稱 → 執行 dispatch
     ↓
dispatch-claude-code.sh 啟動 Claude Code（背景）
     ↓
Claude Code 執行中（Javis 不輪詢 ✅）
     ↓
任務完成 → Hook 觸發：
  ├─ 寫入 latest.json
  ├─ 發送 Wake Event → Javis 被喚醒 ⚡
  └─ 發送 Telegram 通知（如果有指定群組）
     ↓
Javis 讀取 latest.json → 回報結果給用戶
```

---

## 📁 結果檔案位置

- **完整結果**: `~/.openclaw/workspace/claude-code-results/latest.json`
- **任務輸出**: `~/.openclaw/workspace/claude-code-results/task-output.txt`
- **Hook 日誌**: `~/.openclaw/workspace/claude-code-results/hook.log`
- **喚醒標記**: `~/.openclaw/workspace/claude-code-results/pending-wake.json`

---

## 🧠 Javis 的處理邏輯

### 1. 任務派發階段

當用戶要求執行 Claude Code 任務時：

```javascript
// 1. 解析用戶意圖
const prompt = extractPrompt(userMessage);
const taskName = generateTaskName(prompt); // 例如: "calculator-1707654321"
const groupId = determineTargetGroup(prompt); // 根據關鍵字判斷

// 2. 執行 dispatch
exec(`cd ~/.openclaw/workspace/claude-code-hooks && ./run-claude.sh "${prompt}" "${taskName}" "${groupId}"`);

// 3. 回覆用戶
reply(`🚀 已啟動 Claude Code 任務：${taskName}\n完成後會自動通知你！`);
```

### 2. 結果處理階段

當收到 Wake Event 時：

```javascript
// 1. 讀取結果
const result = JSON.parse(readFile('~/.openclaw/workspace/claude-code-results/latest.json'));

// 2. 判斷狀態
if (result.status === 'done') {
  const summary = result.output.slice(0, 500); // 取前 500 字元
  
  // 3. 回報給用戶
  reply(`✅ Claude Code 任務完成！\n\n📋 任務: ${result.task_name}\n\n📝 結果摘要:\n${summary}\n\n完整輸出請查看: ~/.openclaw/workspace/claude-code-results/latest.json`);
  
  // 4. 如果有指定群組，也發送到群組
  if (result.telegram_group) {
    sendToTelegram(result.telegram_group, formatResult(result));
  }
}
```

---

## ⚠️ 注意事項

1. **不要輪詢**：讓 Hook 通知我們，不要主動檢查狀態
2. **背景執行**：任務啟動後，Javis 可以繼續處理其他事情
3. **容錯設計**：即使 Wake Event 失敗，Heartbeat 時也會檢查 pending-wake.json
4. **Token 節省**：整個過程 Token 消耗幾乎為 0

---

## 🧪 測試命令

```bash
# 在 OpenClaw 聊天中說：
幫我測試一下 Claude Code Hook，寫一個簡單的 Hello World Python 程式

# 或者直接測試腳本：
cd ~/.openclaw/workspace/claude-code-hooks
./run-claude.sh "寫一個 Python 函數計算費波那契數列" "fib-test"
```

---

## 📊 效能對比

| 方式 | Token 消耗 | 響應時間 | 說明 |
|------|-----------|---------|------|
| 傳統輪詢 | 🔴 極高 | 📉 慢 | 每 5 秒輪詢一次 |
| Hook 回調 | 🟢 幾乎為 0 | ⚡ 秒級 | 完成後立即通知 |

---

_這個 Skill 整合了 claude-code-hooks 專案，讓你可以在聊天中輕鬆下達 Claude Code 任務！_
