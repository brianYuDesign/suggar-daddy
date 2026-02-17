# Content Service

## 📖 簡介

Content Service 負責處理平台上所有內容相關功能，包括貼文、限時動態、影片的創建、管理、互動和審核。

## 🎯 職責說明

- **內容管理**: 創建、編輯、刪除貼文（Posts）、限時動態（Stories）、影片（Videos）
- **內容瀏覽**: 動態牆（Feed）、內容搜尋、標籤系統
- **互動功能**: 點讚、評論、分享、收藏
- **內容審核**: 審核狀態管理、內容檢舉處理
- **付費內容**: 支援付費解鎖內容（與 Payment Service 整合）
- **內容可見性**: 公開/訂閱者限定/付費內容權限控制

## 🚀 端口和路由

- **端口**: `3006`
- **路由前綴**: 
  - `/api/posts` - 貼文
  - `/api/stories` - 限時動態
  - `/api/videos` - 影片
  - `/api/moderation` - 內容審核

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **快取**: Redis
- **事件**: Kafka Producer
- **搜尋**: PostgreSQL Full-Text Search（未來可升級至 Elasticsearch）

## ⚙️ 環境變數

```bash
# 服務端口
CONTENT_SERVICE_PORT=3006
PORT=3006

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=600  # 快取過期時間（秒）

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=content-service

# 內容設定
MAX_POST_LENGTH=5000
MAX_COMMENT_LENGTH=500
STORY_EXPIRY_HOURS=24
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve content-service

# 建置
nx build content-service

# 執行測試
nx test content-service

# Lint 檢查
nx lint content-service
```

## 📡 API 端點列表

### 貼文 (Posts)

#### 創建貼文

```
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "This is my post content",
  "mediaUrls": ["https://cdn.example.com/image1.jpg"],
  "visibility": "PUBLIC",  // PUBLIC, SUBSCRIBERS_ONLY, PAID
  "price": 10.00,          // 僅當 visibility=PAID 時需要
  "tags": ["lifestyle", "travel"]
}

Response 201:
{
  "postId": "uuid",
  "authorId": "uuid",
  "content": "...",
  "mediaUrls": [...],
  "visibility": "PUBLIC",
  "likesCount": 0,
  "commentsCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得貼文

```
GET /api/posts/:postId
Authorization: Bearer <token>

Response 200:
{
  "postId": "uuid",
  "author": {
    "userId": "uuid",
    "username": "johndoe",
    "avatarUrl": "..."
  },
  "content": "...",
  "mediaUrls": [...],
  "visibility": "PUBLIC",
  "isPurchased": true,  // 付費內容是否已購買
  "likesCount": 150,
  "commentsCount": 23,
  "isLiked": true,      // 當前用戶是否已點讚
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得動態牆

```
GET /api/posts/feed?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "posts": [...],
  "total": 500,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

#### 更新貼文

```
PATCH /api/posts/:postId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated content",
  "tags": ["updated-tag"]
}

Response 200:
{
  "postId": "uuid",
  "content": "Updated content",
  ...
}
```

#### 刪除貼文

```
DELETE /api/posts/:postId
Authorization: Bearer <token>

Response 204: No Content
```

#### 點讚/取消點讚

```
POST /api/posts/:postId/like
Authorization: Bearer <token>

Response 201:
{
  "postId": "uuid",
  "userId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}

DELETE /api/posts/:postId/like
Response 204: No Content
```

#### 取得點讚列表

```
GET /api/posts/:postId/likes?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "likes": [
    {
      "userId": "uuid",
      "username": "user1",
      "avatarUrl": "...",
      "likedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 150
}
```

#### 評論

```
POST /api/posts/:postId/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great post!",
  "parentCommentId": "uuid"  // 可選，用於回覆評論
}

Response 201:
{
  "commentId": "uuid",
  "postId": "uuid",
  "userId": "uuid",
  "content": "Great post!",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得評論列表

```
GET /api/posts/:postId/comments?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "comments": [
    {
      "commentId": "uuid",
      "user": {
        "userId": "uuid",
        "username": "user1",
        "avatarUrl": "..."
      },
      "content": "Great post!",
      "likesCount": 5,
      "repliesCount": 2,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 23
}
```

#### 刪除評論

```
DELETE /api/posts/:postId/comments/:commentId
Authorization: Bearer <token>

Response 204: No Content
```

### 限時動態 (Stories)

#### 創建限時動態

```
POST /api/stories
Authorization: Bearer <token>
Content-Type: application/json

{
  "mediaUrl": "https://cdn.example.com/story.jpg",
  "mediaType": "IMAGE",  // IMAGE or VIDEO
  "duration": 5,         // 秒數，僅影片需要
  "visibility": "PUBLIC"
}

Response 201:
{
  "storyId": "uuid",
  "authorId": "uuid",
  "mediaUrl": "...",
  "expiresAt": "2024-01-02T00:00:00.000Z",  // 24小時後
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得限時動態列表

```
GET /api/stories?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "stories": [
    {
      "storyId": "uuid",
      "author": {...},
      "mediaUrl": "...",
      "viewsCount": 500,
      "isViewed": false,
      "expiresAt": "2024-01-02T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

#### 標記為已觀看

```
POST /api/stories/:storyId/view
Authorization: Bearer <token>

Response 201:
{
  "storyId": "uuid",
  "userId": "uuid",
  "viewedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 刪除限時動態

```
DELETE /api/stories/:storyId
Authorization: Bearer <token>

Response 204: No Content
```

### 影片 (Videos)

#### 上傳影片（與 Media Service 整合）

```
POST /api/videos
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Video Title",
  "description": "Video description",
  "videoUrl": "https://cdn.example.com/video.mp4",
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "duration": 120,  // 秒數
  "visibility": "PUBLIC"
}

Response 201:
{
  "videoId": "uuid",
  "title": "My Video Title",
  "videoUrl": "...",
  "thumbnailUrl": "...",
  "duration": 120,
  "viewsCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得影片列表

```
GET /api/videos?page=1&limit=20&sort=views
Authorization: Bearer <token>

Response 200:
{
  "videos": [...],
  "total": 200
}
```

#### 增加觀看次數

```
POST /api/videos/:videoId/view
Authorization: Bearer <token>

Response 200:
{
  "videoId": "uuid",
  "viewsCount": 501
}
```

### 內容審核 (Moderation)

#### 檢舉內容

```
POST /api/moderation/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentType": "POST",  // POST, COMMENT, STORY, VIDEO
  "contentId": "uuid",
  "reason": "SPAM",       // SPAM, INAPPROPRIATE, HARASSMENT, etc.
  "description": "Detailed reason..."
}

Response 201:
{
  "reportId": "uuid",
  "status": "PENDING",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得待審核內容（僅 ADMIN）

```
GET /api/moderation/pending?page=1&limit=20
Authorization: Bearer <token>  # 需要 ADMIN 角色

Response 200:
{
  "reports": [
    {
      "reportId": "uuid",
      "contentType": "POST",
      "content": {...},
      "reporter": {...},
      "reason": "SPAM",
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

#### 審核內容（僅 ADMIN）

```
PATCH /api/moderation/reports/:reportId
Authorization: Bearer <token>  # 需要 ADMIN 角色
Content-Type: application/json

{
  "status": "APPROVED",  // APPROVED, REJECTED, REMOVED
  "adminNote": "Approved after review"
}

Response 200:
{
  "reportId": "uuid",
  "status": "APPROVED",
  "reviewedBy": "admin-user-id",
  "reviewedAt": "2024-01-01T00:00:00.000Z"
}
```

## 📊 資料模型

### Post Entity

```typescript
{
  postId: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  visibility: 'PUBLIC' | 'SUBSCRIBERS_ONLY' | 'PAID';
  price?: number;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'REMOVED';
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}
```

### Story Entity

```typescript
{
  storyId: string;
  authorId: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  duration?: number;
  visibility: 'PUBLIC' | 'SUBSCRIBERS_ONLY';
  viewsCount: number;
  expiresAt: Date;  // 24 小時後過期
  createdAt: Date;
}
```

### Video Entity

```typescript
{
  videoId: string;
  authorId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  visibility: 'PUBLIC' | 'SUBSCRIBERS_ONLY' | 'PAID';
  price?: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  status: 'PROCESSING' | 'PUBLISHED' | 'FAILED';
  createdAt: Date;
}
```

## 🔄 資料流模式

### 寫入流程

1. 創建內容 API 請求
2. 驗證內容（長度、格式、權限）
3. **寫入 Redis 快取**
4. **發送 Kafka 事件** `content.post.created`
5. 返回成功響應
6. DB Writer Service 消費事件 → 寫入 PostgreSQL

### 讀取流程

1. 查詢 Redis 快取
2. Cache Hit → 檢查可見性權限 → 返回
3. Cache Miss → 查詢 PostgreSQL → 更新快取 → 返回

## 📤 Kafka 事件

- `content.post.created` - 貼文創建
- `content.post.updated` - 貼文更新
- `content.post.deleted` - 貼文刪除
- `content.post.liked` - 貼文點讚
- `content.comment.created` - 評論創建
- `content.story.created` - 限時動態創建
- `content.video.created` - 影片上傳

## 🧪 測試

```bash
# 單元測試
nx test content-service

# 覆蓋率報告
nx test content-service --coverage
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [API 文檔](../../docs/02-開發指南.md)
- [業務邏輯缺口](../../docs/BUSINESS_LOGIC_GAPS.md#content-service)

## 🤝 依賴服務

- **PostgreSQL**: 內容資料讀取
- **Redis**: 快取和計數器
- **Kafka**: 事件發送
- **Payment Service**: 付費內容驗證
- **Media Service**: 媒體上傳處理

## 🚨 已知問題

- 全文搜尋效能待優化（考慮 Elasticsearch）
- 內容推薦算法尚未實作
- 限時動態自動過期清理機制待完善
- 影片串流和轉碼功能尚未整合

## 📝 開發注意事項

1. **付費內容**: 需透過 Payment Service 驗證購買狀態
2. **可見性檢查**: 每次讀取需檢查用戶是否有權限查看
3. **快取失效**: 點讚/評論後需更新快取中的計數器
4. **限時動態**: 使用 Redis TTL 實作 24 小時過期
5. **媒體 URL**: 不儲存實際檔案，僅儲存 CDN URL
