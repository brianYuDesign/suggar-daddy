# 📋 團隊交接清單 - Handoff Checklist

## 交接概覽

本文檔用於確保團隊能夠獨立維護和運維 Recommendation Service。交接完成後，團隊應該能夠：

- ✅ 獨立部署和升級系統
- ✅ 診斷和修復常見問題
- ✅ 應對緊急事故
- ✅ 進行日常運維和監控
- ✅ 優化性能和容量規劃

---

## 一、系統架構回顧

### 架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                    Recommendation Service                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  API Gateway / Load Balancer                                 │
│    ├─ Port 3000 (HTTP)                                       │
│    └─ Health Check: GET /health                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         NestJS Application Layer                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Controllers (API 層)                                  │   │
│  │  ├─ recommendation.controller.ts  (推薦 API)         │   │
│  │  └─ content.controller.ts         (內容管理 API)     │   │
│  │                                                       │   │
│  │ Services (業務邏輯層)                                │   │
│  │  ├─ recommendation.service.ts     (推薦算法)         │   │
│  │  ├─ redis.service.ts              (快取服務)         │   │
│  │  └─ scheduled-tasks.service.ts    (定時任務)        │   │
│  │                                                       │   │
│  │ Entities (數據模型層)                                │   │
│  │  ├─ user.entity.ts                                   │   │
│  │  ├─ content.entity.ts                                │   │
│  │  ├─ content-tag.entity.ts                            │   │
│  │  ├─ user-interest.entity.ts                          │   │
│  │  └─ user-interaction.entity.ts                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │  Redis Cache     │    │  PostgreSQL DB   │               │
│  ├──────────────────┤    ├──────────────────┤               │
│  │ - Recommendations│    │ - Users          │               │
│  │ - User Interests │    │ - Contents       │               │
│  │ - Scores Cache   │    │ - Tags           │               │
│  │                  │    │ - Interactions   │               │
│  │ Port: 6379       │    │ Port: 5432       │               │
│  │ TTL: 1-6h        │    │ Replication: TBD │               │
│  └──────────────────┘    └──────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 核心組件說明

| 組件 | 功能 | 文件 | 關鍵方法 |
|------|------|------|---------|
| **推薦引擎** | 計算個性化推薦 | `recommendation.service.ts` | `getRecommendations()` |
| **快取層** | Redis 快取管理 | `redis.service.ts` | `get()`, `set()`, `del()` |
| **定時任務** | 後台定時更新 | `scheduled-tasks.service.ts` | `updateEngagementScores()` |
| **API 端點** | HTTP API 層 | `recommendation.controller.ts` | 5 個端點 |
| **內容管理** | 內容 CRUD | `content.controller.ts` | 7 個端點 |
| **數據層** | ORM 和數據庫 | `entities/` | TypeORM 實體 |

### 推薦算法核心公式

```
推薦分數 = 0.4 × 熱度分數 + 0.35 × 興趣匹配 + 0.25 × 新鮮度分數

其中：
- 熱度分數 = (點讚數 × 0.7 + 觀看數 × 0.3) / 內容總數
- 興趣匹配 = 用戶興趣標籤與內容標籤的相似度
- 新鮮度分數 = exp(-age_hours / 72)
- 隨機因子 = 20% 隨機探索以增加多樣性

詳見: ALGORITHM.md
```

---

## 二、關鍵文件位置

### 文件導航

```
recommendation-service/
│
├── 📚 文檔
│   ├── README.md                    ← 快速開始指南
│   ├── API.md                       ← API 完整文檔
│   ├── ALGORITHM.md                 ← 推薦算法詳解
│   ├── PROJECT_OVERVIEW.md          ← 項目結構
│   ├── OPERATIONS_GUIDE.md          ← 運維培訓（NEW）
│   ├── INCIDENT_RESPONSE.md         ← 事故響應（NEW）
│   └── TEAM_HANDOFF.md              ← 交接清單（NEW）
│
├── 🔧 源代碼
│   ├── src/
│   │   ├── main.ts                  ← 應用入口
│   │   ├── app.module.ts            ← 根模組（依賴注入）
│   │   │
│   │   ├── services/
│   │   │   ├── recommendation.service.ts        ⭐ 核心推薦算法
│   │   │   ├── redis.service.ts                 ⭐ 快取管理
│   │   │   ├── scheduled-tasks.service.ts       ⭐ 定時任務
│   │   │   └── *.spec.ts                        測試文件
│   │   │
│   │   ├── modules/
│   │   │   ├── recommendations/
│   │   │   │   ├── recommendation.controller.ts ⭐ 推薦 API
│   │   │   │   └── *.spec.ts
│   │   │   └─ contents/
│   │   │       ├── content.controller.ts        ⭐ 內容管理 API
│   │   │       └── *.spec.ts
│   │   │
│   │   ├── database/
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── content.entity.ts
│   │   │   │   ├── content-tag.entity.ts
│   │   │   │   ├── user-interest.entity.ts
│   │   │   │   └── user-interaction.entity.ts
│   │   │   └── data-source.ts                   ⭐ 數據庫配置
│   │   │
│   │   ├── cache/
│   │   │   └── redis.service.ts
│   │   │
│   │   └── dtos/
│   │       ├── recommendation.dto.ts
│   │       ├── content.dto.ts
│   │       └── interaction.dto.ts
│   │
│   ├── test/
│   │   └── [測試支持文件]
│   │
│   ├── 🐳 Docker 相關
│   │   ├── Dockerfile               ← Docker 構建
│   │   ├── docker-compose.yml       ← 開發環境編排
│   │   ├── docker-compose.prod.yml  ← 生產環境編排（如有）
│   │   └── .dockerignore             ← Docker 忽略文件
│   │
│   ├── ⚙️ 配置文件
│   │   ├── package.json              ← 依賴和命令
│   │   ├── package-lock.json         ← 鎖定版本
│   │   ├── tsconfig.json             ← TypeScript 配置
│   │   ├── jest.config.js            ← 測試配置
│   │   ├── .eslintrc.js              ← 代碼檢查
│   │   ├── .env.example              ← 環境變數模板
│   │   ├── .env.dev                  ← 開發環境變數
│   │   ├── .env.prod                 ← 生產環境變數（需要填寫）
│   │   ├── .gitignore                ← Git 忽略規則
│   │   └── .prettierrc.json          ← 代碼格式化
│   │
│   └── 📊 其他
│       ├── logs/                     ← 日誌目錄（運行時生成）
│       ├── node_modules/             ← 依賴包（不提交 git）
│       └── dist/                     ← 編譯輸出（不提交 git）
```

### 五個核心文件

**必須熟悉**:

| 文件 | 功能 | 學習時間 | 學習方式 |
|------|------|---------|---------|
| `src/services/recommendation.service.ts` | 推薦算法核心 | 2 小時 | 閱讀代碼 + ALGORITHM.md |
| `src/modules/recommendations/recommendation.controller.ts` | API 端點 | 1 小時 | 閱讀代碼 + API.md |
| `src/database/data-source.ts` | 數據庫配置 | 30 分 | 閱讀配置 |
| `docker-compose.yml` | 本地開發環境 | 30 分 | 運行和修改 |
| `.env.example` | 環境變數 | 30 分 | 複製並填寫 |

---

## 三、重要聯繫人

### 核心成員

| 角色 | 姓名 | 聯繫方式 | 責任 |
|------|------|---------|------|
| 技術負責人 | [Name] | Slack / Email | 架構決策、技術問題 |
| 後端工程師 | [Name] | Slack / Email | 日常開發、問題修復 |
| DevOps 工程師 | [Name] | Slack / Email | 部署、基礎設施 |
| 數據庫管理員 | [Name] | Slack / Email | 數據庫優化、備份 |
| 產品經理 | [Name] | Slack / Email | 需求、優先級 |

### 重要頻道

| 頻道 | 用途 | 檢查頻率 |
|------|------|---------|
| #incidents | 事故通知 | 實時 |
| #recommendations | 日常討論 | 每日 |
| #deployments | 部署通知 | 每日 |
| #database | 數據庫問題 | 按需 |

### 升級路徑

**問題排查流程**:

```
遇到問題
  ↓
查看 OPERATIONS_GUIDE.md 的故障排查章節
  ↓
自己能解決？
  ├─ YES → 解決並記錄
  └─ NO ──→ 詢問技術負責人
              ├─ 他也不確定？ → 詢問架構師
              └─ 仍無法解決？ → 提升為 incident
```

---

## 四、決策記錄

### 架構決策

#### AD-001: 使用 NestJS 框架

**決策**: 使用 NestJS 而非 Express/Fastify  
**時間**: 2024-01-01  
**原因**:
- 內置 TypeORM 集成
- 依賴注入容器減少重複代碼
- 完善的日誌和錯誤處理
- 易於擴展（Guards, Interceptors）

**後果**:
- 學習曲線略陡
- 編譯時間增加
- 包體積較大

**替代方案**:
- Express.js（更輕量，但需要手動集成）
- Fastify（更快，但生態較小）

---

#### AD-002: 推薦算法使用混合方式

**決策**: 結合熱度、興趣匹配和新鮮度三個維度  
**時間**: 2024-01-05  
**原因**:
- 熱度 → 發現高質量內容
- 興趣匹配 → 個性化推薦
- 新鮮度 → 及時推薦新內容

**權重配置**:
```
熱度: 40% (初期調優找到最佳值)
興趣匹配: 35% (保證個性化)
新鮮度: 25% (推動新內容曝光)
隨機: 20% (增加多樣性)
```

**可能調整的原因**:
- 用戶反饋推薦太陳舊 → 提高新鮮度
- 推薦缺乏個性 → 提高興趣匹配
- 結果太隨機 → 降低隨機因子

---

#### AD-003: 快取策略

**決策**: 推薦結果使用 Redis 快取，TTL 1 小時  
**時間**: 2024-01-10  
**原因**:
- 用戶推薦不需要實時更新
- 1 小時刷新保證相對新鮮
- 減少數據庫查詢 95%+

**TTL 配置**:
```
推薦快取: 3600 秒 (1 小時)
內容快取: 1800 秒 (30 分鐘)
用戶興趣: 21600 秒 (6 小時)
```

**調整原因**:
- 內存不足 → 降低 TTL，減少快取量
- 推薦太陳舊 → 提高更新頻率
- 計算成本高 → 提高 TTL

---

#### AD-004: 定時任務執行

**決策**: 使用 @Cron 裝飾器執行定時任務，無外部調度器  
**時間**: 2024-01-12  
**原因**:
- 簡單，無需 Redis/RabbitMQ
- 對於初期規模足夠
- 代碼簡潔

**執行頻率**:
```
updateEngagementScores: 每小時執行一次
  (更新所有內容的熱度、新鮮度分數)
```

**未來改進**:
- 可升級到 Redis 分布式鎖（多實例場景）
- 可升級到 Kubernetes CronJob（Kubernetes 部署）

---

#### AD-005: 數據庫選型

**決策**: 使用 PostgreSQL（不是 MySQL/MongoDB）  
**時間**: 2024-01-08  
**原因**:
- ACID 事務保證（用戶互動數據完整性）
- 強大的查詢能力（複雜推薦算法）
- JSON 支持（未來存儲複雜數據）
- 開源免費

**為什麼不用 MySQL**:
- JSON 支持不如 PostgreSQL
- 窗口函數支持較弱

**為什麼不用 MongoDB**:
- 不需要 schemaless
- 推薦算法需要強 JOIN（關係型）

---

### 運維決策

#### OD-001: 使用 Docker Compose 本地開發

**決策**: 開發環境完全容器化  
**時間**: 2024-01-02  
**配置**:
```yaml
services:
  recommendation-service: # 應用
  postgres:               # 數據庫
  redis:                  # 快取
```

**好處**:
- 開發環境 = 生產環境
- 減少"在我機器上能跑"問題
- 新人快速上手（一個命令）

---

#### OD-002: 環境變數配置

**決策**: 使用 .env 文件管理配置  
**時間**: 2024-01-03  
**規則**:
```
.env.example  → 提交到 git（模板）
.env.dev      → 本地開發（不提交）
.env.prod     → 生產環境（不提交，手動配置）
.env.test     → 測試環境（git 提交）
```

**關鍵變數**（見 API.md）:
```
NODE_ENV=development
PORT=3000
DATABASE_HOST=postgres
REDIS_HOST=redis
RECOMMENDATION_CACHE_TTL=3600
```

---

#### OD-003: 日誌級別

**決策**: 開發環境 debug，生產環境 info  
**時間**: 2024-01-04  
**配置**:
```
開發: LOG_LEVEL=debug    (詳細日誌用於調試)
生產: LOG_LEVEL=info     (主要事件日誌)
警告: LOG_LEVEL=warn     (只記錄警告和錯誤)
```

---

## 五、訓練內容確認清單

### 基礎知識培訓

```markdown
## 架構理解
- [ ] 理解系統 4 層架構（API層、業務層、數據層、基礎設施層）
- [ ] 能畫出簡單架構圖
- [ ] 理解各組件的責任

## 推薦算法
- [ ] 能解釋推薦分數公式
- [ ] 理解熱度、興趣匹配、新鮮度三個維度
- [ ] 知道何時調整權重
- [ ] 理解 20% 隨機因子的作用

## 數據庫
- [ ] 能列舉 5 個核心表和欄位
- [ ] 能編寫簡單 SQL 查詢
- [ ] 理解索引的作用
- [ ] 知道備份恢復流程

## API 端點
- [ ] 能調用 5 個推薦 API
- [ ] 能調用 7 個內容管理 API
- [ ] 理解請求/響應格式
- [ ] 能解釋常見錯誤碼

## 快取管理
- [ ] 理解 Redis 快取機制
- [ ] 能手動清空快取
- [ ] 能監控快取命中率
- [ ] 知道快取失效時的影響
```

### 運維技能培訓

```markdown
## 環境搭建
- [ ] 能從零啟動完整開發環境
- [ ] 能修改 .env 配置
- [ ] 理解 Docker Compose 配置
- [ ] 能查看容器日誌

## 日常維護
- [ ] 能備份和恢復數據庫
- [ ] 能監控系統資源使用
- [ ] 能分析慢查詢
- [ ] 能優化推薦算法參數

## 故障排查
- [ ] 掌握 7 大故障排查步驟
- [ ] 能快速定位應用、數據庫、快取故障
- [ ] 能制定緊急修復方案
- [ ] 能編寫故障診斷腳本

## 應急響應
- [ ] 理解 P0/P1/P2 分級
- [ ] 知道 P0 應急流程（5-30 分鐘）
- [ ] 能快速重啟服務
- [ ] 能執行降級方案
```

### 進階技能培訓

```markdown
## 性能優化
- [ ] 能識別性能瓶頸
- [ ] 能添加 SQL 索引
- [ ] 能優化推薦算法複雜度
- [ ] 能進行基準測試

## 代碼理解
- [ ] 能理解推薦算法實現
- [ ] 能讀懂 NestJS 模組設計
- [ ] 能修改 DTO 驗證規則
- [ ] 能添加新的 API 端點

## 監控告警
- [ ] 能設置基本監控指標
- [ ] 能配置告警規則
- [ ] 能分析監控數據
- [ ] 能預測容量需求

## 部署上線
- [ ] 理解部署流程
- [ ] 能執行金絲雀部署
- [ ] 能執行回滾操作
- [ ] 能進行零停機升級
```

---

## 六、交接驗證清單

在交接結束前，需要通過以下驗證：

### 環境驗證

```bash
# ✓ 開發環境能啟動
docker-compose up -d
sleep 10
curl http://localhost:3000/health  # 應返回 200

# ✓ 能獲取推薦
curl http://localhost:3000/api/v1/recommendations/user-test?limit=10

# ✓ 能記錄互動
curl -X POST http://localhost:3000/api/v1/recommendations/interactions \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user-test","content_id":"content-1","interaction_type":"like"}'

# ✓ 能清空快取
curl -X POST http://localhost:3000/api/v1/recommendations/clear-cache

# ✓ 能查看日誌
docker-compose logs recommendation-service | tail -20

# ✓ 能備份數據庫
docker-compose exec postgres pg_dump -U postgres recommendation_db > backup.sql

# ✓ 能連接到數據庫
docker-compose exec postgres psql -U postgres -d recommendation_db -c "SELECT COUNT(*) FROM users;"

# ✓ 能連接到 Redis
docker-compose exec redis redis-cli PING  # 應返回 PONG

# ✓ 測試通過
npm test  # 應返回 PASS（70%+ 覆蓋）
```

### 知識驗證

**通過口頭提問驗證**:

1. **架構層面** (3 個問題)
   - "系統有哪些核心層？各層的責任是什麼？"
   - "推薦分數如何計算？為什麼這樣設計？"
   - "快取在系統中起什麼作用？快取失效會怎樣？"

2. **運維層面** (3 個問題)
   - "如果 API 突然返回 500 錯誤，你會如何排查？"
   - "磁盤滿了會影響什麼？怎麼解決？"
   - "推薦響應時間從 50ms 變成 2s，可能是什麼原因？"

3. **應急層面** (3 個問題)
   - "P0 事故的應急流程是什麼？"
   - "如何快速恢復宕機的服務？"
   - "事故後如何進行總結？"

### 實操驗證

**實際操作驗證** (團隊應能獨立完成):

1. **啟動和停止**
   - [ ] 能從零啟動完整環境
   - [ ] 能優雅停止服務
   - [ ] 能清理容器和數據

2. **故障排查**
   - [ ] 能快速定位應用故障
   - [ ] 能快速定位數據庫故障
   - [ ] 能快速定位快取故障

3. **應急響應**
   - [ ] 能執行 P0 應急流程
   - [ ] 能決定是否需要降級
   - [ ] 能進行事故總結

4. **優化調試**
   - [ ] 能分析慢查詢
   - [ ] 能調整推薦權重
   - [ ] 能進行性能測試

---

## 七、交接簽字確認

交接完成後，由以下人員簽字確認：

```
交接時間: ________________
交接人 (技術負責人): ________________
接收人 (團隊負責人): ________________
見證人 (經理/主管): ________________

確認內容:
- [ ] 已完成架構培訓
- [ ] 已完成運維培訓
- [ ] 已完成應急響應培訓
- [ ] 已通過知識驗證
- [ ] 已通過環境驗證
- [ ] 已通過實操驗證
- [ ] 文檔已完整交付
- [ ] 聯繫人已確認
- [ ] 決策記錄已說明

簽字時間: ________________
```

---

## 八、後續支持計劃

### 交接後 1 週 (Ramp-up Period)

```
時間表:
  Day 1-2: 團隊獨立運行系統，技術負責人待命
  Day 3-5: 模擬故障和應急響應演練
  Day 5-7: 解答疑問，鞏固培訓內容

支持方式:
  - Slack 實時支持（優先級高的問題）
  - 每日 10 分鐘檢查會（確認無阻擋問題）
  - 週五技術同步會（複盤一週工作）
```

### 交接後 1 個月 (Stabilization Period)

```
支持方式:
  - 每週 1 次技術同步會（30 分鐘）
  - Slack 支持（24 小時內回復）
  - 文檔持續更新

目標:
  - 團隊能獨立應對 90% 的運維問題
  - 無需技術負責人干預
  - 開始參與功能開發
```

### 交接後 3 個月 (Full Ownership)

```
目標:
  - 團隊完全獨立維護系統
  - 能提出和實施優化方案
  - 能培訓新成員
  - 定期改進文檔和流程
```

---

## 九、常見問題 (FAQ)

### 部署相關

**Q: 如何在生產環境部署？**  
A: 見 OPERATIONS_GUIDE.md 啟動服務章節，生產環境使用 `docker-compose.prod.yml`

**Q: 如何更新應用代碼？**  
A: 
```bash
git pull
npm install (如有新依賴)
npm run build
docker-compose restart recommendation-service
```

**Q: 如何回滾到上一個版本？**  
A:
```bash
git revert <commit-hash>
npm install
docker-compose restart recommendation-service
```

### 性能相關

**Q: 推薦響應時間慢了，如何快速定位？**  
A: 見 OPERATIONS_GUIDE.md 性能故障排查章節

**Q: 如何優化推薦算法性能？**  
A: 見 OPERATIONS_GUIDE.md 性能優化手段章節

**Q: 內存使用一直增加，是什麼原因？**  
A: 可能是快取沒有正確過期。檢查 Redis INFO 命令，必要時清空快取。

### 數據相關

**Q: 如何備份數據庫？**  
A: 見 OPERATIONS_GUIDE.md 數據庫管理章節

**Q: 如何恢復已刪除的數據？**  
A: PostgreSQL 沒有軟刪除，必須使用備份。建議使用 `pg_dump` 定期備份。

**Q: 推薦結果不對，如何調試？**  
A: 見 OPERATIONS_GUIDE.md 業務邏輯故障排查章節

### 應急相關

**Q: 服務宕機，用戶無法訪問，怎麼辦？**  
A: 見 INCIDENT_RESPONSE.md P0 應急流程

**Q: 部分功能不可用，是 P1 還是 P2？**  
A: 見 INCIDENT_RESPONSE.md 事故分類章節

**Q: 事故後需要做什麼？**  
A: 見 INCIDENT_RESPONSE.md 事後總結流程章節

---

## 十、資源清單

### 文檔

- ✅ `README.md` - 項目總覽和快速開始
- ✅ `API.md` - 完整 API 文檔
- ✅ `ALGORITHM.md` - 推薦算法詳解
- ✅ `PROJECT_OVERVIEW.md` - 項目結構
- ✅ `OPERATIONS_GUIDE.md` - 運維培訓 (NEW)
- ✅ `INCIDENT_RESPONSE.md` - 事故響應 (NEW)
- ✅ `TEAM_HANDOFF.md` - 交接清單 (NEW)

### 代碼倉庫

```
GitHub/GitLab: [URL]
Branch: main (生產), develop (開發)
Tags: v1.0.0 (當前版本)
```

### 監控工具

- Prometheus (metrics)
- Grafana (visualization)
- ELK Stack (logs)
- Sentry (error tracking)

### 相關系統

- 用戶服務 API
- 內容服務 API
- 分析服務 API

---

## 十一、改進建議

### 短期改進（1 個月內）

- [ ] 添加 Prometheus 監控
- [ ] 配置告警規則
- [ ] 編寫更多 unit tests（覆蓋率 80%+）
- [ ] 添加 integration tests

### 中期改進（3 個月內）

- [ ] 實現多實例部署（負載均衡）
- [ ] 添加分布式追蹤（Jaeger）
- [ ] 性能優化（目標 P95 < 100ms）
- [ ] 支持 Kubernetes 部署

### 長期改進（6 個月內）

- [ ] 實現 GraphQL API
- [ ] 添加機器學習推薦模型
- [ ] 支持多語言
- [ ] 微服務架構升級

---

**文檔版本**: 1.0.0  
**最後更新**: 2024-02-19  
**負責部門**: Backend Team  
**有效期**: 長期（每季度審查）
