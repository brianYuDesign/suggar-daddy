# Scripts 使用指南

Sugar Daddy 項目腳本系統 - 統一、高效、智能的開發工具集

## 🚀 快速開始

### 開發環境

```bash
# 啟動開發環境（核心服務 + Web）
npm run dev

# 啟動所有服務
npm run dev:all

# 只啟動核心服務
npm run dev:core

# 停止服務
npm run dev:stop

# 重置環境
npm run dev:reset --all
```

### 測試

```bash
# 單元測試
npm run test:unit

# E2E 測試
npm run test:e2e

# 整合測試
npm run test:integration

# 覆蓋率報告
npm run test:coverage
```

### 建構

```bash
# 建構所有項目
npm run build:all

# 建構後端服務
npm run build:backend

# 建構前端應用
npm run build:frontend
```

### 資料庫

```bash
# 資料庫遷移
npm run db:migrate

# 載入種子資料
npm run db:seed

# 備份資料庫
npm run db:backup
```

## 📁 目錄結構

```
scripts/
├── core/          # 核心工具庫（錯誤處理、端口檢查、智能等待、並行啟動）
├── dev/           # 開發環境管理（start、stop、reset）
├── test/          # 測試腳本（unit、e2e、integration、coverage）
├── build/         # 建構腳本（all、backend、frontend）
├── deploy/        # 部署腳本（dev、staging、prod）
├── db/            # 資料庫管理（migrate、seed、backup）
└── legacy/        # 舊腳本備份
```

## ✨ 核心特性

### 1. 智能等待（基於健康檢查）

❌ 舊方式：`sleep 30`  
✅ 新方式：`wait_for_service postgres 60`

### 2. 並行啟動（節省 30-40% 時間）

所有後端服務並行啟動，同時並行等待就緒。

### 3. 統一錯誤處理

清晰的日誌輸出、自動記錄錯誤、一致的退出碼。

### 4. 完整文檔

每個腳本都有 `--help` 選項，提供詳細使用說明。

## 🔧 直接使用腳本

```bash
# 查看幫助
./scripts/dev/start.sh --help

# 高級選項
./scripts/dev/start.sh --core-only --no-web
./scripts/test/e2e.sh --headed --debug
./scripts/db/migrate.sh --dry-run
```

## 📊 日誌位置

- 開發環境：`logs/dev/`
- 錯誤日誌：`/tmp/suggar-daddy-logs/error.log`
- 信息日誌：`/tmp/suggar-daddy-logs/info.log`

## 🎯 最佳實踐

1. **智能等待**：使用健康檢查，不使用 sleep
2. **並行執行**：同時啟動多個服務
3. **錯誤處理**：統一的錯誤處理和日誌
4. **資源清理**：註冊清理函數，確保資源釋放

## 🔄 遷移指南

| 舊命令 | 新命令 | 說明 |
|--------|--------|------|
| `npm run dev` | `npm run dev` | 保持不變（但實現優化） |
| `./scripts/dev-start.sh` | `npm run dev` | 建議使用 npm scripts |
| `./scripts/start-e2e-env.sh` | `npm run test:e2e` | 統一入口 |

## 📚 更多信息

每個腳本都有詳細的幫助信息：

```bash
./scripts/dev/start.sh --help
./scripts/test/unit.sh --help
./scripts/db/migrate.sh --help
```

查看核心工具庫：

- `core/error-handler.sh` - 錯誤處理和日誌
- `core/port-checker.sh` - 端口檢查
- `core/wait-for-service.sh` - 智能等待
- `core/parallel-start.sh` - 並行啟動

---

**注意**：舊腳本已備份到 `legacy/` 目錄，可以繼續使用但不建議。
