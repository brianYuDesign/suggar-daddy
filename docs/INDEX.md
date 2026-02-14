# Sugar Daddy 專案文檔中心

> **統一文檔入口 - 快速找到您需要的所有文檔**

---

## 📚 文檔導航

### 🚀 快速開始

| 文檔 | 描述 | 適合人員 |
|------|------|---------|
| [README.md](../README.md) | 專案概覽與快速開始 | 所有人 |
| [DevOps 快速開始](./devops/README.md#快速開始) | CI/CD 和基礎設施設置 | DevOps 工程師 |
| [基礎設施快速開始](./infrastructure/README.md#快速開始) | Docker、資料庫配置 | 後端開發者 |
| [API 文檔](./api/README.md) | Swagger API 文檔訪問 | 前後端開發者 |

---

## 📖 核心文檔

### 1. DevOps 與運維

**主文檔**: [docs/devops/README.md](./devops/README.md)

**內容**:
- ✅ CI/CD 流水線配置（GitHub Actions）
- ✅ Docker 容器化最佳實踐
- ✅ 環境變數管理
- ✅ 監控與告警設置（Prometheus + Grafana）
- ✅ 安全性修復指南
- ✅ 常見問題排除

**適合**:
- DevOps 工程師
- 系統管理員
- 後端開發者

**關鍵章節**:
- [評估總覽](./devops/README.md#評估總覽) - 了解當前狀態和評分
- [快速開始](./devops/README.md#快速開始) - 30 分鐘快速設置
- [Week 1 計劃](./devops/README.md#快速開始) - P0 緊急項目
- [故障排除](./devops/README.md#常見問題排除) - 解決常見問題

---

### 2. 基礎設施架構

**主文檔**: [docs/infrastructure/README.md](./infrastructure/README.md)

**內容**:
- ✅ 系統架構圖
- ✅ Docker Compose 配置
- ✅ PostgreSQL、Redis、Kafka 運維
- ✅ 資源優化與調優
- ✅ 備份與災難恢復
- ✅ 監控視圖與健康檢查

**適合**:
- 架構師
- 後端開發者
- 數據庫管理員
- DevOps 工程師

**關鍵章節**:
- [架構概覽](./infrastructure/README.md#架構概覽) - 系統架構圖
- [優化總結](./infrastructure/README.md#優化總結) - 已完成的優化項目
- [運維操作](./infrastructure/README.md#運維操作) - 常用命令參考
- [效能調優](./infrastructure/README.md#效能調優) - PostgreSQL/Redis/Kafka 優化

---

### 3. API 文檔

**主文檔**: [docs/api/README.md](./api/README.md)

**內容**:
- ✅ Swagger 配置指南
- ✅ 所有微服務 API 文檔訪問
- ✅ Controller 和 DTO 文檔化
- ✅ 認證配置（JWT）
- ✅ API 最佳實踐

**適合**:
- 前端開發者
- 後端開發者
- QA 工程師
- 技術文檔編寫者

**關鍵章節**:
- [當前狀態](./api/README.md#當前狀態) - 10 個微服務的 Swagger 訪問
- [Swagger 配置指南](./api/README.md#swagger-配置指南) - 如何配置 API 文檔
- [快速修復檢查清單](./api/README.md#快速修復檢查清單) - 分階段改進計劃
- [最佳實踐](./api/README.md#最佳實踐) - API 文檔編寫規範

**Swagger UI 訪問**:
- API Gateway: http://localhost:3000/api/docs
- Auth Service: http://localhost:3002/api/docs
- User Service: http://localhost:3001/api/docs
- [查看所有服務](./api/README.md#訪問-swagger-文檔)

---

### 4. 測試策略

**主文檔**: [docs/testing/README.md](./testing/README.md)

**內容**:
- ✅ 測試覆蓋率分析
- ✅ 單元測試、整合測試、E2E 測試
- ✅ 測試最佳實踐
- ✅ 優先級改進計劃
- ✅ CI/CD 整合

**適合**:
- QA 工程師
- 後端開發者
- 測試自動化工程師

**關鍵章節**:
- [執行摘要](./testing/README.md#執行摘要) - 測試覆蓋率關鍵指標
- [當前狀態](./testing/README.md#當前狀態) - 各專案測試覆蓋率
- [優先級改進計劃](./testing/README.md#優先級改進計劃) - P0/P1/P2 測試任務
- [測試最佳實踐](./testing/README.md#測試最佳實踐) - 如何編寫好的測試

---

## 🎯 按角色導航

### 專案經理 / 管理層

**推薦閱讀順序**:
1. [DevOps 評估總覽](./devops/README.md#評估總覽) - 了解當前狀態和 ROI
2. [基礎設施優化總結](./infrastructure/README.md#優化總結) - 已完成的改進
3. [測試執行摘要](./testing/README.md#執行摘要) - 測試覆蓋率概覽
4. [API 文檔狀態](./api/README.md#執行摘要) - API 文檔完成度

**關鍵指標**:
- DevOps 總體評分: ⭐⭐⭐⭐☆ (3.5/5)
- 基礎設施優化成功率: 91.67%
- 測試覆蓋率: ~25-35%
- API 文檔配置: 80%

### DevOps 工程師

**推薦閱讀順序**:
1. [DevOps 完整指南](./devops/README.md)
2. [基礎設施運維操作](./infrastructure/README.md#運維操作)
3. [故障排除](./devops/README.md#常見問題排除)

**常用命令**:
- [Docker Compose 命令](./infrastructure/README.md#運維操作)
- [健康檢查腳本](./infrastructure/README.md#健康檢查)
- [備份操作](./infrastructure/README.md#備份操作)

### 後端開發者

**推薦閱讀順序**:
1. [API 文檔指南](./api/README.md)
2. [基礎設施快速開始](./infrastructure/README.md#快速開始)
3. [測試最佳實踐](./testing/README.md#測試最佳實踐)

**快速鏈接**:
- [Swagger 配置](./api/README.md#swagger-配置指南)
- [資料庫連接配置](./infrastructure/README.md#連接配置)
- [單元測試範例](./testing/README.md#測試最佳實踐)

### 前端開發者

**推薦閱讀順序**:
1. [API 文檔訪問](./api/README.md#訪問-swagger-文檔)
2. [API Gateway 配置](./infrastructure/README.md#架構概覽)

**快速鏈接**:
- [所有 API Swagger UI](./api/README.md#訪問-swagger-文檔)
- [API Gateway](http://localhost:3000/api/docs)

### QA 工程師

**推薦閱讀順序**:
1. [測試策略完整指南](./testing/README.md)
2. [API 文檔](./api/README.md)
3. [E2E 測試狀態](./testing/README.md#當前狀態)

**快速鏈接**:
- [測試覆蓋率分析](./testing/README.md#測試覆蓋率分析)
- [優先級改進計劃](./testing/README.md#優先級改進計劃)
- [運行測試命令](./testing/README.md#運行測試)

---

## 📁 其他重要文檔

### 專案架構與設計

**位置**: `docs/`

| 文檔 | 描述 |
|------|------|
| [01-專案架構與設計.md](./01-專案架構與設計.md) | 整體架構設計 |
| [02-開發指南.md](./02-開發指南.md) | 開發規範與流程 |
| [03-資料庫遷移.md](./03-資料庫遷移.md) | 資料庫遷移指南 |
| [04-運維與效能.md](./04-運維與效能.md) | 運維最佳實踐 |
| [06-AWS-遷移規劃.md](./06-AWS-遷移規劃.md) | 雲端部署規劃 |

### 業務與功能

| 文檔 | 描述 |
|------|------|
| [專案功能分析.md](./專案功能分析.md) | 功能需求分析 |
| [BUSINESS_LOGIC_GAPS.md](./BUSINESS_LOGIC_GAPS.md) | 業務邏輯缺口 |
| [COMPETITOR_ANALYSIS.md](./COMPETITOR_ANALYSIS.md) | 競品分析 |

### 整合與支付

| 文檔 | 描述 |
|------|------|
| [STRIPE.md](./STRIPE.md) | Stripe 支付整合 |
| [STRIPE_CONNECT_GUIDE.md](./STRIPE_CONNECT_GUIDE.md) | Stripe Connect 指南 |
| [OAUTH_GUIDE.md](./OAUTH_GUIDE.md) | OAuth 第三方登入 |

### 特定功能指南

| 文檔 | 描述 |
|------|------|
| [KAFKA_DLQ_GUIDE.md](./KAFKA_DLQ_GUIDE.md) | Kafka 死信隊列 |
| [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) | 錯誤處理規範 |
| [REDIS_DB_CONSISTENCY_GUIDE.md](./REDIS_DB_CONSISTENCY_GUIDE.md) | Redis 與資料庫一致性 |
| [N_PLUS_ONE_QUERY_FIX.md](./N_PLUS_ONE_QUERY_FIX.md) | N+1 查詢問題修復 |
| [WALLET_RACE_CONDITION_FIX.md](./WALLET_RACE_CONDITION_FIX.md) | 錢包競態條件修復 |

### 前端開發

| 文檔 | 描述 |
|------|------|
| [FRONTEND_ANALYSIS.md](./FRONTEND_ANALYSIS.md) | 前端架構分析 |
| [FRONTEND_DEVELOPMENT_GUIDE.md](./FRONTEND_DEVELOPMENT_GUIDE.md) | 前端開發指南 |

---

## 🔍 快速查找

### 按主題查找

#### Docker 與容器化
- [Docker Compose 配置](./infrastructure/README.md#快速開始)
- [容器資源優化](./infrastructure/README.md#優化總結)
- [Docker 故障排除](./infrastructure/README.md#故障排除)

#### CI/CD
- [GitHub Actions 設置](./devops/README.md#快速開始)
- [CI/CD 流水線](./devops/README.md#ci-cd-配置)
- [自動部署](./devops/README.md#week-2-p1-高優先級項目)

#### 資料庫
- [PostgreSQL 運維](./infrastructure/README.md#postgresql-操作)
- [Redis 運維](./infrastructure/README.md#redis-操作)
- [資料庫備份](./infrastructure/README.md#備份操作)
- [資料庫調優](./infrastructure/README.md#效能調優)

#### 監控與告警
- [Prometheus 設置](./devops/README.md#監控與告警)
- [Grafana 配置](./devops/README.md#啟動完整監控堆疊)
- [健康檢查](./infrastructure/README.md#健康檢查)

#### 測試
- [單元測試](./testing/README.md#單元測試unit-tests)
- [E2E 測試](./testing/README.md#e2e-測試end-to-end-tests)
- [測試覆蓋率](./testing/README.md#測試覆蓋率分析)

#### API
- [Swagger 配置](./api/README.md#swagger-配置指南)
- [API 文檔訪問](./api/README.md#訪問-swagger-文檔)
- [DTO 文檔化](./api/README.md#dto-文檔化待完成)

---

## 📊 文檔狀態

### 已整合文檔

| 原文檔 | 整合至 | 狀態 |
|--------|--------|------|
| DEVOPS_README.md | [docs/devops/README.md](./devops/README.md) | ✅ 已整合 |
| DEVOPS_SUMMARY.md | [docs/devops/README.md](./devops/README.md) | ✅ 已整合 |
| DEVOPS_QUICKSTART.md | [docs/devops/README.md](./devops/README.md) | ✅ 已整合 |
| DEVOPS_ASSESSMENT.md | [docs/devops/README.md](./devops/README.md) | ✅ 已整合 |
| INFRASTRUCTURE-OPTIMIZATION-GUIDE.md | [docs/infrastructure/README.md](./infrastructure/README.md) | ✅ 已整合 |
| INFRASTRUCTURE-DIAGRAM.md | [docs/infrastructure/README.md](./infrastructure/README.md) | ✅ 已整合 |
| INFRASTRUCTURE-QUICKREF.md | [docs/infrastructure/README.md](./infrastructure/README.md) | ✅ 已整合 |
| INFRASTRUCTURE-OPTIMIZATION-SUMMARY.md | [docs/infrastructure/README.md](./infrastructure/README.md) | ✅ 已整合 |
| API-DOCUMENTATION-PHASE1-SUMMARY.md | [docs/api/README.md](./api/README.md) | ✅ 已整合 |
| api-documentation-report.md | [docs/api/README.md](./api/README.md) | ✅ 已整合 |
| TEST-STRATEGY-SUMMARY.md | [docs/testing/README.md](./testing/README.md) | ✅ 已整合 |
| test-coverage-analysis.md | [docs/testing/README.md](./testing/README.md) | ✅ 已整合 |

### 待歸檔文檔

以下文檔可以移至 `docs/archive/`：

- [ ] STAGE2-COMPLETION-SUMMARY.md
- [ ] STAGE2-DOCUMENTATION-INDEX.md
- [ ] STAGE2-QUICKSTART.md
- [ ] INFRASTRUCTURE-OPTIMIZATION-INDEX.md
- [ ] PHASE1-COMPLETION.txt
- [ ] infrastructure-health-report.md

---

## 📝 文檔維護

### 更新頻率

| 文檔類型 | 更新頻率 | 負責人 |
|---------|---------|--------|
| DevOps 指南 | 每週 | DevOps Team |
| 基礎設施文檔 | 每月 | Infrastructure Team |
| API 文檔 | 持續更新 | Backend Team |
| 測試策略 | 每兩週 | QA Team |

### 貢獻指南

1. 所有文檔使用 Markdown 格式
2. 保持文檔結構一致
3. 添加目錄和導航鏈接
4. 包含實際的代碼範例
5. 更新後通知相關團隊

### 反饋與改進

如有文檔問題或改進建議：
1. 在 GitHub Issues 創建 issue
2. 標記為 `documentation`
3. 指派給相關團隊

---

## 🔗 快速鏈接

### 文檔
- [DevOps 完整指南](./devops/README.md)
- [基礎設施完整指南](./infrastructure/README.md)
- [API 文檔指南](./api/README.md)
- [測試策略指南](./testing/README.md)

### 外部資源
- [NestJS 文檔](https://docs.nestjs.com/)
- [Nx 文檔](https://nx.dev/)
- [Docker 文檔](https://docs.docker.com/)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)
- [Redis 文檔](https://redis.io/documentation)
- [Kafka 文檔](https://kafka.apache.org/documentation/)

### 工具
- [Swagger UI](http://localhost:3000/api/docs)
- [Grafana Dashboard](http://localhost:3001)
- [Prometheus](http://localhost:9090)

---

**最後更新**: 2024-02  
**維護者**: Development Team

📚 **統一的文檔中心讓協作更高效！**
