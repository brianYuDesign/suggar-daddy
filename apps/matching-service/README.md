# Matching Service

## 📖 簡介

Matching Service 負責用戶配對和推薦系統，基於用戶偏好、行為和技能進行智能匹配，提升用戶發現優質內容和創作者的效率。

## 🎯 職責說明

- **用戶配對**: 根據興趣、技能、地理位置等因素進行用戶匹配
- **推薦系統**: 推薦創作者、內容和潛在訂閱對象
- **配對算法**: 實作多維度評分和排序演算法
- **配對歷史**: 記錄配對結果和用戶反饋
- **過濾機制**: 支援黑名單、年齡、性別等過濾條件
- **推薦個人化**: 基於用戶行為的個人化推薦

## 🚀 端口和路由

- **端口**: `3003`
- **路由前綴**: `/api/matching`

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **快取**: Redis (推薦結果快取)
- **演算法**: 協同過濾、內容推薦
- **事件**: Kafka Producer

## ⚙️ 環境變數

```bash
# 服務端口
MATCHING_SERVICE_PORT=3003
PORT=3003

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=300  # 推薦結果快取 5 分鐘

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=matching-service

# 配對設定
MAX_RECOMMENDATIONS=100
DEFAULT_RECOMMENDATIONS=20
MIN_MATCH_SCORE=50        # 最低匹配分數 (0-100)
REFRESH_INTERVAL_HOURS=24 # 推薦清單刷新間隔
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve matching-service

# 建置
nx build matching-service

# 執行測試
nx test matching-service

# Lint 檢查
nx lint matching-service
```

## 📡 API 端點列表

### 推薦系統

#### 取得推薦創作者

```
GET /api/matching/recommendations/creators?limit=20&refresh=false
Authorization: Bearer <token>

Query Parameters:
- limit: 推薦數量 (預設 20, 最多 100)
- refresh: 是否強制刷新推薦 (預設 false，使用快取)
- category: 創作者類型過濾

Response 200:
{
  "recommendations": [
    {
      "userId": "uuid",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": "...",
      "bio": "...",
      "matchScore": 85,           // 0-100 匹配分數
      "matchReasons": [
        "Similar interests",
        "Popular in your network",
        "Matching skills"
      ],
      "commonSkills": ["Photography", "Travel"],
      "subscribersCount": 1500,
      "postsCount": 200,
      "isFollowing": false,
      "isSubscribed": false
    }
  ],
  "total": 20,
  "refreshedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得推薦內容

```
GET /api/matching/recommendations/posts?limit=50
Authorization: Bearer <token>

Response 200:
{
  "recommendations": [
    {
      "postId": "uuid",
      "author": {...},
      "content": "...",
      "mediaUrls": [...],
      "likesCount": 150,
      "commentsCount": 20,
      "matchScore": 78,
      "matchReasons": [
        "Based on your interests",
        "Popular among similar users"
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

#### 取得相似用戶

```
GET /api/matching/similar-users/:userId?limit=20
Authorization: Bearer <token>

Response 200:
{
  "users": [
    {
      "userId": "uuid",
      "username": "janedoe",
      "avatarUrl": "...",
      "matchScore": 82,
      "commonInterests": 5,
      "commonSkills": 3,
      "mutualConnections": 2
    }
  ],
  "total": 20
}
```

### 配對功能

#### 開始配對

```
POST /api/matching/match
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferences": {
    "interestedIn": ["CREATOR"],     // CREATOR, SUBSCRIBER
    "ageRange": [18, 65],
    "location": "New York",
    "maxDistance": 100,              // 公里
    "skills": ["uuid1", "uuid2"],
    "excludeIds": ["uuid3"]          // 排除特定用戶
  }
}

Response 200:
{
  "matches": [
    {
      "userId": "uuid",
      "username": "johndoe",
      "avatarUrl": "...",
      "age": 28,
      "location": "Brooklyn, NY",
      "distance": 5,                 // 公里
      "matchScore": 88,
      "profile": {
        "bio": "...",
        "interests": [...],
        "skills": [...]
      },
      "compatibility": {
        "interestMatch": 85,
        "skillMatch": 90,
        "locationMatch": 95
      }
    }
  ],
  "total": 15
}
```

#### 獲取配對詳情

```
GET /api/matching/match/:matchId
Authorization: Bearer <token>

Response 200:
{
  "matchId": "uuid",
  "user1": {...},
  "user2": {...},
  "matchScore": 88,
  "matchedAt": "2024-01-01T00:00:00.000Z",
  "status": "ACTIVE",  // ACTIVE, PASSED, ACCEPTED
  "compatibility": {
    "overallScore": 88,
    "breakdown": {
      "interests": 85,
      "skills": 90,
      "location": 95,
      "activity": 80
    }
  },
  "commonInterests": [...],
  "commonSkills": [...]
}
```

#### 對配對作出反應

```
POST /api/matching/match/:matchId/react
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "LIKE"  // LIKE, PASS, SUPER_LIKE
}

Response 200:
{
  "matchId": "uuid",
  "action": "LIKE",
  "isMutualMatch": true,  // 雙方都 LIKE
  "reactedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得配對歷史

```
GET /api/matching/history?status=all&page=1&limit=20
Authorization: Bearer <token>

Query Parameters:
- status: all | active | passed | mutual

Response 200:
{
  "matches": [
    {
      "matchId": "uuid",
      "user": {...},
      "matchScore": 88,
      "status": "MUTUAL",
      "myAction": "LIKE",
      "theirAction": "LIKE",
      "matchedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "mutualCount": 15
}
```

### 偏好設定

#### 取得配對偏好設定

```
GET /api/matching/preferences
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "preferences": {
    "interestedIn": ["CREATOR"],
    "ageRange": [18, 65],
    "location": "New York",
    "maxDistance": 100,
    "skills": [...],
    "interests": [...],
    "showMe": true,  // 是否顯示在配對中
    "advancedFilters": {
      "minSubscribers": 100,
      "verifiedOnly": false
    }
  },
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 更新配對偏好

```
PATCH /api/matching/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "interestedIn": ["CREATOR", "SUBSCRIBER"],
  "ageRange": [25, 45],
  "maxDistance": 50,
  "skills": ["uuid1", "uuid2"],
  "showMe": true
}

Response 200:
{
  "preferences": {...},
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 推薦反饋

#### 提交推薦反饋

```
POST /api/matching/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "recommendationType": "CREATOR",  // CREATOR, POST
  "recommendedId": "uuid",
  "action": "CLICKED",              // VIEWED, CLICKED, DISMISSED, SUBSCRIBED
  "rating": 4                       // 1-5 星，可選
}

Response 201:
{
  "feedbackId": "uuid",
  "recorded": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 探索功能

#### 探索新創作者

```
GET /api/matching/explore?category=trending&page=1&limit=20
Authorization: Bearer <token>

Query Parameters:
- category: trending (熱門) | new (新人) | rising (崛起中)
- sort: subscribers | posts | engagement

Response 200:
{
  "creators": [
    {
      "userId": "uuid",
      "username": "newcreator",
      "avatarUrl": "...",
      "category": "TRENDING",
      "subscribersCount": 5000,
      "growthRate": 150.5,  // 百分比
      "isNew": false,
      "joinedDaysAgo": 90
    }
  ],
  "total": 100
}
```

## 📊 資料模型

### Match Entity

```typescript
{
  matchId: string;
  user1Id: string;
  user2Id: string;
  matchScore: number;      // 0-100
  status: 'ACTIVE' | 'PASSED' | 'MUTUAL' | 'EXPIRED';
  user1Action?: 'LIKE' | 'PASS' | 'SUPER_LIKE';
  user2Action?: 'LIKE' | 'PASS' | 'SUPER_LIKE';
  compatibility: {
    interests: number;
    skills: number;
    location: number;
    activity: number;
  };
  matchedAt: Date;
  expiresAt: Date;         // 配對過期時間
  updatedAt: Date;
}
```

### MatchPreferences Entity

```typescript
{
  preferenceId: string;
  userId: string;
  interestedIn: string[];
  ageRange: [number, number];
  location?: string;
  maxDistance?: number;    // 公里
  skills: string[];
  interests: string[];
  showMe: boolean;
  advancedFilters: Record<string, any>;
  updatedAt: Date;
}
```

### RecommendationFeedback Entity

```typescript
{
  feedbackId: string;
  userId: string;
  recommendationType: 'CREATOR' | 'POST';
  recommendedId: string;
  action: 'VIEWED' | 'CLICKED' | 'DISMISSED' | 'SUBSCRIBED';
  rating?: number;
  createdAt: Date;
}
```

## 🧮 配對算法

### 評分因子

```typescript
matchScore = (
  interestMatch * 0.30 +    // 興趣匹配度 30%
  skillMatch * 0.25 +        // 技能匹配度 25%
  activityMatch * 0.20 +     // 活躍度匹配 20%
  locationMatch * 0.15 +     // 地理位置 15%
  popularityBoost * 0.10     // 人氣加成 10%
)
```

### 推薦策略

1. **協同過濾**: 基於相似用戶的行為
2. **內容推薦**: 基於用戶興趣和技能
3. **熱度推薦**: 平台熱門內容和創作者
4. **社交推薦**: 朋友關注的創作者
5. **新鮮度**: 優先推薦新創作者和內容

## 🔄 資料流模式

### 推薦生成流程

1. 用戶請求推薦
2. 檢查 Redis 快取
3. Cache Hit → 返回快取結果
4. Cache Miss → 執行推薦演算法
5. 儲存結果到 Redis (TTL 5 分鐘)
6. 返回推薦列表

## 🎯 快取策略

- **推薦結果**: TTL 5 分鐘（平衡即時性和效能）
- **用戶偏好**: TTL 1 小時
- **相似用戶**: TTL 1 天
- **熱門創作者**: TTL 10 分鐘

## 📤 Kafka 事件

- `matching.matched` - 配對成功
- `matching.mutual_match` - 雙向配對
- `recommendation.generated` - 推薦生成
- `recommendation.feedback` - 推薦反饋
- `preferences.updated` - 偏好更新

## 🧪 測試

```bash
# 單元測試
nx test matching-service

# 覆蓋率報告
nx test matching-service --coverage
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [API 文檔](../../docs/02-開發指南.md)
- [技能系統](./skill-service/README.md)

## 🤝 依賴服務

- **PostgreSQL**: 用戶資料、配對歷史讀取
- **Redis**: 推薦結果快取
- **Kafka**: 事件發送
- **Skill Service**: 技能匹配整合
- **User Service**: 用戶資料查詢

## 🚨 已知問題

- 推薦演算法需持續優化和 A/B 測試
- 冷啟動問題（新用戶推薦）待改善
- 地理位置匹配精準度有限
- 機器學習模型尚未整合

請參考 [BUSINESS_LOGIC_GAPS.md](../../docs/BUSINESS_LOGIC_GAPS.md#matching-service)。

## 📝 開發注意事項

1. **快取刷新**: 用戶行為變化時需刷新推薦快取
2. **評分權重**: 根據 A/B 測試結果調整評分因子
3. **效能優化**: 大量用戶時考慮預先計算推薦結果
4. **隱私保護**: 尊重用戶隱私設定，不推薦被封鎖用戶
5. **多樣性**: 避免推薦過於同質化，加入隨機性和新鮮度
