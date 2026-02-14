# Scripts 目錄

這個目錄包含專案的關鍵自動化腳本。

## 📋 腳本清單

### 開發與 CI 腳本

| 腳本 | 用途 | 執行方式 |
|------|------|---------|
| **ci-check.sh** | Lint + Test 檢查（CI 用） | `npm run ci:check` |
| **commit.sh** | 檢查通過後提交 | `npm run commit -- "message"` |
| **validate-env.sh** | 環境變數驗證 | `./scripts/validate-env.sh` |

### 資料庫腳本

| 腳本 | 用途 | 執行方式 |
|------|------|---------|
| **init-db.sql** | 資料庫初始化（PostgreSQL extensions） | Docker 自動執行 |
| **db-monitoring.sql** | 監控視圖（表大小、慢查詢、索引等） | `psql -f scripts/db-monitoring.sql` |

### 運維腳本

| 腳本 | 用途 | 執行方式 |
|------|------|---------|
| **backup-database.sh** | 自動備份 PostgreSQL + Redis | `./scripts/backup-database.sh` |
| **health-check.sh** | 系統健康檢查（12 項檢查） | `./scripts/health-check.sh` |

---

## 使用說明

### ci-check（僅檢查）

跑完 **lint** 再跑 **test**，任一失敗即結束，適合 CI 或提交前手動檢查。

```bash
npm run ci:check
# 或
./scripts/ci-check.sh
```

### commit（檢查通過再提交）

依序執行 **lint → test**，全部通過後才 `git add -A` 並 `git commit`。

```bash
# 一般用法
npm run commit -- "feat: add login"
npm run commit -- -m "fix: typo in auth"

# 只跑檢查、不提交
./scripts/commit.sh --no-commit

# 跳過檢查、只提交（慎用）
./scripts/commit.sh --skip-check "hotfix: emergency"
```

### 環境驗證

```bash
./scripts/validate-env.sh
```

檢查所有必需的環境變數是否正確設置。

### 資料庫備份

```bash
# 手動執行
./scripts/backup-database.sh

# 設定自動備份（cron）
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

### 健康檢查

```bash
# 手動執行
./scripts/health-check.sh

# 定期檢查（每 5 分鐘）
*/5 * * * * /path/to/scripts/health-check.sh
```

### 資料庫監控視圖

```bash
# 安裝監控視圖
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -f /app/scripts/db-monitoring.sql

# 查詢範例
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_table_sizes LIMIT 10;"
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_slow_queries;"
```

---

## 排錯指南

### Lint / Test 錯誤

| 階段 | 錯誤類型 | 解決方式 |
|------|---------|---------|
| **Lint** | `Failed to load Nx plugin` | 使用 fallback：`SKIP_NX=1 npm run ci:check` |
| **Lint** | `error TS2xxx: ...` | 依檔案:行號修正型別錯誤 |
| **Test** | Jest 測試失敗 | 單獨跑：`npx jest --config libs/xxx/jest.config.ts` |

**快速檢查特定檔案：**

```bash
# TypeScript 檢查
npx tsc --noEmit -p apps/user-service/tsconfig.app.json

# 單一測試
npx jest --config libs/common/jest.config.ts --no-cache
```
