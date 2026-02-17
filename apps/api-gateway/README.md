# API Gateway

## 📖 簡介

API Gateway 是整個 Sugar Daddy 平台的統一入口點，負責路由所有外部請求到對應的微服務。提供認證、授權、速率限制和請求日誌等中介層功能。

## 🎯 職責說明

- **統一入口**: 所有 `/api/*` 請求的單一進入點
- **請求路由**: 根據路徑前綴將請求轉發到對應的微服務
- **認證授權**: JWT Token 驗證和角色權限檢查
- **速率限制**: 防止 API 濫用，保護後端服務
- **請求日誌**: 記錄所有 API 請求用於監控和除錯
- **熔斷機制**: 使用 Circuit Breaker 模式保護後端服務

## 🚀 端口和路由

- **端口**: `3000`
- **路由映射**:

| 路由前綴 | 目標服務 | 預設 URL |
|---------|---------|---------|
| `/api/auth` | Auth Service | `http://localhost:3002` |
| `/api/users` | User Service | `http://localhost:3001` |
| `/api/matching` | Matching Service | `http://localhost:3003` |
| `/api/posts`, `/api/stories`, `/api/videos`, `/api/moderation` | Content Service | `http://localhost:3006` |
| `/api/tips`, `/api/post-purchases`, `/api/transactions`, `/api/stripe`, `/api/wallet` | Payment Service | `http://localhost:3007` |
| `/api/subscription-tiers`, `/api/subscriptions` | Subscription Service | `http://localhost:3009` |
| `/api/skills` | Skill Service | `http://localhost:3010` |
| `/api/upload`, `/api/media` | Media Service | `http://localhost:3008` |
| `/api/admin` | Admin Service | `http://localhost:3011` |

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **HTTP 客戶端**: Axios
- **認證**: JWT + Passport
- **限流**: @nestjs/throttler + Redis
- **熔斷器**: 自定義 Circuit Breaker Service
- **日誌**: NestJS Logger

## ⚙️ 環境變數

```bash
# 服務端口
API_GATEWAY_PORT=3000

# 微服務 URLs
AUTH_SERVICE_URL=http://localhost:3002
USER_SERVICE_URL=http://localhost:3001
MATCHING_SERVICE_URL=http://localhost:3003
CONTENT_SERVICE_URL=http://localhost:3006
PAYMENT_SERVICE_URL=http://localhost:3007
SUBSCRIPTION_SERVICE_URL=http://localhost:3009
SKILL_SERVICE_URL=http://localhost:3010
MEDIA_SERVICE_URL=http://localhost:3008
ADMIN_SERVICE_URL=http://localhost:3011
MESSAGING_SERVICE_URL=http://localhost:3005
NOTIFICATION_SERVICE_URL=http://localhost:3004

# JWT 設定
JWT_SECRET=your-secret-key

# Redis 設定（用於速率限制）
REDIS_HOST=localhost
REDIS_PORT=6379

# 速率限制設定
THROTTLE_TTL=60        # TTL in seconds
THROTTLE_LIMIT=100     # Max requests per TTL
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve api-gateway

# 建置
nx build api-gateway

# 執行測試
nx test api-gateway

# 執行整合測試
nx test api-gateway --testPathPattern=integration

# Lint 檢查
nx lint api-gateway
```

## 📡 API 端點列表

### 健康檢查

```
GET /health
```

返回 Gateway 和所有後端服務的健康狀態。

### 代理端點

所有 `/api/*` 請求會被路由到對應的微服務：

```
ANY /api/*
```

- 支援所有 HTTP 方法（GET, POST, PUT, PATCH, DELETE 等）
- 自動轉發請求頭（包括 Authorization）
- 自動轉發請求體和查詢參數
- 返回原始響應狀態碼和內容

## 🔒 認證機制

### JWT 驗證

預設所有請求都需要 JWT Token：

```
Authorization: Bearer <jwt-token>
```

### 公開端點

以下端點不需要認證（使用 `@Public()` 裝飾器）：

- `/api/auth/register`
- `/api/auth/login`
- `/health`

### 角色權限

使用 `@Roles()` 裝飾器限制特定端點：

```typescript
@Roles(UserRole.ADMIN)
@Get('/api/admin/*')
```

## 🛡️ 速率限制

預設限制：

- **100 requests / 60 seconds** per IP
- 超過限制返回 `429 Too Many Requests`
- 使用 Redis 儲存計數器（分散式環境）

自定義限制可透過環境變數調整。

## 🔧 Circuit Breaker

當後端服務出現問題時：

- **失敗閾值**: 連續失敗 5 次
- **開啟狀態**: 30 秒後嘗試恢復
- **半開狀態**: 允許部分請求測試服務
- **錯誤響應**: 503 Service Unavailable

## 📊 監控與日誌

### 請求日誌

每個請求都會記錄：

```json
{
  "method": "GET",
  "path": "/api/users/123",
  "statusCode": 200,
  "duration": 45,
  "userId": "user-id",
  "ip": "192.168.1.1"
}
```

### 健康檢查

```bash
curl http://localhost:3000/health
```

返回所有服務的健康狀態。

## 🧪 測試

```bash
# 單元測試
nx test api-gateway

# 整合測試
nx test api-gateway --testPathPattern=integration

# 測試覆蓋率
nx test api-gateway --coverage

# E2E 測試
nx e2e api-gateway-e2e
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [API 文檔](../../docs/02-開發指南.md)
- [認證機制](../../docs/02-開發指南.md#認證流程)
- [部署指南](../../docs/architecture/ADR-001-Pre-Launch-Architecture-Review.md)

## 🤝 依賴服務

- **Redis**: 速率限制計數器儲存
- **所有後端微服務**: 請求轉發目標

## 🚨 已知問題

請參考 [技術債務文檔](../../docs/architecture/technical-debt.md)。

## 📝 開發注意事項

1. **添加新路由**: 在 `proxy.service.ts` 的 `targets` 陣列中添加新映射
2. **自定義限流**: 使用 `@Throttle()` 裝飾器覆蓋預設限制
3. **公開端點**: 使用 `@Public()` 裝飾器跳過認證
4. **熔斷器配置**: 在 `CircuitBreakerService` 調整閾值和超時時間
