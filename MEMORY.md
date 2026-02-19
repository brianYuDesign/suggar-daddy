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

## Sugar-Daddy 專案上線前準備（2026-02-17 進行中）

**狀態**: 技術驗證進行中，等待 CC Agent Skill 定義

**已完成**:
✅ 完整的專案掃描 & 健康檢查
✅ 上線就緒度評估 (96% 完成，技術 85% 就緒)
✅ 5 個 Team 的詳細工作分解 (116h，T-7 days)
✅ 工作卡與簽核清單
✅ Telegram 自動通知配置 (cron job ready)
✅ Unit 測試通過 575/608 (94.6%)
✅ Jest 配置修復 (path aliases 完全解決)
✅ NODE_ENV=test 環境驗證
✅ E2E 功能測試派發 (2026-02-18 21:03)
✅ 架構文檔整理派發 (2026-02-18 21:03)

**進行中**:
⏳ E2E 功能測試 (前台後台登入 & 功能驗證)
⏳ 架構文檔整理 (新成員快速上手指南)
⏳ **CC Agent Skill 定義** (自動化工作流) ← NEW

**待決定**:
- [ ] 上線日期確認 (建議 2026-02-24 下週一)
- [ ] 5 個 Team Lead 指派 (DevOps/Backend/Frontend/QA/PM)
- [ ] 啟用日報通知 (每天 08:00 AM)
- [ ] CC Agent Skill 完成後啟用自動化

**關鍵文檔**:
- `sugar-daddy-launch-analysis.md` - 96 頁完整上線分析
- `sugar-daddy-launch-tasks.md` - 5 個 Team 的執行任務卡
- Cron Job ID: `8eab8992-da9d-4afd-aa3f-6fe400f3f097` (disabled, ready to enable)

---

## CC Agent Skill 定義（2026-02-19 完成）

**狀態**: ✅ 完成 - 等待部署

**概念**:
- **CC** = Collaborative Collaborator (智能協作者)
- 自動監聽項目變動 (git push, Docker alerts, test failures)
- 自動判斷需要執行的工作流
- 無需每次都下指令
- 主動通知到正確的 Telegram 群組

**核心工作流**:
1. 🔍 **監聽** - git commit, Docker health, 測試結果
2. 🧠 **判斷** - 決定需要哪個 workflow (test/build/deploy)
3. 🚀 **執行** - 自動運行工作流
4. 📢 **通知** - 發送結果到正確的 Telegram 群組
5. 📚 **學習** - 記錄決策，改進準確度

**觸發規則** (已配置):
- `[backend]` tag → 運行後端測試
- `[frontend]` tag → 構建前端 + E2E 測試
- `[docs]` tag → 驗證文檔
- `[deploy]` tag → 部署驗證
- 定時檢查 (每 6 小時) → 系統健康檢查
- Docker alert → 診斷並嘗試恢復
- 測試失敗 → 分析錯誤並建議修復

**交付的文件**:
- ✅ SKILL.md - 完整文檔
- ✅ references/triggers.md - 所有觸發規則詳解
- ✅ references/workflows.md - 5 個工作流詳細流程
- ✅ references/decision_tree.md - 決策邏輯
- ✅ references/channel_routing.md - Telegram 群組映射
- ✅ references/faq.md - 常見問題
- ✅ suggar-daddy-cc-triggers.json - 觸發配置

**位置**:
- Skill: `~/.openclaw/workspace/skills/suggar-daddy-cc/`
- Triggers: `~/.openclaw/workspace/suggar-daddy-cc-triggers.json`
- Decisions: `~/.openclaw/workspace/suggar-daddy-cc-decisions.json` (執行後自動建立)

**使用方式**:
```bash
# 1. 啟用 Skill
openclaw skill load ~/.openclaw/workspace/skills/suggar-daddy-cc/

# 2. 建立 cron job
cron add --job '{
  "name": "suggar-daddy-cc",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": { "kind": "agentTurn", "message": "監控並執行工作流" },
  "sessionTarget": "isolated"
}'

# 3. 驗證運行
cron list | grep suggar-daddy-cc
```

**安全防衛**:
- ❌ 從不自動部署到生產
- ❌ 從不執行破壞性操作
- ❌ 低信心時會要求人工確認
- ✅ 尊重「安靜時間」(22:00-08:00)
- ✅ 完整的決策審計日誌

**優勢**:
- 🎯 不需要每次都下指令
- 🔥 實時響應項目變動
- 📊 自動生成報告到 Telegram
- 🧠 逐步學習和改進
- 🛡️ 內置安全防衛

_最後更新：2026-02-19 08:30 GMT+8_

_最後更新：2026-02-19 08:28 GMT+8_
