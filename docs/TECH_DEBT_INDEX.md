# 技術債務管理 - 文檔索引

**版本**: 1.0  
**最後更新**: 2026-02-14  
**維護者**: Tech Lead

---

## 📚 快速導航

### 🎯 開始這裡（必讀）

如果你是第一次接觸這個計劃，請按以下順序閱讀：

1. **[團隊啟動郵件](./TEAM_KICKOFF_EMAIL.md)** ⭐⭐⭐
   - 計劃概述
   - 本週目標
   - 你的任務
   - 溝通機制

2. **[本週 Sprint 計劃](./SPRINT_2026_FEB_W3.md)** ⭐⭐⭐
   - 詳細任務說明
   - 時間規劃
   - 成功指標
   - 風險管理

3. **[技術債務追踪](./TECHNICAL-DEBT.md)** ⭐⭐
   - 所有 23 個技術債務
   - 優先級和影響
   - 實施計劃

---

## 📋 文檔分類

### 計劃和追踪

| 文檔 | 用途 | 受眾 | 更新頻率 |
|------|------|------|----------|
| [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) | 本週任務詳情 | 所有人 | 每日更新進度 |
| [Sprint W4 計劃](./SPRINT_2026_FEB_W4.md) | 下週計劃預覽 | 所有人 | 每週更新 |
| [技術債務追踪](./TECHNICAL-DEBT.md) | 所有技術債務清單 | Tech Lead, Architect | 每週更新 |
| [每日站會記錄](./DAILY_STANDUP_LOG.md) | 每日進度和阻礙 | 所有人 | 每日更新 |

---

### 指標和報告

| 文檔 | 用途 | 受眾 | 更新頻率 |
|------|------|------|----------|
| [績效指標面板](./METRICS_DASHBOARD.md) | 所有關鍵指標 | Tech Lead, 管理層 | 每週更新 |
| [週報模板](./WEEKLY_REPORT_TEMPLATE.md) | 週報格式 | Tech Lead | 每週五填寫 |
| [Q1 最終報告計劃](./TECH_DEBT_PAYOFF_REPORT_2026Q1_PLAN.md) | Q1 報告框架 | Tech Lead, 管理層 | Q1 結束填寫 |
| [進度報告](./PROGRESS_REPORT.md) | 專案整體進度 | 所有人 | 階段性更新 |

---

### 溝通和協調

| 文檔 | 用途 | 受眾 | 更新頻率 |
|------|------|------|----------|
| [團隊啟動郵件](./TEAM_KICKOFF_EMAIL.md) | Sprint 啟動郵件 | 所有人 | 每 Sprint 開始 |
| [每日站會記錄](./DAILY_STANDUP_LOG.md) | 每日同步 | 所有人 | 每日 |
| [Tech Lead 工作總結](./TECH_LEAD_WORK_SUMMARY.md) | Tech Lead 工作報告 | 管理層 | 階段性 |

---

### 參考和標準

| 文檔 | 用途 | 受眾 | 更新頻率 |
|------|------|------|----------|
| [代碼審查清單](./CODE-REVIEW-CHECKLIST.md) | Code Review 標準 | 所有開發者 | 不定期 |
| [運維指南](./OPERATIONS-GUIDE.md) | 運維操作手冊 | DevOps | 不定期 |
| [錯誤處理指南](./ERROR_HANDLING_GUIDE.md) | 錯誤處理標準 | Backend Developer | 不定期 |
| [執行總結](./EXECUTION-SUMMARY-2026-02.md) | 階段性總結報告 | 所有人 | 階段性 |

---

## 👥 按角色導航

### DevOps Engineer

**本週必讀**:
1. [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) - P0-004, P0-002, P0-003, P0-001 部分
2. [技術債務追踪](./TECHNICAL-DEBT.md) - P0 部分
3. [運維指南](./OPERATIONS-GUIDE.md)

**本週任務**:
- P0-004: 監控系統（Day 1-2）
- P0-002: PostgreSQL HA（Day 3-5）
- P0-003: Redis Sentinel（Day 3-5）
- P0-001: Jaeger（Day 6-7 或下週）

---

### Frontend Developer

**本週必讀**:
1. [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) - P0-005 部分
2. [技術債務追踪](./TECHNICAL-DEBT.md) - P0-005 部分

**本週任務**:
- P0-005: 前端測試覆蓋率（Web 50%, Admin 55%）

---

### QA Engineer

**本週必讀**:
1. [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) - E2E 測試改進部分
2. [測試最佳實踐](./TEST_BEST_PRACTICES.md)

**本週任務**:
- E2E 測試改進（91% → 95%+）
- 協助 Frontend 測試策略設計

---

### Solution Architect

**本週必讀**:
1. [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) - 架構審查部分
2. [技術債務追踪](./TECHNICAL-DEBT.md) - 所有 P1, P2 部分

**本週任務**:
- 架構審查報告（微服務、數據、安全、性能、擴展性）

---

### Tech Lead

**本週工作**:
1. 每日 Daily Standup（10:00）
2. 監控所有任務進度
3. 識別和處理阻礙
4. 更新 [每日站會記錄](./DAILY_STANDUP_LOG.md)
5. 週五撰寫週報

---

## 📅 按時間導航

### 每日

- **10:00**: Daily Standup
- **EOD**: 更新 [每日站會記錄](./DAILY_STANDUP_LOG.md)
- **隨時**: 在 Slack `#tech-debt-payoff` 溝通

---

### 每週

- **週一**: 查看 [Sprint 計劃](./SPRINT_2026_FEB_W3.md)，確認本週任務
- **週三**: 技術分享（本週：監控系統使用培訓）
- **週五 16:00**: Sprint Review（回顧本週）
- **週五 17:00**: 發送週報（使用 [週報模板](./WEEKLY_REPORT_TEMPLATE.md)）

---

### 每月

- **月初**: 技術債務審查會議
- **月末**: 更新 [技術債務追踪](./TECHNICAL-DEBT.md)

---

### 每季

- **季末**: Q1 最終報告（使用 [Q1 報告計劃](./TECH_DEBT_PAYOFF_REPORT_2026Q1_PLAN.md)）

---

## 🎯 按任務類型導航

### P0 Critical 項目

- [P0-001: Jaeger 分散式追蹤](./TECHNICAL-DEBT.md#p0-001-無分散式追蹤系統)
- [P0-002: PostgreSQL HA](./TECHNICAL-DEBT.md#p0-002-postgresql-無高可用性)
- [P0-003: Redis Sentinel](./TECHNICAL-DEBT.md#p0-003-redis-無高可用性)
- [P0-004: 監控系統](./TECHNICAL-DEBT.md#p0-004-無監控與告警系統)
- [P0-005: 前端測試](./TECHNICAL-DEBT.md#p0-005-前端測試覆蓋率不足)

---

### P1 High 項目

- [P1-001: ELK 日誌聚合](./TECHNICAL-DEBT.md#p1-001-無日誌聚合系統)
- [P1-002: 服務網格](./TECHNICAL-DEBT.md#p1-002-無服務網格service-mesh)
- [P1-003: Saga 模式](./TECHNICAL-DEBT.md#p1-003-無跨服務交易機制saga)
- [P1-004: CI/CD](./TECHNICAL-DEBT.md#p1-004-無自動化部署cicd)
- [P1-005: 安全掃描](./TECHNICAL-DEBT.md#p1-005-無安全性掃描)

---

## 📊 按類型導航

### 基礎設施類

- [監控系統 (P0-004)](./TECHNICAL-DEBT.md#p0-004-無監控與告警系統)
- [PostgreSQL HA (P0-002)](./TECHNICAL-DEBT.md#p0-002-postgresql-無高可用性)
- [Redis Sentinel (P0-003)](./TECHNICAL-DEBT.md#p0-003-redis-無高可用性)
- [日誌聚合 (P1-001)](./TECHNICAL-DEBT.md#p1-001-無日誌聚合系統)
- [CI/CD (P1-004)](./TECHNICAL-DEBT.md#p1-004-無自動化部署cicd)

---

### 架構類

- [分散式追蹤 (P0-001)](./TECHNICAL-DEBT.md#p0-001-無分散式追蹤系統)
- [服務網格 (P1-002)](./TECHNICAL-DEBT.md#p1-002-無服務網格service-mesh)
- [Saga 模式 (P1-003)](./TECHNICAL-DEBT.md#p1-003-無跨服務交易機制saga)

---

### 測試類

- [前端測試 (P0-005)](./TECHNICAL-DEBT.md#p0-005-前端測試覆蓋率不足)
- [E2E 測試改進](./SPRINT_2026_FEB_W3.md#e2e-測試改進qa-engineer)

---

### 安全類

- [安全掃描 (P1-005)](./TECHNICAL-DEBT.md#p1-005-無安全性掃描)

---

## 🔍 搜索指南

### 如何快速找到信息？

#### 找本週任務
→ [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md)

#### 找技術債務詳情
→ [技術債務追踪](./TECHNICAL-DEBT.md)

#### 找指標和數據
→ [績效指標面板](./METRICS_DASHBOARD.md)

#### 找每日進度
→ [每日站會記錄](./DAILY_STANDUP_LOG.md)

#### 找週報格式
→ [週報模板](./WEEKLY_REPORT_TEMPLATE.md)

#### 找溝通方式
→ [團隊啟動郵件](./TEAM_KICKOFF_EMAIL.md) - 溝通渠道部分

#### 找風險和問題
→ [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) - 風險管理部分

---

## 📞 聯絡和支援

### 緊急聯絡

- **Slack 頻道**: `#tech-debt-payoff`
- **Tech Lead**: @tech-lead
- **工作時間**: 週一~週五 9:00-18:00

---

### 常見問題

**Q: 我的任務是什麼？**  
A: 查看 [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) 你的角色部分

**Q: 今天的 Daily Standup 在哪裡？**  
A: Slack `#tech-debt-payoff` 頻道，每天上午 10:00

**Q: 如何更新進度？**  
A: 每天在 [每日站會記錄](./DAILY_STANDUP_LOG.md) 填寫

**Q: 遇到阻礙怎麼辦？**  
A: 立即在 Slack 頻道提出，或 @tech-lead

**Q: 如何撰寫週報？**  
A: 使用 [週報模板](./WEEKLY_REPORT_TEMPLATE.md)

**Q: 技術債務的優先級如何判斷？**  
A: 查看 [技術債務追踪](./TECHNICAL-DEBT.md) - 優先級評估標準部分

---

## 🎓 學習資源

### 技術分享

**本週（W3）**: 監控系統使用培訓
- **時間**: 週三 15:00
- **主題**: Prometheus + Grafana 使用
- **分享人**: DevOps Engineer

**下週（W4）**: 分散式追蹤最佳實踐
- **時間**: 週三 15:00
- **主題**: Jaeger + OpenTelemetry
- **分享人**: DevOps Engineer

---

### 相關文檔

- [錯誤處理指南](./ERROR_HANDLING_GUIDE.md)
- [測試最佳實踐](./TEST_BEST_PRACTICES.md)
- [代碼審查清單](./CODE-REVIEW-CHECKLIST.md)
- [運維指南](./OPERATIONS-GUIDE.md)

---

## 📈 版本歷史

### v1.0 (2026-02-14)

- ✅ 創建索引文檔
- ✅ 分類所有技術債務文檔
- ✅ 建立快速導航體系
- ✅ 添加角色和時間導航

---

## 🔄 文檔維護

### 更新規則

- **每日**: 更新 `DAILY_STANDUP_LOG.md`
- **每週**: 更新 Sprint 計劃進度
- **每月**: 更新 `TECHNICAL-DEBT.md` 狀態
- **階段性**: 更新 `PROGRESS_REPORT.md`

---

### 新增文檔

如果創建了新的文檔，請：
1. 添加到對應分類
2. 更新此索引文檔
3. 在 Slack 頻道通知團隊

---

**文檔結束**

*這是你的導航地圖。善用它，保持高效！* 🗺️

---

## 快速行動（今天就做）

- [ ] 閱讀 [團隊啟動郵件](./TEAM_KICKOFF_EMAIL.md)
- [ ] 查看 [Sprint W3 計劃](./SPRINT_2026_FEB_W3.md) 你的任務
- [ ] 加入 Slack `#tech-debt-payoff` 頻道
- [ ] 確認明天 10:00 Daily Standup
- [ ] 準備開始你的第一個任務！

🚀 **讓我們開始吧！**
