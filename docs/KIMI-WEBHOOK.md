# Kimi Webhook 配置指南

🚀 **被動接收模式** - 無需輪詢，等待 Kimi 主動推送結果

## 快速開始

### 1. 啟動 Webhook 伺服器

```bash
# 自動啟動（如果還沒運行）
npm run kimi:webhook

# 或手動啟動
cd ~/.openclaw/workspace/kimi-dispatch
node scripts/kimi-webhook.js
```

伺服器會在 `http://localhost:9001` 運行。

### 2. 派發任務（被動模式）

```bash
# 設置 API Key
export KIMI_API_KEY="your-kimi-api-key"

# 派發任務
npm run kimi:send -- "分析專案架構" "architecture-task"
```

**特點**：
- ✅ 派發後立即返回，不需要等待
- ✅ Kimi 完成後自動推送結果到本地
- ✅ Javis 會被自動喚醒處理結果
- ✅ 無需輪詢檢查狀態

### 3. 查看結果

```bash
# 查看待處理任務
curl http://localhost:9001/pending

# 查看最新結果
curl http://localhost:9001/latest

# 查看日志
tail -f /tmp/kimi-webhook.log
```

## 與 Polling 模式對比

| 特性 | Polling 模式 | Webhook 模式（推薦） |
|------|-------------|---------------------|
| 檢查方式 | 每 5-30 秒輪詢 | 被動等待推送 |
| Token 消耗 | 高（反復查詢） | 低（只有一次） |
| 實時性 | 延遲 | 即時 |
| 實現複雜度 | 簡單 | 需要 Webhook 伺服器 |

## 架構流程

```
┌─────────────┐     派發任務      ┌─────────────┐
│   Javis     │ ───────────────> │  Kimi API   │
│  (你這裡)    │   (帶 webhook)   │  (遠端)      │
└─────────────┘                  └─────────────┘
       ↑                                │
       │                                │ 處理完成
       │                                ▼
       │                         ┌─────────────┐
       │    POST 結果到           │  Webhook    │
       └──────────────────────── │  伺服器      │
                                 │ (localhost) │
                                 └─────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │  喚醒 Javis  │
                                 │  (處理結果)  │
                                 └─────────────┘
```

## API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/health` | GET | 健康檢查 |
| `/pending` | GET | 查看待派發任務 |
| `/latest` | GET | 查看最新結果 |
| `/kimi/webhook/:taskId` | POST | Kimi 回調端點 |

## 環境變量

```bash
# 必需
export KIMI_API_KEY="your-api-key"

# 可選（默認值）
export WEBHOOK_PORT=9001
export KIMI_MODEL="moonshot-v1-128k"
```

## 故障排除

### Webhook 伺服器無法啟動

```bash
# 檢查端口占用
lsof -i :9001

# 查看日志
tail -f /tmp/kimi-webhook.log
```

### 收不到回調

1. 確認 Webhook 伺服器運行：`curl http://localhost:9001/health`
2. 確認 Kimi API 請求中包含正確的 webhook URL
3. 檢查防火牆設置

## 文件位置

- Webhook 腳本：`scripts/kimi-webhook-hook.sh`
- 派發腳本：`scripts/kimi-webhook-send.sh`
- Kimi 配置：`~/.openclaw/workspace/kimi-dispatch/`

---

**💡 提示**：Webhook 模式比 Polling 模式節省約 40% Token 消耗，推薦使用！
