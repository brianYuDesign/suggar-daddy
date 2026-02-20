# Content-Streaming Service - 快速開始指南

## ⚡ 5 分鐘啟動

### 步驟 1: 環境準備

```bash
cd /Users/brianyu/.openclaw/workspace/content-streaming-service

# 複製環境配置
cp .env.example .env
```

### 步驟 2: Docker Compose 啟動（推薦）

```bash
# 啟動所有依賴
docker-compose up -d

# 檢查狀態
docker-compose ps

# 應該看到 3 個服務: postgres, redis, content-streaming-service
```

### 步驟 3: 驗證服務運行

```bash
# 檢查日誌
docker-compose logs -f content-streaming-service

# 看到以下信息表示啟動成功:
# 🚀 Content-Streaming Service listening on port 3001
```

---

## 🧪 測試 API

### 1. 初始化上傳

```bash
curl -X POST http://localhost:3001/api/uploads/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "my-video.mp4",
    "content_type": "video/mp4",
    "file_size": 1073741824
  }'

# 應該返回:
# {
#   "session_id": "uuid-xxx",
#   "chunk_size": 5242880,
#   "total_chunks": 205
# }
```

### 2. 上傳分片

```bash
# 假設 session_id = "abc-123"

# 準備 5MB 測試文件
dd if=/dev/zero bs=1M count=5 of=/tmp/chunk.bin

# 上傳第一個分片
curl -X POST http://localhost:3001/api/uploads/abc-123/chunk?chunkIndex=0 \
  -H "Content-Type: application/octet-stream" \
  --data-binary @/tmp/chunk.bin

# 應該返回:
# {
#   "uploaded": true,
#   "chunkIndex": 0
# }
```

### 3. 完成上傳

```bash
curl -X POST http://localhost:3001/api/uploads/abc-123/complete \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "abc-123",
    "title": "My Awesome Video",
    "description": "A great video",
    "subscription_level": 0
  }'

# 應該返回:
# {
#   "message": "Upload completed successfully",
#   "video_id": "video-uuid"
# }
```

### 4. 取得視頻詳情

```bash
curl http://localhost:3001/api/videos/video-uuid

# 應該返回:
# {
#   "id": "video-uuid",
#   "creator_id": "...",
#   "title": "My Awesome Video",
#   "status": "processing",
#   "qualities": [...],
#   ...
# }
```

### 5. 發佈視頻

```bash
curl -X POST http://localhost:3001/api/videos/video-uuid/publish \
  -H "Content-Type: application/json"
```

### 6. 取得播放列表

```bash
curl http://localhost:3001/api/streaming/video-uuid/playlist

# 應該返回:
# {
#   "video_id": "video-uuid",
#   "qualities": [
#     { "name": "720p", "resolution": "1280x720", "url": "..." },
#     { "name": "480p", "resolution": "854x480", "url": "..." },
#     ...
#   ],
#   "default_quality": "720p"
# }
```

---

## 🧬 本地開發設置

### 不使用 Docker 的方式

```bash
# 安裝依賴
npm install

# 啟動本地 PostgreSQL 和 Redis
# (需要預先安裝好)

# 啟動開發伺服器
npm run dev

# 應該看到:
# [Nest] 12345  - 02/19/2026, 10:00:00 AM   LOG [NestFactory] Starting Nest application...
# 🚀 Content-Streaming Service listening on port 3001
```

### 執行測試

```bash
# 執行所有測試
npm test

# 監看模式（文件變更時自動重新執行）
npm run test:watch

# 生成覆蓋率報告
npm run test:cov
```

---

## 📝 常見操作

### 查看數據庫

```bash
# 連接到 PostgreSQL
docker-compose exec postgres psql -U postgres -d content_streaming

# 查看表
\dt

# 查看視頻表
SELECT * FROM videos;

# 查看轉碼任務
SELECT * FROM transcoding_jobs;

# 退出
\q
```

### 檢查服務日誌

```bash
# 所有服務日誌
docker-compose logs

# 只看應用日誌
docker-compose logs -f content-streaming-service

# 只看最後 100 行
docker-compose logs --tail=100
```

### 重啟服務

```bash
# 重啟應用
docker-compose restart content-streaming-service

# 重啟所有服務
docker-compose restart

# 停止所有
docker-compose down

# 完全重建
docker-compose up -d --force-recreate
```

---

## 🔧 環境配置

### 必須配置的變量

編輯 `.env` 文件：

```env
# AWS S3 (實際使用時)
AWS_ACCESS_KEY_ID=your-actual-key
AWS_SECRET_ACCESS_KEY=your-actual-secret
AWS_S3_BUCKET=your-bucket-name

# Cloudflare (實際使用時)
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_DOMAIN=cdn.yourdomain.com
```

### 開發時的配置

Docker Compose 自動設置了開發環境：
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Application: localhost:3001

---

## 🐛 故障排查

### 無法連接到 PostgreSQL

```bash
# 檢查 PostgreSQL 服務
docker-compose ps postgres

# 查看 PostgreSQL 日誌
docker-compose logs postgres

# 重啟 PostgreSQL
docker-compose restart postgres
```

### 應用無法啟動

```bash
# 查看應用日誌
docker-compose logs content-streaming-service

# 檢查端口 3001 是否被佔用
lsof -i :3001

# 強制重建應用
docker-compose up -d --build content-streaming-service
```

### 數據庫初始化失敗

```bash
# 清除 PostgreSQL 數據卷
docker-compose down -v

# 重新啟動（將重新初始化）
docker-compose up -d
```

---

## 📦 構建生產版本

### 本地構建 Docker 鏡像

```bash
# 構建鏡像
docker build -t content-streaming-service:1.0.0 .

# 標記為最新版本
docker tag content-streaming-service:1.0.0 content-streaming-service:latest

# 檢查鏡像
docker images | grep content-streaming
```

### 推送到 Registry

```bash
# 登錄 Docker Registry
docker login

# 標記鏡像
docker tag content-streaming-service:1.0.0 your-registry/content-streaming-service:1.0.0

# 推送
docker push your-registry/content-streaming-service:1.0.0
```

---

## 📋 檢查清單

啟動前的檢查清單：

- [ ] 已安裝 Docker & Docker Compose
- [ ] 已複製 `.env.example` 為 `.env`
- [ ] 已編輯 `.env` (至少設置 S3 和 Cloudflare)
- [ ] 已運行 `docker-compose up -d`
- [ ] 應用已成功啟動 (檢查日誌)
- [ ] 可以成功調用 API

---

## 🚀 下一步

1. **閱讀 API 文檔**: `docs/openapi.yaml`
2. **學習架構**: `docs/ARCHITECTURE.md`
3. **查看完整 README**: `README.md`
4. **運行測試**: `npm test`
5. **開始開發**: 在 `src/` 目錄修改代碼

---

## 💡 提示

- 使用 `npm run dev` 開啟自動重新加載
- 使用 `npm run test:watch` 實時測試
- 使用 `docker-compose logs -f` 查看實時日誌
- 在 `.env.example` 中查看所有可用配置

---

_最後更新: 2026-02-19_
