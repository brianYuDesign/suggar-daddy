# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## 🚀 Claude Code Dispatch 設定

### Telegram 群組

| 群組名稱 | 群組 ID | 用途 |
|---------|---------|------|
| g-frontend | `-5255123740` | 前端開發任務 |
| g-backend-devops | `-5298003529` | 後端/DevOps 任務 |
| g-sa-specs | `-5112586079` | 系統架構設計 |
| g-ai-news | `-5222197646` | AI 相關任務 |
| g-crypto-news | `-5224275409` | 區塊鏈相關任務 |
| g-general | `-5163850548` | 待分類（未來安排） |

### 自動通知規則

- **前端任務** (關鍵字: 前端、UI、頁面、HTML、CSS、React、Vue) → 自動通知 g-frontend
- **後端任務** (關鍵字: 後端、API、資料庫、FastAPI、Django) → 自動通知 g-backend-devops
- **架構任務** (關鍵字: 架構、系統設計、微服務、SA) → 自動通知 g-sa-specs
- **AI 任務** (關鍵字: AI、機器學習、模型) → 自動通知 g-ai-news
- **區塊鏈任務** (關鍵字: 區塊鏈、智能合約、Web3) → 自動通知 g-crypto-news

### 檔案位置

- **Dispatch 腳本**: `~/.openclaw/workspace/claude-code-hooks/run-claude.sh`
- **結果目錄**: `~/.openclaw/workspace/claude-code-results/`
- **Hook 腳本**: `~/.claude/hooks/notify-agi.sh`
- **Skill**: `~/.openclaw/workspace/skills/claude-code-dispatch/`

---

## 🎯 Kimi Dispatch 設定

### API 配置

| 項目 | 值 |
|------|---|
| **API Key** | `$KIMI_API_KEY` (sk-xxx...) |
| **API URL** | `https://api.moonshot.cn/v1` |
| **默認模型** | `moonshot-v1-128k` |
| **Webhook 端口** | 9001 |

### 支援的模型

| 模型 | 上下文 | 用途 |
|------|-------|------|
| `moonshot-v1-8k` | 8K | 快速任務 |
| `moonshot-v1-32k` | 32K | 中等任務 |
| `moonshot-v1-128k` | 128K | 大型任務 |
| `kimi-k2.5` | 2M | 最新高性能 |

### 檔案位置

- **快速啟動**: `~/.openclaw/workspace/kimi-dispatch/run-kimi.sh`
- **派發腳本**: `~/.openclaw/workspace/kimi-dispatch/scripts/dispatch-kimi.sh`
- **Webhook 伺服器**: `~/.openclaw/workspace/kimi-dispatch/scripts/kimi-webhook.js`
- **結果目錄**: `~/.openclaw/workspace/kimi-dispatch/results/`

### 快速命令

```bash
# 啟動 Webhook 伺服器（背景）
cd ~/.openclaw/workspace/kimi-dispatch
node scripts/kimi-webhook.js &

# 派發任務
./run-kimi.sh "任務描述"

# 派發並通知到 Telegram
./run-kimi.sh "任務描述" "task-name" "-5298003529"

# 查看結果
cat results/latest.json | jq

# 查看待派發任務
curl http://localhost:9001/pending | jq

# 健康檢查
curl http://localhost:9001/health | jq
```

### 省 Token 要點

✅ **DO**:
- 使用 Webhook 自動回調（不輪詢）
- 非流式響應（一次性返回）
- 結果緩存到本地
- 背景執行派發

❌ **DON'T**:
- 每 5 秒輪詢檢查狀態
- 使用流式響應（token 浪費）
- 重複查詢已保存的結果
- 阻塞主程序等待

---

Add whatever helps you do your job. This is your cheat sheet.
