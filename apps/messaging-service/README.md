# Messaging Service

## 📖 簡介

Messaging Service 負責處理平台上的即時訊息功能，包括一對一私訊、群組聊天、訊息歷史和 WebSocket 連接管理。

## 🎯 職責說明

- **即時訊息**: WebSocket 實作的即時通訊
- **私訊管理**: 一對一訊息發送、接收、已讀狀態
- **群組聊天**: 群組訊息、成員管理（未來功能）
- **訊息歷史**: 訊息儲存和查詢
- **檔案訊息**: 支援圖片、影片、檔案分享
- **付費訊息**: 付費解鎖私訊內容
- **在線狀態**: 用戶在線/離線狀態管理
- **訊息通知**: 新訊息通知（與 Notification Service 整合）

## 🚀 端口和路由

- **端口**: `3005`
- **WebSocket**: `ws://localhost:3005` 或 `/api/messaging` (透過 API Gateway)
- **HTTP API**: `/api/messaging`（透過 API Gateway 代理至 `MESSAGING_SERVICE_URL`）

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **WebSocket**: Socket.IO
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **快取**: Redis (訊息快取、在線狀態)
- **事件**: Kafka Producer & Consumer

## ⚙️ 環境變數

```bash
# 服務端口
MESSAGING_SERVICE_PORT=3005
PORT=3005

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379
MESSAGE_CACHE_TTL=3600         # 訊息快取 1 小時
ONLINE_STATUS_TTL=300          # 在線狀態 5 分鐘

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=messaging-service

# WebSocket 設定
WS_CORS_ORIGIN=http://localhost:4200,http://localhost:4300
WS_PING_INTERVAL=25000         # 心跳間隔（毫秒）
WS_PING_TIMEOUT=5000           # 心跳超時

# 訊息設定
MAX_MESSAGE_LENGTH=2000
MAX_ATTACHMENTS=5
MESSAGE_RETENTION_DAYS=365     # 訊息保留天數
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve messaging-service

# 建置
nx build messaging-service

# 執行測試
nx test messaging-service

# Lint 檢查
nx lint messaging-service
```

## 📡 API 端點列表

### HTTP API

#### 取得對話列表

```
GET /api/messaging/conversations?page=1&limit=20
Authorization: Bearer <token>

Response 200:
{
  "conversations": [
    {
      "conversationId": "uuid",
      "participant": {
        "userId": "uuid",
        "username": "johndoe",
        "avatarUrl": "...",
        "isOnline": true
      },
      "lastMessage": {
        "messageId": "uuid",
        "content": "Hello!",
        "senderId": "uuid",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "isRead": false
      },
      "unreadCount": 5,
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "unreadTotal": 15
}
```

#### 取得對話訊息歷史

```
GET /api/messaging/conversations/:conversationId/messages?page=1&limit=50
Authorization: Bearer <token>

Response 200:
{
  "messages": [
    {
      "messageId": "uuid",
      "conversationId": "uuid",
      "senderId": "uuid",
      "content": "Hello!",
      "type": "TEXT",  // TEXT, IMAGE, VIDEO, FILE, PAID
      "attachments": [],
      "isPaid": false,
      "price": null,
      "isRead": true,
      "readAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 200,
  "page": 1
}
```

#### 建立對話

```
POST /api/messaging/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "uuid"
}

Response 201:
{
  "conversationId": "uuid",
  "participants": ["user-id-1", "user-id-2"],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 標記訊息為已讀

```
POST /api/messaging/conversations/:conversationId/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageIds": ["uuid1", "uuid2"]  // 可選，不提供則標記所有未讀
}

Response 200:
{
  "marked": 5,
  "conversationId": "uuid"
}
```

#### 刪除對話

```
DELETE /api/messaging/conversations/:conversationId
Authorization: Bearer <token>

Response 204: No Content
```

注意：僅對當前用戶隱藏對話，不實際刪除訊息。

#### 檢舉訊息

```
POST /api/messaging/messages/:messageId/report
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "HARASSMENT",  // SPAM, HARASSMENT, INAPPROPRIATE
  "description": "Detailed reason..."
}

Response 201:
{
  "reportId": "uuid",
  "status": "PENDING",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### WebSocket 事件

#### 連接 WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3005', {
  auth: {
    token: 'jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to messaging service');
});
```

#### 發送訊息 (Client → Server)

```javascript
socket.emit('message:send', {
  conversationId: 'uuid',
  recipientId: 'uuid',  // 如果是新對話
  content: 'Hello!',
  type: 'TEXT',
  attachments: []  // 可選
});
```

#### 接收訊息 (Server → Client)

```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data);
  // data = {
  //   messageId: 'uuid',
  //   conversationId: 'uuid',
  //   senderId: 'uuid',
  //   content: 'Hello!',
  //   type: 'TEXT',
  //   createdAt: '2024-01-01T00:00:00.000Z'
  // }
});
```

#### 正在輸入狀態 (Client → Server)

```javascript
socket.emit('typing:start', {
  conversationId: 'uuid'
});

socket.emit('typing:stop', {
  conversationId: 'uuid'
});
```

#### 接收正在輸入狀態 (Server → Client)

```javascript
socket.on('typing:user', (data) => {
  console.log(`${data.username} is typing...`);
  // data = {
  //   userId: 'uuid',
  //   username: 'johndoe',
  //   conversationId: 'uuid'
  // }
});
```

#### 訊息已讀回執 (Server → Client)

```javascript
socket.on('message:read', (data) => {
  console.log('Message read:', data);
  // data = {
  //   messageIds: ['uuid1', 'uuid2'],
  //   conversationId: 'uuid',
  //   readBy: 'user-id',
  //   readAt: '2024-01-01T00:00:00.000Z'
  // }
});
```

#### 用戶在線狀態 (Server → Client)

```javascript
socket.on('user:online', (data) => {
  console.log('User online:', data.userId);
});

socket.on('user:offline', (data) => {
  console.log('User offline:', data.userId);
});
```

#### 訊息刪除 (Client → Server)

```javascript
socket.emit('message:delete', {
  messageId: 'uuid',
  conversationId: 'uuid'
});
```

#### 接收訊息刪除 (Server → Client)

```javascript
socket.on('message:deleted', (data) => {
  // data = {
  //   messageId: 'uuid',
  //   conversationId: 'uuid'
  // }
});
```

## 📊 資料模型

### Conversation Entity

```typescript
{
  conversationId: string;
  participants: string[];  // userId 陣列
  lastMessageId?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Entity

```typescript
{
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'PAID';
  attachments: {
    url: string;
    type: string;
    size: number;
  }[];
  isPaid: boolean;
  price?: number;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
}
```

### UserStatus (Redis)

```typescript
{
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  socketId?: string;
}
```

## 🔄 資料流模式

### 發送訊息流程

1. Client 透過 WebSocket 發送訊息
2. Server 驗證 JWT Token
3. **寫入 Redis 快取**（即時可見）
4. **發送 Kafka 事件** `message.created`
5. 透過 WebSocket 即時推送給接收者
6. DB Writer Service 持久化到 PostgreSQL

### 讀取訊息流程

1. Client 請求訊息歷史（HTTP API）
2. 查詢 Redis 快取（最近訊息）
3. Cache Miss → 查詢 PostgreSQL
4. 合併結果並返回

## 🎯 快取策略

- **最近訊息**: TTL 1 小時（前 50 則）
- **對話列表**: TTL 10 分鐘
- **在線狀態**: TTL 5 分鐘（心跳更新）
- **未讀數**: 即時更新

## 📤 Kafka 事件

### Producer

- `message.created` - 訊息創建
- `message.read` - 訊息已讀
- `message.deleted` - 訊息刪除
- `conversation.created` - 對話創建

### Consumer

- `user.blocked` - 用戶被封鎖（關閉對話）
- `payment.dm_purchase.completed` - 付費訊息購買完成

## 🔒 安全機制

- **JWT 認證**: WebSocket 連接需驗證 JWT Token
- **權限檢查**: 僅允許對話參與者訪問訊息
- **速率限制**: 防止訊息轟炸（每分鐘最多 60 則）
- **內容過濾**: 敏感詞過濾（可選）
- **封鎖用戶**: 封鎖用戶無法發送訊息

## 🧪 測試

```bash
# 單元測試
nx test messaging-service

# WebSocket 測試
nx test messaging-service --testPathPattern=websocket

# 覆蓋率報告
nx test messaging-service --coverage
```

### WebSocket 測試範例

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3005', {
  auth: { token: testToken }
});

socket.emit('message:send', testMessage);

socket.on('message:new', (message) => {
  expect(message.content).toBe(testMessage.content);
});
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [WebSocket 整合](../../docs/02-開發指南.md)
- [業務邏輯缺口](../../docs/BUSINESS_LOGIC_GAPS.md#messaging-service)

## 🤝 依賴服務

- **PostgreSQL**: 訊息歷史讀取
- **Redis**: 快取和在線狀態
- **Kafka**: 事件發送和消費
- **Notification Service**: 新訊息通知
- **Payment Service**: 付費訊息驗證

## 🚨 已知問題

- 群組聊天功能尚未實作
- 訊息搜尋功能有限
- 訊息編輯功能待開發
- 訊息加密（E2EE）尚未實作
- WebSocket 連接的負載均衡和水平擴展待優化

請參考 [BUSINESS_LOGIC_GAPS.md](../../docs/BUSINESS_LOGIC_GAPS.md#messaging-service)。

## 📝 開發注意事項

1. **心跳機制**: 定期發送 ping/pong 維持連接
2. **斷線重連**: 客戶端需實作自動重連邏輯
3. **訊息順序**: 使用 `createdAt` 和 `messageId` 確保順序
4. **未讀計數**: 需即時更新且與實際一致
5. **在線狀態**: 用戶關閉頁面時需標記為離線
6. **付費訊息**: 需與 Payment Service 驗證購買狀態
7. **水平擴展**: 多個 WebSocket Server 需使用 Redis Pub/Sub 同步事件

## 🎯 擴展性

### 水平擴展 WebSocket Server

使用 Redis Adapter 讓多個 Socket.IO 實例共享事件：

```typescript
import { createAdapter } from '@socket.io/redis-adapter';

io.adapter(createAdapter(pubClient, subClient));
```

### 訊息分片

按 `conversationId` 分片儲存訊息，提升查詢效能。
