# CC Agent 簡化指南 - 給 Brian

## 一句話理解

**你推代碼 → CC 自動測試/構建 → 如果壞了，告訴你怎麼修 → 搞定**

---

## 推代碼時怎麼做

### 後端改動
```bash
git commit -m "Add user validation [backend]"
git push

# CC 會自動:
#  1. 運行 unit tests
#  2. 運行 lint 檢查
#  3. 檢查測試覆蓋率
#  
# 如果全部通過: 沒有 Telegram 消息（代表成功）
# 如果有問題: Telegram 消息告訴你怎麼修
```

### 前端改動
```bash
git commit -m "Update dashboard UI [frontend]"
git push

# CC 會自動:
#  1. 構建 Next.js + Admin 應用
#  2. 運行 E2E smoke tests
#  3. 檢查 bundle 大小
#
# 結果通過 Telegram 發到 g-frontend
```

### 文檔改動
```bash
git commit -m "Update API docs [docs]"
git push

# CC 會自動:
#  1. 驗證 Markdown 語法
#  2. 檢查所有鏈接
#  3. 驗證代碼例子
#
# 如果有問題: Telegram 告訴你
```

---

## Telegram 通知說什麼

### ✅ 成功（無通知）
```
推代碼 → CC 測試全部通過 → 沒有 Telegram 消息
(你能從 git status 看到它已經 merged)
```

### ❌ 失敗（會通知）
```
❌ Backend test failed

Error: UserService validation test
  Line 42: Expected 'string' but got 'number'
  
Fix: Change userCount type from string to number
     in apps/user/src/services/user.service.ts

Sent to: g-backend-devops
```

### ⚠️ 系統警告（會通知）
```
⚠️ API Response Time Degraded
  • Currently: 820ms (target: <500ms)
  • Possible cause: Database slow query
  
Suggestion: Run optimization script
Auto-recovery: Restarted Redis (monitoring...)

Sent to: g-backend-devops
```

---

## 遇到問題怎麼做

### 收到測試失敗通知
```
1. 讀 CC 的通知（它會告訴你在哪一行）
2. 修改那一行
3. 再推一次
4. CC 自動驗證
```

### 收到系統問題通知
```
1. 讀 CC 的建議
2. 如果是簡單的（如重啟），CC 已自動做了
3. 如果是複雜的（如 rollback），CC 會問你要不要
4. 你回答，CC 執行
```

### 推代碼時標籤選擇
```
[backend]   - 後端 API/Service 改動
[frontend]  - 前端 UI/頁面改動
[docs]      - 文檔改動
[admin]     - 管理後台改動
[api]       - API schema/路由改動

例子:
git commit -m "Fix payment validation [backend] [api]"
```

---

## 你不需要知道的事情

❌ 不需要知道「改了哪些檔案」
   → CC 會自動檢測並運行對應的測試

❌ 不需要知道「運行了哪些指令」
   → CC 自動決定運行什麼

❌ 不需要知道「系統修改了哪些配置」
   → Governance 系統記錄一切（你需要時再查）

❌ 不需要手動運行測試
   → CC 會在推代碼時自動運行

---

## 簡化的流程圖

```
                      你推代碼
                         ↓
                  CC 偵測改動類型
                         ↓
            ┌─────────────┼─────────────┐
            ↓             ↓             ↓
         後端         前端           文檔
            ↓             ↓             ↓
        測試+Lint     構建+E2E      驗證語法
            ↓             ↓             ↓
       ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
       ↓         ↓  ↓         ↓  ↓         ↓
      全過   有問題 全過   有問題 全過   有問題
      ✅      ❌    ✅      ❌    ✅      ❌
       ↓      ↓    ↓      ↓    ↓      ↓
      無    Telegram 無    Telegram 無   Telegram
      通知   「這樣修」 通知  「這樣修」 通知  「這樣修」
```

---

## 安全保障

✅ **自動恢復的事**
   - Docker 容器重啟
   - PM2 服務重啟
   - Redis 連接池重置

❌ **需要你批准的事**
   - 數據庫修改
   - 生產部署
   - Rollback 到舊版本

✅ **完整記錄一切**
   - 每次改動都有日誌
   - 可以查「發生了什麼」
   - Governance 系統追蹤

---

## 快速參考表

| 我做什麼 | CC 做什麼 | 需要 Telegram | 時間 |
|---------|---------|-----------|------|
| 推後端代碼 | 測試+Lint | 僅失敗時 | 2-3 分 |
| 推前端代碼 | 構建+E2E | 僅失敗時 | 3-5 分 |
| 推文檔 | 驗證 | 僅失敗時 | <1 分 |
| 什麼都沒做 | 每 6h 健康檢查 | 僅問題時 | - |

---

## 常見問題

**Q: 為什麼沒有 Telegram 消息？**  
A: 代表成功了。沒消息 = 好消息。

**Q: 夜間 22:00 後 CC 會不會打擾我？**  
A: 只有關鍵問題才會通知。一般問題到早上 8:00 再說。

**Q: CC 能做什麼？**  
A: 測試、構建、檢查。不能部署、回滾或修改數據庫（這些需要你決定）。

**Q: 可以關閉 CC 嗎？**  
A: 可以，但為什麼要呢？它幫你省時間。

**Q: 如果 CC 出錯怎麼辦？**  
A: 完整記錄在 Governance 系統。查一下就知道發生了什麼。

---

## 就這樣

1. 推代碼（加 tag）
2. CC 自動工作
3. 如果有問題，Telegram 會告訴你
4. 你修，再推，CC 再驗
5. 搞定

簡單。高效。不需要了解內部細節。

_2026-02-19 | CC Agent 簡化版_
