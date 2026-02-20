# Sugar Daddy 文檔中心

> 專案文檔索引，包含架構設計、開發指南、部署文檔。

## 快速導航

### 新手必讀

| 文檔 | 說明 |
|------|------|
| [快速開始](./guides/QUICK_START.md) | 快速啟動開發環境 |
| [開發指南](./technical/development.md) | 本地開發環境設置與最佳實踐 |
| [FAQ](./guides/FAQ.md) | 常見問題解答 |
| [服務總覽](./architecture/SERVICES_OVERVIEW.md) | 所有微服務的職責與架構圖 |

### 架構與技術

| 文檔 | 說明 |
|------|------|
| [服務總覽](./architecture/SERVICES_OVERVIEW.md) | 13 個微服務的完整架構圖與職責說明 |
| [技術架構](./technical/architecture.md) | 系統整體架構設計與數據流 |

### 開發指南

| 文檔 | 說明 |
|------|------|
| [API 文檔](./technical/api.md) | RESTful API 設計規範與端點參考 |
| [開發指南](./technical/development.md) | 本地開發環境設置與工作流程 |
| [環境變數完整說明](./technical/environment-variables.md) | 所有環境變數的詳細說明與配置指南 |
| [環境文件整理指南](./guides/ENVIRONMENT_FILES_GUIDE.md) | 多個 .env 文件的用途與管理 |
| [Rate Limiting](./technical/rate-limiting.md) | 速率限制機制與配置 |
| [Circuit Breaker](./technical/circuit-breaker.md) | 熔斷器模式實作 |
| [技能系統](./technical/skill-system.md) | 技能匹配系統設計 |

### 部署與維運

| 文檔 | 說明 |
|------|------|
| [部署指南](./technical/deployment.md) | Docker 與生產環境部署指南 |
| [Secrets 管理](./devops/secrets-management.md) | 敏感資料安全管理方案 |
| [Secrets 設置指南](./devops/secrets-setup-guide.md) | Docker Secrets 配置步驟 |
| [監控告警](./devops/MONITORING_ALERTING_SETUP.md) | 系統監控與告警配置 |
| [災難恢復](./devops/DISASTER_RECOVERY.md) | 備份與災難恢復計劃 |
| [PM2 使用](./devops/PM2-USAGE.md) | PM2 進程管理 |
| [Rate Limiting 部署](./guides/RATE_LIMITING_DEPLOYMENT_GUIDE.md) | 速率限制功能部署指南 |

### 最佳實踐

| 文檔 | 說明 |
|------|------|
| [最佳實踐](./guides/BEST_PRACTICES.md) | 代碼規範與開發最佳實踐 |
| [腳本遷移指南](./guides/SCRIPT_MIGRATION_GUIDE.md) | 開發腳本使用指南 |

---

## 按團隊分類

### 後端團隊

| 文檔 | 說明 |
|------|------|
| [後端文檔首頁](./backend/README.md) | 後端開發資源導航 |
| [API 完整性檢查](./backend/api-completeness.md) | API 端點完整性評估 |
| [代碼重複分析](./backend/code-duplication.md) | 重複代碼識別與優化 |
| [性能分析](./backend/performance-analysis.md) | 後端性能瓶頸與優化 |

### 前端團隊

| 文檔 | 說明 |
|------|------|
| [前端文檔首頁](./frontend/README.md) | 前端開發資源導航 |
| [UI 組件指南](./frontend/UI_COMPONENTS_GUIDE.md) | UI 組件庫使用說明 |
| [組件開發規範](./frontend/component-guidelines.md) | 組件開發最佳實踐 |

### QA 團隊

| 文檔 | 說明 |
|------|------|
| [QA 文檔首頁](./qa/README.md) | 測試資源導航 |
| [測試指南](./qa/TESTING-GUIDE.md) | 測試方法與流程 |
| [測試標準](./qa/TESTING-STANDARDS.md) | 測試品質標準 |
| [E2E 測試](./qa/TESTING-E2E.md) | 端對端測試指南 |
| [CI/CD 測試](./qa/CI-CD-TESTING.md) | CI/CD 測試流程 |
| [前端測試速查](./qa/FRONTEND-TEST-QUICK-REF.md) | 前端測試快速參考 |

---

## 文檔結構

```
docs/
├── README.md              # 本文件 - 文檔中心導航
├── architecture/           # 架構設計文檔
├── technical/              # 技術實作文檔
├── guides/                 # 操作指南
├── backend/                # 後端團隊文檔
├── frontend/               # 前端團隊文檔
├── devops/                 # DevOps 文檔
└── qa/                     # QA 文檔
```
