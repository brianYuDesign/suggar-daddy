# 📚 Sugar Daddy 文檔中心

> 完整的專案文檔索引，包含架構設計、開發指南、部署文檔和團隊協作指南。

## 🎯 快速導航

### 🚀 新手必讀

| 文檔 | 說明 | 預計時間 |
|------|------|---------|
| [快速開始](./guides/QUICK_START.md) | 5 分鐘上手指南，快速啟動開發環境 | 5 分鐘 |
| [開發指南](./technical/development.md) | 本地開發環境設置與最佳實踐 | 15 分鐘 |
| [FAQ](./guides/FAQ.md) | 常見問題解答 | 10 分鐘 |
| [服務總覽](./architecture/SERVICES_OVERVIEW.md) | 所有微服務的職責與架構圖 | 20 分鐘 |

### 🏗️ 架構與技術

| 文檔 | 說明 |
|------|------|
| [服務總覽](./architecture/SERVICES_OVERVIEW.md) | 13 個微服務的完整架構圖與職責說明 |
| [技術架構](./technical/architecture.md) | 系統整體架構設計與數據流 |
| [ADR-001](./architecture/ADR-001-Pre-Launch-Architecture-Review.md) | 上線前架構審查決策記錄 |
| [擴展性分析](./architecture/scalability-analysis.md) | 系統擴展能力評估與優化建議 |
| [安全審查](./architecture/security-review.md) | 安全機制審查與加固方案 |
| [技術債務](./architecture/technical-debt.md) | 已知技術債務與改進計劃 |

### 📖 開發指南

| 文檔 | 說明 |
|------|------|
| [API 文檔](./technical/api.md) | RESTful API 設計規範與端點參考 |
| [開發指南](./technical/development.md) | 本地開發環境設置與工作流程 |
| [環境變數完整說明](./technical/environment-variables.md) | 所有環境變數的詳細說明與配置指南 |
| [環境文件整理指南](./guides/ENVIRONMENT_FILES_GUIDE.md) | 多個 .env 文件的用途與管理 |
| [Rate Limiting](./technical/rate-limiting.md) | 速率限制機制與配置 |
| [Circuit Breaker](./technical/circuit-breaker.md) | 熔斷器模式實作 |
| [技能系統](./technical/skill-system.md) | 技能匹配系統設計 |

### 🚢 部署與維運

| 文檔 | 說明 |
|------|------|
| [部署指南](./technical/deployment.md) | Docker 與生產環境部署指南 |
| [生產部署指南](./devops/PRODUCTION-DEPLOYMENT-GUIDE.md) | 生產環境部署完整流程 |
| [生產部署檢查清單](./devops/PRODUCTION-DEPLOYMENT-CHECKLIST.md) | 部署前確認項目 |
| [藍綠部署](./devops/BLUE-GREEN-DEPLOYMENT.md) | 藍綠部署策略 |
| [自動回滾與擴展](./devops/AUTO-ROLLBACK-AND-SCALING.md) | 自動回滾與水平擴展 |
| [效能優化](./devops/PERFORMANCE-OPTIMIZATION.md) | 生產環境效能優化 |
| [故障排除](./devops/TROUBLESHOOTING-GUIDE.md) | 部署故障排除指南 |
| [Secrets 管理](./devops/secrets-management.md) | 敏感資料安全管理方案 |
| [Secrets 設置指南](./devops/secrets-setup-guide.md) | Docker Secrets 配置步驟 |
| [監控告警](./devops/MONITORING_ALERTING_SETUP.md) | 系統監控與告警配置 |
| [災難恢復](./devops/DISASTER_RECOVERY.md) | 備份與災難恢復計劃 |
| [Rate Limiting 部署](./guides/RATE_LIMITING_DEPLOYMENT_GUIDE.md) | 速率限制功能部署指南 |

### 🎨 最佳實踐

| 文檔 | 說明 |
|------|------|
| [最佳實踐](./guides/BEST_PRACTICES.md) | 代碼規範與開發最佳實踐 |
| [腳本遷移指南](./guides/SCRIPT_MIGRATION_GUIDE.md) | 開發腳本使用指南 |

---

## 👥 按團隊分類

### 後端團隊 (Backend)

| 文檔 | 說明 |
|------|------|
| [後端文檔首頁](./backend/README.md) | 後端開發資源導航 |
| [API 完整性檢查](./backend/api-completeness.md) | API 端點完整性評估 |
| [代碼重複分析](./backend/code-duplication.md) | 重複代碼識別與優化 |
| [性能分析](./backend/performance-analysis.md) | 後端性能瓶頸與優化 |
| [重構計劃](./backend/refactoring-plan.md) | 代碼重構優先級與計劃 |
| [Bug 追蹤](./backend/bug-tracker.md) | 已知 Bug 與修復狀態 |
| [部署檢查清單](./backend/DEPLOYMENT_CHECKLIST.md) | 後端部署前檢查項目 |

### 前端團隊 (Frontend)

| 文檔 | 說明 |
|------|------|
| [前端文檔首頁](./frontend/README.md) | 前端開發資源導航 |
| [UI 組件指南](./frontend/UI_COMPONENTS_GUIDE.md) | UI 組件庫使用說明 |
| [組件開發規範](./frontend/component-guidelines.md) | 組件開發最佳實踐 |
| [業務邏輯驗證](./frontend/business-logic-validation.md) | 前端業務邏輯審查 |
| [UI/UX 問題追蹤](./frontend/ui-ux-issues.md) | UI/UX 改進清單 |
| [優化計劃](./frontend/optimization-plan.md) | 前端性能優化計劃 |
| [測試覆蓋率報告](./frontend/test-coverage-report.md) | 前端測試覆蓋情況 |
| [Git 提交指南](./frontend/GIT_COMMIT_GUIDE.md) | 前端 Git 提交規範 |
| [快速參考](./frontend/QUICK_REFERENCE.md) | 常用命令速查表 |

### DevOps 團隊

詳見 [部署與維運](#-部署與維運) 章節。

### QA 團隊

| 文檔 | 說明 |
|------|------|
| [QA 文檔首頁](./qa/README.md) | 測試資源導航 |
| [測試優化](./qa/test-optimization.md) | 測試執行優化方案 |
| [E2E 等待優化報告](./qa/e2e-wait-optimization-report.md) | E2E 測試性能優化 |
| [優化範例](./qa/optimization-example.md) | 測試優化實際案例 |
| [TST-001 執行總結](./qa/TST-001_EXECUTION_SUMMARY.md) | 測試執行報告 |

### 專案管理 (PM)

| 文檔 | 說明 |
|------|------|
| [PM 文檔首頁](./pm/README.md) | 專案管理資源導航 |
| [上線檢查清單](./pm/LAUNCH_CHECKLIST.md) | 產品上線前檢查項目 |
| [營運手冊](./pm/OPERATIONS_MANUAL.md) | 日常營運指南 |
| [專案進度](./pm/PROGRESS.md) | 專案進度追蹤 |
| [訂閱邏輯審查](./pm/subscription-logic-review.md) | 訂閱功能邏輯審查 |

### 共享資源 (Shared)

| 文檔 | 說明 |
|------|------|
| [共享文檔首頁](./shared/README.md) | 跨團隊共享資源 |

---

## 📝 文檔維護

### 維護原則

1. **保持同步** - 代碼變更時同步更新文檔
2. **分類清晰** - 按功能和團隊分類存放
3. **連結有效** - 定期檢查內部連結
4. **版本控制** - 重大變更記錄在文檔中
5. **簡潔明瞭** - README 保持簡潔，詳細內容放在子文檔

### 文檔結構

```
docs/
├── README.md                 # 本文件 - 文檔中心導航
├── architecture/             # 架構設計文檔
├── technical/                # 技術實作文檔
├── guides/                   # 操作指南
├── backend/                  # 後端團隊文檔
├── frontend/                 # 前端團隊文檔
├── devops/                   # DevOps 文檔
├── qa/                       # QA 文檔
├── pm/                       # 專案管理文檔
├── shared/                   # 共享資源
└── shared/                   # 共享資源
```

### 貢獻文檔

如需新增或修改文檔，請遵循以下步驟：

1. 在對應的目錄創建或編輯 Markdown 文件
2. 更新相關的 README.md（添加連結）
3. 在 Git commit 中說明文檔變更
4. 確保所有連結有效

---

## 🔍 搜尋技巧

```bash
# 搜尋特定關鍵字
grep -r "關鍵字" docs/

# 列出所有 README
find docs -name "README.md"

# 列出所有報告
find docs/reports -name "*.md"

# 列出最近修改的文檔
find docs -name "*.md" -mtime -7
```

---

## 📅 最近更新

- **2026-02-17**: 創建完整的文檔索引，重新組織文檔結構
- **2026-02-17**: 為所有 15 個服務創建 README
- **2026-02-17**: 添加服務總覽和架構圖
- **2026-02-17**: 創建環境變數完整說明文檔
- **2026-02-16**: Phase A Rate Limiting 完成
- **2026-02-15**: 添加 Docker Secrets 管理文檔
- **2026-02-13**: PostgreSQL HA 和 Redis Sentinel 配置文檔

---

## ❓ 需要幫助？

- 📧 **技術問題**: 查看對應團隊的文檔或 FAQ
- 🐛 **Bug 回報**: 參考 [Bug 追蹤](./backend/bug-tracker.md)
- 💡 **功能建議**: 聯繫專案經理或參考 [PM 文檔](./pm/)
- 📖 **文檔問題**: 提交 Issue 或直接修改並 PR
