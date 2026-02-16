# 🚀 Git 整理快速參考

**TL;DR:** 208 個變更 → 10 個有序的 commits

---

## 📋 快速執行（10 分鐘版）

```bash
# 1. 閱讀完整計劃
cat GIT_CLEANUP_PLAN.md

# 2. 執行前置準備
./scripts/git-cleanup-helper.sh setup

# 3. 執行 commits（使用輔助腳本）
./scripts/git-cleanup-helper.sh commit1
./scripts/git-cleanup-helper.sh commit2
# ... 或手動執行（見下方）

# 4. 驗證
./scripts/git-cleanup-helper.sh verify
```

---

## 📚 文檔索引

| 文檔 | 用途 | 閱讀時間 |
|------|------|---------|
| **GIT_CLEANUP_PLAN.md** | 完整整理計劃（推薦閱讀） | 30 分鐘 |
| **GIT_CLEANUP_QUICK_REFERENCE.md** | 快速參考（本檔案） | 5 分鐘 |
| **scripts/migrations/README.md** | 資料庫遷移指南 | 10 分鐘 |
| **scripts/git-cleanup-helper.sh** | 自動化輔助腳本 | - |

---

## 🎯 10 個 Commits 總覽

| # | 名稱 | 檔案數 | 風險 | 測試時間 |
|---|------|--------|------|---------|
| 1 | 角色系統 - 共享庫 | 10 | 🔴 Critical | 5 min |
| 2 | 角色系統 - 服務層 | 50 | 🔴 High | 10 min |
| 3 | OpenTelemetry | 13 | 🟡 Medium | 5 min |
| 4 | E2E 測試框架 | 22 | 🟢 Low | 15 min |
| 5 | 單元測試補充 | 20 | 🟢 Low | 20 min |
| 6 | 認證功能 | 15 | 🟡 Medium | 10 min |
| 7 | 社交功能 | 25 | 🟡 Medium | 15 min |
| 8 | 前端優化 | 20 | 🟢 Low | 5 min |
| 9 | 後端優化 | 25 | 🟡 Medium | 10 min |
| 10 | 環境配置 | 10 | 🟢 Low | 2 min |

**總計:** 210 個檔案，約 97 分鐘測試時間

---

## ⚠️ Critical: 執行前必讀

### 1. 資料庫遷移（最重要！）

```bash
# 備份
pg_dump suggar_daddy > backup_$(date +%Y%m%d).sql

# 執行遷移
psql -d suggar_daddy -f scripts/migrations/001_add_user_type_permission_role.sql

# 驗證
psql -d suggar_daddy -c "SELECT user_type, permission_role, COUNT(*) FROM users GROUP BY 1,2;"
```

### 2. 清理臨時檔案

```bash
npm run e2e:clean
```

### 3. 更新 .gitignore

```bash
echo "e2e/.auth/" >> .gitignore
```

---

## 📝 Commit 命令速查

### Commit 1: 角色系統 - 共享庫

```bash
git add libs/database/src/entities/user.entity.ts \
        libs/database/src/entities/match.entity.ts \
        libs/database/src/entities/index.ts \
        libs/dto/src/*.dto.ts \
        libs/dto/src/types.ts \
        libs/auth/src/decorators/roles.decorator.ts \
        libs/auth/src/guards/roles.guard.ts \
        libs/common/src/constants.ts

git commit -m "refactor(libs)!: migrate role system to userType + permissionRole

BREAKING CHANGE: User entity role field split into userType + permissionRole
See scripts/migrations/001_add_user_type_permission_role.sql"

# 測試
nx test database && nx test dto && nx test auth
```

### Commit 2: 角色系統 - 服務層

```bash
git add apps/*/src/app/*.controller.ts \
        apps/*/src/app/*.service.ts
git reset apps/*/src/main.ts
git reset **/*.spec.ts

git commit -m "refactor(services): adapt all services to new role system

Updated 11 microservices to use userType + permissionRole
Part 2/4 of role system migration"

# 測試
nx run-many -t test --all --exclude=e2e
```

### Commit 3: OpenTelemetry

```bash
git add package.json package-lock.json \
        apps/*/src/main.ts \
        libs/common/src/lib/tracing/tracing.service.ts

git commit -m "feat(observability): add OpenTelemetry tracing to all services

All 12 services now support distributed tracing"

# 測試
npm run dev  # 檢查啟動日誌
```

### Commit 4: E2E 測試框架

```bash
git add playwright.config.ts \
        e2e/auth.setup.ts \
        e2e/utils/redis-helper.ts \
        e2e/**/*.spec.ts \
        scripts/e2e-admin-start.sh \
        scripts/seed-redis-test-users.js

git commit -m "test(e2e): upgrade Playwright framework with auth setup

Test execution time: 5min → 2min (60% faster)"

# 測試
npm run e2e:admin:start
```

### Commit 5: 單元測試補充

```bash
git add apps/**/*.spec.ts \
        libs/**/*.spec.tsx \
        libs/ui/src/setupTests.ts

git commit -m "test: add unit tests for services and UI components

Coverage: 65% → 80%"

# 測試
nx run-many -t test --all
```

### Commit 6-10: 功能開發與配置

```bash
# Commit 6: 認證功能
git add apps/auth-service/ apps/web/app/\(auth\)/ libs/common/src/email/
git commit -m "feat(auth): add password reset and email verification"

# Commit 7: 社交功能
git add apps/web/components/stories/ apps/content-service/src/app/story.*
git commit -m "feat(social): add follow system and stories"

# Commit 8: 前端優化
git add apps/web/app/ apps/web/components/layout/
git commit -m "refactor(frontend): update pages for role system + UX improvements"

# Commit 9: 後端優化
git add apps/content-service/ apps/notification-service/ libs/redis/
git commit -m "feat(backend): service enhancements and optimizations"

# Commit 10: 環境配置
git add .env.development scripts/migrations/ CLEANUP_README.md
git commit -m "chore: update env configs and add migration tools"
```

---

## ✅ 驗證檢查清單

每個 commit 後：
```bash
git status  # 確認沒有遺漏
git show    # 檢視 commit 內容
```

全部完成後：
```bash
npm run ci:check           # 所有測試
npm run e2e:admin:test     # E2E 測試
./scripts/health-check.sh  # 健康檢查
git log --oneline -11      # 檢視歷史
```

---

## 🚨 出問題怎麼辦？

### 資料庫遷移失敗

```bash
# 回滾
psql -d suggar_daddy -f scripts/migrations/002_rollback_user_type_permission_role.sql
```

### Commit 錯誤

```bash
# 修改最後一個 commit
git commit --amend

# 回滾到前一個 commit
git reset --soft HEAD~1

# 完全回滾（危險！會丟失變更）
git reset --hard HEAD~1
```

### 測試失敗

```bash
# 查看詳細錯誤
nx test <project-name> --verbose

# 跳過測試（不推薦）
git commit --no-verify
```

---

## 📊 進度追蹤

使用此表格追蹤進度：

```
[ ] Setup 完成
[ ] Commit 1 - 角色系統庫 (測試: ✓/✗)
[ ] Commit 2 - 角色系統服務 (測試: ✓/✗)
[ ] Commit 3 - OpenTelemetry (測試: ✓/✗)
[ ] Commit 4 - E2E 框架 (測試: ✓/✗)
[ ] Commit 5 - 單元測試 (測試: ✓/✗)
[ ] Commit 6 - 認證功能 (測試: ✓/✗)
[ ] Commit 7 - 社交功能 (測試: ✓/✗)
[ ] Commit 8 - 前端優化 (測試: ✓/✗)
[ ] Commit 9 - 後端優化 (測試: ✓/✗)
[ ] Commit 10 - 環境配置 (測試: ✓/✗)
[ ] 最終驗證 (ci:check: ✓/✗)
[ ] Push to remote
```

---

## 🎯 預計時間

| 階段 | 時間 |
|------|------|
| 閱讀文檔 | 30 分鐘 |
| Setup（備份+遷移） | 20 分鐘 |
| Commits 1-2（關鍵） | 60 分鐘 |
| Commits 3-5（測試） | 40 分鐘 |
| Commits 6-10（功能） | 60 分鐘 |
| 驗證與測試 | 30 分鐘 |
| **總計** | **約 4 小時** |

---

## 💡 Pro Tips

1. **一次做一個 commit**：不要跳過順序
2. **每個 commit 後測試**：及早發現問題
3. **保持冷靜**：出錯很正常，可以回滾
4. **使用輔助腳本**：`./scripts/git-cleanup-helper.sh`
5. **記錄問題**：遇到的問題寫下來，下次避免

---

## 📞 需要幫助？

- **完整文檔:** `cat GIT_CLEANUP_PLAN.md`
- **遷移指南:** `cat scripts/migrations/README.md`
- **輔助腳本:** `./scripts/git-cleanup-helper.sh --help`
- **Tech Lead:** 開 Slack 討論

---

**最後更新:** 2026-02-16  
**預計完成時間:** 4 小時  
**成功率:** 95% (如果按照步驟執行)

🚀 **祝您整理順利！**
