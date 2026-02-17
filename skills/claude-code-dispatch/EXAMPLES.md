# 如何在聊天中下達 Claude Code 任務

## 🗣️ 口語化指令（推薦）

直接跟 Javis 說你想做什麼，他會自動處理：

### 範例 1: 簡單任務
```
你: 幫我用 Claude Code 寫一個 Python 計算器

Javis: 🚀 收到！啟動 Claude Code 任務...
      （自動生成任務名稱: calculator-1707654321）
      （背景執行，完成後通知）
```

### 範例 2: 前端任務
```
你: 用 Claude Code 做一個登入頁面，要響應式的

Javis: 🚀 收到！啟動前端任務...
      （自動判斷 → 通知到 g-frontend 群組）
```

### 範例 3: 後端任務
```
你: dispatch 一個後端任務：實現用戶認證 API，用 FastAPI + JWT

Javis: 🚀 收到！啟動後端任務...
      （自動判斷 → 通知到 g-backend-devops 群組）
```

---

## 🎯 Javis 的判斷邏輯

### 關鍵字識別

| 關鍵字 | 判斷為 | 通知群組 |
|--------|--------|----------|
| 前端、UI、頁面、HTML、CSS、React、Vue | 前端任務 | g-frontend (-5255123740) |
| 後端、API、資料庫、FastAPI、Django | 後端任務 | g-backend-devops (-5298003529) |
| 架構、系統設計、微服務、SA | 架構任務 | g-sa-specs (-5112586079) |
| AI、機器學習、模型 | AI 任務 | g-ai-news (-5222197646) |
| 區塊鏈、智能合約、Web3 | 區塊鏈任務 | g-crypto-news (-5224275409) |

### 任務名稱生成

Javis 會從你的描述中提取關鍵詞：

- "寫一個 Python 計算器" → `calculator-1707654321`
- "實現用戶認證 API" → `auth-api-1707654321`
- "開發響應式登入頁面" → `login-page-1707654321`

---

## 📞 明確指定參數

如果你想明確控制參數：

```
你: 用 Claude Code 做一個 TODO API
    任務名稱: todo-api-v2
    通知群組: -5298003529

Javis: 🚀 收到！
      任務名稱: todo-api-v2
      通知群組: g-backend-devops
      啟動中...
```

---

## 🔍 查看結果

### 主動詢問
```
你: Claude Code 任務完成了嗎？

Javis: ✅ 任務 calculator-1707654321 已完成！
      （顯示摘要）
```

### 自動通知
完成後 Javis 會自動通知你（透過 Wake Event）：

```
Javis: 🎉 Claude Code 任務完成！
      
      📋 任務: calculator-1707654321
      📝 結果摘要: 已建立 calculator.py，包含基本運算功能和單元測試...
      
      完整結果: ~/.openclaw/workspace/claude-code-results/latest.json
```

---

## 🛠️ 進階用法

### 使用 Agent Teams（多 Agent 協作）

```
你: 用 Agent Teams 模式開發一個帶物理引擎的落沙遊戲

Javis: 🚀 啟動 Agent Teams 任務！
      Lead Agent + Sub-agents 協作中...
      （完成後通知）
```

### 指定工作目錄

```
你: 在 ~/projects/my-app 目錄下，用 Claude Code 重構測試

Javis: 🚀 收到！
      工作目錄: ~/projects/my-app
      任務: 重構測試
      啟動中...
```

---

## 📊 實際對話範例

### 對話 1: 快速開發

```
Brian: 幫我寫個 Python 爬蟲，抓 Hacker News 首頁標題

Javis: 🚀 收到！啟動 Claude Code 任務：hn-scraper-1707654321
      背景執行中，完成後會通知你 ⏳

（5 分鐘後）

Javis: ✅ 任務完成！
      
      📋 hn-scraper-1707654321
      📝 已建立 hn_scraper.py：
          - 使用 requests + BeautifulSoup
          - 抓取前 30 條標題
          - 包含錯誤處理和測試
      
      檔案位置: ~/projects/hn-scraper/
```

### 對話 2: 前端開發

```
Brian: 做一個響應式的個人名片頁面，要有深色模式

Javis: 🚀 啟動前端任務：card-page-1707654400
      自動通知到 g-frontend 群組 📱
      
（10 分鐘後，在 Telegram g-frontend 群組收到通知）

Telegram Bot: 🤖 Claude Code 任務完成
              📋 任務: card-page-1707654400
              📝 結果摘要:
              已建立 index.html、style.css、script.js
              - 響應式設計（Mobile-first）
              - 深色模式切換（localStorage 保存）
              - 優雅的動畫效果
              ...
```

### 對話 3: 後端 API

```
Brian: dispatch 後端任務：實現一個用戶認證系統
      - FastAPI
      - JWT tokens
      - PostgreSQL
      - 包含註冊、登入、刷新 token

Javis: 🚀 收到！啟動後端任務：auth-system-1707654500
      框架: FastAPI
      資料庫: PostgreSQL
      認證: JWT
      通知群組: g-backend-devops
      
      背景執行中... ⏳

（15 分鐘後）

Javis: ✅ 認證系統開發完成！
      
      📋 auth-system-1707654500
      📝 已實現：
          - 用戶註冊端點 (/register)
          - 登入端點 (/login)
          - Token 刷新 (/refresh)
          - 用戶資訊端點 (/me)
          - 密碼雜湊（bcrypt）
          - JWT 簽名與驗證
          - Pydantic 資料驗證
          - 完整的單元測試
      
      檔案位置: ~/projects/auth-api/
      啟動方式: uvicorn main:app --reload
```

---

## 💡 小技巧

### 1. 批次任務
```
Brian: 同時做三個任務：
      1. 前端登入頁面
      2. 後端認證 API
      3. 資料庫 schema 設計

Javis: 🚀 收到！啟動 3 個並行任務：
      - login-page-1707654600 (前端)
      - auth-api-1707654601 (後端)
      - db-schema-1707654602 (SA)
      
      全部完成後會通知你！
```

### 2. 繼續上次的任務
```
Brian: 繼續上次的計算器任務，加入歷史記錄功能

Javis: 🚀 收到！
      基於任務: calculator-1707654321
      新任務: calculator-v2-1707654700
      新增功能: 歷史記錄
      啟動中...
```

### 3. 檢視所有任務
```
Brian: 目前有哪些 Claude Code 任務在跑？

Javis: 📊 當前任務狀態：
      
      執行中:
      - auth-api-1707654601 (啟動 8 分鐘)
      - db-schema-1707654602 (啟動 8 分鐘)
      
      已完成:
      - login-page-1707654600 ✅
      - calculator-1707654321 ✅
```

---

## ⚙️ 設定與調整

如果你想要改變預設行為，跟 Javis 說：

```
Brian: 以後前端任務不要自動發到群組

Javis: ✅ 收到！更新規則：
      前端任務不再自動通知到 g-frontend
      （記錄到 TOOLS.md）
```

---

_現在你可以直接跟 Javis 說話，他會幫你處理所有細節！_ 🎯
