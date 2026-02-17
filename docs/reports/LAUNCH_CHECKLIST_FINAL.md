# 🚀 上線前最終檢查清單
# Pre-Launch Final Checklist

**目標上線日**: 2026-02-24（週一）  
**檢查日期**: 2026-02-17 ~ 2026-02-23  
**負責人**: Tech Lead, Solution Architect

---

## 📋 檢查清單總覽

| 階段 | 任務數 | 完成 | 進度 | 狀態 |
|------|-------|------|------|------|
| **Day -7: 技術準備** | 20 | 20 | 100% | ✅ 完成 |
| **Day -1 ~ -2: 上線準備** | 8 | 0 | 0% | 📋 待完成 |
| **Day 0: 上線日** | 10 | 0 | 0% | ⏰ 等待中 |
| **Day 1-7: 灰度發布** | 15 | 0 | 0% | ⏰ 等待中 |
| **總計** | **53** | **20** | **38%** | 🟡 進行中 |

---

## ✅ Day -7 ~ -3: 技術準備（已完成）

### 1. P0 Bug 修復 ✅

- [x] BUG-001: 金額計算精度問題（decimal.js）
- [x] BUG-002: 支付失敗未記錄（孤兒交易處理）
- [x] BUG-003: 計數器邏輯錯誤（?? 運算符）
- [x] BUG-011: Media Service 認證保護
- [x] 提款金額驗證漏洞
- [x] 幂等性處理缺失
- [x] Admin 授權繞過風險

**驗證**: 186 tests passed (100%) ✅

### 2. Critical 安全風險緩解 ✅

- [x] Rate Limiting 實施（三層策略）
- [x] Circuit Breaker 實施（opossum）
- [x] Secrets 管理（Docker Secrets）
- [x] JWT 認證機制完善

**驗證**: 4/4 Critical 風險已緩解 ✅

### 3. 測試覆蓋率 ✅

- [x] Backend 單元測試 100% 通過（222/222）
- [x] Frontend 測試覆蓋率提升至 42.3%（+118%）
- [x] E2E 測試優化（-78 waitForTimeout）
- [x] 用戶旅程測試（3 個角色）

**驗證**: 測試通過率達標 ✅

### 4. 架構完整性 ✅

- [x] 微服務依賴關係清晰
- [x] API Gateway 配置完善
- [x] Kafka 事件流完整
- [x] Redis 快取策略完善
- [x] PostgreSQL 高可用架構（Master-Replica）
- [x] 監控系統完善（Prometheus + Grafana + Jaeger）

**驗證**: 架構評分 88/100 ✅

### 5. 性能優化 ✅

- [x] N+1 查詢修復
- [x] 資料庫索引優化
- [x] 快取 TTL 優化
- [x] 查詢優化（-60% 響應時間）

**驗證**: 性能測試通過 ✅

---

## 📋 Day -2 ~ -1: 上線準備（今明兩天）

### 1. 運營準備（4h）⏰

**優先級**: 🔴 P0 - 必須完成

#### 1.1 告警通知配置（2h）

**負責人**: DevOps  
**截止時間**: 2026-02-18 12:00

- [ ] **Slack 整合**
  ```bash
  # 配置 Alertmanager Slack Webhook
  cd infrastructure/prometheus
  edit alertmanager.yml
  # 添加 Slack receiver
  ```
  - [ ] 創建 #alerts-production 頻道
  - [ ] 配置 Incoming Webhook
  - [ ] 測試告警發送
  
- [ ] **Email 告警**
  - [ ] 配置 SMTP 設置
  - [ ] 添加收件人列表（Tech Lead, DevOps, On-call）
  - [ ] 測試郵件發送

- [ ] **告警規則配置**
  - [ ] 錯誤率 > 1%（Warning）
  - [ ] 錯誤率 > 5%（Critical）
  - [ ] P95 響應時間 > 1s（Warning）
  - [ ] P95 響應時間 > 2s（Critical）
  - [ ] 可用性 < 99%（Warning）
  - [ ] 可用性 < 95%（Critical）
  - [ ] Circuit Breaker 開路（Warning）
  - [ ] 資料庫連線池 > 80%（Warning）
  - [ ] Redis 記憶體 > 80%（Warning）
  - [ ] Kafka lag > 1000（Warning）

**驗證步驟**:
```bash
# 測試告警
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"TestAlert","severity":"critical"},"annotations":{"summary":"Test alert"}}]'

# 檢查 Slack 是否收到
# 檢查 Email 是否收到
```

**完成標準**:
- ✅ Slack 告警測試成功
- ✅ Email 告警測試成功
- ✅ 所有告警規則配置完成

---

#### 1.2 團隊培訓與 Briefing（2h）

**負責人**: PM + Tech Lead  
**截止時間**: 2026-02-18 16:00

- [ ] **培訓材料準備**
  - [ ] 運營手冊 Review
  - [ ] 常見問題 FAQ
  - [ ] 回滾流程演示
  - [ ] 監控 Dashboard 介紹

- [ ] **團隊 Briefing 會議**
  - [ ] 時間：2026-02-18 14:00-16:00
  - [ ] 參與人員：Backend, Frontend, QA, DevOps, PM
  - [ ] 會議議程：
    - 上線計劃與時程
    - 灰度發布策略
    - 監控指標解讀
    - 告警響應流程
    - 回滾流程演練
    - 輪班安排
    - Q&A

- [ ] **輪班表安排**
  ```
  Day 1-2 (10% 流量):
  ├── 08:00-16:00  Tech Lead + Backend Dev A
  ├── 16:00-24:00  DevOps + Backend Dev B
  └── 24:00-08:00  On-call (Backend Dev C)
  
  Day 3-7:
  ├── 正常工作時間: 全員待命
  └── 非工作時間: On-call 輪班
  ```

**完成標準**:
- ✅ 所有團隊成員了解上線計劃
- ✅ 輪班表確定並同步
- ✅ 回滾流程演練通過

---

### 2. 技術驗證（4h）⏰

**優先級**: 🔴 P0 - 必須完成

#### 2.1 完整測試套件執行（2h）

**負責人**: QA  
**截止時間**: 2026-02-19 12:00

- [ ] **Backend 測試**
  ```bash
  npm run test
  # 預期: 222/222 tests passed
  ```

- [ ] **Frontend 測試**
  ```bash
  npm run test:frontend
  # 預期: 覆蓋率 > 42%
  ```

- [ ] **E2E 測試**
  ```bash
  npm run test:e2e
  # 預期: 所有關鍵流程通過
  ```

- [ ] **整合測試**
  ```bash
  npm run test:integration
  # 預期: 服務間通訊正常
  ```

- [ ] **煙霧測試**
  ```bash
  ./scripts/test/smoke-test.sh
  # 預期: 所有服務健康檢查通過
  ```

**完成標準**:
- ✅ 所有測試通過
- ✅ 無 regression bug
- ✅ 記錄測試結果

---

#### 2.2 回滾流程測試（2h）

**負責人**: DevOps  
**截止時間**: 2026-02-19 16:00

- [ ] **準備測試環境**
  ```bash
  # 啟動測試環境
  docker-compose -f docker-compose.test.yml up -d
  ```

- [ ] **模擬上線**
  ```bash
  # 切換到新版本
  git checkout v1.1.0
  docker-compose up -d
  ./scripts/test/smoke-test.sh
  ```

- [ ] **執行回滾**
  ```bash
  # 回滾到舊版本
  docker-compose down
  git checkout v1.0.0
  docker-compose up -d
  ./scripts/test/smoke-test.sh
  ```

- [ ] **驗證資料一致性**
  - [ ] 檢查資料庫資料
  - [ ] 檢查 Redis 快取
  - [ ] 檢查 Kafka 訊息

- [ ] **計時測試**
  - [ ] 記錄回滾開始時間
  - [ ] 記錄回滾完成時間
  - [ ] 確認回滾時間 < 5 分鐘

**完成標準**:
- ✅ 回滾流程測試成功
- ✅ 回滾時間 < 5 分鐘
- ✅ 資料一致性驗證通過

---

### 3. 文檔完整性 ✅

- [x] 上線檢查清單（本文檔）
- [x] 運營手冊
- [x] 技術審查報告
- [x] ADR-001: 上線前架構審查
- [x] 執行摘要

---

## ⏰ Day -1: 上線前最終準備

### 2026-02-23（週日）

#### 休息與準備

- [ ] **團隊休息日**
  - 確保所有成員充分休息
  - 檢查輪班表無衝突
  - 準備應急物資（咖啡、零食）

- [ ] **設備檢查**
  - [ ] 筆電充電
  - [ ] 網路穩定
  - [ ] 手機充電
  - [ ] 備用電源

- [ ] **最終文檔 Review**
  - [ ] 再次 Review 運營手冊
  - [ ] 確認回滾流程清晰
  - [ ] 確認聯絡方式正確

---

## 🚀 Day 0: 上線日（2026-02-24 週一）

### T-2h (08:00 AM): 上線前準備

- [ ] **全體團隊 Briefing**
  - [ ] 確認所有人員到位
  - [ ] Review 上線計劃
  - [ ] 確認監控系統正常
  - [ ] 確認告警通知正常

- [ ] **最終檢查**
  - [ ] 執行完整測試套件
  - [ ] 檢查所有服務健康狀態
  - [ ] 檢查資料庫連線
  - [ ] 檢查 Redis 連線
  - [ ] 檢查 Kafka 連線

- [ ] **備份最新資料**
  ```bash
  ./scripts/db/backup.sh
  # 確認備份成功
  ls -lh backups/
  ```

### T-0 (10:00 AM): 開始灰度發布

- [ ] **執行部署腳本**
  ```bash
  # 部署新版本
  git checkout v1.1.0
  docker-compose pull
  docker-compose up -d
  ```

- [ ] **驗證部署成功**
  ```bash
  ./scripts/test/smoke-test.sh
  # 所有服務健康檢查通過
  ```

- [ ] **開放 10% 流量**
  - [ ] 配置 Load Balancer / Feature Flag
  - [ ] 確認流量分配正確
  - [ ] 開始密切監控

### T+1h (11:00 AM): 監控與驗證

- [ ] **監控關鍵指標**（每 5 分鐘）
  - [ ] 錯誤率 < 0.5%
  - [ ] P95 響應時間 < 500ms
  - [ ] 可用性 > 99%
  - [ ] Circuit Breaker 開路次數
  - [ ] 資料庫 CPU < 50%
  - [ ] Redis 記憶體 < 50%
  - [ ] Kafka lag < 100

- [ ] **檢查錯誤日誌**
  ```bash
  docker-compose logs -f --tail=100
  # 檢查是否有異常錯誤
  ```

- [ ] **驗證核心功能**
  - [ ] 用戶註冊
  - [ ] 用戶登入
  - [ ] 內容瀏覽
  - [ ] 支付流程（測試訂單）
  - [ ] 訂閱管理

### T+4h (14:00 PM): 評估與決策

- [ ] **評估系統穩定性**
  - [ ] Review 過去 4 小時的監控數據
  - [ ] 分析錯誤日誌
  - [ ] 收集用戶反饋

- [ ] **Go/No-Go 決策**
  - [ ] ✅ 一切正常 → 繼續保持 10% 流量
  - [ ] ❌ 發現問題 → 回滾至 0%

- [ ] **記錄與報告**
  - [ ] 記錄關鍵指標
  - [ ] 記錄問題和解決方案
  - [ ] Daily standup 更新

---

## 📈 Day 1-2: 灰度 10%（2026-02-24 ~ 2026-02-25）

### 持續監控（每 5 分鐘）

- [ ] **自動告警監控**
  - Slack #alerts-production
  - Email 告警
  - Grafana Dashboard

- [ ] **關鍵指標**
  ```
  目標值：
  - 錯誤率 < 0.5%
  - P95 響應時間 < 500ms
  - 可用性 > 99%
  - Circuit Breaker 開路次數 = 0
  ```

### 每 4 小時檢查點

- [ ] **10:00 AM**: 晨間檢查
- [ ] **14:00 PM**: 午間檢查
- [ ] **18:00 PM**: 傍晚檢查
- [ ] **22:00 PM**: 深夜檢查

### Day 2 (2026-02-25): 評估與決策

- [ ] **評估 24h 運行狀況**
  - [ ] 無嚴重 Bug
  - [ ] 錯誤率正常
  - [ ] 用戶反饋正面

- [ ] **Go/No-Go 決策**
  - [ ] ✅ 一切正常 → 擴大至 50% 流量
  - [ ] ❌ 有問題 → 回滾至 0% 或維持 10%

---

## 📈 Day 3-4: 灰度 50%（2026-02-26 ~ 2026-02-27）

### 開始擴大流量

- [ ] **配置 50% 流量**（2026-02-26 10:00 AM）
  - [ ] 更新 Load Balancer / Feature Flag
  - [ ] 確認流量分配正確

### 系統穩定性驗證

- [ ] **監控資源使用**
  - [ ] 資料庫 CPU < 70%
  - [ ] Redis 記憶體 < 70%
  - [ ] Kafka lag < 1000 messages
  - [ ] API Gateway CPU < 70%

### 性能測試

- [ ] **峰值流量測試**
  - [ ] 模擬高峰期流量
  - [ ] 監控系統回應
  - [ ] 記錄性能數據

### Day 4 (2026-02-27): 評估與決策

- [ ] **評估 48h 運行狀況**
  - [ ] 系統穩定
  - [ ] 性能符合預期
  - [ ] 無擴展瓶頸

- [ ] **Go/No-Go 決策**
  - [ ] ✅ 一切正常 → 擴大至 100% 流量
  - [ ] ❌ 有問題 → 回滾至 10% 或維持 50%

---

## 📈 Day 5-7: 全量發布（2026-02-28 ~ 2026-03-02）

### 開始全量發布

- [ ] **配置 100% 流量**（2026-02-28 10:00 AM）
  - [ ] 更新 Load Balancer / Feature Flag
  - [ ] 確認所有流量切換完成

### 持續監控

- [ ] **每日監控報告**
  - Day 5: 2026-02-28
  - Day 6: 2026-03-01
  - Day 7: 2026-03-02

### 成功標準

- [ ] **運行 7 天無嚴重問題**
- [ ] **所有關鍵指標達標**
  - 可用性 > 99.5%
  - 錯誤率 < 0.5%
  - P95 響應時間 < 500ms
- [ ] **用戶反饋良好**
  - 用戶滿意度 > 4.0/5.0
  - 無大量投訴

---

## 🔄 回滾流程（緊急使用）

### 觸發條件

自動觸發（立即回滾）:
- 🔴 錯誤率 > 5%
- 🔴 P95 響應時間 > 2000ms
- 🔴 可用性 < 95%
- 🔴 資料庫連線池耗盡
- 🔴 Critical Bug 發現

手動觸發（考慮回滾）:
- 🟡 錯誤率 1-5%
- 🟡 P95 響應時間 500-2000ms
- 🟡 可用性 95-99%
- 🟡 用戶投訴增加

### 回滾步驟（< 5 分鐘）

```bash
# Step 1: 停止新版本服務
docker-compose down

# Step 2: 切換到舊版本
git checkout v1.0.0

# Step 3: 啟動舊版本
docker-compose up -d

# Step 4: 驗證服務恢復
./scripts/test/smoke-test.sh

# Step 5: 通知團隊
slack notify "#engineering" "🔴 已回滾至 v1.0.0"
```

### 回滾後檢查

- [ ] 所有服務健康檢查通過
- [ ] 資料一致性驗證
- [ ] 用戶功能正常
- [ ] 通知所有相關人員

---

## 📊 監控 Dashboard

### Grafana Dashboards

- **System Overview**
  - http://localhost:3001/d/system-overview
  - 錯誤率、響應時間、可用性

- **Service Health**
  - http://localhost:3001/d/service-health
  - 各服務健康狀態

- **Database Metrics**
  - http://localhost:3001/d/database-metrics
  - 資料庫 CPU、記憶體、連線數

- **Redis Metrics**
  - http://localhost:3001/d/redis-metrics
  - Redis 記憶體、命中率

- **Kafka Metrics**
  - http://localhost:3001/d/kafka-metrics
  - Kafka lag、吞吐量

### Jaeger Tracing

- **Distributed Tracing**
  - http://localhost:16686
  - 分散式追蹤，查找慢請求

---

## 📝 每日報告模板

### Daily Launch Report

**日期**: YYYY-MM-DD  
**流量比例**: XX%  
**報告人**: Tech Lead

#### 關鍵指標

| 指標 | 目標 | 實際 | 狀態 |
|------|------|------|------|
| 錯誤率 | < 0.5% | X.X% | ✅/❌ |
| P95 響應時間 | < 500ms | XXX ms | ✅/❌ |
| 可用性 | > 99% | XX.X% | ✅/❌ |
| Circuit Breaker 開路 | 0 | X | ✅/❌ |

#### 問題與解決方案

1. **問題描述**: ...
   - **影響**: ...
   - **解決方案**: ...
   - **狀態**: ✅ 已解決 / 🟡 進行中

#### 用戶反饋

- **正面**: ...
- **負面**: ...
- **改進建議**: ...

#### 明日計劃

- [ ] ...
- [ ] ...

---

## ✅ 完成標準

### 技術完成標準

- [ ] 所有 P0 任務完成
- [ ] 所有 Critical 風險緩解
- [ ] 告警通知配置完成
- [ ] 團隊培訓完成
- [ ] 回滾流程測試通過

### 上線完成標準

- [ ] 運行 7 天無嚴重問題
- [ ] 可用性 > 99.5%
- [ ] 錯誤率 < 0.5%
- [ ] 用戶滿意度 > 4.0/5.0
- [ ] 無 Critical Bug

### 文檔完成標準

- [ ] 上線檢查清單完成
- [ ] 運營手冊完成
- [ ] 技術審查報告完成
- [ ] 每日報告記錄完整

---

## 📞 緊急聯絡

### 技術團隊

| 角色 | 姓名 | 電話 | Slack |
|------|------|------|-------|
| **Tech Lead** | _待填_ | _待填_ | @tech-lead |
| **Solution Architect** | _待填_ | _待填_ | @architect |
| **DevOps Lead** | _待填_ | _待填_ | @devops-lead |
| **Backend Lead** | _待填_ | _待填_ | @backend-lead |
| **On-call** | _輪班_ | _待填_ | @on-call |

### 聯絡方式

- **Slack**: #engineering, #alerts-production
- **緊急熱線**: _待填_
- **Zoom**: 上線作戰室（連結待分享）

---

## 📚 相關文檔

- [完整技術審查報告](./PRE_LAUNCH_TECHNICAL_REVIEW.md)
- [執行摘要](./EXECUTIVE_SUMMARY.md)
- [ADR-001: 上線前架構審查](./docs/architecture/ADR-001-Pre-Launch-Architecture-Review.md)
- [運營手冊](./docs/pm/OPERATIONS_MANUAL.md)
- [最終進度報告](./FINAL_PROGRESS_REPORT.md)

---

**檢查清單版本**: v1.0  
**最後更新**: 2026-02-17  
**下次更新**: 每日更新

---

**🎉 Let's Launch! 祝上線順利！**
