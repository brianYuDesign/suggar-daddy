# PM2 服務管理使用指南

PM2 是一個功能強大的進程管理器，專案中已配置好用於管理所有開發服務。

## 🚀 快速開始

```bash
# 啟動所有服務
npm run pm2:start

# 查看狀態
npm run pm2:status

# 停止所有服務
npm run pm2:stop
```

## 📦 管理的服務

### 後端服務（8 個）

| 服務名稱 | Port | 說明 |
|---------|------|------|
| api-gateway | 3000 | API 網關 |
| auth-service | 3002 | 認證服務 |
| user-service | 3001 | 用戶服務 |
| payment-service | 3007 | 支付服務 |
| subscription-service | 3005 | 訂閱服務 |
| content-service | 3006 | 內容服務 |
| media-service | 3008 | 媒體服務 |
| db-writer-service | - | 資料庫寫入服務 |

### 前端應用（2 個）

| 應用名稱 | Port | 說明 |
|---------|------|------|
| web | 4200 | 用戶前台應用 |
| admin | 4300 | 管理後台應用 |

## 🛠️ 常用命令

### npm scripts

```bash
# 啟動所有服務
npm run pm2:start

# 停止所有服務
npm run pm2:stop

# 重啟所有服務
npm run pm2:restart

# 查看服務狀態
npm run pm2:status

# 查看所有日誌（實時）
npm run pm2:logs

# 健康檢查
npm run pm2:health
```

### PM2 直接命令

```bash
# 查看所有進程
pm2 list

# 查看特定服務日誌
pm2 logs api-gateway
pm2 logs web

# 查看最近 100 行日誌
pm2 logs api-gateway --lines 100

# 只看錯誤日誌
pm2 logs --err

# 重啟特定服務
pm2 restart api-gateway
pm2 restart web

# 停止特定服務
pm2 stop admin

# 監控資源使用（互動模式）
pm2 monit

# 查看服務詳細資訊
pm2 show api-gateway

# 清空日誌
pm2 flush
```

## 📊 查看日誌

### 日誌位置

```
logs/pm2/
├── api-gateway-out.log       # 標準輸出
├── api-gateway-error.log     # 錯誤日誌
├── web-out.log
├── web-error.log
└── ... (其他服務日誌)
```

### 查看日誌方式

```bash
# 方式 1: 使用 PM2 命令（推薦，實時）
pm2 logs

# 方式 2: 查看日誌檔案
tail -f logs/pm2/api-gateway-out.log

# 方式 3: 查看最近 N 行
pm2 logs --lines 50

# 方式 4: 查看特定服務
pm2 logs api-gateway --lines 100
```

## 🔧 進階使用

### 只啟動部分服務

```bash
# 只啟動特定服務
pm2 start ecosystem.config.js --only api-gateway,web

# 停止特定服務
pm2 stop api-gateway

# 重啟特定服務
pm2 restart web
```

### 監控和調試

```bash
# 實時監控（CPU、記憶體）
pm2 monit

# 查看詳細資訊
pm2 describe api-gateway

# 重新載入（零停機時間）
pm2 reload api-gateway
```

### 日誌管理

```bash
# 安裝日誌輪轉模組
pm2 install pm2-logrotate

# 配置日誌輪轉
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 清空所有日誌
pm2 flush
```

## 🐛 故障排除

### 服務啟動失敗

```bash
# 1. 查看服務狀態
pm2 status

# 2. 查看錯誤日誌
pm2 logs [service-name] --err --lines 50

# 3. 查看詳細資訊
pm2 show [service-name]

# 4. 檢查 Port 是否被佔用
lsof -ti:3000  # 替換為對應的 port

# 5. 重啟服務
pm2 restart [service-name]
```

### Port 衝突

```bash
# 檢查 Port 佔用
lsof -ti:3000

# 停止所有 PM2 服務
npm run pm2:stop
```

### 記憶體洩漏

```bash
# 監控記憶體使用
pm2 monit

# 設定記憶體限制（在 ecosystem.config.js 中）
# max_memory_restart: '500M'

# 手動重啟高記憶體服務
pm2 restart [service-name]
```

## 📝 配置檔案

### ecosystem.config.js

PM2 的配置檔案位於專案根目錄：

```javascript
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'npx',
      args: 'nx serve api-gateway',
      cwd: PROJECT_ROOT,
      max_memory_restart: '500M',
      error_file: 'logs/pm2/api-gateway-error.log',
      out_file: 'logs/pm2/api-gateway-out.log',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
    // ... 其他服務
  ],
};
```

### 自訂配置

如需修改服務配置：

1. 編輯 `ecosystem.config.js`
2. 重啟服務：`npm run pm2:restart`

## 🎯 最佳實踐

### 日常開發流程

```bash
# 早上啟動開發環境
npm run pm2:start

# 隨時查看狀態
npm run pm2:status

# 需要時查看日誌
npm run pm2:logs [service-name]

# 修改代碼後重啟服務
pm2 restart [service-name]

# 下班停止服務
npm run pm2:stop
```

### 效能優化

1. **記憶體限制**：在 `ecosystem.config.js` 中設定 `max_memory_restart`
2. **日誌輪轉**：安裝 `pm2-logrotate` 避免日誌檔案過大
3. **關閉不需要的服務**：`pm2 stop [service-name]`

### 調試技巧

```bash
# 1. 查看服務是否運行
pm2 status

# 2. 查看錯誤日誌
pm2 logs [service-name] --err

# 3. 查看實時日誌
pm2 logs [service-name] --lines 0

# 4. 監控資源
pm2 monit
```

## 📚 更多資源

- [PM2 官方文檔](https://pm2.keymetrics.io/docs/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)
- [PM2 Log Management](https://pm2.keymetrics.io/docs/usage/log-management/)
- [scripts/pm2/README.md](./scripts/pm2/README.md) - PM2 腳本說明

## ❓ 常見問題

**Q: PM2 需要全局安裝嗎？**  
A: 不需要。專案已將 PM2 安裝為 devDependency，使用 npm scripts 即可。

**Q: 如何只啟動後端服務？**  
A: `pm2 start ecosystem.config.js --only api-gateway,auth-service,user-service`

**Q: 日誌檔案會佔用很多空間嗎？**  
A: 建議安裝 `pm2-logrotate` 自動管理日誌檔案大小。

**Q: 可以在 CI/CD 中使用嗎？**  
A: 可以，PM2 支援各種 CI/CD 環境。

---

**文檔版本**: 1.0.0  
**更新時間**: 2026-02-17
