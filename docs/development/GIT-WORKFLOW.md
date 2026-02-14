# Git 提交工作流程指南

---

## Commit Message 格式

使用 Conventional Commits 風格:

```
<type>(<scope>): <簡短描述>

<詳細說明（選填）>
```

### Type 類型

| Type | 說明 | 範例 |
|------|------|------|
| feat | 新功能 | `feat(auth): 新增 OAuth 登入` |
| fix | Bug 修復 | `fix(user): 修復 N+1 查詢問題` |
| perf | 性能優化 | `perf(matching): 優化全表掃描` |
| refactor | 重構 | `refactor(redis): 統一鍵命名規範` |
| test | 測試相關 | `test(e2e): 實作認證流程測試` |
| docs | 文檔更新 | `docs: 更新部署指南` |
| chore | 雜項維護 | `chore: 更新依賴版本` |
| ci | CI/CD 配置 | `ci: 新增 GitHub Actions 流水線` |

### Scope 範圍

後端服務: `auth`, `user`, `matching`, `content`, `payment`, `subscription`, `media`, `notification`, `messaging`, `db-writer`, `gateway`

前端應用: `web`, `admin`

共享庫: `common`, `redis`, `kafka`, `database`, `dto`, `ui`

基礎設施: `docker`, `monitoring`, `postgres`, `ci`

---

## 提交步驟

### 1. 查看變更

```bash
git status
git diff
```

### 2. 暫存檔案

```bash
# 按功能暫存特定檔案（推薦）
git add apps/user-service/src/app/user.service.ts
git add libs/redis/src/constants/ttl.ts

# 或暫存所有修改的檔案
git add -A
```

### 3. 提交

```bash
git commit -m "feat(user): 實作批量查詢優化

- 使用 MGET 取代逐筆 Redis 查詢
- 效能提升 80-95%"
```

### 4. 推送

```bash
git push origin <branch-name>
```

---

## 分批提交建議

大型功能應拆分為多個小型提交:

1. 基礎架構/共享模組先提交
2. 核心邏輯變更
3. 測試案例
4. 文檔更新

範例:

```bash
git commit -m "feat(e2e): 建立 Page Object Model 架構和測試工具"
git commit -m "feat(e2e): 實作認證流程測試 (27 cases)"
git commit -m "feat(e2e): 實作配對流程測試 (12 cases)"
git commit -m "docs(e2e): 新增完整的測試文檔和執行工具"
```

---

## Pull Request 建議

### 標題格式

與 commit message 相同的 conventional 格式，保持簡潔。

### 描述內容

- 概述: 1-3 句說明此 PR 的目的
- 主要變更: 列出變更項目
- 測試: 說明如何驗證
- 相關 Issue: 連結相關的 Issue

### Review 重點

1. 架構設計是否合理
2. 測試是否涵蓋關鍵場景
3. 有無性能或安全性問題
4. 文檔是否完整

---

*原始資料來源: GIT_COMMIT_GUIDE.md*
