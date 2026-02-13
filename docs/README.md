# Suggar Daddy 專案文件

## 📚 文件導覽

### 核心文件（根目錄）
- [README.md](../README.md) - 專案主要說明
- [CLAUDE.md](../CLAUDE.md) - Claude AI 開發指南

### 專案架構
- [01-專案架構與設計.md](./01-專案架構與設計.md) - 整體架構設計
- [02-開發指南.md](./02-開發指南.md) - 開發實務指南
- [專案功能分析.md](./專案功能分析.md) - 功能規格分析
- [BUSINESS_LOGIC_GAPS.md](./BUSINESS_LOGIC_GAPS.md) - 業務邏輯缺口分析

### 前端開發
- [FRONTEND_DEVELOPMENT_GUIDE.md](./FRONTEND_DEVELOPMENT_GUIDE.md) - 前端開發指南
- [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) - 前端架構分析

### 後端開發
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - 後端實作指南
- [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) - 錯誤處理指南

### 資料庫與資料一致性
- [03-資料庫遷移.md](./03-資料庫遷移.md) - 資料庫遷移指南
- [REDIS_DB_CONSISTENCY_GUIDE.md](./REDIS_DB_CONSISTENCY_GUIDE.md) - Redis/DB 一致性指南
- [REDIS_CONSISTENCY_README.md](./REDIS_CONSISTENCY_README.md) - Redis 一致性說明
- [REDIS_CONSISTENCY_INTEGRATION_EXAMPLE.md](./REDIS_CONSISTENCY_INTEGRATION_EXAMPLE.md) - 一致性整合範例
- [WALLET_RACE_CONDITION_FIX.md](./WALLET_RACE_CONDITION_FIX.md) - 錢包競態條件修復
- [N_PLUS_ONE_QUERY_FIX.md](./N_PLUS_ONE_QUERY_FIX.md) - N+1 查詢優化
- [TRANSACTION_SCAN_FIX.md](./TRANSACTION_SCAN_FIX.md) - 交易掃描修復

### 整合服務
- [STRIPE.md](./STRIPE.md) - Stripe 基礎整合
- [STRIPE_CONNECT_GUIDE.md](./STRIPE_CONNECT_GUIDE.md) - Stripe Connect 完整指南
- [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) - OAuth 認證指南
- [KAFKA_DLQ_GUIDE.md](./KAFKA_DLQ_GUIDE.md) - Kafka DLQ 實作指南

### 測試策略 ⭐
- [testing/TEST_STRATEGY_SUMMARY.md](./testing/TEST_STRATEGY_SUMMARY.md) - 測試策略摘要
- [testing/TEST_COVERAGE_ANALYSIS.md](./testing/TEST_COVERAGE_ANALYSIS.md) - 測試覆蓋率分析
- [TESTING.md](./TESTING.md) - 測試規範
- [TEST_BEST_PRACTICES.md](./TEST_BEST_PRACTICES.md) - 測試最佳實踐
- [TEST_ACTION_PLAN.md](./TEST_ACTION_PLAN.md) - 測試行動計劃
- [CONTROLLER_INTEGRATION_TESTING_GUIDE.md](./CONTROLLER_INTEGRATION_TESTING_GUIDE.md) - Controller 測試指南
- [QA_TEST_ASSESSMENT.md](./QA_TEST_ASSESSMENT.md) - QA 測試評估

### DevOps & 部署 ⭐
- [devops/DEVOPS_GUIDE.md](./devops/DEVOPS_GUIDE.md) - DevOps 完整指南（整合版）
- [04-運維與效能.md](./04-運維與效能.md) - 運維與效能優化
- [06-AWS-遷移規劃.md](./06-AWS-遷移規劃.md) - AWS 遷移規劃
- [ENVIRONMENT_SETUP_SUMMARY.md](./ENVIRONMENT_SETUP_SUMMARY.md) - 環境設置摘要
- [ENV_VARS_DOCUMENTATION.md](./ENV_VARS_DOCUMENTATION.md) - 環境變數文件

### 工作流程與報告
- [workflows/](./workflows/) - 工作流程文件
- [PROGRESS_REPORT.md](./PROGRESS_REPORT.md) - 進度報告
- [COMPETITOR_ANALYSIS.md](./COMPETITOR_ANALYSIS.md) - 競爭對手分析

---

## 🗂️ 文件分類速查

### 🚀 快速開始
新團隊成員建議閱讀順序：
1. [README.md](../README.md) - 了解專案概況
2. [CLAUDE.md](../CLAUDE.md) - 設置開發環境
3. [01-專案架構與設計.md](./01-專案架構與設計.md) - 理解架構
4. [02-開發指南.md](./02-開發指南.md) - 開始開發

### 🎯 按角色分類

#### 前端工程師
- FRONTEND_DEVELOPMENT_GUIDE.md
- FRONTEND_ANALYSIS.md
- OAUTH_GUIDE.md

#### 後端工程師
- 02-開發指南.md
- IMPLEMENTATION_GUIDE.md
- ERROR_HANDLING_GUIDE.md
- KAFKA_DLQ_GUIDE.md

#### DevOps 工程師
- devops/ 目錄下的所有文件
- 04-運維與效能.md
- 06-AWS-遷移規劃.md

#### QA 工程師
- testing/ 目錄下的所有文件
- TEST_BEST_PRACTICES.md

---

## 📝 文件維護

- 文件最後更新: 2026-02-13
- 維護者: 開發團隊
- 貢獻指南: 請保持文件與代碼同步更新
