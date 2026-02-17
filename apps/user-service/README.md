# User Service

## 📖 簡介

User Service 負責用戶資料的 CRUD 操作、個人資料管理、用戶搜尋和狀態管理。不處理認證邏輯，僅專注於用戶資料管理。

## 🎯 職責說明

- **用戶資料管理**: 創建、讀取、更新、刪除用戶資料
- **個人資料編輯**: 顯示名稱、頭像、簡介、社交連結等
- **用戶搜尋**: 支援關鍵字搜尋、篩選和排序
- **用戶狀態**: 在線狀態、活躍度、帳號狀態管理
- **關注系統**: 追蹤用戶之間的關注關係
- **黑名單**: 用戶封鎖和隱藏功能

## 🚀 端口和路由

- **端口**: `3001`
- **路由前綴**: `/api/users`

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **快取**: Redis
- **事件**: Kafka Producer

## ⚙️ 環境變數

```bash
# 服務端口
USER_SERVICE_PORT=3001
PORT=3001

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600  # 快取過期時間（秒）

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=user-service

# 分頁設定
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve user-service

# 建置
nx build user-service

# 執行測試
nx test user-service

# Lint 檢查
nx lint user-service
```

## 📡 API 端點列表

### 取得用戶資訊

```
GET /api/users/:userId
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "username": "johndoe",
  "displayName": "John Doe",
  "email": "user@example.com",
  "role": "CREATOR",
  "avatarUrl": "https://cdn.example.com/avatar.jpg",
  "bio": "Hello world!",
  "isOnline": true,
  "followersCount": 1500,
  "followingCount": 300,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 取得當前用戶資料

```
GET /api/users/me
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "username": "johndoe",
  "email": "user@example.com",
  "role": "CREATOR",
  "profile": { ... },
  "settings": { ... }
}
```

### 更新用戶資料

```
PATCH /api/users/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "John Doe Updated",
  "bio": "New bio text",
  "avatarUrl": "https://cdn.example.com/new-avatar.jpg",
  "socialLinks": {
    "twitter": "https://twitter.com/johndoe",
    "instagram": "https://instagram.com/johndoe"
  }
}

Response 200:
{
  "userId": "uuid",
  "displayName": "John Doe Updated",
  ...
}
```

### 搜尋用戶

```
GET /api/users/search?q=john&role=CREATOR&page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "users": [
    {
      "userId": "uuid",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": "...",
      "followersCount": 1500
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### 取得用戶列表

```
GET /api/users?page=1&limit=20&sort=createdAt&order=DESC
Authorization: Bearer <token>

Response 200:
{
  "users": [...],
  "total": 1000,
  "page": 1,
  "limit": 20
}
```

### 關注用戶

```
POST /api/users/:userId/follow
Authorization: Bearer <token>

Response 201:
{
  "followerId": "current-user-id",
  "followingId": "target-user-id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 取消關注

```
DELETE /api/users/:userId/follow
Authorization: Bearer <token>

Response 204: No Content
```

### 取得關注者列表

```
GET /api/users/:userId/followers?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "followers": [
    {
      "userId": "uuid",
      "username": "follower1",
      "avatarUrl": "...",
      "followedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1500,
  "page": 1
}
```

### 取得關注列表

```
GET /api/users/:userId/following?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "following": [...],
  "total": 300,
  "page": 1
}
```

### 封鎖用戶

```
POST /api/users/:userId/block
Authorization: Bearer <token>

Response 201:
{
  "blockerId": "current-user-id",
  "blockedId": "target-user-id",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 解除封鎖

```
DELETE /api/users/:userId/block
Authorization: Bearer <token>

Response 204: No Content
```

### 取得封鎖列表

```
GET /api/users/me/blocked
Authorization: Bearer <token>

Response 200:
{
  "blockedUsers": [
    {
      "userId": "uuid",
      "username": "blockeduser",
      "blockedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5
}
```

### 更新在線狀態

```
PUT /api/users/me/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "isOnline": true,
  "lastActiveAt": "2024-01-01T00:00:00.000Z"
}

Response 200:
{
  "isOnline": true,
  "lastActiveAt": "2024-01-01T00:00:00.000Z"
}
```

### 刪除用戶（軟刪除）

```
DELETE /api/users/:userId
Authorization: Bearer <token>

Response 204: No Content
```

## 📊 資料模型

### User Entity

```typescript
{
  userId: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isOnline: boolean;
  lastActiveAt: Date;
  isVerified: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Follow Entity

```typescript
{
  followId: string;
  followerId: string;  // 關注者
  followingId: string; // 被關注者
  createdAt: Date;
}
```

### Block Entity

```typescript
{
  blockId: string;
  blockerId: string;   // 封鎖者
  blockedId: string;   // 被封鎖者
  createdAt: Date;
}
```

## 🔄 資料流模式

### 寫入流程（CQRS）

1. API 接收更新請求
2. 驗證資料有效性
3. **寫入 Redis 快取**（立即生效）
4. **發送 Kafka 事件** `user.updated`
5. 回傳成功響應
6. DB Writer Service 消費事件 → 寫入 PostgreSQL

### 讀取流程

1. 先查詢 **Redis 快取**
2. Cache Hit → 直接返回
3. Cache Miss → 查詢 **PostgreSQL**
4. 更新 Redis 快取（TTL: 1 小時）
5. 返回資料

## 🎯 快取策略

- **用戶資料**: TTL 1 小時
- **關注數統計**: TTL 5 分鐘
- **在線狀態**: TTL 30 秒
- **搜尋結果**: TTL 10 分鐘

## 📤 Kafka 事件

發送以下事件到 Kafka：

- `user.created` - 新用戶創建
- `user.updated` - 用戶資料更新
- `user.deleted` - 用戶刪除
- `user.followed` - 關注事件
- `user.unfollowed` - 取消關注
- `user.blocked` - 封鎖事件
- `user.unblocked` - 解除封鎖

## 🧪 測試

```bash
# 單元測試
nx test user-service

# 覆蓋率報告
nx test user-service --coverage

# 監聽模式
nx test user-service --watch
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [API 文檔](../../docs/02-開發指南.md)
- [資料庫架構](../../docs/architecture/ADR-001-Pre-Launch-Architecture-Review.md)

## 🤝 依賴服務

- **PostgreSQL**: 用戶資料讀取
- **Redis**: 快取層
- **Kafka**: 事件發送
- **Auth Service**: JWT 驗證（透過 API Gateway）

## 🚨 已知問題

- 關注數統計可能與實際有延遲（快取問題）
- 大量用戶搜尋效能待優化（需考慮 Elasticsearch）
- 用戶隱私設定功能尚未完整實作

請參考 [BUSINESS_LOGIC_GAPS.md](../../docs/BUSINESS_LOGIC_GAPS.md#user-service)。

## 📝 開發注意事項

1. **快取失效**: 更新用戶資料後需手動清除 Redis 快取
2. **軟刪除**: 使用 `isDeleted` flag，不實際刪除資料
3. **關注數**: 使用 Redis 計數器，定期與資料庫同步
4. **權限檢查**: 僅允許用戶更新自己的資料（或 ADMIN）
5. **搜尋效能**: 考慮使用 Elasticsearch 替代資料庫 LIKE 查詢
