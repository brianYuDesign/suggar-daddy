# Rate Limiting 實施文檔

## 📋 概述

本文檔說明 API Gateway 的 Rate Limiting（限流）實施，保護系統免受 DDoS 攻擊和濫用。

## 🎯 限流策略

### 三層限流架構

| 層級 | 限制 | 適用範圍 | 用途 |
|------|------|----------|------|
| **全局限流** | 100 requests/分鐘/IP | 所有 API 端點 | 防止 DDoS 攻擊 |
| **認證限流** | 5 requests/分鐘/IP | `/api/auth/*` | 防止暴力破解 |
| **支付限流** | 10 requests/分鐘/用戶 | `/api/payment/*`, `/api/subscription/*` | 防止支付濫用 |

### 認證端點（嚴格限流）

**限制**: 5 requests/分鐘/IP

適用路徑：
- `/api/auth/login` - 登入
- `/api/auth/register` - 註冊
- `/api/auth/forgot-password` - 忘記密碼
- `/api/auth/reset-password` - 重設密碼
- `/api/auth/verify-email` - 驗證郵箱
- `/api/auth/refresh` - 刷新 Token

**原因**: 防止暴力破解攻擊、帳號枚舉、密碼猜測

### 支付端點（中等限流）

**限制**: 10 requests/分鐘/用戶

適用路徑：
- `/api/payment/charge` - 支付
- `/api/payment/refund` - 退款
- `/api/payment/subscription` - 訂閱管理
- `/api/subscription/create` - 創建訂閱
- `/api/subscription/cancel` - 取消訂閱

**原因**: 防止支付濫用、重複扣款、惡意退款

### 健康檢查（不限流）

路徑：
- `/health`
- `/api/health`
- `/metrics`

**原因**: 監控系統需要頻繁檢查，不應受限流影響

## 🔧 技術實施

### 架構

```
Request → API Gateway → ThrottlerBehindProxyGuard → Redis Storage → Response
```

### 核心組件

#### 1. Throttler 配置 (`throttler.config.ts`)

```typescript
// 從環境變數讀取配置
export function getThrottlerConfig(): ThrottlerConfig {
  return {
    globalLimit: parseInt(process.env.THROTTLE_GLOBAL_LIMIT || '100', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT || '5', 10),
    paymentLimit: parseInt(process.env.THROTTLE_PAYMENT_LIMIT || '10', 10),
    windowSeconds: parseInt(process.env.THROTTLE_WINDOW_SECONDS || '60', 10),
  };
}
```

#### 2. ThrottlerBehindProxyGuard (`guards/throttler-behind-proxy.guard.ts`)

**功能**:
- 從 `X-Forwarded-For` 或 `X-Real-IP` 獲取真實客戶端 IP
- 根據路徑自動選擇限流策略
- 設置標準 Rate Limit Headers

**IP 獲取優先順序**:
1. `X-Forwarded-For` header（取第一個 IP）
2. `X-Real-IP` header
3. `req.ip`

#### 3. Redis 儲存

使用 `@nestjs-redis/throttler-storage` 將限流計數器存儲在 Redis 中，支援：
- **分散式部署**: 多個 API Gateway 實例共享限流狀態
- **高可用性**: 支援 Redis Sentinel 模式
- **持久化**: 計數器在服務重啟後仍然有效

### AppModule 配置

```typescript
@Module({
  imports: [
    // Throttler Module with Redis Storage
    ThrottlerModule.forRoot(createThrottlerOptions()),
  ],
  providers: [
    // 全局應用 Throttler Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
```

## 📊 Rate Limit Headers

所有回應都包含標準的 Rate Limit Headers：

```http
X-RateLimit-Limit: 100        # 時間窗口內的最大請求數
X-RateLimit-Remaining: 95     # 剩餘可用請求數
X-RateLimit-Reset: 1708214400 # 重置時間（Unix timestamp）
```

當觸發限流時，額外返回：

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60                # 建議多少秒後重試

{
  "statusCode": 429,
  "message": "Too many requests. Please try again later."
}
```

## 🔒 安全考量

### 1. Proxy 信任

在 `main.ts` 中必須設置：

```typescript
app.set('trust proxy', true);
```

這樣才能正確讀取 `X-Forwarded-For` 和 `X-Real-IP`。

⚠️ **警告**: 僅在 API Gateway 位於可信任的 proxy/load balancer 後面時才啟用。

### 2. IP 偽造防護

**問題**: 惡意用戶可能偽造 `X-Forwarded-For` header

**解決方案**:
1. 確保 load balancer 會覆寫/清除客戶端提供的 headers
2. 在生產環境中使用 load balancer 的真實 IP 功能
3. 使用 `getTracker()` 只取第一個 IP（最接近 load balancer）

### 3. 分散式攻擊

**問題**: 攻擊者可能從多個 IP 發起分散式攻擊

**應對**:
1. 全局限流作為第一道防線
2. 在 load balancer 層面增加額外防護（如 AWS WAF、Cloudflare）
3. 監控異常流量模式
4. 考慮實施基於用戶的限流（已登入用戶）

## ⚙️ 環境變數配置

在 `.env` 文件中配置：

```bash
# Rate Limiting Configuration
THROTTLE_GLOBAL_LIMIT=100      # 全局限流
THROTTLE_AUTH_LIMIT=5          # 認證端點限流
THROTTLE_PAYMENT_LIMIT=10      # 支付端點限流
THROTTLE_WINDOW_SECONDS=60     # 時間窗口（秒）

# Redis Configuration (必須)
REDIS_HOST=redis-master
REDIS_PORT=6379

# 或使用 Sentinel 模式（生產環境推薦）
# REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26380,redis-sentinel-3:26381
# REDIS_MASTER_NAME=mymaster
```

## 🧪 測試

### 運行測試

```bash
# 運行 Rate Limiting E2E 測試
npm test -- rate-limiting.e2e.spec.ts

# 或使用 Docker
docker-compose exec api-gateway npm test -- rate-limiting.e2e.spec.ts
```

### 手動測試

使用 curl 測試限流：

```bash
# 測試全局限流
for i in {1..105}; do
  curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:3000/health
  echo "Request $i"
done

# 測試認證端點限流
for i in {1..10}; do
  curl -X POST \
    -H "X-Forwarded-For: 192.168.1.101" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}' \
    http://localhost:3000/api/auth/login
  echo "Request $i"
done
```

### 監控 Redis

查看 Redis 中的限流 keys：

```bash
# 進入 Redis CLI
docker-compose exec redis-master redis-cli

# 查看所有 throttle keys
KEYS throttle:*

# 查看特定 key 的值和 TTL
GET throttle:global:192.168.1.100
TTL throttle:global:192.168.1.100
```

## 📈 監控與告警

### 關鍵指標

1. **限流觸發率**: 429 回應的比例
2. **IP 分佈**: 被限流的 IP 數量
3. **端點分佈**: 哪些端點最常觸發限流
4. **Redis 狀態**: 連接狀態、記憶體使用

### Prometheus 指標

```typescript
// 建議添加的指標
rate_limit_hits_total{endpoint, status}
rate_limit_redis_errors_total
rate_limit_bypass_total{reason}
```

### 告警規則

```yaml
# Prometheus Alert Rules
groups:
  - name: rate_limiting
    rules:
      - alert: HighRateLimitHits
        expr: rate(rate_limit_hits_total{status="blocked"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate limit hits"
          description: "{{ $value }} requests/sec are being blocked"
      
      - alert: RateLimitRedisDown
        expr: rate_limit_redis_errors_total > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Rate limiting Redis is down"
```

## 🔄 部署與維護

### 部署檢查清單

- [ ] 確認 Redis 正常運行
- [ ] 驗證環境變數配置
- [ ] 測試 `trust proxy` 設置
- [ ] 驗證 load balancer 正確傳遞 IP headers
- [ ] 運行 E2E 測試
- [ ] 監控 429 回應率
- [ ] 設置告警規則

### 調整限流閾值

根據實際流量調整限流值：

```bash
# 開發環境：寬鬆
THROTTLE_GLOBAL_LIMIT=1000
THROTTLE_AUTH_LIMIT=10
THROTTLE_PAYMENT_LIMIT=20

# 生產環境：嚴格
THROTTLE_GLOBAL_LIMIT=100
THROTTLE_AUTH_LIMIT=5
THROTTLE_PAYMENT_LIMIT=10
```

### 故障處理

#### Redis 故障

當 Redis 不可用時，限流將**失效**（fail-open），所有請求會通過。

**解決方案**:
1. 實施 Redis Sentinel 高可用性
2. 監控 Redis 健康狀態
3. 考慮實施 in-memory fallback（待實現）

#### 過度限流

如果合法用戶被誤限流：

1. 檢查 IP 追蹤是否正確
2. 檢查是否有共享 IP（企業 NAT、VPN）
3. 考慮實施用戶級別的限流（而非僅 IP）
4. 提供申訴機制

## 📚 參考資料

- [@nestjs/throttler 文檔](https://docs.nestjs.com/security/rate-limiting)
- [Redis Rate Limiting Pattern](https://redis.io/docs/manual/patterns/distributed-locks/)
- [RFC 6585 - Additional HTTP Status Codes](https://tools.ietf.org/html/rfc6585#section-4)
- [IETF Draft - RateLimit Header Fields](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers)

## 🔜 未來改進

1. **用戶級別限流**: 基於 JWT 的用戶 ID 進行限流
2. **動態限流**: 根據系統負載自動調整閾值
3. **白名單**: 允許特定 IP 繞過限流
4. **黑名單**: 自動封鎖惡意 IP
5. **滑動窗口**: 使用更精確的滑動窗口算法
6. **分級限流**: 不同用戶等級有不同的限流配額
7. **告警整合**: 整合 PagerDuty、Slack 告警
8. **Dashboard**: 建立限流監控儀表板

---

**維護者**: DevOps Team  
**最後更新**: 2024-02-16  
**版本**: 1.0.0
