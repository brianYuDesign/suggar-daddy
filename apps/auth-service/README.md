# Auth Service

## 📖 簡介

Auth Service 負責處理用戶身份驗證和授權相關的所有功能，包括註冊、登入、JWT Token 管理和角色權限控制。

## 🎯 職責說明

- **用戶註冊**: 創建新用戶帳號，密碼加密儲存
- **用戶登入**: 驗證憑證，生成 JWT Token
- **Token 管理**: JWT Token 生成、驗證和刷新
- **密碼管理**: 密碼加密（bcrypt）、重設密碼功能
- **角色權限**: RBAC（Role-Based Access Control）實作
- **Session 管理**: 使用 Redis 管理登入狀態

## 🚀 端口和路由

- **端口**: `3002`
- **路由前綴**: `/api/auth`

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **認證**: Passport + JWT Strategy
- **密碼加密**: bcrypt
- **ORM**: TypeORM
- **驗證**: class-validator, class-transformer
- **快取**: Redis (Session 儲存)

## ⚙️ 環境變數

```bash
# 服務端口
AUTH_SERVICE_PORT=3002
PORT=3002

# 資料庫連接
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# JWT 設定
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Redis 設定
REDIS_HOST=localhost
REDIS_PORT=6379

# 密碼加密
BCRYPT_ROUNDS=10

# CORS 設定
CORS_ORIGIN=http://localhost:4200,http://localhost:4300
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve auth-service

# 建置
nx build auth-service

# 執行測試
nx test auth-service

# Lint 檢查
nx lint auth-service

# 資料庫遷移
npm run typeorm migration:run
```

## 📡 API 端點列表

### 註冊

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "johndoe",
  "role": "SUBSCRIBER"  // 可選: SUBSCRIBER, CREATOR, ADMIN
}

Response 201:
{
  "userId": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "SUBSCRIBER"
}
```

### 登入

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800,
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "SUBSCRIBER"
  }
}
```

### 登出

```
POST /api/auth/logout
Authorization: Bearer <token>

Response 200:
{
  "message": "Logged out successfully"
}
```

### 刷新 Token

```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 604800
}
```

### 驗證 Token

```
POST /api/auth/verify
Authorization: Bearer <token>

Response 200:
{
  "valid": true,
  "userId": "uuid",
  "role": "SUBSCRIBER"
}
```

### 修改密碼

```
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}

Response 200:
{
  "message": "Password changed successfully"
}
```

### 重設密碼（忘記密碼）

```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response 200:
{
  "message": "Password reset email sent"
}
```

```
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword789"
}

Response 200:
{
  "message": "Password reset successfully"
}
```

### 取得當前用戶資訊

```
GET /api/auth/me
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "SUBSCRIBER",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## 🔒 安全機制

### 密碼加密

- 使用 **bcrypt** 進行單向雜湊
- 預設 Salt Rounds: `10`
- 密碼強度驗證：最少 8 字元

### JWT Token

- **Access Token**: 7 天有效期（可配置）
- **Refresh Token**: 30 天有效期（可配置）
- 使用 HS256 演算法簽名
- 包含 userId, email, role 等 payload

### Session 管理

- 使用 Redis 儲存 Session
- 登出時從 Redis 清除 Session
- Token 黑名單機制（撤銷 Token）

### 防護措施

- **速率限制**: 登入嘗試限制（防暴力破解）
- **輸入驗證**: 使用 class-validator 驗證所有輸入
- **SQL 注入防護**: TypeORM 參數化查詢
- **XSS 防護**: 輸入消毒處理

## 🎭 角色權限

### 用戶角色

```typescript
enum UserRole {
  SUBSCRIBER = 'SUBSCRIBER',  // 訂閱用戶
  CREATOR = 'CREATOR',        // 創作者
  ADMIN = 'ADMIN'             // 管理員
}
```

### 權限分配

| 角色 | 權限 |
|-----|-----|
| SUBSCRIBER | 瀏覽內容、訂閱創作者、發送訊息 |
| CREATOR | SUBSCRIBER 權限 + 發布內容、管理訂閱者 |
| ADMIN | 所有權限 + 系統管理、用戶管理、內容審核 |

## 📊 資料模型

### User Entity

```typescript
{
  userId: string;          // UUID
  email: string;           // Unique
  username: string;        // Unique
  passwordHash: string;    // bcrypt hash
  role: UserRole;
  isVerified: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🧪 測試

```bash
# 單元測試
nx test auth-service

# 覆蓋率報告
nx test auth-service --coverage

# 監聽模式
nx test auth-service --watch
```

測試範圍：
- ✅ 用戶註冊流程
- ✅ 登入驗證
- ✅ JWT Token 生成和驗證
- ✅ 密碼加密和比對
- ✅ 角色權限檢查
- ✅ Refresh Token 機制

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [認證流程](../../docs/02-開發指南.md#認證流程)
- [API 文檔](../../docs/02-開發指南.md)
- [安全審查](../../docs/architecture/security-review.md)

## 🤝 依賴服務

- **PostgreSQL**: 用戶資料讀取
- **Redis**: Session 儲存和 Token 管理
- **Kafka**: 發送 `auth.login`, `auth.logout`, `auth.register` 事件

## 🚨 已知問題

- OAuth 第三方登入（Google, Facebook）尚未實作
- 多因素認證（MFA）尚未實作
- 裝置管理和多端登入控制待優化

請參考 [BUSINESS_LOGIC_GAPS.md](../../docs/BUSINESS_LOGIC_GAPS.md#auth-service)。

## 📝 開發注意事項

1. **密碼變更**: 需驗證舊密碼，並使所有現有 Token 失效
2. **JWT Secret**: 生產環境務必使用強密碼並妥善保管
3. **Token 過期**: 前端需實作 Refresh Token 自動刷新機制
4. **Redis 連接**: 確保 Redis 可用，否則 Session 功能異常
5. **角色變更**: 變更用戶角色後，需要重新登入才會生效
