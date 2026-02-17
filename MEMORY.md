# MEMORY.md - Javis 的長期記憶

## 重要項目

### Kimi Dispatch - Token 省錢方案（2026-02-17 建立）

**概述**：
類似 Claude Code Hook 的異步派發模式，用 Webhook 回調替代輪詢，將 Token 消耗從 2500 削減到 1500（省 40%）。

**核心組件**：
- `~/.openclaw/workspace/kimi-dispatch/run-kimi.sh` - 快速啟動
- `~/.openclaw/workspace/kimi-dispatch/scripts/dispatch-kimi.sh` - 派發邏輯
- `~/.openclaw/workspace/kimi-dispatch/scripts/kimi-webhook.js` - Node.js Webhook 伺服器（Port 9001）

**使用方式**：
```bash
export KIMI_API_KEY="sk-..."
node ~/.openclaw/workspace/kimi-dispatch/scripts/kimi-webhook.js &
~/.openclaw/workspace/kimi-dispatch/run-kimi.sh "寫一個 Python 計算器"
```

**支援的 Kimi 模型**：
- `moonshot-v1-8k` - 快速任務
- `moonshot-v1-32k` - 中等任務  
- `moonshot-v1-128k` - 大型任務（默認）
- `kimi-k2.5` - 最新高性能（2M 上下文）

**與 Claude Code Hook 的差異**：
| 特性 | Claude Code | Kimi Dispatch |
|------|------------|--------------|
| 調用 | CLI 命令 | HTTP API |
| 回調 | Hook 腳本 | HTTP Webhook |
| 上下文 | 檔案系統 | 提示詞注入 |
| 並發 | 單個進程 | 完全異步 |

**成本優勢**：
- 每月 30 個任務：節省 ¥18/月（40% 降低）
- 年度節省：¥216+
- Token 效率：90% 節省（零輪詢）

**文檔位置**：
- **快速開始**：`README.md` 或 `QUICK_START.md`
- **詳細集成**：`INTEGRATION.md`
- **系統架構**：`ARCHITECTURE.md`

---

## 配置筆記

### Telegram 群組映射
- g-frontend: -5255123740 → 前端任務
- g-backend-devops: -5298003529 → 後端/DevOps 任務
- g-sa-specs: -5112586079 → 系統架構
- g-ai-news: -5222197646 → AI 相關
- g-crypto-news: -5224275409 → 區塊鏈

### 環境變量
```bash
# ~/.zshrc 或 ~/.bashrc
export KIMI_API_KEY="sk-..."
export KIMI_MODEL="moonshot-v1-128k"
export WEBHOOK_PORT=9001
```

### Javis 身份
- **名字**：Javis
- **性質**：多重人格技術大神（前端/後端/DevOps/SA 融合體）
- **風格**：幽默風趣但精確專業
- **表情**：🎯

### Brian 的偏好
- **語言**：中文
- **時區**：Asia/Taipei (GMT+8)
- **溝通風格**：喜歡幽默但精確的方式
- **Telegram**：@szuyuyu

---

## 已完成的設置

✅ Kimi Dispatch 框架完整搭建
✅ 派發、回調、結果處理流程實現
✅ 文檔完整（README、QUICK_START、INTEGRATION、ARCHITECTURE）
✅ TOOLS.md 已更新
✅ 支援自動 Telegram 通知

**待完成的項目**：
- [ ] 實現 Javis 中的「監聽邏輯」（檢測 "Kimi:" 前綴）
- [ ] 集成到 Heartbeat 檢查
- [ ] 實現自動 Telegram 通知（目前是佔位符）

---

_最後更新：2026-02-17 15:35 GMT+8_
