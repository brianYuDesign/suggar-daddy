# 📑 快速導航索引 - 團隊交接文檔

## 🎯 按用途快速查找

### 🚀 快速開始（我要快速了解）

```
時間: 5 分鐘

1. 閱讀: README.md (快速開始章節)
2. 閱讀: EXECUTIVE_SUMMARY.md (交接概覽)
3. 運行: ./handoff_validation.sh (驗證環境)
```

**結果**: 能快速理解系統是什麼、怎麼運行

---

### 🔧 日常操作（我要進行日常維護）

```
查看: OPERATIONS_GUIDE.md

章節:
  1. 服務啟動和停止
     → docker-compose up/down
     → 環境變數配置

  2. 數據庫管理
     → 備份: pg_dump
     → 恢復: psql < backup.sql
     → 查詢: psql 進入 interactive

  3. Redis 緩存管理
     → 查看狀態: redis-cli
     → 清空緩存: FLUSHALL
     → 監控: redis-cli --stat

  4. 日誌管理
     → docker-compose logs
     → 日誌級別設置
     → 日誌持久化
```

**結果**: 能獨立進行日常維護操作

---

### 🆘 遇到問題（系統出故障了）

```
快速流程:

1. 確認嚴重級別
   → 查看: INCIDENT_RESPONSE.md (事故分類)
   → P0? P1? P2?

2. 快速診斷 (5 分鐘)
   查看: OPERATIONS_GUIDE.md (故障排查)
     - 查看日誌: docker-compose logs
     - 檢查狀態: docker-compose ps
     - 檢查資源: docker stats

3. 查詢具體問題
   查看: FAQ_AND_KNOWLEDGE_BASE.md
     - Q13: API 返回 500？
     - Q14: 無法連接數據庫？
     - Q15: 無法連接 Redis？
     - Q16: 服務突然宕機？

4. 執行應急流程
   查看: INCIDENT_RESPONSE.md
     - P0: 5 分鐘快速診斷，30 分鐘恢復
     - P1: 15 分鐘診斷，2 小時恢復
     - P2: 24 小時內處理

5. 事後處理
   查看: INCIDENT_RESPONSE.md (事後總結流程)
     - 收集日誌
     - 分析根本原因
     - 制定改進方案
```

**結果**: 能快速應對故障，縮短停機時間

---

### 📚 深度學習（我要理解系統設計）

```
1. 系統架構 (1 小時)
   查看: PROJECT_OVERVIEW.md + TEAM_HANDOFF.md
     - 項目結構
     - 核心組件
     - 推薦算法
     - 架構圖

2. 推薦算法 (1-2 小時)
   查看: ALGORITHM.md + FAQ_AND_KNOWLEDGE_BASE.md
     - 分數公式
     - 權重配置
     - 優化技巧
     - 案例分析 (Q6)

3. API 使用 (30 分鐘)
   查看: API.md + FAQ_AND_KNOWLEDGE_BASE.md
     - 5 個推薦 API
     - 7 個內容管理 API
     - 請求/響應格式
     - 常見錯誤處理

4. 決策背景 (30 分鐘)
   查看: TEAM_HANDOFF.md (決策記錄)
     - 為什麼使用 NestJS?
     - 為什麼這個算法權重?
     - 為什麼用 PostgreSQL?
     - 為什麼這樣緩存?

5. 最佳實踐 (30 分鐘)
   查看: FAQ_AND_KNOWLEDGE_BASE.md (最佳實踐)
     - 開發規范
     - 運維規范
     - 應急規范
```

**結果**: 深入理解系統，能提出優化建議

---

### ✈️ 應急響應（系統完全宕機了）

```
立即執行 P0 流程:

時間: 0-5 分鐘
  查看: INCIDENT_RESPONSE.md (P0 應急流程)
  1. 確認問題真實性
  2. 啟動 P0 響應通知
  3. 快速診斷（查看日誌、檢查依賴）

時間: 5-15 分鐘
  4. 嘗試快速修復
     - docker-compose restart recommendation-service
     - 如果失敗，重啟依賴 (postgres, redis)
     - 如果依然失敗，完整重建

時間: 15-30 分鐘
  5. 驗證恢復（15 分鐘持續監控）
  6. 如果恢復失敗，執行降級方案

時間: 30+ 分鐘
  7. 根本原因分析
  8. 實施永久修復
  9. 事後總結和改進
```

**結果**: 最小化停機時間，快速恢復服務

---

### 🎓 培訓新成員（新人入職）

```
第 1 天: 環境搭建 (2 小時)
  ├─ 閱讀: README.md (快速開始)
  ├─ 閱讀: FAQ (Q1-Q4: 環境配置)
  ├─ 實操: 搭建開發環境
  └─ 驗證: ./handoff_validation.sh

第 2-3 天: API 理解 (4 小時)
  ├─ 閱讀: API.md (完整 API 文檔)
  ├─ 閱讀: FAQ (Q5-Q8: 功能使用)
  ├─ 實操: 調用各個 API 端點
  └─ 作業: 編寫簡單的測試

第 4-5 天: 架構和算法 (4 小時)
  ├─ 閱讀: PROJECT_OVERVIEW.md (項目結構)
  ├─ 閱讀: ALGORITHM.md (推薦算法)
  ├─ 閱讀: TEAM_HANDOFF.md (架構決策)
  └─ 作業: 畫出架構圖，解釋算法

第 6 天: 運維和故障排查 (4 小時)
  ├─ 閱讀: OPERATIONS_GUIDE.md (運維培訓)
  ├─ 閱讀: FAQ (Q9-Q16: 故障排查)
  ├─ 實操: 進行故障演練（模擬各種故障）
  └─ 作業: 編寫故障排查清單

第 7 天: 應急響應 (2 小時)
  ├─ 閱讀: INCIDENT_RESPONSE.md (應急流程)
  ├─ 實操: P0 應急流程演練
  └─ 簽署: 理解應急流程確認書
```

**結果**: 新人快速上手，成為有效團隊成員

---

## 📊 文檔速查表

### 按主題分類

| 主題 | 一級文檔 | 二級文檔 | 三級文檔 |
|------|---------|---------|---------|
| **快速開始** | README.md | - | - |
| **API 使用** | API.md | FAQ_Q5-Q8 | 具體端點 |
| **推薦算法** | ALGORITHM.md | FAQ_Q6, Q8 | 權重調優 |
| **項目結構** | PROJECT_OVERVIEW.md | TEAM_HANDOFF.md | 文件位置 |
| **日常操作** | OPERATIONS_GUIDE.md (1-4) | FAQ_Q1-Q4 | 具體命令 |
| **故障排查** | OPERATIONS_GUIDE.md (故障排查) | FAQ_Q9-Q16 | 流程圖 |
| **應急響應** | INCIDENT_RESPONSE.md | FAQ_FAQ_Q13-Q16 | 應急命令 |
| **性能優化** | OPERATIONS_GUIDE.md (性能優化) | FAQ_Q9-Q12 | 測試工具 |
| **交接清單** | TEAM_HANDOFF.md | HANDOFF_COMPLETION | 驗證清單 |
| **知識庫** | FAQ_AND_KNOWLEDGE_BASE | 最佳實踐 | 案例分析 |

---

### 按使用角色分類

| 角色 | 必讀文檔 | 常用文檔 | 參考文檔 |
|------|---------|---------|---------|
| **新手開發者** | README.md<br>PROJECT_OVERVIEW | API.md<br>FAQ (Q1-Q8) | ALGORITHM.md |
| **資深開發者** | ALGORITHM.md<br>TEAM_HANDOFF | 代碼本身<br>FAQ (Q6, Q8) | OPERATIONS_GUIDE |
| **運維工程師** | OPERATIONS_GUIDE<br>INCIDENT_RESPONSE | FAQ (Q9-Q16)<br>docker-compose | 監控告警 |
| **DBA** | OPERATIONS_GUIDE (數據層)<br>FAQ (Q11, Q14, Q18) | SQL 優化<br>備份恢復 | 性能測試 |
| **新手運維** | OPERATIONS_GUIDE (1-4)<br>FAQ (Q1-Q4) | 故障排查流程<br>日常命令 | 應急手冊 |
| **SRE/技術負責人** | INCIDENT_RESPONSE<br>TEAM_HANDOFF | 監控架構<br>容量規劃 | 決策記錄 |
| **產品經理** | EXECUTIVE_SUMMARY<br>ALGORITHM.md | API.md | 決策文檔 |
| **管理層** | EXECUTIVE_SUMMARY<br>TEAM_HANDOFF (聯繫人) | 進度報告 | 成本分析 |

---

## 🔍 按問題類型快速查找

### "我要..."

```
✓ 快速開始開發
  → README.md (5 分鐘)
  → FAQ Q1-Q4 (環境搭建)

✓ 調用推薦 API
  → API.md (推薦引擎章節)
  → FAQ Q5 (推薦為空)

✓ 記錄用戶互動
  → API.md (記錄互動章節)
  → FAQ Q7 (如何記錄互動)

✓ 優化推薦質量
  → ALGORITHM.md
  → FAQ Q6 (推薦質量不好)
  → FAQ Q8 (如何更新權重)

✓ 優化性能
  → OPERATIONS_GUIDE.md (性能優化)
  → FAQ Q9-Q12 (性能問題)

✓ 排查故障
  → OPERATIONS_GUIDE.md (故障排查)
  → FAQ Q13-Q16 (具體故障)

✓ 應對緊急情況
  → INCIDENT_RESPONSE.md (應急流程)
  → 按 P0/P1/P2 查看相應流程

✓ 理解系統設計
  → PROJECT_OVERVIEW.md
  → TEAM_HANDOFF.md (架構決策)
  → ALGORITHM.md

✓ 培訓新成員
  → 見"快速導航" → "應急響應" → "培訓新成員"

✓ 進行容量規劃
  → OPERATIONS_GUIDE.md (性能優化)
  → FAQ Q12 (性能測試)
  → TEAM_HANDOFF.md (決策記錄)
```

---

## 📱 常用命令速查

```bash
# 啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f recommendation-service

# 重啟服務
docker-compose restart recommendation-service

# 連接數據庫
docker-compose exec postgres psql -U postgres -d recommendation_db

# 連接 Redis
docker-compose exec redis redis-cli

# 備份數據庫
docker-compose exec postgres pg_dump -U postgres recommendation_db > backup.sql

# 恢復數據庫
docker-compose exec -T postgres psql -U postgres recommendation_db < backup.sql

# 清空緩存
curl -X POST http://localhost:3000/api/v1/recommendations/clear-cache

# 獲取推薦
curl http://localhost:3000/api/v1/recommendations/user-123

# 運行測試
npm test

# 查看覆蓋率
npm run test:cov

# 運行開發服務
npm run dev
```

更多命令見: **OPERATIONS_GUIDE.md** (快速參考)

---

## 🎯 5 分鐘快速入門

### 第一次使用？按以下步驟：

```bash
# 1. 閱讀總結 (5 分鐘)
cat README.md | head -100

# 2. 啟動環境 (10 分鐘)
docker-compose up -d
sleep 10
curl http://localhost:3000/health

# 3. 測試推薦 API (5 分鐘)
curl http://localhost:3000/api/v1/recommendations/user-test

# 4. 查看日誌 (5 分鐘)
docker-compose logs recommendation-service

# 5. 閱讀快速指南 (10 分鐘)
cat OPERATIONS_GUIDE.md | grep -A 50 "快速參考"

# 總計: ~35 分鐘，您已經掌握基礎！
```

---

## 💡 常見場景導航

### 場景 1: 服務不能訪問

```
步驟 1: 確認是否運行
curl http://localhost:3000/health

步驟 2: 查看日誌
docker-compose logs recommendation-service | tail -50

步驟 3: 查看詳細診斷
FAQ Q13 (API 返回 500)
or
FAQ Q16 (服務突然宕機)

步驟 4: 執行快速修復
docker-compose restart recommendation-service
```

---

### 場景 2: 推薦結果為空

```
FAQ Q5: 推薦 API 返回空結果

可能原因:
  1. 用戶無互動記錄
  2. 系統無足夠內容
  3. 推薦算法太嚴格
  4. 快取問題

解決步驟:
  1. 記錄用戶互動
  2. 創建測試內容
  3. 清空快取
  4. 重新測試
```

---

### 場景 3: 推薦響應慢

```
FAQ Q9: 推薦 API 響應慢

快速診斷:
  1. 測量響應時間
  2. 檢查快取命中率
  3. 檢查數據庫查詢時間
  4. 檢查系統資源

快速修復:
  1. 清空快取
  2. 增加快取 TTL
  3. 添加數據庫索引
  4. 優化推薦算法
```

---

### 場景 4: 磁盤滿了

```
FAQ 沒有直接對應（需要補充）

快速診斷:
  df -h  # 查看磁盤使用
  
快速修復:
  docker system prune  # 清理 Docker
  docker volume prune  # 清理卷
  
長期解決:
  定期清理日誌
  設置日誌輪轉
  監控磁盤使用
```

---

## 📞 需要幫助？

```
1. 查看 FAQ_AND_KNOWLEDGE_BASE.md (26 個 FAQ)
2. 查看 OPERATIONS_GUIDE.md (故障排查章節)
3. 查看 INCIDENT_RESPONSE.md (應急流程)
4. 查看 TEAM_HANDOFF.md (聯繫人)
5. 聯繫技術負責人
```

---

## 📄 文檔列表

```
核心文檔:
  ✅ README.md                  - 項目快速開始
  ✅ API.md                     - API 完整文檔
  ✅ ALGORITHM.md               - 推薦算法詳解
  ✅ PROJECT_OVERVIEW.md        - 項目結構說明

交接文檔:
  ✅ OPERATIONS_GUIDE.md        - 運維培訓指南 (NEW)
  ✅ INCIDENT_RESPONSE.md       - 應急響應流程 (NEW)
  ✅ TEAM_HANDOFF.md            - 團隊交接清單 (NEW)
  ✅ FAQ_AND_KNOWLEDGE_BASE.md  - FAQ 和知識庫 (NEW)

驗收文檔:
  ✅ HANDOFF_COMPLETION.md      - 交接完成驗收 (NEW)
  ✅ EXECUTIVE_SUMMARY.md       - 執行總結 (NEW)
  ✅ QUICK_NAVIGATION.md        - 本文檔
```

---

**更新時間**: 2024-02-19  
**文檔版本**: 1.0.0  
**維護人**: Backend Team
