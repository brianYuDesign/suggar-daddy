# Suggar Daddy 專案文件索引

> 最後更新: 2026-02-15

---

## 快速開始

新成員建議閱讀順序：

1. [README.md](../README.md) — 專案概況
2. [CLAUDE.md](../CLAUDE.md) — 開發環境與 AI 開發指南
3. [architecture/01-專案架構與設計.md](./architecture/01-專案架構與設計.md) — 系統架構設計
4. [02-開發指南.md](./02-開發指南.md) — API、JWT、Kafka 開發實務

---

## 架構與設計 (`architecture/`)

| 文件 | 說明 |
|------|------|
| [01-專案架構與設計.md](./architecture/01-專案架構與設計.md) | 整體系統架構設計 |
| [專案功能分析.md](./architecture/專案功能分析.md) | 功能規格分析 |
| [ARCHITECTURE_HEALTH_SCORECARD.md](./architecture/ARCHITECTURE_HEALTH_SCORECARD.md) | 架構健康度評分卡 |
| [infrastructure.md](./architecture/infrastructure.md) | 基礎設施與優化指南（合併版） |

## API 文檔 (`api/`)

| 文件 | 說明 |
|------|------|
| [README.md](./api/README.md) | API 文檔完整指南 |
| [API-IMPLEMENTATION-OVERVIEW.md](./api/API-IMPLEMENTATION-OVERVIEW.md) | API 實作狀態總覽 |
| [AUTH-API-GUIDE.md](./api/AUTH-API-GUIDE.md) | Auth API 完整指南 |
| [SERVICE-API-REFERENCE.md](./api/SERVICE-API-REFERENCE.md) | Service API 參考 |

## 開發指南 (`development/`)

| 文件 | 說明 |
|------|------|
| [02-開發指南.md](./02-開發指南.md) | API 文件、JWT 認證、Kafka 整合 |
| [api-reference.md](./development/api-reference.md) | API 參考手冊（合併版） |
| [IMPLEMENTATION_GUIDE.md](./development/IMPLEMENTATION_GUIDE.md) | 後端實作指南 |
| [ERROR_HANDLING_GUIDE.md](./development/ERROR_HANDLING_GUIDE.md) | 錯誤處理規範 |
| [swagger-templates.md](./development/swagger-templates.md) | Swagger 裝飾器範本 |
| [OAUTH_GUIDE.md](./development/OAUTH_GUIDE.md) | OAuth 認證指南 |
| [STRIPE.md](./development/STRIPE.md) | Stripe 支付整合 |
| [KAFKA_DLQ_GUIDE.md](./development/KAFKA_DLQ_GUIDE.md) | Kafka Dead Letter Queue 實作 |
| [GIT-WORKFLOW.md](./development/GIT-WORKFLOW.md) | Git 工作流程 |
| [N_PLUS_ONE_QUERY_FIX.md](./development/N_PLUS_ONE_QUERY_FIX.md) | N+1 查詢問題修復 |
| [TRANSACTION_SCAN_FIX.md](./development/TRANSACTION_SCAN_FIX.md) | 交易全表掃描修復 |
| [WALLET_RACE_CONDITION_FIX.md](./development/WALLET_RACE_CONDITION_FIX.md) | 錢包競態條件修復 |

## 前端 (`frontend/`)

| 文件 | 說明 |
|------|------|
| [FRONTEND_DEVELOPMENT_GUIDE.md](./frontend/FRONTEND_DEVELOPMENT_GUIDE.md) | 前端開發指南 |
| [FRONTEND_ANALYSIS.md](./frontend/FRONTEND_ANALYSIS.md) | 前端應用深度分析 |
| [frontend-assessment-report.md](./frontend/frontend-assessment-report.md) | 前端功能完整性與 UX 評估 |
| [frontend-executive-summary.md](./frontend/frontend-executive-summary.md) | 前端評估執行摘要 |
| [frontend-test-priorities.md](./frontend/frontend-test-priorities.md) | 前端測試優先順序 |
| [ux-improvements.md](./frontend/ux-improvements.md) | UX 改善建議 |

## 基礎設施 (`infrastructure/`)

| 文件 | 說明 |
|------|------|
| [README.md](./infrastructure/README.md) | 基礎設施完整指南 |
| [POSTGRESQL-HA.md](./infrastructure/POSTGRESQL-HA.md) | PostgreSQL 高可用（整合版） |
| [POSTGRESQL_HA.md](./infrastructure/POSTGRESQL_HA.md) | PostgreSQL 高可用部署 |
| [POSTGRESQL_HA_TEST_REPORT.md](./infrastructure/POSTGRESQL_HA_TEST_REPORT.md) | PostgreSQL HA 測試報告 |
| [QUERY-OPTIMIZATION.md](./infrastructure/QUERY-OPTIMIZATION.md) | 查詢效能優化指南 |
| [REDIS-GUIDE.md](./infrastructure/REDIS-GUIDE.md) | Redis 使用指南 |
| [REDIS_PERSISTENCE.md](./infrastructure/REDIS_PERSISTENCE.md) | Redis 持久化配置 |
| [REDIS_SENTINEL.md](./infrastructure/REDIS_SENTINEL.md) | Redis Sentinel 哨兵機制 |
| [REDIS_TTL_GUIDE.md](./infrastructure/REDIS_TTL_GUIDE.md) | Redis TTL 管理指南 |
| [DISTRIBUTED_TRACING.md](./infrastructure/DISTRIBUTED_TRACING.md) | 分散式追蹤設計 |
| [OPENTELEMETRY_SETUP.md](./infrastructure/OPENTELEMETRY_SETUP.md) | OpenTelemetry 設定指南 |
| [DOCKER_DISK_OPTIMIZATION.md](./infrastructure/DOCKER_DISK_OPTIMIZATION.md) | Docker 磁碟優化 |
| [ENV_VARS_DOCUMENTATION.md](./infrastructure/ENV_VARS_DOCUMENTATION.md) | 環境變數完整文件 |
| [disaster-recovery.md](./infrastructure/disaster-recovery.md) | 災難恢復計畫 |

## 測試 (`testing/`)

| 文件 | 說明 |
|------|------|
| [README.md](./testing/README.md) | 測試文檔索引 |
| [TESTING.md](./testing/TESTING.md) | 測試覆蓋率總覽 |
| [TEST_BEST_PRACTICES.md](./testing/TEST_BEST_PRACTICES.md) | 測試最佳實踐 |
| [TEST_ACTION_PLAN.md](./testing/TEST_ACTION_PLAN.md) | 測試行動計劃 |
| [CONTROLLER_INTEGRATION_TESTING_GUIDE.md](./testing/CONTROLLER_INTEGRATION_TESTING_GUIDE.md) | Controller 整合測試指南 |
| [E2E_TESTING_GUIDE.md](./testing/E2E_TESTING_GUIDE.md) | E2E 測試指南 |
| [E2E-TESTING-GUIDE.md](./testing/E2E-TESTING-GUIDE.md) | E2E 測試完整指南 |
| [FRONTEND_TESTING.md](./testing/FRONTEND_TESTING.md) | 前端測試指南 |
| [FRONTEND_TESTING_QUICKSTART.md](./testing/FRONTEND_TESTING_QUICKSTART.md) | 前端測試快速上手 |
| [FRONTEND_TEST_COMPLETION_REPORT.md](./testing/FRONTEND_TEST_COMPLETION_REPORT.md) | 前端測試覆蓋率報告 |
| [SUMMARY.md](./testing/SUMMARY.md) | 測試摘要 |
| [TEST_COVERAGE_ASSESSMENT.md](./testing/TEST_COVERAGE_ASSESSMENT.md) | 測試覆蓋率評估 |
| [PRE_LAUNCH_TEST_STRATEGY.md](./testing/PRE_LAUNCH_TEST_STRATEGY.md) | 上線前測試策略 |
| [2_WEEK_SPRINT_ROADMAP.md](./testing/2_WEEK_SPRINT_ROADMAP.md) | 兩週衝刺測試路線圖 |
| [QUICK_REFERENCE.md](./testing/QUICK_REFERENCE.md) | 測試快速參考 |

## 運維與 DevOps

### 運維 (`operations/`)

| 文件 | 說明 |
|------|------|
| [04-運維與效能.md](./04-運維與效能.md) | 運維與效能優化 |
| [OPERATIONS-GUIDE.md](./operations/OPERATIONS-GUIDE.md) | 營運指南 |
| [operations-manual.md](./operations/operations-manual.md) | 操作手冊 |
| [MONITORING.md](./operations/MONITORING.md) | 監控系統設計 |
| [MONITORING-GUIDE.md](./operations/MONITORING-GUIDE.md) | 監控指南 |
| [METRICS_DASHBOARD.md](./operations/METRICS_DASHBOARD.md) | 指標儀表板配置 |
| [BACKEND-HEALTH.md](./operations/BACKEND-HEALTH.md) | 後端服務健康度評估 |
| [LAUNCH-READINESS.md](./operations/LAUNCH-READINESS.md) | 上線準備度 |

### DevOps (`devops/`)

| 文件 | 說明 |
|------|------|
| [README.md](./devops/README.md) | DevOps 完整指南（整合版） |
| [DEVOPS_GUIDE.md](./devops/DEVOPS_GUIDE.md) | DevOps 指南 |
| [DEVOPS_INFRASTRUCTURE_ASSESSMENT.md](./devops/DEVOPS_INFRASTRUCTURE_ASSESSMENT.md) | 基礎設施評估 |
| [INFRASTRUCTURE_READINESS_SUMMARY.md](./devops/INFRASTRUCTURE_READINESS_SUMMARY.md) | 基礎設施準備度摘要 |
| [ACTION_PLAN_CHECKLIST.md](./devops/ACTION_PLAN_CHECKLIST.md) | 行動計劃清單 |
| [RISK_MANAGEMENT.md](./devops/RISK_MANAGEMENT.md) | 風險管理計畫 |
| [TEAM-WORKFLOW.md](./devops/TEAM-WORKFLOW.md) | 團隊工作流程 |
| [TECHNICAL-DEBT.md](./devops/TECHNICAL-DEBT.md) | 技術債務追蹤 |
| [TECH_DEBT_INDEX.md](./devops/TECH_DEBT_INDEX.md) | 技術債務文檔索引 |

### 雲端遷移

| 文件 | 說明 |
|------|------|
| [06-AWS-遷移規劃.md](./06-AWS-遷移規劃.md) | AWS 雲端遷移規劃 |

## 衝刺紀錄 (`sprints/`)

| 文件 | 說明 |
|------|------|
| [SPRINT_2026_FEB_W3.md](./sprints/SPRINT_2026_FEB_W3.md) | 2026 二月第三週衝刺 |
| [SPRINT_2026_FEB_W4.md](./sprints/SPRINT_2026_FEB_W4.md) | 2026 二月第四週衝刺 |
| [2026-02-14-SPRINT-REPORT.md](./sprints/2026-02-14-SPRINT-REPORT.md) | 2026-02-14 衝刺報告 |

## 歸檔 (`archive/`)

已被整合或過時的文件，保留供參考。

| 文件 | 說明 |
|------|------|
| [ADMIN_ROUTING_FIX.md](./archive/ADMIN_ROUTING_FIX.md) | Admin 路由修復 |
| [COMPETITOR_ANALYSIS.md](./archive/COMPETITOR_ANALYSIS.md) | 競品分析 |
| [GO-LIVE-READINESS-ASSESSMENT.md](./archive/GO-LIVE-READINESS-ASSESSMENT.md) | 上線就緒評估 |
| [P0_CRITICAL_ISSUES.md](./archive/P0_CRITICAL_ISSUES.md) | P0 關鍵問題追蹤 |
| [PRODUCTION_READINESS_ASSESSMENT.md](./archive/PRODUCTION_READINESS_ASSESSMENT.md) | 上線準備狀態評估 |
| [PRODUCTION_READINESS_SUMMARY.md](./archive/PRODUCTION_READINESS_SUMMARY.md) | 上線準備執行摘要 |
| [API-DOCUMENTATION-PHASE1-SUMMARY.md](./archive/API-DOCUMENTATION-PHASE1-SUMMARY.md) | API 文檔第一階段摘要 |
| [api-documentation-report.md](./archive/api-documentation-report.md) | API 文檔報告 |
| [DEVOPS_ASSESSMENT.md](./archive/DEVOPS_ASSESSMENT.md) | DevOps 評估 |
| [DEVOPS_QUICKSTART.md](./archive/DEVOPS_QUICKSTART.md) | DevOps 快速入門 |
| [DEVOPS_README.md](./archive/DEVOPS_README.md) | DevOps 說明 |
| [DEVOPS_SUMMARY.md](./archive/DEVOPS_SUMMARY.md) | DevOps 摘要 |
| [DOCUMENTATION-REORGANIZATION-PLAN.md](./archive/DOCUMENTATION-REORGANIZATION-PLAN.md) | 文件重組計畫 |
| [INFRASTRUCTURE-*.md](./archive/) | 基礎設施相關（已整合） |
| [STAGE2-*.md](./archive/) | 第二階段相關 |
| [TASK_2_COMPLETION_REPORT.md](./archive/TASK_2_COMPLETION_REPORT.md) | 任務 2 完成報告 |
| [TEST-STRATEGY-SUMMARY.md](./archive/TEST-STRATEGY-SUMMARY.md) | 測試策略摘要 |

---

## 目錄結構

```
docs/
  api/              — API 文檔與實作指南
  architecture/     — 系統架構與設計
  archive/          — 歸檔文件（已整合或過時）
  development/      — 開發參考與修復紀錄
  devops/           — DevOps 與 CI/CD 指南
  frontend/         — 前端開發與評估
  infrastructure/   — 基礎設施與資料庫指南
  operations/       — 營運、監控與服務健康度
  sprints/          — 衝刺計畫紀錄
  testing/          — 測試策略與覆蓋率文件
```

---

文件維護者: 開發團隊 | 最後更新: 2026-02-15
