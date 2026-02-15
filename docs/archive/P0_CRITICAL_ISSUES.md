# P0 阻斷上線問題清單

**最後更新**：2026-02-14  
**狀態**：🔴 待處理（5 個）

---

## 📊 總覽

| # | 問題 | 工時 | 緊急度 | 負責人 | 狀態 | 截止日期 |
|---|------|------|--------|--------|------|----------|
| P0-001 | 無分散式追蹤系統 | 40h | ⭐⭐⭐⭐ | DevOps #1 | 🔴 待處理 | Week 2 |
| P0-002 | PostgreSQL 無高可用 | 40h | ⭐⭐⭐⭐⭐ | DevOps #2 | 🔴 待處理 | Week 1 |
| P0-003 | Redis 無高可用 | 24h | ⭐⭐⭐⭐ | DevOps #2 | 🔴 待處理 | Week 1 |
| P0-004 | 無監控與告警系統 | 40h | ⭐⭐⭐⭐⭐ | DevOps #1 | 🔴 待處理 | Week 1 |
| P0-005 | 前端測試覆蓋率不足 | 20h* | ⭐⭐⭐ | QA Engineer | 🔴 待處理 | Week 2 |

*\*僅上線前關鍵部分，完整 80h 可分階段完成*

**總計**：164 工時（約 3 週，需 3-4 人全職）

---

## 🔴 P0-001: 無分散式追蹤系統

### 快速資訊
- **影響**：跨服務問題無法追蹤，MTTR 增加 2-3 倍
- **預計工時**：40 小時（5 天）
- **負責人**：DevOps Engineer #1
- **優先級**：⭐⭐⭐⭐（高，但可在上線後 1 週內完成）

### 實施步驟

#### Day 1-2：安裝 Jaeger（16h）
```bash
# 1. 修改 docker-compose.yml，增加 Jaeger
cat >> docker-compose.yml <<EOF
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: suggar-daddy-jaeger
    ports:
      - "6831:6831/udp"  # Jaeger Agent
      - "16686:16686"    # Jaeger UI
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    networks:
      - suggar-daddy-network
EOF

# 2. 啟動 Jaeger
docker-compose up -d jaeger

# 3. 驗證 UI
open http://localhost:16686
```

#### Day 3-4：整合 OpenTelemetry（16h）

**API Gateway 整合**：
```typescript
// apps/api-gateway/src/main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
  serviceName: 'api-gateway',
});

sdk.start();

// 在 bootstrap() 後記得清理
process.on('SIGTERM', () => sdk.shutdown());
```

**其他微服務整合**（複製到各服務）：
```typescript
// 範例：apps/auth-service/src/main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT,
  }),
  serviceName: 'auth-service',
});

sdk.start();
```

#### Day 5：測試與驗證（8h）
```bash
# 1. 發送測試請求
curl http://localhost:3000/api/users/me -H "Authorization: Bearer $TOKEN"

# 2. 在 Jaeger UI 查看追蹤
# http://localhost:16686
# - 選擇 Service: api-gateway
# - 查看 Trace 是否包含跨服務調用

# 3. 驗證所有服務都有 Trace
# 應該看到：api-gateway → auth-service → user-service 的完整鏈路
```

### 驗收標準
- [ ] Jaeger UI 可訪問（http://localhost:16686）
- [ ] 所有 12 個微服務都出現在 Service 列表
- [ ] 跨服務請求鏈路完整（API Gateway → 後端服務）
- [ ] Span 包含有用資訊（HTTP method, status code, error）

### 環境變數
```bash
# .env
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
OTEL_SAMPLING_RATE=1.0  # 100% sampling (開發/測試)
```

---

## 🔴 P0-002: PostgreSQL 無高可用性

### 快速資訊
- **影響**：單點故障，潛在停機 2-8 小時/次
- **預計工時**：40 小時（5 天）
- **負責人**：DevOps Engineer #2
- **優先級**：⭐⭐⭐⭐⭐（最高）

### 當前狀態
✅ **Docker-Compose 已配置**：
- `postgres-master` (5432)
- `postgres-replica` (5433)

❌ **應用層未實現讀寫分離**：
- 所有服務仍連接 `postgres`（應改為 `postgres-master`）

### 實施步驟

#### Day 1：修改 DatabaseModule（8h）
```typescript
// libs/database/src/database.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const haEnabled = config.get('POSTGRES_HA_ENABLED') === 'true';
        
        if (haEnabled) {
          // 讀寫分離模式
          return {
            type: 'postgres',
            replication: {
              master: {
                host: config.get('POSTGRES_MASTER_HOST') || 'postgres-master',
                port: parseInt(config.get('POSTGRES_MASTER_PORT') || '5432'),
                username: config.get('POSTGRES_USER'),
                password: config.get('POSTGRES_PASSWORD'),
                database: config.get('POSTGRES_DB'),
              },
              slaves: [
                {
                  host: config.get('POSTGRES_REPLICA_HOST') || 'postgres-replica',
                  port: parseInt(config.get('POSTGRES_REPLICA_PORT') || '5433'),
                  username: config.get('POSTGRES_USER'),
                  password: config.get('POSTGRES_PASSWORD'),
                  database: config.get('POSTGRES_DB'),
                },
              ],
            },
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: config.get('NODE_ENV') === 'development',
          };
        } else {
          // 單機模式（向下兼容）
          return {
            type: 'postgres',
            host: config.get('POSTGRES_HOST') || 'postgres',
            port: parseInt(config.get('POSTGRES_PORT') || '5432'),
            username: config.get('POSTGRES_USER'),
            password: config.get('POSTGRES_PASSWORD'),
            database: config.get('POSTGRES_DB'),
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: config.get('NODE_ENV') === 'development',
          };
        }
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

#### Day 2：修改所有服務的 docker-compose 配置（8h）
```yaml
# docker-compose.yml - 所有服務統一修改
services:
  auth-service:
    environment:
      # 啟用 HA 模式
      POSTGRES_HA_ENABLED: true
      POSTGRES_MASTER_HOST: postgres-master
      POSTGRES_MASTER_PORT: 5432
      POSTGRES_REPLICA_HOST: postgres-replica
      POSTGRES_REPLICA_PORT: 5433
      # 移除舊的單機配置
      # POSTGRES_HOST: postgres  # 刪除
      # POSTGRES_PORT: 5432      # 刪除
    depends_on:
      postgres-master:
        condition: service_healthy
      postgres-replica:
        condition: service_healthy
```

**需要修改的服務**（11 個）：
- auth-service
- user-service
- matching-service
- notification-service
- messaging-service
- content-service
- payment-service
- media-service
- subscription-service
- db-writer-service
- admin-service

#### Day 3：測試複製延遲（8h）
```bash
# 1. 在 Master 插入測試數據
docker exec -it suggar-daddy-postgres-master psql -U postgres -d suggar_daddy -c \
  "INSERT INTO users (id, email, username, created_at) VALUES (gen_random_uuid(), 'test@test.com', 'test_user', NOW());"

# 2. 立即在 Replica 查詢（檢查複製延遲）
docker exec -it suggar-daddy-postgres-replica psql -U postgres -d suggar_daddy -c \
  "SELECT * FROM users WHERE email = 'test@test.com';"

# 3. 檢查複製延遲統計
docker exec -it suggar-daddy-postgres-replica psql -U postgres -d suggar_daddy -c \
  "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds;"

# 目標：延遲 < 1 秒
```

#### Day 4：壓力測試（8h）
```bash
# 使用 Apache Bench 或 K6 進行壓力測試
# 驗證讀寫分離效果

# 1. 寫入壓力測試（應只打到 Master）
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  -p post_data.json -T application/json \
  http://localhost:3000/api/posts

# 2. 讀取壓力測試（應分散到 Replica）
ab -n 10000 -c 50 \
  http://localhost:3000/api/posts

# 3. 監控資料庫連線數
docker exec suggar-daddy-postgres-master psql -U postgres -d suggar_daddy -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

#### Day 5：故障轉移測試（8h）
```bash
# 1. 模擬 Master 故障
docker stop suggar-daddy-postgres-master

# 2. 觀察應用行為（應該寫入失敗，但讀取仍可用）
curl http://localhost:3000/api/users/me  # 應該成功（從 Replica）
curl -X POST http://localhost:3000/api/posts  # 應該失敗（Master 不可用）

# 3. 手動提升 Replica 為 Master（需要 Patroni 自動化）
docker exec -it suggar-daddy-postgres-replica psql -U postgres -c "SELECT pg_promote();"

# 4. 重啟 Master
docker start suggar-daddy-postgres-master

# 5. 驗證複製恢復
```

### 驗收標準
- [ ] 所有服務連接到 postgres-master（寫入）
- [ ] 讀取查詢分散到 postgres-replica
- [ ] 複製延遲 < 1 秒
- [ ] 壓力測試通過（1,000 併發）
- [ ] 故障測試通過（Master 宕機後讀取仍可用）

### 環境變數
```bash
# .env
POSTGRES_HA_ENABLED=true
POSTGRES_MASTER_HOST=postgres-master
POSTGRES_MASTER_PORT=5432
POSTGRES_REPLICA_HOST=postgres-replica
POSTGRES_REPLICA_PORT=5433
```

---

## 🔴 P0-003: Redis 無高可用性

### 快速資訊
- **影響**：Redis 故障導致 Cache Miss Storm，資料庫壓力激增 10 倍
- **預計工時**：24 小時（3 天）
- **負責人**：DevOps Engineer #2
- **優先級**：⭐⭐⭐⭐（高）

### 當前狀態
✅ **Docker-Compose 已配置**：
- redis-master, redis-replica-1, redis-replica-2
- redis-sentinel-1/2/3

❌ **應用層部分未整合**：
- matching-service, notification-service, messaging-service, admin-service 仍使用單機模式

### 實施步驟

#### Day 1：驗證 RedisModule 支援 Sentinel（4h）
```typescript
// libs/redis/src/redis.module.ts（確認已實現）
import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

```typescript
// libs/redis/src/redis.service.ts（確認 Sentinel 支援）
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    const sentinels = process.env.REDIS_SENTINELS?.split(',').map(s => {
      const [host, port] = s.trim().split(':');
      return { host, port: parseInt(port) };
    });

    if (sentinels && sentinels.length > 0) {
      // Sentinel 模式
      this.client = new Redis({
        sentinels,
        name: process.env.REDIS_MASTER_NAME || 'mymaster',
        sentinelRetryStrategy: (times) => Math.min(times * 50, 2000),
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });
    } else {
      // 單機模式（向下兼容）
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });
    }

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('+switch-master', (masterName, oldHost, oldPort, newHost, newPort) => {
      console.log(`Redis Sentinel: Master switched from ${oldHost}:${oldPort} to ${newHost}:${newPort}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  // ... 其他方法
}
```

#### Day 1-2：修改所有服務配置（12h）

**需要修改的服務**（找出仍使用單機模式的）：
```bash
# 檢查哪些服務仍使用 REDIS_HOST
grep -r "REDIS_HOST" docker-compose.yml
```

**修改範例**：
```yaml
# docker-compose.yml - matching-service
matching-service:
  environment:
    # 移除單機配置
    # REDIS_HOST: redis  # 刪除
    # REDIS_PORT: 6379   # 刪除
    
    # 使用 Sentinel
    REDIS_SENTINELS: redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379
    REDIS_MASTER_NAME: mymaster
  depends_on:
    redis-master:
      condition: service_healthy
    redis-sentinel-1:
      condition: service_healthy
```

**需要修改的服務**：
- matching-service
- notification-service
- messaging-service
- admin-service
- (其他仍使用 REDIS_HOST 的)

#### Day 3：故障轉移測試（8h）
```bash
# 1. 驗證當前 Master
docker exec -it suggar-daddy-redis-sentinel-1 redis-cli -p 26379 \
  SENTINEL masters

# 2. 模擬 Master 故障
docker stop suggar-daddy-redis-master

# 3. 等待 Sentinel 自動故障轉移（應在 30 秒內完成）
# 觀察日誌
docker logs -f suggar-daddy-redis-sentinel-1

# 4. 驗證新 Master
docker exec -it suggar-daddy-redis-sentinel-1 redis-cli -p 26379 \
  SENTINEL get-master-addr-by-name mymaster

# 5. 驗證應用仍可連接
curl http://localhost:3000/api/users/me  # 應該成功

# 6. 重啟原 Master（應自動變為 Replica）
docker start suggar-daddy-redis-master
```

### 驗收標準
- [ ] 所有服務使用 ioredis Sentinel 客戶端
- [ ] 所有服務配置 REDIS_SENTINELS（移除 REDIS_HOST）
- [ ] 故障轉移 < 30 秒
- [ ] 應用自動重連新 Master
- [ ] 日誌顯示 `+switch-master` 事件

### 快取預熱腳本（可選）
```typescript
// scripts/cache-warmup.ts
import Redis from 'ioredis';

async function warmupCache() {
  const redis = new Redis({
    sentinels: [
      { host: 'redis-sentinel-1', port: 26379 },
      { host: 'redis-sentinel-2', port: 26379 },
      { host: 'redis-sentinel-3', port: 26379 },
    ],
    name: 'mymaster',
  });

  // 預熱熱門用戶
  const hotUsers = await fetchHotUsers();
  for (const user of hotUsers) {
    await redis.set(`user:${user.id}`, JSON.stringify(user), 'EX', 3600);
  }

  // 預熱熱門貼文
  const hotPosts = await fetchHotPosts();
  for (const post of hotPosts) {
    await redis.set(`post:${post.id}`, JSON.stringify(post), 'EX', 3600);
  }

  console.log('Cache warmup completed');
  redis.disconnect();
}

warmupCache();
```

---

## 🔴 P0-004: 無監控與告警系統

### 快速資訊
- **影響**：被動發現問題，MTTR 2-4 小時
- **預計工時**：40 小時（5 天）
- **負責人**：DevOps Engineer #1
- **優先級**：⭐⭐⭐⭐⭐（最高）

### 當前狀態
✅ **基礎設施已準備**：
- `infrastructure/monitoring/docker-compose.monitoring.yml`
- Prometheus, Grafana, Alertmanager, Node Exporter, cAdvisor

❌ **應用層未整合**：
- 微服務未暴露 /metrics 端點

### 實施步驟

#### Day 1：安裝 Prometheus + Grafana（8h）
```bash
# 1. 啟動監控系統
cd infrastructure/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# 2. 驗證訪問
open http://localhost:9090  # Prometheus
open http://localhost:3001  # Grafana (admin/admin123)

# 3. 檢查 Prometheus Targets
# http://localhost:9090/targets
# 應該看到：prometheus, node-exporter, cadvisor 都是 UP
```

#### Day 2-3：應用層整合 Prometheus（16h）

**安裝依賴**：
```bash
npm install --save @willsoto/nestjs-prometheus prom-client
```

**創建 MetricsModule**：
```typescript
// libs/common/src/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    // 自定義指標
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latencies in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
```

**整合到各服務**：
```typescript
// 範例：apps/api-gateway/src/app/app.module.ts
import { MetricsModule } from '@common/metrics/metrics.module';

@Module({
  imports: [
    MetricsModule,
    // ... 其他模組
  ],
})
export class AppModule {}
```

**範例：在 Controller 中記錄指標**：
```typescript
// apps/api-gateway/src/app/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Controller()
export class AppController {
  constructor(
    @InjectMetric('http_requests_total') private requestCounter: Counter,
    @InjectMetric('http_request_duration_seconds') private requestDuration: Histogram,
  ) {}

  @Get('health')
  async health() {
    const end = this.requestDuration.startTimer();
    this.requestCounter.inc({ method: 'GET', path: '/health', status: '200' });
    // ... 業務邏輯
    end({ method: 'GET', path: '/health', status: '200' });
    return { status: 'ok' };
  }
}
```

**更新 Prometheus 配置**：
```yaml
# infrastructure/monitoring/prometheus.yml
scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3002']
    metrics_path: '/metrics'

  # ... 其他 11 個服務
```

#### Day 4：配置告警規則（8h）
```yaml
# infrastructure/monitoring/alerts.yml
groups:
  - name: critical
    interval: 30s
    rules:
      # 服務宕機
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      # 高錯誤率
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # API 高延遲
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency on {{ $labels.job }}"
          description: "P95 latency is {{ $value }}s"

      # 資料庫連線數過高
      - alert: HighDatabaseConnections
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database connections are at {{ $value | humanizePercentage }}"

      # Redis 命中率低
      - alert: LowRedisCacheHitRate
        expr: redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low Redis cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
```

**配置 Alertmanager**：
```yaml
# infrastructure/monitoring/alertmanager.yml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-critical'
  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
    - match:
        severity: warning
      receiver: 'slack-warning'

receivers:
  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        title: '🔴 Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ end }}'

  - name: 'slack-warning'
    slack_configs:
      - channel: '#alerts-warning'
        title: '🟡 Warning Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'
```

#### Day 5：創建 Grafana Dashboards（8h）

**Dashboard 1：系統資源監控**
- CPU 使用率（Node Exporter）
- 記憶體使用率
- 磁碟 I/O
- 網路流量

**Dashboard 2：應用效能監控**
- QPS（每秒請求數）
- P50/P95/P99 延遲
- 錯誤率（4xx, 5xx）
- 各服務健康狀態

**Dashboard 3：資料層監控**
- PostgreSQL 連線數、TPS、Slow Queries
- Redis 命中率、記憶體使用
- Kafka Consumer Lag

**匯入預設 Dashboard**：
```bash
# Grafana UI → Import Dashboard
# 輸入 Dashboard ID：
# - 1860 (Node Exporter Full)
# - 3662 (Prometheus 2.0 Stats)
# - 9628 (PostgreSQL Database)
```

### 驗收標準
- [ ] Prometheus 可訪問（http://localhost:9090）
- [ ] Grafana 可訪問（http://localhost:3001）
- [ ] 所有 12 個微服務都在 Prometheus Targets（/metrics 端點）
- [ ] 至少 3 個 Grafana Dashboards
- [ ] 告警規則已配置（至少 5 個）
- [ ] Alertmanager 整合 Slack（測試一次告警）

### 驗證測試
```bash
# 1. 觸發高錯誤率告警（測試）
for i in {1..100}; do
  curl http://localhost:3000/api/nonexistent
done

# 2. 檢查 Alertmanager
open http://localhost:9093

# 3. 檢查 Slack 是否收到通知
```

---

## 🔴 P0-005: 前端測試覆蓋率不足

### 快速資訊
- **影響**：生產 Bug 發現晚，用戶體驗下降
- **預計工時**：20 小時（上線前關鍵部分）
- **完整工時**：80 小時（分 8 週完成）
- **負責人**：QA Engineer + Frontend Developer
- **優先級**：⭐⭐⭐（中，可分階段完成）

### 當前狀態
- **Web 前端**：測試覆蓋率 30%（目標 60%）
- **Admin 前端**：測試覆蓋率 40%（目標 60%）

### 實施步驟

#### Week 1（20h）：關鍵流程測試

**優先級 P0**：
- [ ] 登入流程測試（4h）
- [ ] 註冊流程測試（4h）
- [ ] 支付流程測試（6h）
- [ ] 配對功能測試（6h）

**範例：登入流程測試**
```typescript
// apps/web/src/components/LoginForm.spec.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { apiClient } from '@api-client';

jest.mock('@api-client');

describe('LoginForm', () => {
  it('should login successfully with valid credentials', async () => {
    // Mock API
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { access_token: 'fake-token', user: { id: '123', email: 'test@test.com' } },
    });

    render(<LoginForm />);

    // 填寫表單
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    // 提交
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // 驗證
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password123',
      });
    });

    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('should show error message with invalid credentials', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

**範例：支付流程 E2E 測試**
```typescript
// e2e/payment.spec.ts
import { test, expect } from '@playwright/test';

test('complete PPV purchase flow', async ({ page }) => {
  // 1. 登入
  await page.goto('http://localhost:4200/login');
  await page.fill('input[name="email"]', 'buyer@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('http://localhost:4200/feed');

  // 2. 瀏覽貼文
  await page.click('text=View Post');
  await expect(page.locator('.post-locked')).toBeVisible();

  // 3. 購買 PPV
  await page.click('button:has-text("Unlock for $9.99")');
  
  // 4. Stripe Checkout
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.fill('input[name="cardExpiry"]', '12/30');
  await page.fill('input[name="cardCvc"]', '123');
  await page.click('button:has-text("Pay")');

  // 5. 驗證解鎖
  await expect(page.locator('.post-content')).toBeVisible();
  await expect(page.locator('.post-locked')).not.toBeVisible();
});
```

#### 驗收標準（上線前）
- [ ] 登入/註冊流程測試通過
- [ ] 支付流程 E2E 測試通過
- [ ] 配對功能測試通過
- [ ] 測試覆蓋率達 40%（關鍵流程）

#### Week 2-8（60h）：持續提升（上線後）
- Week 2-3：元件單元測試 → 50%
- Week 4-6：整合測試、邊緣案例 → 60%
- Week 7-8：重構測試、文檔

---

## 📞 緊急聯絡

### 負責人

| 角色 | 姓名 | 任務 | 聯絡方式 |
|------|------|------|---------|
| **DevOps #1** | [待指派] | P0-001, P0-004 | devops1@company.com |
| **DevOps #2** | [待指派] | P0-002, P0-003 | devops2@company.com |
| **QA Engineer** | [待指派] | P0-005 | qa@company.com |
| **Tech Lead** | [待指派] | 整體協調 | tech-lead@company.com |

### 每日站會

**時間**：每天早上 10:00  
**時長**：15 分鐘  
**議程**：
1. 昨天完成了什麼？
2. 今天計劃做什麼？
3. 遇到什麼阻礙？

### 問題升級路徑

```
遇到阻礙
    ↓
立即告知 Tech Lead
    ↓
Tech Lead 評估
    ↓
    ├─ 技術問題：召集相關工程師討論
    ├─ 資源問題：向上級申請資源
    └─ 範圍問題：評估是否調整優先級
```

---

## 📊 進度追蹤

### 每日更新

**格式**：
```
### 2026-02-XX
- P0-001：✅ Jaeger 安裝完成 / 🟡 API Gateway 整合中 / 🔴 其他服務待整合
- P0-002：✅ DatabaseModule 修改完成 / 🟡 docker-compose 修改中
- P0-003：✅ Redis Sentinel 驗證完成 / 🟡 服務配置修改中
- P0-004：✅ Prometheus 安裝完成 / 🟡 應用層整合中
- P0-005：🔴 待開始
```

### 風險日誌

**格式**：
```
### 2026-02-XX - 風險
- **問題**：PostgreSQL 複製延遲 > 5 秒
- **影響**：讀寫分離效果不佳
- **解決方案**：調整 wal_sender_timeout，增加網路頻寬
- **狀態**：🟡 處理中
```

---

## ✅ 完成標準

### 整體完成標準

- [ ] 所有 5 個 P0 問題狀態為 ✅
- [ ] 所有驗收標準達成
- [ ] 壓力測試通過
- [ ] 故障演練通過
- [ ] 文檔更新完成

### 上線許可

**簽核**：
- [ ] DevOps Team Lead
- [ ] Tech Lead
- [ ] Solution Architect
- [ ] CTO

**最終檢查**：
```bash
# 執行上線前檢查腳本
./scripts/pre-launch-check.sh

# 預期輸出：
# ✅ P0-001: Jaeger 追蹤正常
# ✅ P0-002: PostgreSQL 讀寫分離正常
# ✅ P0-003: Redis Sentinel 正常
# ✅ P0-004: 監控系統正常
# ✅ P0-005: 前端測試覆蓋率 40%
# ✅ 備份系統正常
# ✅ 告警系統正常
# 
# 🎉 系統準備上線！
```

---

**最後更新**：2026-02-14  
**下次審查**：2026-02-15（每日更新）

*本文檔是 [PRODUCTION_READINESS_ASSESSMENT.md](./PRODUCTION_READINESS_ASSESSMENT.md) 的快速參考清單。*
