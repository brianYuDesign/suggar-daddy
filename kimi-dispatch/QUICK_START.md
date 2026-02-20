# 🚀 Kimi Dispatch 快速開始

## 5 分鐘極速上手

### 第 1 步：配置 API Key（1 分鐘）

```bash
# 編輯你的 shell 配置檔案（~/.zshrc 或 ~/.bashrc）
export KIMI_API_KEY="sk-xxxxx..."  # 從 Kimi 平台獲取

# 立即生效
source ~/.zshrc
```

### 第 2 步：啟動 Webhook 伺服器（1 分鐘）

```bash
# 新開一個終端
cd ~/.openclaw/workspace/kimi-dispatch
node scripts/kimi-webhook.js

# 應該看到：
# 🚀 Kimi Webhook 伺服器啟動於 http://localhost:9001
```

### 第 3 步：派發任務（1 分鐘）

```bash
# 在另一個終端
cd ~/.openclaw/workspace/kimi-dispatch

# 最簡單的方式
./run-kimi.sh "寫一個 Python 計算器"

# 應該看到：
# 🚀 Kimi 任務派發
# ✅ 任務已派發！
# ✨ 任務正在 Kimi 中執行...
```

### 第 4 步：等待結果（1-2 分鐘）

```bash
# 監控結果目錄（新開終端）
watch -n 1 'cat ~/.openclaw/workspace/kimi-dispatch/results/latest.json | jq'

# 或簡單查看
sleep 30 && cat ~/.openclaw/workspace/kimi-dispatch/results/latest.json | jq
```

### 第 5 步：成功！🎉

看到類似的結果：

```json
{
  "task_id": "kimi-1707654321-12345",
  "task_name": "calc",
  "status": "done",
  "model": "moonshot-v1-128k",
  "output": "以下是一個 Python 計算器的實現...",
  "tokens": {
    "prompt": 150,
    "completion": 850,
    "total": 1000
  },
  "completed_at": "2026-02-17T15:30:00Z"
}
```

---

## 常用命令速查

### 派發任務

```bash
# 基礎派發
./run-kimi.sh "你的任務描述"

# 指定任務名稱
./run-kimi.sh "任務描述" "my-task-name"

# 派發並通知到 Telegram 群組
./run-kimi.sh "任務" "name" "-5298003529"
```

### 檢查結果

```bash
# 查看最新結果
cat ~/.openclaw/workspace/kimi-dispatch/results/latest.json | jq

# 查看特定任務
cat ~/.openclaw/workspace/kimi-dispatch/results/kimi-1707654321-12345.json | jq

# 查看待派發任務
curl http://localhost:9001/pending | jq

# 健康檢查
curl http://localhost:9001/health | jq
```

### 監控日誌

```bash
# Webhook 日誌
tail -f ~/.openclaw/workspace/kimi-dispatch/webhook.log

# 實時監控結果目錄
watch -n 1 'ls -lht ~/.openclaw/workspace/kimi-dispatch/results | head -5'
```

---

## 常見問題

### Q: 如何停止 Webhook 伺服器？

```bash
pkill -f "node.*kimi-webhook"
```

### Q: 如何修改 Webhook 端口？

```bash
WEBHOOK_PORT=9999 node scripts/kimi-webhook.js
```

### Q: 如何查看 API 調用的詳細信息？

```bash
# 查看 API 原始響應
cat ~/.openclaw/workspace/kimi-dispatch/results/api-response-*.json | jq
```

### Q: 任務失敗了怎麼辦？

```bash
# 查看錯誤日誌
cat ~/.openclaw/workspace/kimi-dispatch/results/error-*.json | jq

# 檢查 API Key 是否正確
echo $KIMI_API_KEY

# 檢查 Kimi API 是否在線
curl https://api.moonshot.cn/v1/models -H "Authorization: Bearer $KIMI_API_KEY"
```

---

## 下一步

✅ 基礎設置完成後，查看：

- **[INTEGRATION.md](./INTEGRATION.md)** - 與 Javis 集成
- **[README.md](./README.md)** - 完整文檔
- **[scripts/dispatch-kimi.sh](./scripts/dispatch-kimi.sh)** - 進階選項

---

## 效率對比

| | 傳統方式 | Kimi Dispatch |
|---|---------|--------------|
| **Token 消耗** | 💔 每次輪詢都浪費 | ✅ 只在調用時計費 |
| **響應速度** | 📉 遲鈍 | ⚡ 秒級 |
| **開發複雜度** | 📚 需要輪詢邏輯 | 🎯 簡單異步 |
| **成本** | 💸 高（輪詢浪費） | 💰 低（90% 節省） |

---

## 📞 需要幫助？

1. 查看日誌：`tail -f webhook.log`
2. 檢查環境：`echo $KIMI_API_KEY`
3. 測試 API：`curl $KIMI_API_URL/models -H "Authorization: Bearer $KIMI_API_KEY"`
4. 檢查結果：`ls -lh results/`

---

**下次使用時，只需要記住這一行：**

```bash
cd ~/.openclaw/workspace/kimi-dispatch && ./run-kimi.sh "你的任務"
```

祝你使用愉快！ 🚀
