# 📋 文檔與腳本清理 - 快速開始

## 🎯 清理目標

減少 **29%** 的文檔和腳本數量，消除重複內容，提升可維護性。

---

## 📊 清理統計

| 類別 | 清理前 | 清理後 | 減少 |
|------|--------|--------|------|
| **角色系統文檔** | 5 | 3 | -40% |
| **E2E 文檔** | 2 | 0* | -100% |
| **Testing 文檔** | 5 | 4 | -20% |
| **Scripts** | 19 | 15 | -21% |
| **總計** | **31** | **22** | **-29%** |

*移動到 `docs/archive/solutions/`

---

## 🚀 快速執行

### 選項 1: 自動化執行（推薦）

```bash
# 1. 閱讀清理計劃
cat docs/DOCUMENTATION_CLEANUP_PLAN.md

# 2. 執行清理腳本（會自動備份）
./scripts/cleanup-docs.sh

# 3. 驗證功能
npm run ci:check
./scripts/health-check.sh

# 4. 提交變更
git add -A
git commit -m "docs: cleanup redundant documentation and scripts

- Merge ROLE_SYSTEM docs (5 → 3)
- Archive e2e-rate-limit docs
- Remove duplicate E2E-TESTING-GUIDE
- Consolidate scripts (19 → 15)

Reduces maintenance burden by 29%"
```

### 選項 2: 手動執行

查看 `docs/DOCUMENTATION_CLEANUP_PLAN.md` 的 **Phase 1-7** 逐步執行。

---

## 📄 核心文檔

### 詳細清理計劃
📖 [`docs/DOCUMENTATION_CLEANUP_PLAN.md`](./docs/DOCUMENTATION_CLEANUP_PLAN.md)

包含：
- 詳細分析報告
- 重複內容統計
- Phase 1-7 執行步驟
- 風險評估與緩解措施
- 驗收標準

### 自動化清理腳本
🔧 [`scripts/cleanup-docs.sh`](./scripts/cleanup-docs.sh)

功能：
- ✅ 自動備份所有變更
- ✅ 執行 Phase 1-5（文檔整合、Scripts 合併）
- ⚠️ Phase 6-7 需手動完成（更新連結、驗證測試）

---

## 🎯 主要變更

### 1️⃣ 角色系統文檔 (5 → 3)

**保留的核心文檔**：

| 文檔 | 用途 | 讀者 |
|------|------|------|
| `ROLE_SYSTEM_QUICK_REFERENCE.md` ⭐ | 日常開發手冊 | 所有開發者 |
| `ROLE_SYSTEM_COMPLETION_REPORT.md` | 項目成果總結 | PM, Tech Lead |
| `ROLE_SYSTEM_REFACTORING.md` | 架構設計方案 | Solution Architect |

**合併/刪除**：
- ❌ `ROLE_SYSTEM_IMPLEMENTATION_SUMMARY.md` → 合併到 COMPLETION_REPORT
- ❌ `ROLE_SYSTEM_README.md` → 合併到 QUICK_REFERENCE 頂部

### 2️⃣ E2E 測試文檔 (2 → 0)

**移動到 Archive**：
- 📦 `e2e-rate-limit-solution.md` → `docs/archive/solutions/`
- ❌ `e2e-rate-limit-fix-summary.md` → 刪除（95% 重複）

**原因**：這些是「問題修復記錄」，不是使用指南，屬於歷史文檔。

### 3️⃣ Testing 目錄 (5 → 4)

**保留**：
- ✅ `E2E_TESTING_GUIDE.md` ⭐ （底線版本，最新優化指南）
- ✅ `TESTING.md`, `README.md`, `SUMMARY.md`

**刪除**：
- ❌ `E2E-TESTING-GUIDE.md` （連字號版本，舊版架構記錄）

### 4️⃣ Scripts (19 → 15)

**合併**：
- 🔀 `check-services.sh` + `health-check.sh` → `health-check.sh`

**刪除**：
- ❌ `docker-manager.sh` （功能已在 dev-start.sh）
- ❌ `e2e-test.sh` （已被 e2e-admin-start.sh 取代）
- ❌ `e2e-test-run.sh` （舊版執行器）

**保留的 15 個核心腳本**：
- 開發與 CI: `ci-check.sh`, `commit.sh`, `dev-start.sh`
- E2E 測試: `e2e-admin-start.sh`, `start-e2e-*.sh`
- 資料庫: `init-db.sql`, `db-monitoring.sql`, `seed-*.{sql,js}`
- 運維: `backup-database.sh`, `health-check.sh`, `validate-env.sh`
- 驗證: `verify-redis-helper.cjs`, `verify-role-system.sh`

---

## ⚠️ 注意事項

### 執行前必讀

1. **先備份**：腳本會自動備份到 `backups/cleanup-YYYY-MM-DD-HHMMSS/`
2. **分階段執行**：可以分兩次完成（文檔 + Scripts）
3. **手動檢查**：Phase 6-7 需要手動更新連結和驗證測試
4. **通知團隊**：清理完成後通知團隊文檔結構變更

### 風險評估

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|---------|
| 連結失效 | 中 | 中 | Phase 6 統一更新引用 |
| 資訊遺失 | 低 | 高 | Phase 1 完整備份 |
| 腳本功能受損 | 低 | 高 | Phase 7 驗證所有功能 |

---

## 📅 執行時間估算

| 階段 | 內容 | 預估時間 |
|------|------|---------|
| **第 1 次** | Phase 1-4（文檔清理）| 1 小時 |
| **第 2 次** | Phase 5-7（Scripts + 驗證）| 1.5 小時 |
| **總計** | | **2.5 小時** |

---

## ✅ 驗收標準

清理完成後，確認：

### 文檔結構
- [ ] 角色系統文檔僅剩 3 個
- [ ] `docs/` 目錄不再有 `e2e-rate-limit` 文檔（已移到 archive）
- [ ] `docs/testing/` 僅剩 `E2E_TESTING_GUIDE.md`（底線版本）
- [ ] 所有文檔的內部連結都正確

### Scripts
- [ ] `scripts/` 目錄剩餘 15 個腳本
- [ ] `health-check.sh` 包含原 `check-services.sh` 的功能
- [ ] 所有 `package.json` 中的 npm scripts 都能正常執行

### 功能驗證
- [ ] `npm run ci:check` 正常運行
- [ ] `npm run dev` 正常啟動
- [ ] `npm run e2e:admin:start` 正常執行
- [ ] `./scripts/health-check.sh` 正常檢查

### Git
- [ ] 所有變更已提交
- [ ] 使用 `git mv` 保留文件歷史
- [ ] Commit message 清楚描述變更
- [ ] 備份目錄完整

---

## 🤔 常見問題

### Q: 為什麼要刪除這些文檔？
**A**: 這些文檔有 40-95% 的內容重複，增加維護負擔。合併後保留最重要的核心內容，提升可發現性。

### Q: 刪除的內容會丟失嗎？
**A**: 不會。
1. 腳本會自動備份到 `backups/` 目錄
2. Git 歷史保留所有變更
3. 重要內容合併到保留的文檔中

### Q: 可以只執行部分清理嗎？
**A**: 可以。你可以：
1. 只執行文檔清理（Phase 2-4）
2. 只執行 Scripts 清理（Phase 5）
3. 根據需要調整清理範圍

### Q: 清理後團隊成員找不到文檔怎麼辦？
**A**: 建議：
1. 在 Slack 通知團隊變更
2. 更新 onboarding 文檔
3. 在主 README 添加文檔導航
4. 保留 `backups/` 目錄 2-4 週

### Q: 如果執行後發現問題怎麼辦？
**A**: 可以回滾：
```bash
# 從備份恢復
cp backups/cleanup-YYYY-MM-DD-HHMMSS/* docs/
cp backups/cleanup-YYYY-MM-DD-HHMMSS/* scripts/

# 或使用 Git 回滾
git reset --hard HEAD~1
```

---

## 📞 後續行動

### 1. 通知團隊（Slack/Email）

```
【文檔結構更新通知】

我們完成了文檔與腳本的清理，主要變更：

✅ 角色系統文檔：5 → 3（現在更簡潔！）
   - 日常使用請看 ROLE_SYSTEM_QUICK_REFERENCE.md

✅ E2E 測試指南：請使用 E2E_TESTING_GUIDE.md（底線版本）

✅ Scripts 整合：health-check.sh 現在包含所有服務檢查

詳細說明：docs/DOCUMENTATION_CLEANUP_PLAN.md
問題回報：<your-slack-channel>
```

### 2. 更新 Onboarding

- 更新新人文檔導航
- 更新主 README 的文檔連結
- 更新團隊 wiki

### 3. 建立定期檢查機制

- 每季度檢查一次文檔重複性
- PR 時檢查是否新增不必要的腳本
- 定期清理 archive 目錄

---

## 🙋 需要幫助？

- 📖 詳細計劃：[DOCUMENTATION_CLEANUP_PLAN.md](./docs/DOCUMENTATION_CLEANUP_PLAN.md)
- 🔧 執行腳本：[cleanup-docs.sh](./scripts/cleanup-docs.sh)
- 💬 問題回報：開 GitHub Issue 或聯繫 Tech Lead

---

**最後更新**: 2025-02-16  
**維護者**: Solution Architect  
**審查者**: Tech Lead, DevOps Engineer
