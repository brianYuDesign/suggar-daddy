# 📚 Suggar Daddy 文檔重組方案

> **架構師評估**: 2024年2月  
> **當前狀態**: 🔴 高度混亂（根目錄 19 個文檔，docs/ 目錄 37 個文檔）  
> **目標**: 清晰的文檔層次結構，消除冗餘，提升可維護性

---

## 📊 當前問題分析

### 🔴 嚴重問題

1. **文檔過度分散**
   - 根目錄 19 個 .md 文件（應該只有 1-2 個）
   - 86% 文檔在 docs/ 根目錄，未分類
   - 4 個空子目錄（analysis, integrations, testing, workflows）

2. **高度重複內容**
   - DevOps 文檔 5 層重複（README → SUMMARY → ASSESSMENT → QUICKSTART → GUIDE）
   - Infrastructure 文檔 3 層重複（INDEX → GUIDE → SUMMARY）
   - 相同功能文檔存在兩個位置（disaster-recovery, swagger-templates）

3. **命名不一致**
   - 混合中英文（6 個中文文檔，50+ 個英文文檔）
   - 混合大小寫（UPPER_SNAKE_CASE vs kebab-case）
   - 數字序列不連貫（01-04, 06，缺少 05）

4. **組織邏輯混亂**
   - 同一主題文檔分散多處（測試文檔 6 個位置）
   - Redis 文檔 3 個未合併
   - Stripe 文檔 2 個應整合

---

## 🎯 重組目標

### 設計原則

1. **單一真相來源（Single Source of Truth）**
   - 每個主題只有一個主文檔
   - 避免內容重複
   
2. **清晰的層次結構**
   - 根目錄：只有 README.md + 重要的索引
   - docs/：按主題分類的子目錄
   - 深度不超過 3 層

3. **一致的命名規範**
   - 統一使用英文 + kebab-case
   - 特殊文檔使用 UPPER_CASE（README, CHANGELOG）
   - 數字前綴用於有序文檔

4. **易於導航**
   - 主索引：README.md
   - 各子目錄：README.md 索引
   - 交叉引用使用相對路徑

---

## 📁 新文檔結構

```
suggar-daddy/
│
├── README.md                          # 項目主文檔（保留，簡化）
├── CHANGELOG.md                       # 版本變更記錄
├── CONTRIBUTING.md                    # 貢獻指南
│
├── docs/
│   ├── README.md                      # 文檔總索引 ⭐️ 新建
│   │
│   ├── 01-getting-started/            # 入門指南 ⭐️ 新建
│   │   ├── README.md
│   │   ├── quick-start.md             # 快速開始
│   │   ├── environment-setup.md       # 環境配置
│   │   └── project-structure.md       # 項目結構
│   │
│   ├── 02-architecture/               # 系統架構 ✅ 重組
│   │   ├── README.md
│   │   ├── system-design.md           # ✅ 保留
│   │   ├── infrastructure.md          # ✅ 保留
│   │   ├── database-design.md         # 🔄 重命名自 03-資料庫遷移.md
│   │   └── aws-migration-plan.md      # 🔄 重命名自 06-AWS-遷移規劃.md
│   │
│   ├── 03-development/                # 開發指南 ✅ 重組
│   │   ├── README.md
│   │   ├── coding-standards.md        # 🔄 拆分自 02-開發指南.md
│   │   ├── api-reference.md           # ✅ 保留
│   │   ├── api-documentation.md       # 🆕 合併 API 文檔規範
│   │   ├── error-handling.md          # 🔄 重命名
│   │   └── swagger-guide.md           # ⚠️ 合併 swagger-templates.md
│   │
│   ├── 04-testing/                    # 測試指南 🆕 新建
│   │   ├── README.md                  # 測試總覽
│   │   ├── test-strategy.md           # 🔄 合併測試策略文檔
│   │   ├── unit-testing.md            # 🔄 拆分自 TEST_BEST_PRACTICES.md
│   │   ├── integration-testing.md     # 🔄 重命名自 CONTROLLER_INTEGRATION_TESTING_GUIDE.md
│   │   ├── e2e-testing.md             # 🔄 拆分
│   │   └── test-coverage-report.md    # 🔄 重命名
│   │
│   ├── 05-integrations/               # 第三方整合 🆕 新建
│   │   ├── README.md
│   │   ├── stripe/
│   │   │   ├── README.md
│   │   │   ├── setup.md               # 🔄 合併 STRIPE.md
│   │   │   └── stripe-connect.md      # 🔄 重命名
│   │   ├── oauth/
│   │   │   ├── README.md
│   │   │   └── oauth-guide.md         # 🔄 移動
│   │   ├── kafka/
│   │   │   ├── README.md
│   │   │   └── dlq-handling.md        # 🔄 重命名自 KAFKA_DLQ_GUIDE.md
│   │   └── redis/
│   │       ├── README.md
│   │       ├── consistency-guide.md   # ⚠️ 合併 3 個 Redis 文檔
│   │       └── integration-example.md
│   │
│   ├── 06-operations/                 # 運維指南 ✅ 重組
│   │   ├── README.md
│   │   ├── deployment.md              # 🔄 拆分自 operations-manual.md
│   │   ├── monitoring.md              # 🔄 拆分
│   │   ├── disaster-recovery.md       # ⚠️ 刪除重複文件
│   │   ├── performance-tuning.md      # 🔄 重命名自 04-運維與效能.md
│   │   └── troubleshooting.md         # 🔄 拆分
│   │
│   ├── 07-devops/                     # DevOps ✅ 重組
│   │   ├── README.md                  # ⚠️ 合併 DEVOPS 文檔
│   │   ├── ci-cd-setup.md             # 🔄 拆分
│   │   ├── docker-guide.md            # 🔄 拆分
│   │   ├── infrastructure-as-code.md  # 🔄 合併 IaC 內容
│   │   └── deployment-strategy.md     # 🔄 拆分
│   │
│   ├── 08-infrastructure/             # 基礎設施 🆕 新建
│   │   ├── README.md                  # ⚠️ 合併 INFRASTRUCTURE 文檔
│   │   ├── optimization-guide.md      # 🔄 合併優化指南
│   │   ├── health-monitoring.md       # 🔄 重命名
│   │   ├── resource-management.md     # 🔄 拆分
│   │   └── quick-reference.md         # 🔄 保留快速參考
│   │
│   ├── 09-analysis/                   # 商業分析 ✅ 使用空目錄
│   │   ├── README.md
│   │   ├── competitor-analysis.md     # 🔄 移動
│   │   ├── feature-analysis.md        # 🔄 重命名自 專案功能分析.md
│   │   ├── business-logic-gaps.md     # 🔄 移動
│   │   └── progress-report.md         # 🔄 移動
│   │
│   ├── 10-troubleshooting/            # 故障排除 🆕 新建
│   │   ├── README.md
│   │   ├── n-plus-one-query-fix.md    # 🔄 移動
│   │   ├── wallet-race-condition.md   # 🔄 重命名
│   │   └── transaction-scan-fix.md    # 🔄 移動
│   │
│   └── 99-archive/                    # 歸檔 🆕 新建
│       ├── README.md
│       ├── stage2-completion.md       # 🔄 歸檔
│       └── phase1-api-docs.md         # 🔄 歸檔
│
├── infrastructure/                    # Terraform/IaC 代碼
│   ├── README.md                      # ✅ 保留
│   ├── terraform/
│   └── docker/
│       └── README.md                  # ✅ 保留
│
├── scripts/                           # 運維腳本
│   └── README.md                      # ✅ 保留
│
└── claudedocs/                        # Claude 工作文檔 ⚠️ 建議重命名
    └── (暫時保留)
```

---

## 🔄 具體遷移操作

### Phase 1: 刪除冗餘文檔（立即執行）

```bash
# 根目錄冗餘文檔（保留信息後刪除）
rm DEVOPS_README.md                    # 內容合併到 docs/07-devops/README.md
rm DEVOPS_SUMMARY.md                   # 內容合併到 DEVOPS_ASSESSMENT.md
rm DEVOPS_QUICKSTART.md                # 內容合併到 docs/07-devops/README.md

rm INFRASTRUCTURE-OPTIMIZATION-INDEX.md   # 內容合併到新索引
rm INFRASTRUCTURE-OPTIMIZATION-SUMMARY.md # 內容合併到優化指南
rm INFRASTRUCTURE-DIAGRAM.md              # 內容合併到架構文檔

rm STAGE2-DOCUMENTATION-INDEX.md       # 過時的索引
rm STAGE2-QUICKSTART.md                # 合併到主 README

# docs/ 目錄重複文檔
rm docs/disaster-recovery.md           # 保留 docs/operations/disaster-recovery.md
rm docs/swagger-templates.md           # 保留 docs/development/swagger-templates.md

# 過時的報告文檔（歸檔而非刪除）
mv STAGE2-COMPLETION-SUMMARY.md docs/99-archive/
mv API-DOCUMENTATION-PHASE1-SUMMARY.md docs/99-archive/
mv api-documentation-report.md docs/99-archive/
mv test-coverage-analysis.md docs/99-archive/
mv infrastructure-health-report.md docs/99-archive/
```

### Phase 2: 創建新目錄結構

```bash
# 創建新子目錄
mkdir -p docs/{01-getting-started,04-testing,05-integrations/{stripe,oauth,kafka,redis},08-infrastructure,09-analysis,10-troubleshooting,99-archive}

# 創建各目錄的 README.md
touch docs/01-getting-started/README.md
touch docs/04-testing/README.md
touch docs/05-integrations/README.md
touch docs/08-infrastructure/README.md
touch docs/09-analysis/README.md
touch docs/10-troubleshooting/README.md
touch docs/99-archive/README.md
```

### Phase 3: 遷移和重命名文檔

```bash
# 入門指南（新建內容從現有文檔提取）
# 從 README.md 提取快速開始章節 → docs/01-getting-started/quick-start.md
# 從 ENVIRONMENT_SETUP_SUMMARY.md → docs/01-getting-started/environment-setup.md

# 架構文檔
mv docs/01-專案架構與設計.md docs/02-architecture/system-overview.md
mv docs/03-資料庫遷移.md docs/02-architecture/database-design.md
mv docs/06-AWS-遷移規劃.md docs/02-architecture/aws-migration-plan.md

# 開發指南
mv docs/02-開發指南.md docs/03-development/coding-standards.md
mv docs/ERROR_HANDLING_GUIDE.md docs/03-development/error-handling.md
# 合併 swagger-templates.md 和 development/swagger-templates.md
mv docs/development/swagger-templates.md docs/03-development/swagger-guide.md

# 測試文檔
mv docs/TESTING.md docs/04-testing/README.md
mv docs/TEST_BEST_PRACTICES.md docs/04-testing/best-practices.md
mv docs/TEST_ACTION_PLAN.md docs/04-testing/action-plan.md
mv docs/CONTROLLER_INTEGRATION_TESTING_GUIDE.md docs/04-testing/integration-testing.md
mv docs/QA_TEST_ASSESSMENT.md docs/04-testing/qa-assessment.md

# 第三方整合
mv docs/STRIPE.md docs/05-integrations/stripe/setup.md
mv docs/STRIPE_CONNECT_GUIDE.md docs/05-integrations/stripe/connect-guide.md
mv docs/OAUTH_GUIDE.md docs/05-integrations/oauth/guide.md
mv docs/KAFKA_DLQ_GUIDE.md docs/05-integrations/kafka/dlq-handling.md

# Redis 文檔（需要合併內容）
# 將 REDIS_CONSISTENCY_README.md + REDIS_DB_CONSISTENCY_GUIDE.md 
# + REDIS_CONSISTENCY_INTEGRATION_EXAMPLE.md 合併
# → docs/05-integrations/redis/consistency-guide.md

# 運維文檔
mv docs/04-運維與效能.md docs/06-operations/performance-tuning.md
mv docs/operations-manual.md docs/06-operations/deployment.md
mv docs/operations/disaster-recovery.md docs/06-operations/disaster-recovery.md

# DevOps 文檔
mv DEVOPS_ASSESSMENT.md docs/07-devops/assessment-report.md
mv docs/devops/DEVOPS_GUIDE.md docs/07-devops/README.md

# 基礎設施文檔
mv INFRASTRUCTURE-OPTIMIZATION-GUIDE.md docs/08-infrastructure/optimization-guide.md
mv INFRASTRUCTURE-QUICKREF.md docs/08-infrastructure/quick-reference.md

# 商業分析
mv docs/COMPETITOR_ANALYSIS.md docs/09-analysis/competitor-analysis.md
mv docs/專案功能分析.md docs/09-analysis/feature-analysis.md
mv docs/BUSINESS_LOGIC_GAPS.md docs/09-analysis/business-logic-gaps.md
mv docs/PROGRESS_REPORT.md docs/09-analysis/progress-report.md

# 故障排除
mv docs/N_PLUS_ONE_QUERY_FIX.md docs/10-troubleshooting/n-plus-one-query-fix.md
mv docs/WALLET_RACE_CONDITION_FIX.md docs/10-troubleshooting/wallet-race-condition.md
mv docs/TRANSACTION_SCAN_FIX.md docs/10-troubleshooting/transaction-scan-fix.md

# 前端文檔
mv docs/FRONTEND_DEVELOPMENT_GUIDE.md docs/03-development/frontend-guide.md
mv docs/FRONTEND_ANALYSIS.md docs/09-analysis/frontend-analysis.md

# 環境變數文檔
mv docs/ENV_VARS_DOCUMENTATION.md docs/01-getting-started/environment-variables.md

# 實施指南
mv docs/IMPLEMENTATION_GUIDE.md docs/03-development/implementation-guide.md
```

### Phase 4: 創建主索引文檔

創建 `docs/README.md` 作為文檔總索引：

```markdown
# Suggar Daddy 文檔中心

## 📚 文檔導航

### 🚀 新手入門
如果你是第一次接觸本項目，請按順序閱讀：
1. [快速開始](./01-getting-started/quick-start.md)
2. [環境配置](./01-getting-started/environment-setup.md)
3. [項目結構](./01-getting-started/project-structure.md)

### 🏗️ 系統架構
- [系統設計概覽](./02-architecture/system-design.md)
- [基礎設施架構](./02-architecture/infrastructure.md)
- [資料庫設計](./02-architecture/database-design.md)
- [AWS 遷移規劃](./02-architecture/aws-migration-plan.md)

### 💻 開發指南
- [開發規範](./03-development/coding-standards.md)
- [API 參考](./03-development/api-reference.md)
- [錯誤處理](./03-development/error-handling.md)
- [Swagger 文檔](./03-development/swagger-guide.md)

### 🧪 測試
- [測試策略](./04-testing/README.md)
- [單元測試](./04-testing/unit-testing.md)
- [整合測試](./04-testing/integration-testing.md)
- [測試覆蓋率報告](./04-testing/test-coverage-report.md)

### 🔌 第三方整合
- [Stripe 支付](./05-integrations/stripe/)
- [OAuth 認證](./05-integrations/oauth/)
- [Kafka 消息隊列](./05-integrations/kafka/)
- [Redis 快取](./05-integrations/redis/)

### 🔧 運維指南
- [部署指南](./06-operations/deployment.md)
- [監控和日誌](./06-operations/monitoring.md)
- [災難恢復](./06-operations/disaster-recovery.md)
- [效能調優](./06-operations/performance-tuning.md)

### 🚢 DevOps
- [CI/CD 配置](./07-devops/ci-cd-setup.md)
- [Docker 指南](./07-devops/docker-guide.md)
- [基礎設施即代碼](./07-devops/infrastructure-as-code.md)

### 🏢 基礎設施
- [優化指南](./08-infrastructure/optimization-guide.md)
- [健康監控](./08-infrastructure/health-monitoring.md)
- [快速參考](./08-infrastructure/quick-reference.md)

### 📊 商業分析
- [競爭對手分析](./09-analysis/competitor-analysis.md)
- [功能分析](./09-analysis/feature-analysis.md)
- [業務邏輯缺口](./09-analysis/business-logic-gaps.md)

### 🔍 故障排除
- [N+1 查詢問題](./10-troubleshooting/n-plus-one-query-fix.md)
- [錢包競態條件](./10-troubleshooting/wallet-race-condition.md)
- [交易掃描修復](./10-troubleshooting/transaction-scan-fix.md)

## 🔗 快速連結

- [項目 README](../README.md)
- [貢獻指南](../CONTRIBUTING.md)
- [變更日誌](../CHANGELOG.md)
```

### Phase 5: 更新根目錄 README.md

簡化 `README.md`，移除過多細節，改為引用 docs/：

```markdown
# Suggar Daddy

> 糖爹平台 - Nx Monorepo 微服務架構

## 快速開始

### 安裝依賴
\`\`\`bash
npm install
\`\`\`

### 啟動開發環境
\`\`\`bash
# 啟動基礎設施（PostgreSQL, Redis, Kafka）
docker-compose up -d

# 啟動所有服務
npm run dev
\`\`\`

### 測試
\`\`\`bash
# 單元測試
npm run test

# E2E 測試
npm run test:e2e
\`\`\`

## 📚 完整文檔

詳細文檔請參閱：[docs/README.md](./docs/README.md)

- **新手入門**: [快速開始指南](./docs/01-getting-started/quick-start.md)
- **系統架構**: [架構設計](./docs/02-architecture/)
- **開發指南**: [開發規範](./docs/03-development/)
- **運維手冊**: [部署和監控](./docs/06-operations/)

## 技術棧

- **框架**: NestJS, Nx Monorepo
- **資料庫**: PostgreSQL, Redis
- **消息隊列**: Kafka
- **支付**: Stripe Connect
- **認證**: OAuth 2.0

## 項目結構

\`\`\`
suggar-daddy/
├── apps/           # 應用程式
│   ├── api/        # 主 API
│   └── ...
├── libs/           # 共享庫
├── docs/           # 文檔
└── infrastructure/ # 基礎設施配置
\`\`\`

## 貢獻

請閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT
```

---

## 📋 合併文檔內容指南

### 1. 合併 DevOps 文檔

**目標文件**: `docs/07-devops/README.md`

**合併來源**:
- `DEVOPS_README.md` → 導航部分
- `DEVOPS_SUMMARY.md` → 執行摘要
- `DEVOPS_ASSESSMENT.md` → 詳細評估（保留完整）
- `DEVOPS_QUICKSTART.md` → 快速開始章節
- `docs/devops/DEVOPS_GUIDE.md` → 實施指南

**結構**:
```markdown
# DevOps 指南

## 執行摘要
[來自 DEVOPS_SUMMARY.md]

## 快速開始（2 週內實施）
[來自 DEVOPS_QUICKSTART.md]

## 完整評估報告
[來自 DEVOPS_ASSESSMENT.md]

## 實施步驟
[來自 DEVOPS_GUIDE.md]

## 工具和腳本
[來自 DEVOPS_README.md]
```

### 2. 合併 Infrastructure 文檔

**目標文件**: `docs/08-infrastructure/README.md`

**合併來源**:
- `INFRASTRUCTURE-OPTIMIZATION-INDEX.md` → 導航
- `INFRASTRUCTURE-OPTIMIZATION-SUMMARY.md` → 執行摘要
- `INFRASTRUCTURE-OPTIMIZATION-GUIDE.md` → 詳細指南
- `INFRASTRUCTURE-QUICKREF.md` → 快速參考（獨立文件）
- `INFRASTRUCTURE-DIAGRAM.md` → 架構圖（移到 02-architecture/）
- `infrastructure-health-report.md` → 健康報告（歸檔）

**結構**:
```markdown
# 基礎設施管理

## 執行摘要
[來自 OPTIMIZATION-SUMMARY]

## 使用指南
[來自 OPTIMIZATION-GUIDE]

## 快速參考
[連結到 quick-reference.md]

## 架構圖
[連結到 ../02-architecture/infrastructure.md]
```

### 3. 合併 Redis 文檔

**目標文件**: `docs/05-integrations/redis/consistency-guide.md`

**合併來源**:
- `REDIS_CONSISTENCY_README.md` → 概述
- `REDIS_DB_CONSISTENCY_GUIDE.md` → 詳細指南
- `REDIS_CONSISTENCY_INTEGRATION_EXAMPLE.md` → 範例代碼

**結構**:
```markdown
# Redis 一致性指南

## 概述
[來自 README]

## 一致性策略
[來自 GUIDE]

## 實作範例
[來自 EXAMPLE]

## 最佳實踐
[新增內容]
```

### 4. 合併測試文檔

**目標**: 整合分散的測試文檔

**文件對應**:
- `docs/TESTING.md` → `docs/04-testing/README.md`（主文檔）
- `TEST_BEST_PRACTICES.md` → 拆分到各測試類型文檔
- `TEST_ACTION_PLAN.md` → `docs/04-testing/action-plan.md`
- `TEST-STRATEGY-SUMMARY.md` → 合併到 README
- `test-coverage-analysis.md` → `docs/04-testing/coverage-report.md`（歸檔）
- `CONTROLLER_INTEGRATION_TESTING_GUIDE.md` → `docs/04-testing/integration-testing.md`
- `QA_TEST_ASSESSMENT.md` → `docs/04-testing/qa-assessment.md`（歸檔）

---

## 🔗 更新內部連結

### 自動化腳本

創建腳本自動更新所有內部連結：

```bash
#!/bin/bash
# scripts/update-doc-links.sh

# 更新常見的文檔連結
find docs -name "*.md" -type f -exec sed -i '' \
  -e 's|](./DEVOPS_README.md)|](./07-devops/README.md)|g' \
  -e 's|](./INFRASTRUCTURE-OPTIMIZATION-GUIDE.md)|](./08-infrastructure/optimization-guide.md)|g' \
  -e 's|](./docs/TESTING.md)|](./04-testing/README.md)|g' \
  -e 's|](../STAGE2-QUICKSTART.md)|](./01-getting-started/quick-start.md)|g' \
  {} +

echo "✅ 文檔連結已更新"
```

### 手動檢查清單

- [ ] 更新 README.md 中的連結
- [ ] 更新各子目錄 README.md 的交叉引用
- [ ] 檢查 package.json 中的文檔連結
- [ ] 更新 CONTRIBUTING.md 中的文檔引用
- [ ] 檢查代碼中的文檔註釋連結

---

## 🗑️ 刪除清單

### 立即刪除（無有效內容）

```bash
# 如果驗證後確認為空或重複
rm -f claudedocs/workflow_admin_panel.md
rm -f claudedocs/workflow_business_logic_gaps.md
```

### 歸檔（有歷史價值）

移動到 `docs/99-archive/`：
- `STAGE2-COMPLETION-SUMMARY.md`
- `API-DOCUMENTATION-PHASE1-SUMMARY.md`
- `api-documentation-report.md`
- `test-coverage-analysis.md`
- `infrastructure-health-report.md`
- `PHASE1-COMPLETION.txt`

---

## ✅ 實施檢查清單

### Phase 1: 準備工作（1 小時）

- [ ] 備份當前文檔
  ```bash
  tar -czf docs-backup-$(date +%Y%m%d).tar.gz docs/ *.md
  ```
- [ ] 創建新分支
  ```bash
  git checkout -b docs/reorganization
  ```
- [ ] 審查所有文檔，確認無遺漏

### Phase 2: 創建新結構（30 分鐘）

- [ ] 創建所有新目錄
- [ ] 創建各目錄的 README.md
- [ ] 創建主索引 `docs/README.md`

### Phase 3: 遷移文檔（2-3 小時）

- [ ] 遷移架構文檔（02-architecture/）
- [ ] 遷移開發文檔（03-development/）
- [ ] 遷移測試文檔（04-testing/）
- [ ] 遷移整合文檔（05-integrations/）
- [ ] 遷移運維文檔（06-operations/）
- [ ] 遷移 DevOps 文檔（07-devops/）
- [ ] 遷移基礎設施文檔（08-infrastructure/）
- [ ] 遷移分析文檔（09-analysis/）
- [ ] 遷移故障排除（10-troubleshooting/）
- [ ] 歸檔過時文檔（99-archive/）

### Phase 4: 合併內容（2-3 小時）

- [ ] 合併 DevOps 文檔
- [ ] 合併 Infrastructure 文檔
- [ ] 合併 Redis 文檔
- [ ] 合併測試文檔
- [ ] 合併 Stripe 文檔

### Phase 5: 更新連結（1 小時）

- [ ] 運行連結更新腳本
- [ ] 手動檢查關鍵文檔連結
- [ ] 更新 README.md
- [ ] 測試所有連結有效性

### Phase 6: 清理（30 分鐘）

- [ ] 刪除冗餘文檔
- [ ] 移動歸檔文檔
- [ ] 刪除空目錄
- [ ] 清理臨時文件

### Phase 7: 驗證（1 小時）

- [ ] 檢查所有連結
- [ ] 確認文檔完整性
- [ ] 測試導航流程
- [ ] 團隊審查

### Phase 8: 提交（30 分鐘）

- [ ] Git commit
  ```bash
  git add docs/
  git add README.md *.md
  git commit -m "docs: 重組文檔結構，消除冗餘"
  ```
- [ ] 創建 PR
- [ ] 更新 Wiki（如有）
- [ ] 通知團隊

---

## 📊 預期效果

### 改進指標

| 指標 | 重組前 | 重組後 | 改善 |
|------|--------|--------|------|
| **根目錄 .md 文件** | 19 | 3 | ✅ -84% |
| **docs/ 根目錄文件** | 37 | 1 | ✅ -97% |
| **空目錄** | 4 | 0 | ✅ -100% |
| **重複文檔** | 8+ | 0 | ✅ -100% |
| **文檔總數** | 56+ | ~45 | ✅ -20% |
| **平均導航深度** | 混亂 | 2-3 層 | ✅ 清晰 |

### 用戶體驗改善

**重組前**:
- 🔴 難以找到需要的文檔
- 🔴 不知道哪個文檔是最新的
- 🔴 重複內容造成混淆
- 🔴 命名不一致

**重組後**:
- ✅ 清晰的導航層次
- ✅ 單一真相來源
- ✅ 一致的命名規範
- ✅ 易於維護和擴展

---

## 🚀 下一步

1. **立即執行**: 開始 Phase 1-3（創建結構和遷移文檔）
2. **優先處理**: 合併高度重複的 DevOps 和 Infrastructure 文檔
3. **持續優化**: 建立文檔維護規範，避免再次混亂
4. **團隊培訓**: 向團隊說明新的文檔結構

---

## 📝 文檔維護規範（重組後）

### 新增文檔時

1. **確定類別**: 新文檔屬於哪個目錄？
2. **檢查重複**: 是否已有類似文檔？考慮合併
3. **遵循命名**: 使用 kebab-case（特殊文檔除外）
4. **更新索引**: 在對應目錄的 README.md 中加入連結
5. **交叉引用**: 使用相對路徑，避免絕對路徑

### 更新文檔時

1. **單一來源**: 不要複製內容到多個文檔
2. **使用連結**: 引用其他文檔時使用連結
3. **版本控制**: 重大變更在 CHANGELOG.md 中記錄
4. **審查機制**: PR 必須審查文檔變更

### 禁止的行為

- ❌ 在根目錄創建新 .md 文件（README 等除外）
- ❌ 複製內容到多個文檔
- ❌ 使用不一致的命名（中英混合、大小寫混亂）
- ❌ 創建沒有內容的空文檔或目錄

---

**預估工時**: 8-10 小時  
**優先級**: 🔴 高（影響團隊效率和新人上手）  
**風險**: 🟢 低（主要是文檔重組，不影響代碼）  

**建議**: 立即開始實施，分階段完成。前 3 個 Phase 優先處理。
