# 📋 文檔與腳本清理計劃

**生成日期**: 2025-02-16  
**分析範圍**: 文檔、腳本、測試指南  
**目標**: 減少重複、提升可維護性、清理過時內容

---

## 📊 執行摘要

| 類別 | 當前數量 | 建議保留 | 建議刪除 | 建議合併 | 減少比例 |
|------|---------|---------|---------|---------|---------|
| **角色系統文檔** | 5 | 3 | 0 | 2 | 40% |
| **E2E 測試文檔** | 2 | 0 | 1 | 1 | 50% |
| **Testing 目錄** | 5 | 4 | 1 | 0 | 20% |
| **Scripts** | 19 | 15 | 0 | 4 | 21% |
| **總計** | 31 | 22 | 2 | 7 | **29%** |

**預期效益**:
- ✅ 減少 29% 的維護負擔
- ✅ 消除重複資訊
- ✅ 提升文檔可發現性
- ✅ 清晰的文檔層級結構

---

## 1️⃣ 角色系統文檔（5 → 3）

### 📁 當前狀況

```
docs/
├── ROLE_SYSTEM_COMPLETION_REPORT.md      (335 行) - 項目成果總結
├── ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md (287 行) - 實施變更列表
├── ROLE_SYSTEM_QUICK_REFERENCE.md        (412 行) - 日常使用手冊 ⭐
├── ROLE_SYSTEM_README.md                 (198 行) - 導航索引
└── ROLE_SYSTEM_REFACTORING.md            (445 行) - 架構設計方案
```

### 🎯 清理策略

#### ✅ 保留（3個核心文檔）

1. **ROLE_SYSTEM_QUICK_REFERENCE.md** ⭐ **主要文檔**
   - **角色**: 日常開發手冊
   - **讀者**: 所有開發者
   - **內容**: enum 定義、使用範例、最佳實踐、FAQ
   - **理由**: 最實用、最常查閱

2. **ROLE_SYSTEM_COMPLETION_REPORT.md** 📊 **成果報告**
   - **角色**: 項目完成總結
   - **讀者**: PM、Tech Lead、Stakeholders
   - **內容**: Phase 狀態、驗證結果、效益分析
   - **理由**: 重要的項目里程碑記錄

3. **ROLE_SYSTEM_REFACTORING.md** 🏗️ **架構設計**
   - **角色**: 技術規劃文檔
   - **讀者**: Tech Lead、Solution Architect
   - **內容**: 現狀分析、實施計畫、風險評估
   - **理由**: 長期參考的架構決策記錄

#### 🔀 合併（2個）

4. **ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md** → 合併到 **COMPLETION_REPORT**
   - **理由**: 
     - 40% 內容重複（before/after 對比、檔案清單）
     - 都是「已完成」的實施記錄
     - COMPLETION_REPORT 已有「變更檔案」章節
   - **行動**: 將 7 個檔案清單作為附錄添加到 COMPLETION_REPORT

5. **ROLE_SYSTEM_README.md** → 精簡並合併到 **QUICK_REFERENCE** 頂部
   - **理由**:
     - 50% 內容重複（導航、核心概念）
     - 僅剩 3 個文檔後，不需要獨立導航
     - 可作為 QUICK_REFERENCE 的「導讀」章節
   - **行動**: 在 QUICK_REFERENCE 頂部添加「文檔導航」區塊

### 📝 重複內容處理

**重複內容統計**:
- **Enum 定義** (重複 4 次) → 僅保留在 QUICK_REFERENCE，其他改為連結
- **Phase 狀態** (重複 3 次) → 統一在 COMPLETION_REPORT
- **使用範例** (重複 2 次) → QUICK_REFERENCE 專注最佳實踐

---

## 2️⃣ E2E 測試文檔（2 → 0）

### 📁 當前狀況

```
docs/
├── e2e-rate-limit-fix-summary.md    (185 行) - 修復摘要
└── e2e-rate-limit-solution.md       (223 行) - 完整解決方案
```

### 🎯 清理策略

#### ❌ 刪除（1個）

- **e2e-rate-limit-fix-summary.md**
  - **理由**: 95% 內容與 solution.md 重複
  - **行動**: 直接刪除

#### 📦 移動到 Archive（1個）

- **e2e-rate-limit-solution.md** → `docs/archive/solutions/e2e-rate-limit-solution.md`
  - **理由**: 
    - 這是「問題修復記錄」，不是使用指南
    - 問題已解決，屬於歷史記錄
    - 放在主 docs/ 目錄層級過高
  - **行動**: 移動到 archive，並在 `docs/testing/TESTING.md` 添加參考連結

---

## 3️⃣ Testing 目錄（5 → 4）

### 📁 當前狀況

```
docs/testing/
├── E2E-TESTING-GUIDE.md      (335 行) - 舊版架構指南
├── E2E_TESTING_GUIDE.md      (310 行) - 新版優化指南 ⭐
├── TESTING.md                (428 行) - 測試總覽
├── README.md                 (156 行) - 目錄導航
└── SUMMARY.md                (289 行) - 上線評估報告
```

### 🎯 清理策略

#### ❌ 刪除（1個）

- **E2E-TESTING-GUIDE.md** （連字號版本）
  - **理由**: 
    - 舊版文檔（過去式修復記錄）
    - E2E_TESTING_GUIDE.md（底線版本）更新、更實用
    - 修復記錄應移至 TESTING.md 的「歷史記錄」章節
  - **行動**: 刪除，將重要修復紀錄合併到 TESTING.md

#### ✅ 保留（4個）

1. **E2E_TESTING_GUIDE.md** ⭐ **主要 E2E 指南**
   - 最新的優化實踐、命令大全、故障排除

2. **TESTING.md** 📊 **測試總覽**
   - 所有測試的入口文檔、覆蓋率統計

3. **README.md** 📚 **導航索引**
   - 快速導航、角色推薦

4. **SUMMARY.md** 📈 **評估報告**
   - 上線前的測試評估（給管理層）

---

## 4️⃣ Scripts 清理（19 → 15）

### 📁 當前狀況

**✅ 活躍使用中的腳本（9個）**:

| 腳本 | 引用位置 | 用途 |
|------|---------|------|
| `ci-check.sh` | package.json | CI 檢查（lint + test）|
| `commit.sh` | package.json | 檢查通過後提交 |
| `dev-start.sh` | package.json | 開發環境啟動 |
| `e2e-admin-start.sh` | package.json | E2E Admin 測試 |
| `init-db.sql` | docker-compose.yml | 資料庫初始化 |
| `validate-env.sh` | docs/devops/ | 環境變數驗證 |
| `verify-redis-helper.cjs` | docs/e2e/ | Redis 工具驗證 |
| `verify-role-system.sh` | docs/ROLE_SYSTEM/ | 角色系統驗證 |
| `health-check.sh` | docs/devops/ | 系統健康檢查 |

**⚠️ 文檔引用但未在 package.json（6個）**:

| 腳本 | 引用位置 | 狀態 |
|------|---------|------|
| `backup-database.sh` | docs/devops/ | 運維腳本（手動執行）|
| `db-monitoring.sql` | docs/archive/ | 監控視圖（手動安裝）|
| `start-e2e-env.sh` | docs/devops/ | 由 e2e-admin-start.sh 呼叫 |
| `start-e2e-services.sh` | docs/devops/ | 由其他腳本呼叫 |
| `e2e-test-run.sh` | docs/archive/ | 舊版 E2E 執行器 |
| `seed-redis-test-users.js` | （未找到引用）| 測試資料種子 |

**❌ 無任何引用的腳本（4個）**:

| 腳本 | 推測用途 | 建議 |
|------|---------|------|
| `check-services.sh` | 服務檢查？ | 合併到 health-check.sh |
| `docker-manager.sh` | Docker 管理？ | 合併到 dev-start.sh |
| `e2e-test.sh` | E2E 測試？ | 已被 e2e-admin-start.sh 取代 |
| `seed-test-users.sql` | 測試資料？ | 合併到 init-db.sql 或獨立保留 |

### 🎯 清理策略

#### 🔀 合併腳本（4個 → 減少到 15 個）

1. **check-services.sh** + **health-check.sh** → `health-check.sh`
   - 理由: 功能重複（都是檢查服務狀態）
   - 行動: 將 check-services 功能整合到 health-check

2. **docker-manager.sh** → 功能分散到 `dev-start.sh` 和 `docker-compose.yml`
   - 理由: dev-start.sh 已涵蓋 Docker 管理
   - 行動: 刪除 docker-manager.sh

3. **e2e-test.sh** + **e2e-test-run.sh** → 已被 `e2e-admin-start.sh` 取代
   - 理由: 舊版執行器，已不再使用
   - 行動: 刪除這兩個腳本

4. **seed-test-users.sql** → 合併到 `init-db.sql` 或移到 `infrastructure/postgres/seeds/`
   - 理由: 統一測試資料管理
   - 行動: 視需求決定合併或移動

#### ✅ 保留的核心腳本（15個）

**開發與 CI（3個）**:
- ci-check.sh
- commit.sh  
- dev-start.sh

**E2E 測試（2個）**:
- e2e-admin-start.sh
- start-e2e-env.sh
- start-e2e-services.sh

**資料庫（3個）**:
- init-db.sql
- db-monitoring.sql
- seed-redis-test-users.js

**運維（4個）**:
- backup-database.sh
- health-check.sh（合併後）
- validate-env.sh

**驗證（3個）**:
- verify-redis-helper.cjs
- verify-role-system.sh

---

## 🎬 執行計劃

### Phase 1: 備份（必須）

```bash
# 1. 創建備份目錄
mkdir -p backups/cleanup-2025-02-16

# 2. 備份要修改/刪除的文件
cp docs/ROLE_SYSTEM_*.md backups/cleanup-2025-02-16/
cp docs/e2e-rate*.md backups/cleanup-2025-02-16/
cp docs/testing/E2E-TESTING-GUIDE.md backups/cleanup-2025-02-16/
cp scripts/{check-services,docker-manager,e2e-test,e2e-test-run}.sh backups/cleanup-2025-02-16/
```

### Phase 2: 角色系統文檔整合

#### Step 1: 合併 IMPLEMENTATION_SUMMARY → COMPLETION_REPORT

```bash
# 在 COMPLETION_REPORT.md 末尾添加「附錄：變更檔案清單」
# 從 IMPLEMENTATION_SUMMARY 複製檔案列表
```

#### Step 2: 精簡 README → QUICK_REFERENCE

```bash
# 在 QUICK_REFERENCE.md 頂部添加「文檔導航」區塊
# 內容來自 README.md 的導航部分
```

#### Step 3: 刪除已合併的文件

```bash
git rm docs/ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md
git rm docs/ROLE_SYSTEM_README.md
```

### Phase 3: E2E 文檔清理

```bash
# 1. 移動到 archive
mkdir -p docs/archive/solutions
git mv docs/e2e-rate-limit-solution.md docs/archive/solutions/

# 2. 刪除摘要
git rm docs/e2e-rate-limit-fix-summary.md

# 3. 在 docs/testing/TESTING.md 添加參考連結
echo "## 歷史修復記錄
- [E2E Rate Limit 修復](../archive/solutions/e2e-rate-limit-solution.md)" >> docs/testing/TESTING.md
```

### Phase 4: Testing 目錄清理

```bash
# 刪除舊版 E2E 指南
git rm docs/testing/E2E-TESTING-GUIDE.md

# 重要修復記錄合併到 TESTING.md
# （手動編輯）
```

### Phase 5: Scripts 合併與清理

```bash
# 1. 合併 check-services.sh 到 health-check.sh
cat scripts/check-services.sh >> scripts/health-check.sh
# （手動整合，避免重複）

# 2. 刪除已合併/過時的腳本
git rm scripts/check-services.sh
git rm scripts/docker-manager.sh
git rm scripts/e2e-test.sh
git rm scripts/e2e-test-run.sh

# 3. 更新 scripts/README.md
# 移除已刪除腳本的說明
```

### Phase 6: 更新交叉引用

```bash
# 1. 更新所有文檔中的連結
# 使用 find + sed 批量替換

# 2. 更新 scripts/README.md
# 移除已刪除腳本的文檔

# 3. 更新主 README.md（如有引用）
```

### Phase 7: 驗證與提交

```bash
# 1. 檢查所有連結是否有效
find docs -name "*.md" -exec grep -H "ROLE_SYSTEM_IMPLEMENTATION_SUMMARY\|ROLE_SYSTEM_README\|e2e-rate-limit-fix-summary\|E2E-TESTING-GUIDE.md" {} \;

# 2. 執行測試確保腳本功能正常
npm run ci:check
./scripts/health-check.sh

# 3. 提交變更
git add -A
git commit -m "docs: cleanup redundant documentation and scripts

- Merge ROLE_SYSTEM docs (5 → 3)
- Archive e2e-rate-limit docs
- Remove duplicate E2E-TESTING-GUIDE
- Consolidate scripts (19 → 15)

Reduces maintenance burden by 29%"
```

---

## 📈 預期成果

### 定量指標

| 指標 | 清理前 | 清理後 | 改善 |
|------|-------|-------|------|
| **總文件數** | 31 | 22 | -29% |
| **角色系統文檔** | 5 | 3 | -40% |
| **E2E 文檔** | 2 | 0（移到 archive）| -100% |
| **Scripts** | 19 | 15 | -21% |
| **重複內容** | ~40% | ~10% | -75% |

### 定性效益

✅ **可發現性提升**
- 清晰的 3 層文檔結構（Quick Reference → Completion Report → Refactoring）
- 角色系統文檔從 5 個減少到 3 個，減少選擇困難

✅ **維護負擔降低**
- 消除 95% 重複的 e2e-rate-limit 文檔
- 統一 enum 定義位置（僅在 Quick Reference）

✅ **腳本整合**
- 合併功能重複的 check-services 和 health-check
- 移除已被取代的舊版 e2e 執行器

✅ **文檔分層清晰**
```
📚 日常使用
├── QUICK_REFERENCE (開發者每日查閱)
├── E2E_TESTING_GUIDE (測試執行指南)
└── TESTING.md (測試總覽)

📊 項目管理
├── COMPLETION_REPORT (成果總結)
└── SUMMARY.md (上線評估)

🏗️ 架構設計
└── REFACTORING.md (長期參考)

📦 歷史記錄
└── archive/ (已解決的問題、舊版文檔)
```

---

## ⚠️ 風險與注意事項

### 風險評估

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|---------|
| **連結失效** | 中 | 中 | Phase 6 統一更新所有引用 |
| **資訊遺失** | 低 | 高 | Phase 1 完整備份所有文件 |
| **腳本功能受損** | 低 | 高 | Phase 7 驗證所有腳本功能 |
| **團隊混淆** | 中 | 低 | 在 Slack 通知變更，更新 README |

### 注意事項

1. **執行前必須備份**
   - 所有要修改/刪除的文件都要備份到 `backups/cleanup-2025-02-16/`

2. **分階段執行**
   - 不要一次執行所有步驟
   - 每個 Phase 執行後驗證功能正常

3. **更新團隊文檔**
   - 在團隊 wiki/Slack 通知文檔結構變更
   - 更新 onboarding 文檔中的文檔導航

4. **保留 Git 歷史**
   - 使用 `git mv` 而非 `rm + add`，保留文件歷史
   - Commit message 要清楚說明刪除/合併理由

---

## 📅 時間估算

| Phase | 預估時間 | 難度 |
|-------|---------|------|
| Phase 1: 備份 | 10 分鐘 | ⭐ 簡單 |
| Phase 2: 角色系統整合 | 30 分鐘 | ⭐⭐ 中等 |
| Phase 3: E2E 文檔清理 | 15 分鐘 | ⭐ 簡單 |
| Phase 4: Testing 清理 | 20 分鐘 | ⭐⭐ 中等 |
| Phase 5: Scripts 整合 | 40 分鐘 | ⭐⭐⭐ 複雜 |
| Phase 6: 更新引用 | 30 分鐘 | ⭐⭐ 中等 |
| Phase 7: 驗證與提交 | 20 分鐘 | ⭐⭐ 中等 |
| **總計** | **2.5 小時** | |

**建議執行時間**: 分 2 次完成
- **第 1 次**: Phase 1-4（文檔清理，1 小時）
- **第 2 次**: Phase 5-7（腳本整合，1.5 小時）

---

## ✅ 驗收標準

清理完成後，確認以下檢查點：

### 文檔結構

- [ ] 角色系統文檔僅剩 3 個（Quick Reference, Completion Report, Refactoring）
- [ ] docs/ 目錄不再有 e2e-rate-limit 文檔（已移到 archive）
- [ ] docs/testing/ 僅剩 E2E_TESTING_GUIDE.md（底線版本）
- [ ] 所有文檔的內部連結都正確

### Scripts

- [ ] scripts/ 目錄剩餘 15 個腳本
- [ ] package.json 中的 npm scripts 都能正常執行
- [ ] health-check.sh 包含原 check-services.sh 的功能
- [ ] 所有主動使用的腳本都有文檔說明

### 功能驗證

- [ ] `npm run ci:check` 正常運行
- [ ] `npm run dev` 正常啟動
- [ ] `npm run e2e:admin:start` 正常執行
- [ ] `./scripts/health-check.sh` 正常檢查

### Git

- [ ] 所有變更已提交
- [ ] Commit message 清楚描述變更
- [ ] 使用 `git mv` 保留文件歷史
- [ ] 備份目錄完整

---

## 📞 後續行動

1. **通知團隊**（Slack/Email）
   ```
   【文檔結構更新通知】

   我們完成了文檔與腳本的清理，主要變更：
   
   ✅ 角色系統文檔：5 → 3（現在更簡潔！）
      - 日常使用請看 ROLE_SYSTEM_QUICK_REFERENCE.md
   
   ✅ E2E 測試指南：請使用 E2E_TESTING_GUIDE.md（底線版本）
   
   ✅ Scripts 整合：health-check.sh 現在包含所有服務檢查
   
   詳細說明：docs/DOCUMENTATION_CLEANUP_PLAN.md
   ```

2. **更新 Onboarding**
   - 更新新人文檔導航
   - 更新 README 的文檔連結

3. **建立定期檢查機制**
   - 每季度檢查一次文檔重複性
   - PR 時檢查是否新增不必要的腳本

---

## 🤔 討論問題

執行前需要確認的問題：

1. **seed-test-users.sql 應該如何處理？**
   - Option A: 合併到 init-db.sql（簡化）
   - Option B: 移到 infrastructure/postgres/seeds/（結構化）
   - Option C: 保持現狀（如果很少變動）

2. **db-monitoring.sql 要保留嗎？**
   - 目前僅在 archive 文檔中引用
   - 如果實際在用，應該移到 infrastructure/postgres/monitoring/

3. **start-e2e-env.sh 和 start-e2e-services.sh 是否重複？**
   - 需要確認它們是否被 e2e-admin-start.sh 內部呼叫
   - 如果是，應保留；如果不是，考慮合併

4. **舊版 e2e-test*.sh 是否有人還在使用？**
   - 確認 CI/CD pipeline 是否引用
   - 確認團隊成員是否還在手動執行

---

**產出單位**: Solution Architect  
**審查者**: Tech Lead, DevOps Engineer  
**執行者**: 開發團隊
