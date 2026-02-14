# Suggar Daddy 專案文件索引

> 最後更新: 2026-02-14

---

## 快速開始

新成員建議閱讀順序：

1. [README.md](../README.md) — 專案概況
2. [CLAUDE.md](../CLAUDE.md) — 開發環境與 AI 開發指南
3. [01-專案架構與設計.md](./01-專案架構與設計.md) — 系統架構設計
4. [02-開發指南.md](./02-開發指南.md) — API、JWT、Kafka 開發實務

---

## 架構與設計

| 文件 | 說明 |
|------|------|
| [01-專案架構與設計.md](./01-專案架構與設計.md) | 整體系統架構設計 |
| [專案功能分析.md](./專案功能分析.md) | 功能規格分析 |
| [ARCHITECTURE_HEALTH_SCORECARD.md](./ARCHITECTURE_HEALTH_SCORECARD.md) | 架構健康度評分卡 |
| [COMPETITOR_ANALYSIS.md](./COMPETITOR_ANALYSIS.md) | 競品分析 |
| [architecture/infrastructure.md](./architecture/infrastructure.md) | 基礎設施與優化指南（合併版） |

## API 與開發

| 文件 | 說明 |
|------|------|
| [02-開發指南.md](./02-開發指南.md) | API 文件、JWT 認證、Kafka 整合 |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | 後端實作指南 |
| [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) | 錯誤處理規範 |
| [swagger-templates.md](./swagger-templates.md) | Swagger 裝飾器範本 |
| [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) | OAuth 認證指南 |
| [STRIPE.md](./STRIPE.md) | Stripe 支付整合 |
| [ENV_VARS_DOCUMENTATION.md](./ENV_VARS_DOCUMENTATION.md) | 環境變數完整文件 |
| [DISTRIBUTED_TRACING.md](./DISTRIBUTED_TRACING.md) | 分散式追蹤設計 |
| [KAFKA_DLQ_GUIDE.md](./KAFKA_DLQ_GUIDE.md) | Kafka Dead Letter Queue 實作 |

### api/ 子目錄

| 文件 | 說明 |
|------|------|
| [api/README.md](./api/README.md) | API 文檔完整指南 |
| [api/API-IMPLEMENTATION-OVERVIEW.md](./api/API-IMPLEMENTATION-OVERVIEW.md) | API 實作狀態總覽 |
| [api/AUTH-API-GUIDE.md](./api/AUTH-API-GUIDE.md) | Auth API 完整指南 |

### development/ 子目錄

| 文件 | 說明 |
|------|------|
| [development/api-reference.md](./development/api-reference.md) | API 參考手冊（合併版） |

## 前端

| 文件 | 說明 |
|------|------|
| [FRONTEND_DEVELOPMENT_GUIDE.md](./FRONTEND_DEVELOPMENT_GUIDE.md) | 前端開發指南 |
| [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) | 前端應用深度分析 |
| [frontend-assessment-report.md](./frontend-assessment-report.md) | 前端功能完整性與 UX 評估 |
| [frontend-executive-summary.md](./frontend-executive-summary.md) | 前端評估執行摘要 |
| [ux-improvements.md](./ux-improvements.md) | UX 改善建議 |

## 資料庫與效能

| 文件 | 說明 |
|------|------|
| [03-資料庫遷移.md](./03-資料庫遷移.md) | 資料庫遷移指南 |
| [POSTGRESQL_HA.md](./POSTGRESQL_HA.md) | PostgreSQL 高可用部署 |
| [POSTGRESQL_HA_TEST_REPORT.md](./POSTGRESQL_HA_TEST_REPORT.md) | PostgreSQL HA 測試報告 |
| [REDIS_PERSISTENCE.md](./REDIS_PERSISTENCE.md) | Redis 持久化配置 |
| [REDIS_SENTINEL.md](./REDIS_SENTINEL.md) | Redis Sentinel 哨兵機制 |
| [REDIS_TTL_GUIDE.md](./REDIS_TTL_GUIDE.md) | Redis TTL 管理指南 |
| [N_PLUS_ONE_QUERY_FIX.md](./N_PLUS_ONE_QUERY_FIX.md) | N+1 查詢問題修復 |
| [TRANSACTION_SCAN_FIX.md](./TRANSACTION_SCAN_FIX.md) | 交易全表掃描修復 |
| [WALLET_RACE_CONDITION_FIX.md](./WALLET_RACE_CONDITION_FIX.md) | 錢包競態條件修復 |

### infrastructure/ 子目錄

| 文件 | 說明 |
|------|------|
| [infrastructure/README.md](./infrastructure/README.md) | 基礎設施完整指南 |
| [infrastructure/QUERY-OPTIMIZATION.md](./infrastructure/QUERY-OPTIMIZATION.md) | 查詢效能優化指南 |
| [infrastructure/POSTGRESQL-HA.md](./infrastructure/POSTGRESQL-HA.md) | PostgreSQL 高可用（整合版） |

## 測試

| 文件 | 說明 |
|------|------|
| [TESTING.md](./TESTING.md) | 測試覆蓋率總覽 |
| [TEST_BEST_PRACTICES.md](./TEST_BEST_PRACTICES.md) | 測試最佳實踐 |
| [TEST_ACTION_PLAN.md](./TEST_ACTION_PLAN.md) | 測試行動計劃 |
| [CONTROLLER_INTEGRATION_TESTING_GUIDE.md](./CONTROLLER_INTEGRATION_TESTING_GUIDE.md) | Controller 整合測試指南 |
| [FRONTEND_TESTING.md](./FRONTEND_TESTING.md) | 前端測試指南 |
| [FRONTEND_TESTING_QUICKSTART.md](./FRONTEND_TESTING_QUICKSTART.md) | 前端測試快速上手 |
| [FRONTEND_TEST_COMPLETION_REPORT.md](./FRONTEND_TEST_COMPLETION_REPORT.md) | 前端測試覆蓋率報告 |
| [frontend-test-priorities.md](./frontend-test-priorities.md) | 前端測試優先順序 |

### testing/ 子目錄

| 文件 | 說明 |
|------|------|
| [testing/README.md](./testing/README.md) | 測試文檔索引 |
| [testing/SUMMARY.md](./testing/SUMMARY.md) | 測試摘要 |
| [testing/TEST_COVERAGE_ASSESSMENT.md](./testing/TEST_COVERAGE_ASSESSMENT.md) | 測試覆蓋率評估 |
| [testing/PRE_LAUNCH_TEST_STRATEGY.md](./testing/PRE_LAUNCH_TEST_STRATEGY.md) | 上線前測試策略 |
| [testing/2_WEEK_SPRINT_ROADMAP.md](./testing/2_WEEK_SPRINT_ROADMAP.md) | 兩週衝刺測試路線圖 |
| [testing/QUICK_REFERENCE.md](./testing/QUICK_REFERENCE.md) | 測試快速參考 |
| [testing/E2E-TESTING-GUIDE.md](./testing/E2E-TESTING-GUIDE.md) | E2E 測試完整指南 |

## DevOps 與運維

| 文件 | 說明 |
|------|------|
| [04-運維與效能.md](./04-運維與效能.md) | 運維與效能優化 |
| [06-AWS-遷移規劃.md](./06-AWS-遷移規劃.md) | AWS 雲端遷移規劃 |
| [OPERATIONS-GUIDE.md](./OPERATIONS-GUIDE.md) | 營運指南 |
| [operations-manual.md](./operations-manual.md) | 操作手冊 |
| [disaster-recovery.md](./disaster-recovery.md) | 災難恢復計畫 |
| [MONITORING.md](./MONITORING.md) | 監控系統設計 |
| [METRICS_DASHBOARD.md](./METRICS_DASHBOARD.md) | 指標儀表板配置 |

### devops/ 子目錄

| 文件 | 說明 |
|------|------|
| [devops/README.md](./devops/README.md) | DevOps 完整指南（整合版） |
| [devops/DEVOPS_GUIDE.md](./devops/DEVOPS_GUIDE.md) | DevOps 指南 |
| [devops/DEVOPS_INFRASTRUCTURE_ASSESSMENT.md](./devops/DEVOPS_INFRASTRUCTURE_ASSESSMENT.md) | 基礎設施評估 |
| [devops/INFRASTRUCTURE_READINESS_SUMMARY.md](./devops/INFRASTRUCTURE_READINESS_SUMMARY.md) | 基礎設施準備度摘要 |
| [devops/ACTION_PLAN_CHECKLIST.md](./devops/ACTION_PLAN_CHECKLIST.md) | 行動計劃清單 |

### operations/ 子目錄

| 文件 | 說明 |
|------|------|
| [operations/BACKEND-HEALTH.md](./operations/BACKEND-HEALTH.md) | 後端服務健康度評估 |

## 上線準備與風險

| 文件 | 說明 |
|------|------|
| [PRODUCTION_READINESS_ASSESSMENT.md](./PRODUCTION_READINESS_ASSESSMENT.md) | 上線準備狀態完整評估 |
| [PRODUCTION_READINESS_SUMMARY.md](./PRODUCTION_READINESS_SUMMARY.md) | 上線準備執行摘要 |
| [GO-LIVE-READINESS-ASSESSMENT.md](./GO-LIVE-READINESS-ASSESSMENT.md) | 上線就緒評估報告 |
| [P0_CRITICAL_ISSUES.md](./P0_CRITICAL_ISSUES.md) | P0 關鍵問題追蹤 |
| [RISK_MANAGEMENT.md](./RISK_MANAGEMENT.md) | 風險管理計畫 |
| [TECHNICAL-DEBT.md](./TECHNICAL-DEBT.md) | 技術債務追蹤 |
| [TECH_DEBT_INDEX.md](./TECH_DEBT_INDEX.md) | 技術債務文檔索引 |

## 團隊與流程

| 文件 | 說明 |
|------|------|
| [TEAM-WORKFLOW.md](./TEAM-WORKFLOW.md) | 團隊工作流程 |

### sprints/ 子目錄

| 文件 | 說明 |
|------|------|
| [sprints/SPRINT_2026_FEB_W3.md](./sprints/SPRINT_2026_FEB_W3.md) | 2026 二月第三週衝刺 |
| [sprints/SPRINT_2026_FEB_W4.md](./sprints/SPRINT_2026_FEB_W4.md) | 2026 二月第四週衝刺 |

## archive/ — 歸檔文件

已被整合或過時的文件，保留供參考。

| 文件 | 說明 |
|------|------|
| [archive/API-DOCUMENTATION-PHASE1-SUMMARY.md](./archive/API-DOCUMENTATION-PHASE1-SUMMARY.md) | API 文檔第一階段摘要 |
| [archive/api-documentation-report.md](./archive/api-documentation-report.md) | API 文檔報告 |
| [archive/DEVOPS_ASSESSMENT.md](./archive/DEVOPS_ASSESSMENT.md) | DevOps 評估（已整合至 devops/） |
| [archive/DEVOPS_QUICKSTART.md](./archive/DEVOPS_QUICKSTART.md) | DevOps 快速入門（已整合） |
| [archive/DEVOPS_README.md](./archive/DEVOPS_README.md) | DevOps 說明（已整合） |
| [archive/DEVOPS_SUMMARY.md](./archive/DEVOPS_SUMMARY.md) | DevOps 摘要（已整合） |
| [archive/DOCUMENTATION-REORGANIZATION-PLAN.md](./archive/DOCUMENTATION-REORGANIZATION-PLAN.md) | 文件重組計畫 |
| [archive/INFRASTRUCTURE-DIAGRAM.md](./archive/INFRASTRUCTURE-DIAGRAM.md) | 基礎設施架構圖（已整合） |
| [archive/INFRASTRUCTURE-OPTIMIZATION-GUIDE.md](./archive/INFRASTRUCTURE-OPTIMIZATION-GUIDE.md) | 基礎設施優化指南（已整合） |
| [archive/INFRASTRUCTURE-OPTIMIZATION-INDEX.md](./archive/INFRASTRUCTURE-OPTIMIZATION-INDEX.md) | 基礎設施優化索引（已整合） |
| [archive/INFRASTRUCTURE-OPTIMIZATION-SUMMARY.md](./archive/INFRASTRUCTURE-OPTIMIZATION-SUMMARY.md) | 基礎設施優化摘要（已整合） |
| [archive/INFRASTRUCTURE-QUICKREF.md](./archive/INFRASTRUCTURE-QUICKREF.md) | 基礎設施快速參考（已整合） |
| [archive/STAGE2-COMPLETION-SUMMARY.md](./archive/STAGE2-COMPLETION-SUMMARY.md) | 第二階段完成摘要 |
| [archive/STAGE2-DOCUMENTATION-INDEX.md](./archive/STAGE2-DOCUMENTATION-INDEX.md) | 第二階段文檔索引 |
| [archive/STAGE2-QUICKSTART.md](./archive/STAGE2-QUICKSTART.md) | 第二階段快速入門 |
| [archive/TEST-STRATEGY-SUMMARY.md](./archive/TEST-STRATEGY-SUMMARY.md) | 測試策略摘要（已整合） |
| [archive/infrastructure-health-report.md](./archive/infrastructure-health-report.md) | 基礎設施健康報告（已整合） |
| [archive/test-coverage-analysis.md](./archive/test-coverage-analysis.md) | 測試覆蓋率分析（已整合） |

---

## 目錄結構

```
docs/
  api/              — API 文檔與實作指南
  architecture/     — 系統架構與基礎設施設計
  archive/          — 歸檔文件（已整合或過時）
  development/      — 開發參考手冊
  devops/           — DevOps 與 CI/CD 指南
  infrastructure/   — 基礎設施與資料庫指南
  operations/       — 營運與服務健康度
  sprints/          — 衝刺計畫紀錄
  testing/          — 測試策略與覆蓋率文件
```

---

文件維護者: 開發團隊 | 最後更新: 2026-02-14
