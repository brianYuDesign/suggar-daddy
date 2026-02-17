# PM2 管理腳本

本目錄包含使用 PM2 進行服務管理的腳本。

## 腳本說明

| 腳本 | 功能 | 使用方式 |
|-----|------|---------|
| `start-services.sh` | 啟動所有 PM2 服務 | `npm run pm2:start` |
| `stop-services.sh` | 停止並清理 PM2 服務 | `npm run pm2:stop` |
| `restart-services.sh` | 重啟 PM2 服務 | `npm run pm2:restart` |
| `status.sh` | 查看服務狀態 | `npm run pm2:status` |
| `logs.sh` | 查看服務日誌 | `npm run pm2:logs` |
| `health-check.sh` | 健康檢查腳本 | `npm run pm2:health` |

## 快速使用

```bash
# 啟動所有服務
npm run pm2:start

# 查看狀態
npm run pm2:status

# 查看日誌
npm run pm2:logs

# 停止所有服務
npm run pm2:stop
```

## 詳細文檔

請查看 [PM2-E2E-GUIDE.md](../../docs/PM2-E2E-GUIDE.md)
