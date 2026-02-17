# Skill Service

## 📖 簡介

Skill Service 負責技能系統管理，包括技能標籤的創建、用戶技能設定和技能匹配功能，用於提升配對精準度和內容推薦。

## 🎯 職責說明

- **技能管理**: 創建、編輯、刪除技能標籤
- **技能分類**: 技能分類和層級管理
- **用戶技能**: 用戶設定自己的技能標籤
- **技能匹配**: 基於技能的用戶配對和推薦
- **技能搜尋**: 根據技能搜尋用戶或內容
- **技能統計**: 技能熱度和使用統計

## 🚀 端口和路由

- **端口**: `3010`
- **路由前綴**: `/api/skills`

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
SKILL_SERVICE_PORT=3010
PORT=3010

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=skill-service

# 技能設定
MAX_USER_SKILLS=10
MIN_SKILL_NAME_LENGTH=2
MAX_SKILL_NAME_LENGTH=50
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve skill-service

# 建置
nx build skill-service

# 執行測試
nx test skill-service

# E2E 測試
nx e2e skill-service-e2e

# Lint 檢查
nx lint skill-service
```

## 📡 API 端點列表

### 技能管理

#### 取得所有技能

```
GET /api/skills?category=all&page=1&limit=100
Authorization: Bearer <token>

Query Parameters:
- category: 技能分類 (all, tech, lifestyle, art, etc.)
- search: 搜尋關鍵字
- sort: popular (熱門度) | alphabetical (字母順序)

Response 200:
{
  "skills": [
    {
      "skillId": "uuid",
      "name": "Photography",
      "category": "ART",
      "usersCount": 1500,
      "icon": "📷",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 150
}
```

#### 取得技能詳情

```
GET /api/skills/:skillId
Authorization: Bearer <token>

Response 200:
{
  "skillId": "uuid",
  "name": "Photography",
  "description": "Professional photography skills",
  "category": "ART",
  "subcategory": "Visual Arts",
  "usersCount": 1500,
  "icon": "📷",
  "relatedSkills": [
    {
      "skillId": "uuid",
      "name": "Video Editing"
    }
  ],
  "trendingScore": 85,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 創建技能（僅 ADMIN）

```
POST /api/skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Photography",
  "description": "Professional photography skills",
  "category": "ART",
  "subcategory": "Visual Arts",
  "icon": "📷"
}

Response 201:
{
  "skillId": "uuid",
  "name": "Photography",
  "category": "ART",
  "usersCount": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 更新技能（僅 ADMIN）

```
PATCH /api/skills/:skillId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Professional Photography",
  "description": "Updated description",
  "category": "ART"
}

Response 200:
{
  "skillId": "uuid",
  "name": "Professional Photography",
  ...
}
```

#### 刪除技能（僅 ADMIN）

```
DELETE /api/skills/:skillId
Authorization: Bearer <token>

Response 204: No Content
```

### 用戶技能

#### 取得用戶技能列表

```
GET /api/skills/user/:userId
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "skills": [
    {
      "skillId": "uuid",
      "name": "Photography",
      "category": "ART",
      "proficiencyLevel": "EXPERT",  // BEGINNER, INTERMEDIATE, EXPERT
      "yearsOfExperience": 5,
      "isVerified": true,
      "addedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 8
}
```

#### 取得當前用戶技能

```
GET /api/skills/me
Authorization: Bearer <token>

Response 200:
{
  "skills": [...],
  "total": 8,
  "maxSkills": 10
}
```

#### 添加技能到個人資料

```
POST /api/skills/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "skillId": "uuid",
  "proficiencyLevel": "INTERMEDIATE",  // 可選
  "yearsOfExperience": 3              // 可選
}

Response 201:
{
  "userSkillId": "uuid",
  "skillId": "uuid",
  "skill": {
    "name": "Photography",
    "category": "ART"
  },
  "proficiencyLevel": "INTERMEDIATE",
  "addedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 更新技能熟練度

```
PATCH /api/skills/me/:skillId
Authorization: Bearer <token>
Content-Type: application/json

{
  "proficiencyLevel": "EXPERT",
  "yearsOfExperience": 5
}

Response 200:
{
  "userSkillId": "uuid",
  "proficiencyLevel": "EXPERT",
  "yearsOfExperience": 5,
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 移除個人技能

```
DELETE /api/skills/me/:skillId
Authorization: Bearer <token>

Response 204: No Content
```

#### 批次添加技能

```
POST /api/skills/me/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "skills": [
    {
      "skillId": "uuid-1",
      "proficiencyLevel": "INTERMEDIATE"
    },
    {
      "skillId": "uuid-2",
      "proficiencyLevel": "EXPERT"
    }
  ]
}

Response 201:
{
  "added": 2,
  "skills": [...]
}
```

### 技能匹配

#### 根據技能推薦用戶

```
GET /api/skills/recommendations?skillIds=uuid1,uuid2&limit=20
Authorization: Bearer <token>

Response 200:
{
  "recommendations": [
    {
      "userId": "uuid",
      "username": "johndoe",
      "avatarUrl": "...",
      "matchingSkills": [
        {
          "skillId": "uuid",
          "name": "Photography"
        }
      ],
      "matchScore": 85,  // 0-100 匹配分數
      "commonSkillsCount": 3
    }
  ],
  "total": 50
}
```

#### 根據技能搜尋用戶

```
GET /api/skills/search/users?skillId=uuid&proficiencyLevel=EXPERT&page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "users": [
    {
      "userId": "uuid",
      "username": "johndoe",
      "avatarUrl": "...",
      "skills": [...],
      "proficiencyLevel": "EXPERT",
      "yearsOfExperience": 5
    }
  ],
  "total": 100
}
```

#### 取得技能相似用戶

```
GET /api/skills/similar/:userId?limit=10
Authorization: Bearer <token>

Response 200:
{
  "similarUsers": [
    {
      "userId": "uuid",
      "username": "janedoe",
      "commonSkills": 5,
      "matchScore": 78
    }
  ],
  "total": 25
}
```

### 技能統計

#### 取得技能統計資訊

```
GET /api/skills/:skillId/stats
Authorization: Bearer <token>

Response 200:
{
  "skillId": "uuid",
  "name": "Photography",
  "usersCount": 1500,
  "distribution": {
    "BEGINNER": 500,
    "INTERMEDIATE": 700,
    "EXPERT": 300
  },
  "averageExperience": 3.5,  // 平均年資
  "trendingScore": 85,
  "growthRate": 12.5,  // 百分比
  "popularityRank": 15
}
```

#### 取得熱門技能排行

```
GET /api/skills/trending?limit=20
Authorization: Bearer <token>

Response 200:
{
  "trending": [
    {
      "rank": 1,
      "skillId": "uuid",
      "name": "AI & Machine Learning",
      "category": "TECH",
      "usersCount": 5000,
      "growthRate": 45.2
    }
  ],
  "total": 20
}
```

#### 取得技能分類統計

```
GET /api/skills/categories/stats
Authorization: Bearer <token>

Response 200:
{
  "categories": [
    {
      "category": "TECH",
      "skillsCount": 150,
      "usersCount": 8500,
      "popularSkills": [...]
    },
    {
      "category": "ART",
      "skillsCount": 80,
      "usersCount": 3200,
      "popularSkills": [...]
    }
  ]
}
```

## 📊 資料模型

### Skill Entity

```typescript
{
  skillId: string;
  name: string;
  description?: string;
  category: string;          // TECH, ART, LIFESTYLE, BUSINESS, etc.
  subcategory?: string;
  icon?: string;             // Emoji 或圖示 URL
  usersCount: number;
  trendingScore: number;     // 0-100
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserSkill Entity

```typescript
{
  userSkillId: string;
  userId: string;
  skillId: string;
  proficiencyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  yearsOfExperience?: number;
  isVerified: boolean;       // 技能認證狀態
  addedAt: Date;
  updatedAt: Date;
}
```

## 🔄 資料流模式

### 寫入流程

1. 用戶添加技能
2. 驗證技能是否存在
3. **更新 Redis 快取**
4. **發送 Kafka 事件** `skill.user.added`
5. 返回成功響應
6. DB Writer Service 持久化

### 讀取流程

1. 查詢 Redis 快取
2. Cache Hit → 返回
3. Cache Miss → 查詢 PostgreSQL → 更新快取 → 返回

## 🎯 快取策略

- **技能列表**: TTL 1 小時（較少變動）
- **用戶技能**: TTL 30 分鐘
- **熱門技能**: TTL 10 分鐘
- **統計資料**: TTL 5 分鐘

## 📤 Kafka 事件

- `skill.created` - 新技能創建
- `skill.updated` - 技能更新
- `skill.user.added` - 用戶添加技能
- `skill.user.removed` - 用戶移除技能
- `skill.user.updated` - 技能熟練度更新

## 🧪 測試

```bash
# 單元測試
nx test skill-service

# E2E 測試
nx e2e skill-service-e2e

# 覆蓋率報告
nx test skill-service --coverage
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [API 文檔](../../docs/02-開發指南.md)
- [配對系統](../../docs/architecture/SERVICES_OVERVIEW.md#matching-service)

## 🤝 依賴服務

- **PostgreSQL**: 技能資料讀取
- **Redis**: 快取層
- **Kafka**: 事件發送
- **Matching Service**: 技能匹配整合

## 🚨 已知問題

- 技能認證機制尚未完整實作
- 技能推薦算法待優化
- 多語言技能名稱支援有限
- 技能等級定義需更細緻化

請參考 [BUSINESS_LOGIC_GAPS.md](../../docs/BUSINESS_LOGIC_GAPS.md#skill-service)。

## 📝 開發注意事項

1. **技能上限**: 每個用戶最多 10 個技能標籤
2. **技能分類**: 需預先定義好技能分類體系
3. **去重檢查**: 添加技能前檢查是否已存在
4. **統計更新**: 用戶添加/移除技能時更新 usersCount
5. **快取失效**: 技能統計變更時需清除相關快取
