# Recommendation Service - API 文檔

## 概覽

推薦服務是一個基於 NestJS 的高性能推薦引擎，提供用戶個性化內容推薦。

**技術棧**: NestJS + Redis + PostgreSQL

**性能指標**:
- 推薦 API 響應時間: <500ms (緩存命中 <50ms)
- 並發處理: 支持數千並發用戶
- 推薦生成: 非阻塞異步更新

---

## 基礎資訊

**Base URL**: `http://localhost:3000/api/v1`

**Response Format**: JSON

**Error Handling**: 標準 HTTP 狀態碼 + JSON 錯誤詳情

---

## 推薦引擎 API

### 1. 獲取用戶推薦

```
GET /api/v1/recommendations/:userId
```

**參數**:
- `userId` (path) - 用戶 ID (必要)
- `limit` (query) - 推薦數量，默認 20，範圍 1-100 (可選)

**Response (200 OK)**:
```json
{
  "user_id": "user-123",
  "count": 5,
  "cache_hit": true,
  "generated_at": "2024-01-15T10:30:00Z",
  "recommendations": [
    {
      "content_id": "content-1",
      "title": "Amazing Article",
      "tags": ["tech", "news"],
      "score": 0.95,
      "reason": "Based on your interests"
    },
    {
      "content_id": "content-2",
      "title": "Another Great Post",
      "tags": ["technology"],
      "score": 0.87,
      "reason": "Trending now"
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:3000/api/v1/recommendations/user-123?limit=20
```

---

### 2. 記錄用戶互動

```
POST /api/v1/recommendations/interactions
```

**Request Body**:
```json
{
  "user_id": "user-123",
  "content_id": "content-1",
  "interaction_type": "like"
}
```

**Interaction Types**:
- `view` - 觀看 (權重: 1)
- `like` - 點讚 (權重: 5)
- `share` - 分享 (權重: 8)
- `comment` - 評論 (權重: 3)
- `skip` - 跳過 (權重: -1)

**Response (204 No Content)**

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/recommendations/interactions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "content_id": "content-1",
    "interaction_type": "like"
  }'
```

---

### 3. 刷新推薦（清空快取）

```
POST /api/v1/recommendations/refresh/:userId
```

**Parameters**:
- `userId` (path) - 用戶 ID (必要)

**Response (200 OK)**:
```json
{
  "user_id": "user-123",
  "count": 5,
  "cache_hit": false,
  "generated_at": "2024-01-15T10:35:00Z",
  "recommendations": [...]
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/recommendations/refresh/user-123
```

---

### 4. 更新內容分數（定期任務）

```
POST /api/v1/recommendations/update-scores
```

**用途**: 重新計算所有內容的熱度分數、新鮮度分數等

**Response (200 OK)**:
```json
{
  "message": "Engagement scores updated successfully",
  "timestamp": "2024-01-15T10:40:00Z"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/recommendations/update-scores
```

---

### 5. 清空推薦快取

```
POST /api/v1/recommendations/clear-cache
```

**用途**: 清空所有 Redis 推薦快取（用於緊急情況或維護）

**Response (200 OK)**:
```json
{
  "message": "All recommendation caches cleared",
  "timestamp": "2024-01-15T10:45:00Z"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/recommendations/clear-cache
```

---

## 內容管理 API

### 1. 獲取所有內容

```
GET /api/v1/contents
```

**Parameters**:
- `limit` (query) - 返回數量，默認 50 (可選)

**Response (200 OK)**:
```json
[
  {
    "id": "content-1",
    "title": "Article Title",
    "description": "...",
    "creator_id": "creator-1",
    "view_count": 100,
    "like_count": 20,
    "share_count": 5,
    "engagement_score": 35.0,
    "tags": ["tech", "news"],
    "created_at": "2024-01-10T00:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### 2. 獲取單個內容

```
GET /api/v1/contents/:id
```

**Response (200 OK)**: 同上 (單個對象)

---

### 3. 創建內容

```
POST /api/v1/contents
```

**Request Body**:
```json
{
  "title": "My New Article",
  "description": "This is about...",
  "creator_id": "creator-1",
  "tags": ["tech", "tutorial"]
}
```

**Response (201 Created)**:
```json
{
  "id": "content-new",
  "title": "My New Article",
  ...
}
```

---

### 4. 更新內容

```
PUT /api/v1/contents/:id
```

**Request Body**:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "is_featured": true
}
```

---

### 5. 記錄觀看

```
POST /api/v1/contents/:id/view
```

**Response (204 No Content)**

---

### 6. 記錄點讚

```
POST /api/v1/contents/:id/like
```

**Response (204 No Content)**

---

### 7. 刪除內容

```
DELETE /api/v1/contents/:id
```

**Response (204 No Content)**

---

## 錯誤處理

**標準錯誤響應格式**:
```json
{
  "statusCode": 400,
  "message": "Bad request message",
  "error": "BadRequest"
}
```

**常見錯誤碼**:
- `400` - Bad Request (缺少必要參數或無效輸入)
- `404` - Not Found (資源不存在)
- `500` - Internal Server Error (服務器錯誤)

---

## 推薦算法邏輯

詳見 [ALGORITHM.md](./ALGORITHM.md)

---

## 環境配置

詳見 [.env.example](.env.example)

---

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 配置環境
cp .env.example .env

# 3. 啟動 Docker Compose (包括 PostgreSQL 和 Redis)
docker-compose up -d

# 4. 運行服務
npm run dev

# 5. 運行測試
npm test

# 6. 檢查測試覆蓋
npm run test:cov
```

---

## 測試

```bash
# 運行所有測試
npm test

# 監視模式
npm run test:watch

# 覆蓋率報告
npm run test:cov
```

當前測試覆蓋率: **70%+** (推薦算法、控制器、服務)

---

## 部署

### Docker 部署

```bash
# 構建鏡像
docker build -t recommendation-service:1.0.0 .

# 使用 Docker Compose
docker-compose up -d

# 查看日誌
docker-compose logs -f recommendation-service
```

### 環境變數

| 變數 | 默認值 | 說明 |
|------|-------|------|
| `NODE_ENV` | development | 運行環境 |
| `PORT` | 3000 | 服務端口 |
| `DATABASE_HOST` | localhost | PostgreSQL 主機 |
| `DATABASE_PORT` | 5432 | PostgreSQL 端口 |
| `DATABASE_USER` | postgres | 數據庫用戶 |
| `DATABASE_PASSWORD` | postgres | 數據庫密碼 |
| `DATABASE_NAME` | recommendation_db | 數據庫名 |
| `REDIS_HOST` | localhost | Redis 主機 |
| `REDIS_PORT` | 6379 | Redis 端口 |
| `RECOMMENDATION_CACHE_TTL` | 3600 | 推薦快取時間 (秒) |
| `RANDOM_EXPLORATION_RATIO` | 0.2 | 隨機探索比例 (20%) |

