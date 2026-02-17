# Rate Limiting 部署指南

## 📋 部署前檢查清單

### 環境準備

- [ ] ✅ Redis 已安裝並運行
- [ ] ✅ Load Balancer 配置檢查
- [ ] ✅ 環境變數已設置
- [ ] ✅ 代碼已通過測試

## 🚀 部署步驟

### 1. 驗證 Redis 連接

```bash
# 檢查 Redis 是否運行
docker-compose ps redis-master

# 測試 Redis 連接
docker-compose exec redis-master redis-cli ping
# 預期輸出: PONG
```

### 2. 配置環境變數

在 `.env` 或 `.env.production` 中添加：

```bash
# Rate Limiting Configuration
THROTTLE_GLOBAL_LIMIT=100
THROTTLE_AUTH_LIMIT=5
THROTTLE_PAYMENT_LIMIT=10
THROTTLE_WINDOW_SECONDS=60

# Redis Configuration
REDIS_HOST=redis-master
REDIS_PORT=6379

# 如果使用 Sentinel (生產環境推薦)
# REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26380,redis-sentinel-3:26381
# REDIS_MASTER_NAME=mymaster
```

### 3. 驗證 Load Balancer 配置

確保 Load Balancer 傳遞真實客戶端 IP：

**AWS ALB / ELB**:
```yaml
# X-Forwarded-For header 會自動添加
# 無需額外配置
```

**Nginx**:
```nginx
location / {
    proxy_pass http://api-gateway:3000;
    
    # 傳遞真實客戶端 IP
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Cloudflare**:
```
# Cloudflare 自動添加以下 headers:
# - CF-Connecting-IP (真實客戶端 IP)
# - X-Forwarded-For (完整代理鏈)
# 無需額外配置
```

### 4. 部署到 Staging

```bash
# 1. 構建 Docker 鏡像
docker-compose build api-gateway

# 2. 啟動服務
docker-compose up -d api-gateway redis-master

# 3. 檢查日誌
docker-compose logs -f api-gateway

# 查找以下日誌確認 Rate Limiting 已啟用:
# [Throttler] 📍 使用單機 Redis 進行 Rate Limiting: redis://redis-master:6379
```

### 5. 運行測試

```bash
# E2E 測試
npm test -- rate-limiting.e2e.spec.ts

# 手動測試全局限流
for i in {1..105}; do
  curl -H "X-Forwarded-For: 192.168.1.100" \
    http://localhost:3000/health
  echo "Request $i"
done

# 預期: 前 100 個成功，後 5 個返回 429
```

### 6. 驗證 Rate Limit Headers

```bash
curl -v http://localhost:3000/health

# 檢查回應 headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1708214460
```

### 7. 監控 Redis Keys

```bash
# 進入 Redis CLI
docker-compose exec redis-master redis-cli

# 查看所有 throttle keys
127.0.0.1:6379> KEYS throttle:*

# 預期輸出:
# 1) "throttle:global:192.168.1.100"
# 2) "throttle:auth:192.168.1.101"

# 查看特定 key 的值和 TTL
127.0.0.1:6379> GET throttle:global:192.168.1.100
"5"

127.0.0.1:6379> TTL throttle:global:192.168.1.100
(integer) 45
```

## 🧪 測試場景

### 場景 1: 全局限流測試

```bash
# 使用 Apache Bench
ab -n 150 -c 10 http://localhost:3000/health

# 預期:
# - 前 100 個請求: 200 OK
# - 後 50 個請求: 429 Too Many Requests
```

### 場景 2: 認證端點限流測試

```bash
# 測試登入端點
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: 192.168.1.101" \
    -d '{"email":"test@example.com","password":"password"}'
  sleep 0.1
done

# 預期:
# - 前 5 個請求: 401 (認證失敗) 或其他
# - 後 5 個請求: 429 (Rate Limited)
```

### 場景 3: 多 IP 測試

```bash
# 測試不同 IP 有獨立的限流計數器
for i in {1..3}; do
  curl -H "X-Forwarded-For: 192.168.1.$i" \
    http://localhost:3000/health
done

# 每個 IP 都應該成功
```

## 📊 監控設置

### 1. Prometheus 指標

創建 `prometheus-config.yml`:

```yaml
scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
    metrics_path: '/metrics'
```

### 2. Grafana Dashboard

導入預設 Dashboard 或創建自訂儀表板：

```json
{
  "dashboard": {
    "title": "Rate Limiting Dashboard",
    "panels": [
      {
        "title": "Rate Limit Hits (429 Responses)",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=\"429\"}[5m])"
          }
        ]
      },
      {
        "title": "Top Rate Limited IPs",
        "targets": [
          {
            "expr": "topk(10, sum by (ip) (rate(rate_limit_hits_total[5m])))"
          }
        ]
      }
    ]
  }
}
```

### 3. 告警規則

創建 `alerting-rules.yml`:

```yaml
groups:
  - name: rate_limiting
    rules:
      - alert: HighRateLimitHits
        expr: rate(http_requests_total{status="429"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate limit hits detected"
          description: "{{ $value }} requests/sec are being rate limited"
      
      - alert: RateLimitRedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Rate limiting Redis is down"
          description: "Rate limiting will be disabled"
```

## 🔧 故障排除

### 問題 1: Rate Limiting 不生效

**症狀**: 發送超過限制的請求仍然返回 200

**檢查**:
```bash
# 1. 檢查 Redis 連接
docker-compose exec api-gateway npm run check-redis

# 2. 檢查環境變數
docker-compose exec api-gateway env | grep THROTTLE

# 3. 檢查日誌
docker-compose logs api-gateway | grep Throttler
```

**解決方案**:
- 確認 Redis 正常運行
- 確認環境變數已正確設置
- 重啟 API Gateway

### 問題 2: 所有請求都被限流

**症狀**: 即使第一個請求也返回 429

**檢查**:
```bash
# 檢查 Redis 中是否有殘留的限流 keys
docker-compose exec redis-master redis-cli KEYS "throttle:*"

# 刪除所有限流 keys
docker-compose exec redis-master redis-cli --scan --pattern "throttle:*" | xargs redis-cli DEL
```

### 問題 3: 無法獲取真實 IP

**症狀**: 所有請求被視為同一個 IP

**檢查**:
```bash
# 測試 X-Forwarded-For
curl -v -H "X-Forwarded-For: 1.2.3.4" http://localhost:3000/health

# 檢查日誌中的 IP
docker-compose logs api-gateway | grep "Rate limit"
```

**解決方案**:
- 確認 `trust proxy` 已設置
- 檢查 Load Balancer 是否傳遞 IP headers
- 驗證 ThrottlerBehindProxyGuard 正確實施

### 問題 4: Redis 連接失敗

**症狀**: 日誌顯示 "Redis connection failed"

**檢查**:
```bash
# 測試 Redis 連接
docker-compose exec api-gateway telnet redis-master 6379
```

**解決方案**:
- 確認 Redis 服務運行中
- 檢查網路配置
- 驗證 Redis 主機名和端口

## 📈 效能調優

### 調整限流閾值

根據實際流量調整：

```bash
# 開發環境 (寬鬆)
THROTTLE_GLOBAL_LIMIT=1000
THROTTLE_AUTH_LIMIT=10
THROTTLE_PAYMENT_LIMIT=20

# 生產環境 (嚴格)
THROTTLE_GLOBAL_LIMIT=100
THROTTLE_AUTH_LIMIT=5
THROTTLE_PAYMENT_LIMIT=10

# 高流量環境 (超嚴格)
THROTTLE_GLOBAL_LIMIT=50
THROTTLE_AUTH_LIMIT=3
THROTTLE_PAYMENT_LIMIT=5
```

### Redis 連接池優化

如果 Redis 連接是瓶頸：

```typescript
// throttler.config.ts
new Redis({
  host: 'redis-master',
  port: 6379,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  // 增加連接池
  maxRetriesPerRequest: 5,
  retryStrategy: (times) => Math.min(times * 100, 2000),
});
```

## ✅ 部署檢查清單

部署完成後，確認以下項目：

- [ ] ✅ Redis 連接正常
- [ ] ✅ 環境變數已設置
- [ ] ✅ Trust proxy 已配置
- [ ] ✅ Load Balancer 傳遞 IP headers
- [ ] ✅ E2E 測試通過
- [ ] ✅ 手動測試驗證
- [ ] ✅ Rate Limit Headers 正確
- [ ] ✅ Redis keys 正常創建
- [ ] ✅ 監控已設置
- [ ] ✅ 告警已配置
- [ ] ✅ 文檔已更新

## 🎯 驗收標準

部署成功的標準：

1. ✅ 全局限流生效（100 req/min）
2. ✅ 認證端點限流生效（5 req/min）
3. ✅ 支付端點限流生效（10 req/min）
4. ✅ 429 回應包含正確的 headers
5. ✅ 不同 IP 有獨立的計數器
6. ✅ 健康檢查不受限流影響
7. ✅ Redis 故障時服務仍可用（降級）

## 📞 支援

如有問題，請聯繫：
- DevOps Team: devops@suggar-daddy.com
- Security Team: security@suggar-daddy.com
- Emergency Hotline: +1-XXX-XXX-XXXX

---

**文檔版本**: 1.0.0  
**最後更新**: 2024-02-16  
**維護者**: DevOps Engineer
