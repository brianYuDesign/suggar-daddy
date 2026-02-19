# 🚀 Sugar-Daddy API 完整參考

## 概述

Sugar-Daddy 平台提供 **81 個 API 端點**，分佈在 5 個核心服務中。

### 系統組成

| 服務 | 端點數 | 技術 | 端口 | 狀態 |
|------|-------|------|------|------|
| **API Gateway** | 1 | Express.js | 3000 | ✅ |
| **Auth Service** | 20 | NestJS + PostgreSQL | 3001 | ✅ |
| **Content-Streaming** | 11 | NestJS + S3 | 3001 | ✅ |
| **Payment Service** | 19 | NestJS + Stripe | 3002 | ✅ |
| **Subscription** | 10 | NestJS + PostgreSQL | 3003 | ✅ |
| **Recommendation** | 10 | Node.js + ML | 3004 | ✅ |
| **監控/Webhook** | 10 | Grafana + Prometheus | 9090 | ✅ |
| **總計** | **81** | - | - | ✅ |

---

## 📋 完整端點清單

### 1️⃣ Gateway 服務 (1 個)

#### Health Check
- `GET /health` - 健康檢查，檢查所有後端服務狀態

---

### 2️⃣ Auth Service (20 個)

#### 身份驗證 (6 個)
- `POST /api/v1/auth/register` - 用戶註冊
- `POST /api/v1/auth/login` - 用戶登入
- `POST /api/v1/auth/refresh` - 刷新 Token
- `POST /api/v1/auth/logout` - 登出
- `POST /api/v1/auth/validate` - 驗證 Token
- `POST /api/v1/auth/change-password` - 更改密碼

#### 用戶管理 (8 個)
- `GET /api/v1/auth/users` - 獲取用戶列表
- `POST /api/v1/auth/users` - 創建用戶
- `GET /api/v1/auth/users/{userId}` - 獲取用戶詳情
- `DELETE /api/v1/auth/users/{userId}` - 刪除用戶
- `POST /api/v1/auth/users/{userId}/activate` - 激活用戶
- `POST /api/v1/auth/users/{userId}/deactivate` - 禁用用戶
- `GET /api/v1/auth/profile` - 獲取用戶資料
- `PATCH /api/v1/auth/profile` - 更新用戶資料

#### 角色管理 (4 個)
- `GET /api/v1/auth/roles` - 獲取角色列表
- `POST /api/v1/auth/roles` - 創建角色
- `GET /api/v1/auth/roles/{roleId}` - 獲取角色詳情
- `PATCH /api/v1/auth/roles/{roleId}` - 更新角色

#### 角色權限 (2 個)
- `GET /api/v1/auth/roles/{roleId}/permissions` - 獲取角色權限
- `POST /api/v1/auth/roles/{roleId}/permissions` - 添加角色權限

#### 權限管理 (1 個)
- `GET /api/v1/auth/permissions` - 獲取權限列表

---

### 3️⃣ Content-Streaming Service (11 個)

#### 視頻上傳 (4 個)
- `POST /api/v1/uploads/initiate` - 初始化上傳會話
- `GET /api/v1/uploads/{sessionId}` - 獲取上傳狀態
- `POST /api/v1/uploads/{sessionId}/chunk` - 上傳分片
- `POST /api/v1/uploads/{sessionId}/complete` - 完成上傳

#### 視頻管理 (4 個)
- `GET /api/v1/videos` - 獲取視頻列表
- `POST /api/v1/videos` - 創建視頻
- `GET /api/v1/videos/{videoId}` - 獲取視頻詳情
- `PATCH /api/v1/videos/{videoId}` - 更新視頻
- `DELETE /api/v1/videos/{videoId}` - 刪除視頻

#### 流媒體播放 (1 個)
- `GET /api/v1/videos/{videoId}/stream` - 流式播放視頻

#### 轉碼管理 (2 個)
- `GET /api/v1/transcoding` - 獲取轉碼任務列表
- `GET /api/v1/transcoding/{jobId}` - 獲取轉碼狀態

#### 質量配置 (1 個)
- `GET /api/v1/quality-configs` - 獲取質量配置

---

### 4️⃣ Payment Service (19 個)

#### 支付管理 (5 個)
- `POST /api/v1/payments/intent` - 創建支付意圖
- `POST /api/v1/payments/confirm` - 確認支付
- `GET /api/v1/payments` - 獲取支付列表
- `GET /api/v1/payments/{paymentId}` - 獲取支付詳情
- `GET /api/v1/payments/user/{userId}` - 獲取用戶支付記錄

#### 退款管理 (4 個)
- `POST /api/v1/payments/refund` - 申請退款
- `GET /api/v1/payments/refunds` - 獲取退款列表
- `GET /api/v1/payments/refunds/{refundId}` - 獲取退款詳情

#### Webhook (2 個)
- `POST /api/v1/payments/webhooks/stripe` - Stripe Webhook

#### 分析統計 (1 個)
- `GET /api/v1/payments/analytics` - 獲取支付分析

---

### 5️⃣ Subscription Service (10 個)

#### 計劃管理 (2 個)
- `GET /api/v1/subscriptions/plans` - 獲取計劃列表
- `GET /api/v1/subscriptions/plans/{planId}` - 獲取計劃詳情

#### 訂閱管理 (7 個)
- `GET /api/v1/subscriptions` - 獲取用戶訂閱
- `POST /api/v1/subscriptions` - 創建訂閱
- `GET /api/v1/subscriptions/{subscriptionId}` - 獲取訂閱詳情
- `PATCH /api/v1/subscriptions/{subscriptionId}` - 更新訂閱
- `POST /api/v1/subscriptions/{subscriptionId}/cancel` - 取消訂閱
- `POST /api/v1/subscriptions/{subscriptionId}/pause` - 暫停訂閱
- `POST /api/v1/subscriptions/{subscriptionId}/resume` - 恢復訂閱

#### 帳單 (1 個)
- `GET /api/v1/subscriptions/{subscriptionId}/billing-history` - 獲取帳單歷史

---

### 6️⃣ Recommendation Service (10 個)

#### 推薦系統 (7 個)
- `GET /api/v1/recommendations` - 獲取推薦列表
- `POST /api/v1/recommendations` - 創建推薦配置
- `GET /api/v1/recommendations/{contentId}` - 獲取相似內容
- `POST /api/v1/recommendations/{contentId}/like` - 標記為喜歡
- `POST /api/v1/recommendations/{contentId}/view` - 記錄觀看
- `POST /api/v1/recommendations/interactions` - 記錄交互
- `POST /api/v1/recommendations/refresh/{userId}` - 刷新推薦

#### 維護 (3 個)
- `POST /api/v1/recommendations/update-scores` - 更新推薦評分
- `POST /api/v1/recommendations/clear-cache` - 清除快取

---

## 🔐 認證方式

### Bearer Token (JWT)

所有需要認證的端點都使用 JWT Bearer Token：

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://api.sugardaddy.com/v1/api/v1/auth/me
```

### 獲取 Token 流程

1. **註冊或登入** 獲得 token
```bash
curl -X POST https://api.sugardaddy.com/v1/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

2. **使用返回的 Token**
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": { /* ... */ },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### Token 刷新

Access Token 過期時，使用 Refresh Token 獲得新 Token：

```bash
curl -X POST https://api.sugardaddy.com/v1/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "REFRESH_TOKEN_HERE"
  }'
```

---

## 📊 API 響應格式

所有端點都返回統一的響應格式：

### 成功響應 (2xx)

```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": {
    // 實際數據
  }
}
```

### 錯誤響應 (4xx, 5xx)

```json
{
  "statusCode": 400,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 📈 常見錯誤代碼

| HTTP 代碼 | 含義 | 示例 |
|----------|------|------|
| **200** | OK | 請求成功 |
| **201** | Created | 資源創建成功 |
| **206** | Partial Content | 視頻流媒體範圍請求 |
| **400** | Bad Request | 無效的請求參數 |
| **401** | Unauthorized | 未提供或無效的認證 |
| **403** | Forbidden | 無權限訪問資源 |
| **404** | Not Found | 資源不存在 |
| **409** | Conflict | 資源衝突（如重複用戶名） |
| **422** | Unprocessable Entity | 無法處理的請求 |
| **429** | Too Many Requests | 速率限制 |
| **500** | Internal Server Error | 伺服器內部錯誤 |
| **502** | Bad Gateway | 上游服務不可用 |
| **503** | Service Unavailable | 服務暫時不可用 |

---

## 🚀 常見用例

### 用例 1: 用戶註冊和登入

```bash
# 1. 註冊新用戶
curl -X POST https://api.sugardaddy.com/v1/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. 登入
curl -X POST https://api.sugardaddy.com/v1/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### 用例 2: 視頻上傳流程

```bash
# 1. 初始化上傳
curl -X POST https://api.sugardaddy.com/v1/api/v1/uploads/initiate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "my-video.mp4",
    "contentType": "video/mp4",
    "fileSize": 524288000
  }'
# 返回 sessionId

# 2. 上傳分片（重複執行）
curl -X POST https://api.sugardaddy.com/v1/api/v1/uploads/{sessionId}/chunk \
  -H "Authorization: Bearer TOKEN" \
  --data-binary @chunk_0.bin

# 3. 完成上傳
curl -X POST https://api.sugardaddy.com/v1/api/v1/uploads/{sessionId}/complete \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Awesome Video",
    "description": "Video description",
    "tags": ["tag1", "tag2"]
  }'
```

### 用例 3: 訂閱管理

```bash
# 1. 獲取可用計劃
curl https://api.sugardaddy.com/v1/api/v1/subscriptions/plans

# 2. 創建訂閱
curl -X POST https://api.sugardaddy.com/v1/api/v1/subscriptions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan-uuid",
    "autoRenew": true,
    "paymentMethodId": "pm-uuid"
  }'

# 3. 取消訂閱
curl -X POST https://api.sugardaddy.com/v1/api/v1/subscriptions/{subscriptionId}/cancel \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "No longer needed"}'
```

### 用例 4: 支付流程

```bash
# 1. 創建支付意圖
curl -X POST https://api.sugardaddy.com/v1/api/v1/payments/intent \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "paymentMethod": "stripe",
    "description": "Premium subscription"
  }'

# 2. 確認支付
curl -X POST https://api.sugardaddy.com/v1/api/v1/payments/confirm \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "intent-uuid",
    "paymentMethodId": "pm-token"
  }'
```

---

## 📚 詳細文檔

完整的 OpenAPI 3.0 規範文檔請查看：
- 📄 [OPENAPI-3.0.yaml](OPENAPI-3.0.yaml) - 完整 API 規範
- 📖 [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) - 快速參考

---

## 🔗 相關資源

- [系統架構文檔](../architecture/)
- [運維指南](../operations/)
- [新人上手指南](../onboarding/)

---

**最後更新**: 2026-02-19  
**版本**: 1.0.0  
**狀態**: ✅ 完整
