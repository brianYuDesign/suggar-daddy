# 🚀 快速開始指南

Sugar Daddy 項目的 5 分鐘快速設置指南

---

## 📋 前置需求

確保您已安裝以下工具：

- ✅ Node.js 18+ 和 npm
- ✅ Docker 和 Docker Compose
- ✅ Git

**檢查版本**:
```bash
node --version   # 應該 >= 18
npm --version    # 應該 >= 8
docker --version
docker-compose --version
```

---

## ⚡ 5 分鐘快速啟動

### 1️⃣ 克隆項目

```bash
git clone https://github.com/brianYuDesign/suggar-daddy.git
cd suggar-daddy
```

### 2️⃣ 安裝依賴

```bash
npm install
```

☕ 喝杯咖啡，等待安裝完成...（約 2-3 分鐘）

### 3️⃣ 環境配置

```bash
# 複製環境變數範例檔案
cp .env.example .env
```

> 💡 **提示**: `.env` 文件已經包含開發環境的預設值，通常不需要修改

### 4️⃣ 啟動開發環境

```bash
npm run dev
```

✨ 腳本會自動：
1. 啟動 Docker 容器（PostgreSQL、Redis、Kafka）
2. 等待資料庫就緒
3. 運行資料庫遷移
4. 並行啟動所有後端服務
5. 啟動前端應用

⏱️ **首次啟動需要 2-3 分鐘**（後續啟動約 30 秒）

### 5️⃣ 訪問應用

啟動完成後，打開瀏覽器訪問：

- 🌐 **前端應用**: http://localhost:4200
- 🔧 **API Gateway**: http://localhost:3000
- 📚 **API 文檔**: http://localhost:3000/api/docs

---

## 🎯 常用命令速查

### 開發環境管理

```bash
# ▶️ 啟動開發環境
npm run dev

# ⏹️ 停止所有服務
npm run dev:stop

# 🔄 重置開發環境（清除所有資料）
npm run dev:reset
```

### 測試

```bash
# ✅ 單元測試
npm run test:unit

# 🧪 E2E 測試
npm run test:e2e

# 📊 覆蓋率報告
npm run test:coverage
```

### 建置

```bash
# 🔨 建置所有項目
npm run build:all

# 🏗️ 只建置後端
npm run build:backend

# 🎨 只建置前端
npm run build:frontend
```

### 資料庫操作

```bash
# 🗄️ 運行資料庫遷移
npm run db:migrate

# 🌱 載入測試資料
npm run db:seed

# 💾 備份資料庫
npm run db:backup
```

---

## 🆘 常見問題

### ❓ 端口已被佔用

**錯誤**: `Error: Port 3000 is already in use`

**解決方案**:
```bash
# 停止舊的進程
npm run dev:stop

# 或使用強制重啟
./scripts/dev/start.sh --force
```

### ❓ Docker 容器啟動失敗

**解決方案**:
```bash
# 重啟 Docker 容器
docker-compose down
docker-compose up -d

# 或使用重置腳本
npm run dev:reset --all
```

### ❓ 資料庫連接錯誤

**解決方案**:
```bash
# 檢查 Docker 容器狀態
docker-compose ps

# 重啟 PostgreSQL
docker-compose restart postgres

# 重新運行遷移
npm run db:migrate
```

### ❓ 依賴安裝失敗

**解決方案**:
```bash
# 清理並重新安裝
rm -rf node_modules package-lock.json
npm install
```

### ❓ 前端無法訪問

**解決方案**:
```bash
# 檢查服務狀態
./scripts/dev/start.sh --help

# 重啟前端
nx serve web
```

---

## 🎓 進階使用

### 🎛️ 自訂啟動選項

```bash
# 查看所有選項
./scripts/dev/start.sh --help

# 只啟動核心服務（不啟動前端）
./scripts/dev/start.sh --core-only --no-web

# 啟動所有服務（包含可選服務）
./scripts/dev/start.sh --all

# 啟動 Admin 後台
./scripts/dev/start.sh --admin

# 跳過 Docker 啟動（假設已運行）
./scripts/dev/start.sh --skip-docker
```

### 🧪 測試選項

```bash
# 監聽模式（自動重新運行）
npm run test:unit -- --watch

# 只測試特定項目
npm run test:unit -- api-gateway

# 帶覆蓋率的測試
npm run test:unit -- --coverage

# E2E 調試模式
npm run test:e2e -- --headed --debug
```

### 🏗️ 建置選項

```bash
# 生產環境建置
npm run build:all -- --production

# 建置特定服務
npm run build:backend -- api-gateway

# 建置特定前端應用
npm run build:frontend -- web
```

### 🗄️ 資料庫進階操作

```bash
# 查看遷移選項
npm run db:migrate -- --help

# 回滾遷移
npm run db:migrate -- --rollback

# 預覽遷移（不實際執行）
npm run db:migrate -- --dry-run

# 強制重新載入種子資料
npm run db:seed -- --force

# 只載入 PostgreSQL 種子資料
npm run db:seed -- --postgres-only
```

---

## 📚 延伸閱讀

完成快速開始後，建議閱讀以下文檔：

1. **[腳本系統完整指南](../scripts/README.md)** - 詳細了解所有腳本
2. **[架構文檔](./architecture/README.md)** - 理解系統架構
3. **[API 文檔](./api/README.md)** - 學習 API 使用
4. **[測試指南](./testing/README.md)** - 了解測試策略
5. **[DevOps 指南](./devops/README.md)** - CI/CD 和部署

---

## 🎉 你已準備好！

恭喜！您已成功設置 Sugar Daddy 開發環境。

**下一步建議**:
1. 🔍 探索 [API 文檔](http://localhost:3000/api/docs)
2. 🧪 嘗試運行測試 `npm run test:unit`
3. 📖 閱讀 [貢獻指南](../CONTRIBUTING.md)（如果存在）
4. 💬 加入開發團隊 Slack/Discord 頻道

**需要幫助？**
- 📧 聯繫技術主管
- 💬 在團隊頻道提問
- 📝 查看 [常見問題 FAQ](./FAQ.md)

---

**祝你開發愉快！** 🚀
