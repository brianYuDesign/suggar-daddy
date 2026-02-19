# Sugar-Daddy CC Agent - 快速開始指南

## 🎯 CC Agent 是什麼？

**CC = Collaborative Collaborator** - 一個智能助手：

✅ 自動監聽你的項目  
✅ 自動判斷需要做什麼  
✅ 自動執行測試 / 構建 / 檢查  
✅ 不需要每次都下指令  
✅ 學習並改進決策  

## 📋 5 分鐘快速設置

### 1️⃣ 啟用 Skill

```bash
openclaw skill load ~/.openclaw/workspace/skills/suggar-daddy-cc/
```

### 2️⃣ 建立監控 Job

```bash
cron add --job '{
  "name": "suggar-daddy-cc",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": { "kind": "agentTurn", "message": "Monitor sugar-daddy project and execute workflows" },
  "sessionTarget": "isolated",
  "enabled": true
}'
```

### 3️⃣ 驗證設置

```bash
# 查看 job 是否建立
cron list | grep suggar-daddy

# 查看最新決策
tail ~/.openclaw/workspace/suggar-daddy-cc-decisions.json | jq
```

完成！🎉

## 💡 使用示例

### 例子 1️⃣：後端開發者推送代碼

```bash
# 你寫了代碼並推送
git commit -m "[backend] Add payment retry logic"
git push origin main

# CC Agent 自動：
# 1. 偵測 [backend] 標籤
# 2. 運行所有後端測試
# 3. 檢查 lint 錯誤
# 4. 計算代碼覆蓋率
# 5. 發送結果到 g-backend-devops 群組

# 你收到通知：
✅ Backend Tests Passed
   575/608 (94.6%) ✅
   Coverage: +2.3% ↑
   Ready for merge
```

### 例子 2️⃣：自動錯誤分析

```bash
# CI 測試失敗
npm run test:unit  # → FAIL: "Redis incr is not a function"

# CC Agent 自動：
# 1. 分析錯誤
# 2. 認出這是 Redis mock 問題（95% 確信度）
# 3. 查找之前的解決方案
# 4. 立即通知 g-backend-devops

# 你收到：
⚠️ Test Failure Analyzed
   Service: MatchingService
   Issue: Redis mock incomplete
   Suggested fix: Add incr: jest.fn() to mock
   Link: See line 45 in matching.service.spec.ts
   Similar issue #245: ✅ solved with this fix
```

### 例子 3️⃣：系統健康檢查

```bash
# 每 6 小時自動運行
# CC Agent 檢查：
# ✅ Docker 16/16 容器正常
# ✅ PM2 16/16 服務正常
# ✅ PostgreSQL 主從複製正常
# ✅ Redis 3 個實例正常
# ✅ Kafka broker 正常
# ✅ API Gateway 平均響應 142ms

# 你收到簡潔通知：
✅ System Health OK
   All 16/16 services ✅
   No issues detected
```

## 🔧 常見命令

### 暫停 CC Agent

```bash
cc pause      # 暫停所有工作流
cc pause 2h   # 暫停 2 小時後恢復
cc resume     # 立即恢復
```

### 手動觸發工作流

```bash
cc run test:unit           # 運行後端測試
cc run build:frontend      # 構建前端
cc run health-check        # 系統健康檢查
cc run validate:deploy     # 部署驗證
```

### 查看決策日誌

```bash
# 最後 10 個決策
tail ~/.openclaw/workspace/suggar-daddy-cc-decisions.json | jq '.' | tail -50

# 查看成功率
jq '.patterns | map(.success_rate)' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json

# 查看特定觸發的歷史
jq '.decisions | select(.trigger == "backend-push")' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json
```

### 教導 CC Agent

```bash
# 告訴 CC："這個錯誤不是 mock 問題"
cc learn "error-type=MockError, actual=LogicError"

# 告訴 CC："這個模式應該觸發 X 工作流"
cc learn "pattern=commit-with-[backend], decision=should-run-tests"

# 查看已學習的模式
cc patterns show
```

## 📢 觸發規則一覽

| 觸發 | 條件 | 工作流 | 通知到 |
|------|------|--------|--------|
| **Backend Push** | `[backend]` tag | 運行單元測試 + lint | g-backend-devops |
| **Frontend Push** | `[frontend]` tag | 構建 + E2E 測試 | g-frontend |
| **Test Failure** | 測試失敗 | 分析錯誤 + 建議修復 | g-backend-devops (🚨) |
| **Docker Alert** | 容器不健康 | 診斷 + 嘗試恢復 | g-backend-devops (🚨) |
| **Health Check** | 每 6 小時 | 系統檢查 | g-backend-devops |
| **Deploy Tag** | 建立 v*.*.* tag | 完整驗證 | g-sa-specs (🚨) |

## ⚡ 無需做的事情

✅ **CC Agent 現在會自動做**：
- ✓ 檢測代碼推送
- ✓ 運行測試
- ✓ 構建應用
- ✓ 分析錯誤
- ✓ 檢查系統健康
- ✓ 發送通知
- ✓ 學習模式

❌ **CC Agent 絕不會做**：
- ✗ 自動部署到生產 (需要人工審核)
- ✗ 刪除文件
- ✗ 修改數據庫 (未經許可)
- ✗ 在安靜時間做非緊急事務

## 📚 詳細文檔

| 文件 | 內容 |
|------|------|
| **SKILL.md** | 完整功能說明 |
| **references/triggers.md** | 所有觸發規則詳解 |
| **references/workflows.md** | 5 個工作流完整流程 |
| **references/decision_tree.md** | CC 如何決策 |
| **references/channel_routing.md** | 哪個群組收到什麼通知 |
| **references/faq.md** | 常見問題解答 |

位置：`~/.openclaw/workspace/skills/suggar-daddy-cc/`

## 🚀 下一步

1. **啟用** - 按上面的 5 分鐘設置
2. **推送代碼** - 試試 `git commit -m "[backend] test"` 看 CC 的反應
3. **觀察** - 檢查 Telegram 通知，確認工作流運行正常
4. **優化** - 根據實際情況調整觸發規則
5. **學習** - 用 `cc learn` 教導 CC 你的工作流偏好

---

**Questions?** 查看 FAQ.md 或問 Brian! 

**Ready?** 現在就啟用它吧！🎯

_Created: 2026-02-19_
