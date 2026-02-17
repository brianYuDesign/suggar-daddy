# Admin Service

## 📖 簡介

Admin Service 提供管理後台所需的 API 端點，負責系統管理、用戶管理、內容審核、數據統計和系統配置功能。

## 🎯 職責說明

- **用戶管理**: 查看、編輯、封禁、刪除用戶
- **內容審核**: 審核貼文、評論、限時動態
- **統計報表**: 用戶增長、收入報表、平台數據
- **系統配置**: 平台設定、功能開關、公告管理
- **權限管理**: 管理員角色和權限分配
- **日誌查詢**: 系統操作日誌和審計追蹤

## 🚀 端口和路由

- **端口**: `3011`（注意：main.ts 中配置為 3011，非文檔中的 3010）
- **路由前綴**: `/api/admin`

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **權限**: RBAC (Role-Based Access Control)
- **快取**: Redis
- **事件**: Kafka Producer

## ⚙️ 環境變數

```bash
# 服務端口
ADMIN_SERVICE_PORT=3011
PORT=3011

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=admin-service

# 管理員設定
SUPER_ADMIN_EMAIL=admin@example.com
ADMIN_SESSION_TIMEOUT=3600  # 秒
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve admin-service

# 建置
nx build admin-service

# 執行測試
nx test admin-service

# Lint 檢查
nx lint admin-service
```

## 📡 API 端點列表

### 用戶管理

#### 取得用戶列表

```
GET /api/admin/users?page=1&limit=50&role=all&status=all&search=keyword
Authorization: Bearer <token>  # 需要 ADMIN 角色

Query Parameters:
- role: all | SUBSCRIBER | CREATOR | ADMIN
- status: all | active | banned | deleted
- search: 用戶名或 Email
- sort: createdAt | lastLoginAt | subscribersCount

Response 200:
{
  "users": [
    {
      "userId": "uuid",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "CREATOR",
      "isVerified": true,
      "isBanned": false,
      "subscribersCount": 1500,
      "totalEarnings": 15000.50,
      "lastLoginAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "total": 10000,
  "page": 1,
  "limit": 50
}
```

#### 取得用戶詳情

```
GET /api/admin/users/:userId
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "role": "CREATOR",
  "profile": {...},
  "statistics": {
    "subscribersCount": 1500,
    "postsCount": 200,
    "totalEarnings": 15000.50,
    "totalWithdrawals": 10000.00
  },
  "status": {
    "isVerified": true,
    "isBanned": false,
    "isDeleted": false
  },
  "activityLog": [
    {
      "action": "LOGIN",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "ip": "192.168.1.1"
    }
  ],
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

#### 更新用戶

```
PATCH /api/admin/users/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "ADMIN",
  "isVerified": true,
  "adminNote": "Verified user identity"
}

Response 200:
{
  "userId": "uuid",
  "role": "ADMIN",
  "isVerified": true,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 封禁/解封用戶

```
POST /api/admin/users/:userId/ban
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Violated community guidelines",
  "duration": 7,  // 天數，null = 永久
  "notify": true
}

Response 200:
{
  "userId": "uuid",
  "isBanned": true,
  "bannedUntil": "2024-01-08T00:00:00.000Z",
  "bannedAt": "2024-01-01T00:00:00.000Z"
}

# 解封
POST /api/admin/users/:userId/unban
Response 200:
{
  "userId": "uuid",
  "isBanned": false,
  "unbannedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 刪除用戶

```
DELETE /api/admin/users/:userId?permanent=false
Authorization: Bearer <token>

Query Parameters:
- permanent: false (軟刪除) | true (永久刪除)

Response 204: No Content
```

### 內容審核

#### 取得待審核內容

```
GET /api/admin/moderation/pending?type=all&page=1&limit=20
Authorization: Bearer <token>

Query Parameters:
- type: all | post | comment | story | video

Response 200:
{
  "items": [
    {
      "reportId": "uuid",
      "contentType": "POST",
      "contentId": "uuid",
      "content": {...},
      "reporter": {...},
      "reason": "SPAM",
      "description": "...",
      "reportedAt": "2024-01-01T00:00:00.000Z",
      "status": "PENDING"
    }
  ],
  "total": 50,
  "urgentCount": 10
}
```

#### 審核內容

```
PATCH /api/admin/moderation/reports/:reportId
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "APPROVE",  // APPROVE, REMOVE, WARN
  "adminNote": "Content is appropriate",
  "notifyUser": true
}

Response 200:
{
  "reportId": "uuid",
  "status": "RESOLVED",
  "action": "APPROVE",
  "reviewedBy": "admin-user-id",
  "reviewedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 批次審核

```
POST /api/admin/moderation/batch-review
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportIds": ["uuid1", "uuid2"],
  "action": "REMOVE",
  "adminNote": "Batch removal of spam"
}

Response 200:
{
  "processed": 2,
  "results": [...]
}
```

### 統計報表

#### 取得平台統計

```
GET /api/admin/stats/overview
Authorization: Bearer <token>

Response 200:
{
  "users": {
    "total": 10000,
    "active": 7500,
    "new_today": 50,
    "new_this_month": 800,
    "growth_rate": 15.5  // 百分比
  },
  "creators": {
    "total": 2000,
    "verified": 500,
    "active": 1500
  },
  "content": {
    "posts": 50000,
    "stories": 10000,
    "videos": 5000
  },
  "revenue": {
    "total": 500000.00,
    "this_month": 50000.00,
    "platform_fee": 10000.00
  },
  "subscriptions": {
    "active": 8000,
    "monthly_recurring_revenue": 80000.00
  }
}
```

#### 取得用戶增長數據

```
GET /api/admin/stats/user-growth?period=30d&interval=day
Authorization: Bearer <token>

Query Parameters:
- period: 7d | 30d | 90d | 1y
- interval: hour | day | week | month

Response 200:
{
  "period": "30d",
  "interval": "day",
  "data": [
    {
      "date": "2024-01-01",
      "new_users": 25,
      "total_users": 9500
    },
    {
      "date": "2024-01-02",
      "new_users": 30,
      "total_users": 9530
    }
  ],
  "summary": {
    "total_new": 800,
    "average_daily": 26.7,
    "growth_rate": 8.4
  }
}
```

#### 取得收入報表

```
GET /api/admin/stats/revenue?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>

Response 200:
{
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "revenue": {
    "total": 50000.00,
    "tips": 20000.00,
    "subscriptions": 25000.00,
    "post_purchases": 5000.00
  },
  "platform_fee": 10000.00,
  "creator_earnings": 40000.00,
  "daily_breakdown": [
    {
      "date": "2024-01-01",
      "revenue": 1500.00,
      "transactions": 50
    }
  ],
  "top_creators": [
    {
      "userId": "uuid",
      "username": "top_creator",
      "earnings": 5000.00
    }
  ]
}
```

#### 取得內容統計

```
GET /api/admin/stats/content?period=30d
Authorization: Bearer <token>

Response 200:
{
  "posts": {
    "total": 5000,
    "published": 4800,
    "removed": 200,
    "engagement_rate": 12.5
  },
  "stories": {
    "total": 2000,
    "average_views": 500
  },
  "videos": {
    "total": 500,
    "total_views": 250000
  },
  "moderation": {
    "reports": 100,
    "resolved": 90,
    "pending": 10
  }
}
```

### 系統配置

#### 取得系統配置

```
GET /api/admin/settings
Authorization: Bearer <token>

Response 200:
{
  "platform": {
    "name": "Sugar Daddy",
    "maintenanceMode": false,
    "registrationEnabled": true
  },
  "fees": {
    "platformFeePercentage": 20,
    "minTipAmount": 1.00,
    "minWithdrawalAmount": 50.00
  },
  "limits": {
    "maxPostLength": 5000,
    "maxFileSize": 104857600,
    "maxUserSkills": 10
  },
  "features": {
    "subscriptionsEnabled": true,
    "storiesEnabled": true,
    "videosEnabled": true
  }
}
```

#### 更新系統配置

```
PATCH /api/admin/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": {
    "maintenanceMode": true
  },
  "fees": {
    "platformFeePercentage": 15
  }
}

Response 200:
{
  "settings": {...},
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 公告管理

#### 創建公告

```
POST /api/admin/announcements
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Platform Maintenance",
  "content": "We will be performing maintenance...",
  "type": "INFO",  // INFO, WARNING, ALERT
  "targetAudience": "ALL",  // ALL, CREATORS, SUBSCRIBERS
  "expiresAt": "2024-01-10T00:00:00.000Z"
}

Response 201:
{
  "announcementId": "uuid",
  "title": "Platform Maintenance",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得公告列表

```
GET /api/admin/announcements?active=true
Authorization: Bearer <token>

Response 200:
{
  "announcements": [...]
}
```

### 操作日誌

#### 取得操作日誌

```
GET /api/admin/audit-logs?page=1&limit=50&action=all&adminId=uuid
Authorization: Bearer <token>

Query Parameters:
- action: all | user_ban | content_remove | settings_update
- adminId: 特定管理員

Response 200:
{
  "logs": [
    {
      "logId": "uuid",
      "admin": {...},
      "action": "USER_BAN",
      "target": {
        "type": "USER",
        "id": "user-uuid"
      },
      "details": {...},
      "ip": "192.168.1.1",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1000
}
```

## 🔒 權限控制

所有 Admin Service 端點都需要 **ADMIN 角色**。

```typescript
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
```

## 📊 資料模型

### AuditLog Entity

```typescript
{
  logId: string;
  adminId: string;
  action: string;
  targetType: 'USER' | 'POST' | 'SETTINGS';
  targetId: string;
  details: Record<string, any>;
  ip: string;
  userAgent: string;
  createdAt: Date;
}
```

## 📤 Kafka 事件

- `admin.user.banned` - 用戶被封禁
- `admin.content.removed` - 內容被移除
- `admin.settings.updated` - 系統設定變更

## 🧪 測試

```bash
# 單元測試
nx test admin-service

# 覆蓋率報告
nx test admin-service --coverage
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [管理後台](../admin/README.md)

## 🤝 依賴服務

- **PostgreSQL**: 讀寫資料庫（Admin 有直接寫入權限）
- **Redis**: 快取
- **Kafka**: 事件發送

## 🚨 已知問題

- 細粒度權限管理待實作
- 數據匯出功能有限
- 即時監控儀表板待開發

## 📝 開發注意事項

1. **審計日誌**: 所有管理操作都需記錄
2. **權限檢查**: 每個端點都需驗證 ADMIN 角色
3. **敏感操作**: 刪除、封禁等操作需二次確認
4. **效能**: 大量資料查詢需要分頁和索引優化
