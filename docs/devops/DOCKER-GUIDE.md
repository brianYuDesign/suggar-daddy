# 本地開發指南 - Sugar Daddy 項目

## 📋 目錄

1. [快速開始](#快速開始)
2. [開發環境設置](#開發環境設置)
3. [服務架構](#服務架構)
4. [常用命令](#常用命令)
5. [故障排除](#故障排除)
6. [PM2 部署](#pm2-部署)

---

## 🚀 快速開始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (本地開發)
- npm 10+

### 1. 克隆並進入項目

```bash
git clone <repository-url>
cd sugar-daddy
```

### 2. 配置環境變量

```bash
# 複製示例文件
cp .env.example .env

# 編輯 .env (可選，預設值已包含)
# 本地開發通常使用預設值即可
```

### 3. 啟動完整棧

```bash
# 構建並啟動所有服務 (首次運行)
docker-compose up --build

# 之後快速啟動
docker-compose up

# 後台運行
docker-compose up -d
```

### 4. 驗證服務運行

```bash
# 檢查健康狀態
curl http://localhost:3000/health       # Recommendation Service
curl http://localhost:3001/health       # Content-Streaming Service

# 查看服務狀態
docker-compose ps

# 查看服務日誌
docker-compose logs -f recommendation
docker-compose logs -f content-streaming
```

---

## 🔧 開發環境設置

### 本地開發 (不使用 Docker)

如果想在本地直接運行服務以加快開發速度：

#### 1. 啟動數據庫和 Redis (Docker 方式)

```bash
# 只啟動數據庫和緩存服務
docker-compose up postgres redis
```

#### 2. 在另一個終端安裝依賴並運行服務

```bash
# Recommendation Service
cd recommendation-service
npm install
npm run dev

# Content-Streaming Service (新終端)
cd content-streaming-service
npm install
npm run dev
```

### Docker 開發工作流

#### 開發迭代循環

```bash
# 1. 編輯代碼
# 修改 src/** 文件

# 2. 重新構建服務
docker-compose build recommendation
# 或
docker-compose build content-streaming

# 3. 重啟服務
docker-compose up -d

# 4. 查看日誌
docker-compose logs -f recommendation
```

#### 進入容器調試

```bash
# 進入服務容器的 shell
docker-compose exec recommendation sh

# 查看容器進程
docker-compose exec recommendation ps aux

# 執行命令
docker-compose exec recommendation npm run test
```

---

## 🏗️ 服務架構

### 系統拓撲

```
┌─────────────────────────────────────────────────────┐
│          Docker Compose Network                      │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────┐   ┌──────────────────────┐   │
│  │  PostgreSQL      │   │  Redis               │   │
│  │  :5432           │   │  :6379               │   │
│  │  (Persistent)    │   │  (Cache/Queue)       │   │
│  └──────────────────┘   └──────────────────────┘   │
│         ▲                        ▲                    │
│         │                        │                    │
│  ┌──────┴──────┬─────────────────┴──────────┐      │
│  │             │                             │      │
│  ▼             ▼                             ▼      │
│  ┌────────────────────┐   ┌─────────────────────┐  │
│  │ Recommendation Svc │   │ Content-Streaming   │  │
│  │ :3000              │   │ Svc :3001           │  │
│  │ - Popularity algo  │   │ - Video streaming   │  │
│  │ - Caching          │   │ - S3 integration    │  │
│  │ - Filtering        │   │ - FFmpeg transcoding│  │
│  └────────────────────┘   └─────────────────────┘  │
│         ▲                          ▲                 │
└─────────┼──────────────────────────┼─────────────────┘
          │                          │
          └──────────────────────────┘
               API Clients
```

### 服務詳情

| 服務 | 端口 | 語言 | 框架 | 職責 |
|------|------|------|------|------|
| **Recommendation** | 3000 | TypeScript | NestJS | 推薦算法、過濾、排序 |
| **Content-Streaming** | 3001 | TypeScript | NestJS | 視頻上傳、轉碼、CDN 集成 |
| **PostgreSQL** | 5432 | - | - | 主數據存儲 |
| **Redis** | 6379 | - | - | 緩存、會話、隊列 |

---

## 💻 常用命令

### Docker Compose 命令

```bash
# 啟動服務
docker-compose up              # 前台
docker-compose up -d           # 後台

# 重新構建並啟動
docker-compose up --build

# 停止服務
docker-compose down            # 停止並移除容器
docker-compose down -v         # 停止並移除容器和卷

# 查看狀態
docker-compose ps              # 列出容器
docker-compose logs            # 查看所有日誌
docker-compose logs -f         # 實時日誌
docker-compose logs recommendation      # 特定服務日誌

# 執行命令
docker-compose exec <service> <command>

# 例子
docker-compose exec recommendation npm run test
docker-compose exec content-streaming npm run lint
docker-compose exec postgres psql -U postgres
```

### 單個服務開發

```bash
# 只啟動特定服務
docker-compose up postgres redis recommendation

# 重新構建單個服務
docker-compose build recommendation

# 查看特定服務日誌
docker-compose logs -f recommendation
```

### 本地開發命令

```bash
# Recommendation Service
cd recommendation-service
npm run dev           # 開發模式 (watch)
npm run build         # 構建
npm run test          # 運行測試
npm run test:watch   # 測試 watch 模式
npm run test:cov     # 生成覆蓋率報告
npm run lint          # 代碼格式檢查 & 修復

# Content-Streaming Service
cd ../content-streaming-service
npm run dev           # 開發模式
npm run build         # 構建
npm run test          # 運行測試
npm run lint          # 代碼格式檢查
```

### 數據庫管理

```bash
# 連接 PostgreSQL
docker-compose exec postgres psql -U postgres -d sugar_daddy_db

# 基本 SQL 命令
\dt                   # 列出表
SELECT * FROM recommendations;
\q                    # 退出

# 連接 Redis
docker-compose exec redis redis-cli

# 基本 Redis 命令
PING
KEYS *
GET key_name
```

---

## 🔍 故障排除

### 問題 1: 服務無法啟動

**症狀**: `docker-compose up` 報錯

**解決步驟**:

```bash
# 1. 檢查日誌
docker-compose logs

# 2. 清理並重新構建
docker-compose down -v
docker-compose up --build

# 3. 檢查端口佔用
lsof -i :3000  # 3000 端口
lsof -i :3001  # 3001 端口

# 4. 增加 Docker 內存限制 (如果出現 OOM)
# 修改 .docker/config.json 或 Docker Desktop 設置
```

### 問題 2: 數據庫連接失敗

**症狀**: `connection refused` 或 `timeout`

**解決步驟**:

```bash
# 1. 檢查數據庫容器
docker-compose ps postgres

# 2. 查看數據庫日誌
docker-compose logs postgres

# 3. 測試連接
docker-compose exec postgres pg_isready

# 4. 重啟數據庫
docker-compose restart postgres
```

### 問題 3: 代碼更改未反映

**症狀**: 修改代碼後，容器中仍然是舊版本

**解決步驟**:

```bash
# 本地開發模式應該自動更新 (watch 模式)
# 檢查卷掛載是否正確
docker-compose ps

# 如果不是開發模式，需要重新構建
docker-compose build --no-cache recommendation
docker-compose up -d

# 或者進容器手動構建
docker-compose exec recommendation npm run build
```

### 問題 4: 高內存使用

**症狀**: Docker 容器佔用大量內存

**解決步驟**:

```bash
# 檢查內存使用
docker stats

# 減少容器資源
docker-compose down
# 編輯 docker-compose.yml，添加資源限制：
# resources:
#   limits:
#     memory: 512M
```

---

## 🚀 PM2 部署

本項目支持 PM2 部署，與 Docker 環境兼容。

### 安裝 PM2

```bash
npm install -g pm2
pm2 install pm2-logrotate
```

### 運行 PM2 配置

```bash
# 啟動所有應用
pm2 start ecosystem.config.js

# 查看進程狀態
pm2 status
pm2 logs

# 停止/重啟
pm2 restart all
pm2 stop all
```

### 環境變量

PM2 使用 `.env` 文件，確保以下設置：

```bash
# .env
NODE_ENV=production
DATABASE_HOST=localhost      # 如果用 Docker，使用 postgres
REDIS_HOST=localhost         # 如果用 Docker，使用 redis
```

### 限制條件

- ✅ PM2 可與 Docker 容器共存
- ✅ 支持 NODE_ENV 環境變量
- ✅ 自動日誌輪轉
- ❌ 不要同時在 PM2 和 Docker 中運行相同服務

---

## 📊 監控和日誌

### 實時監控

```bash
# 監控容器資源
docker stats

# 監控進程 (本地開發)
pm2 monit

# 查看實時日誌
docker-compose logs -f --all
```

### 日誌文件位置

```
# Docker 日誌
~/.docker/logs/

# PM2 日誌
~/.pm2/logs/

# 應用日誌 (根據 LOG_LEVEL 環境變量)
stdout/stderr
```

---

## 📝 環境變量參考

詳見 `.env.example`

### 關鍵變量

| 變量 | 默認值 | 說明 |
|------|--------|------|
| `NODE_ENV` | development | 運行環境 |
| `PORT` | 3000/3001 | 服務端口 |
| `DATABASE_HOST` | postgres | 數據庫主機 |
| `REDIS_HOST` | redis | Redis 主機 |
| `LOG_LEVEL` | debug | 日誌級別 |

---

## ✅ 檢查清單

快速驗證開發環境：

- [ ] Docker & Docker Compose 已安裝
- [ ] 克隆了項目
- [ ] 複製了 `.env.example` 為 `.env`
- [ ] `docker-compose up --build` 成功
- [ ] `curl http://localhost:3000/health` 返回 200
- [ ] `curl http://localhost:3001/health` 返回 200
- [ ] PostgreSQL 已初始化 (`docker-compose logs postgres`)
- [ ] 可以連接數據庫

---

## 🆘 獲取幫助

- 檢查 GitHub Issues
- 查看 CI/CD 日誌
- 運行 `docker-compose logs` 診斷
- 查看服務日誌: `docker-compose logs <service>`

---

**最後更新**: 2026-02-19  
**維護者**: DevOps Team
