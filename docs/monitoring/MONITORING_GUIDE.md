# 監控系統指南 - Sugar Daddy Project

## 📋 目錄
1. [系統架構](#系統架構)
2. [快速開始](#快速開始)
3. [Prometheus 配置](#prometheus-配置)
4. [Grafana 儀表板](#grafana-儀表板)
5. [ELK Stack 使用](#elk-stack-使用)
6. [Health Check API](#health-check-api)
7. [告警規則](#告警規則)
8. [故障排查](#故障排查)

---

## 系統架構

### 監控棧組件

```
┌─────────────────────────────────────────────────────────┐
│                  Sugar Daddy Monitoring                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │  Prometheus  │     │ Alertmanager │                 │
│  │  (9090)      │────▶│  (9093)      │                 │
│  └──────────────┘     └──────────────┘                 │
│         ▲                     │                         │
│         │                     ▼                         │
│         │              ┌──────────────┐                │
│         │              │   Slack      │                │
│         │              │   PagerDuty  │                │
│         │              └──────────────┘                │
│         │                                               │
│  ┌──────┴─────────────────────────┐                    │
│  │                                │                    │
│  ▼                                ▼                    │
│ ┌──────────────┐          ┌──────────────┐            │
│ │  Exporters   │          │  Application │            │
│ │              │          │    /metrics  │            │
│ │ • PostgreSQL │          │              │            │
│ │ • Redis      │          │ (3000-3002)  │            │
│ │ • Node       │          │              │            │
│ │ • cAdvisor   │          └──────────────┘            │
│ └──────────────┘                                        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              ELK Stack                          │   │
│  │                                                 │   │
│  │  Logstash (5000) ──▶ Elasticsearch (9200)      │   │
│  │       ▲                    ▲                   │   │
│  │       │                    │                   │   │
│  │  Application           Kibana (5601)           │   │
│  │  Logs                                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────┐                                       │
│  │   Grafana    │────▶ Prometheus                      │
│  │   (3010)     │────▶ Elasticsearch                   │
│  └──────────────┘                                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 服務埠映射

| 服務 | 埠 | 用途 |
|------|-----|------|
| Prometheus | 9090 | 指標存儲和查詢 |
| Alertmanager | 9093 | 告警管理 |
| Grafana | 3010 | 可視化儀表板 |
| Elasticsearch | 9200 | 日誌存儲 |
| Kibana | 5601 | 日誌可視化 |
| Logstash | 5000,5044,8080 | 日誌處理 |
| PostgreSQL Exporter | 9187 | 數據庫指標 |
| Redis Exporter | 9121 | 緩存指標 |
| Node Exporter | 9100 | 系統指標 |
| cAdvisor | 8080 | 容器指標 |

---

## 快速開始

### 1. 啟動監控棧

```bash
# 進入項目目錄
cd /Users/brianyu/.openclaw/workspace

# 啟動所有服務
docker-compose up -d

# 檢查服務狀態
docker-compose ps
```

### 2. 訪問 Web UI

| 服務 | URL | 默認認證 |
|------|-----|---------|
| Prometheus | http://localhost:9090 | 無 |
| Grafana | http://localhost:3010 | admin/admin |
| Kibana | http://localhost:5601 | 無 |
| Alertmanager | http://localhost:9093 | 無 |

### 3. 驗證數據採集

```bash
# 檢查 Prometheus 目標狀態
curl http://localhost:9090/api/v1/targets

# 查詢指標
curl 'http://localhost:9090/api/v1/query?query=up'

# 查看告警
curl http://localhost:9093/api/v1/alerts
```

---

## Prometheus 配置

### 配置文件位置

- **主配置**: `./monitoring/prometheus.yml`
- **告警規則**: `./monitoring/alert_rules.yml`
- **數據位置**: `./prometheus_data/`

### 監控目標

#### 1. 應用服務
- **Recommendation Service** (3000)
- **Content-Streaming Service** (3001)
- **Auth Service** (3002)

#### 2. 基礎設施
- **PostgreSQL** (via postgres_exporter:9187)
- **Redis** (via redis_exporter:9121)
- **System** (via node_exporter:9100)
- **Docker** (via cadvisor:8080)

### 指標保留期

```yaml
# prometheus.yml
- '--storage.tsdb.retention.time=15d'  # 保留 15 天數據
```

### 添加新的監控目標

編輯 `monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['my-service:8080']
    scrape_interval: 15s
```

然後重新載入配置:

```bash
# 使用 API 重新載入
curl -X POST http://localhost:9090/-/reload

# 或者重啟容器
docker-compose restart prometheus
```

---

## Grafana 儀表板

### 預配置的儀表板

1. **API 性能儀表板** (`api-performance`)
   - 請求速率
   - 響應延遲 (p95, p99)
   - 錯誤率
   - 應用記憶體使用

2. **數據庫性能儀表板** (`db-performance`)
   - 查詢延遲
   - 數據庫連接數
   - 緩存命中率
   - 查詢錯誤

3. **基礎設施儀表板** (`infrastructure`)
   - CPU 使用率
   - 記憶體使用率
   - 磁盤空間
   - 系統負載

### 訪問儀表板

1. 打開 Grafana: http://localhost:3010
2. 使用 `admin/admin` 登錄
3. 點擊 "Dashboards" 查看所有儀表板
4. 點擊儀表板名稱查看詳細數據

### 創建自定義儀表板

1. 點擊 "+" 按鈕
2. 選擇 "Dashboard"
3. 點擊 "Add Panel"
4. 選擇數據源 (Prometheus 或 Elasticsearch)
5. 編寫 PromQL 查詢或搜索條件
6. 保存面板

### PromQL 查詢示例

```promql
# API 請求速率
rate(http_requests_total[5m])

# API 響應延遲 (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# API 錯誤率
rate(http_requests_total{status=~"5.."}[5m])

# 數據庫連接數
pg_stat_activity_count

# Redis 命中率
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))

# 應用記憶體使用 (MB)
process_resident_memory_bytes / 1024 / 1024

# CPU 使用率
1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))
```

---

## ELK Stack 使用

### 日誌流程

```
應用 → Logstash → Elasticsearch → Kibana
```

### 日誌來源

1. **應用日誌**
   - `/var/log/sugar-daddy/app.log`
   - `/var/log/sugar-daddy/content-streaming.log`
   - `/var/log/sugar-daddy/auth.log`

2. **基礎設施日誌**
   - PostgreSQL: `/var/log/sugar-daddy/postgres.log`
   - Redis: `/var/log/sugar-daddy/redis.log`

3. **Docker 日誌**
   - TCP 埠 5000

4. **Syslog**
   - UDP 埠 514

### Kibana 操作

#### 1. 創建索引模式

1. 打開 Kibana: http://localhost:5601
2. 點擊 "Discover"
3. 點擊 "Create index pattern"
4. 輸入 `logs-*`
5. 選擇 `@timestamp` 作為時間字段

#### 2. 搜索日誌

```
# 搜索錯誤日誌
level:ERROR

# 搜索特定服務
service:recommendation

# 搜索特定時間範圍
@timestamp:[2024-02-19 10:00:00 TO 2024-02-19 11:00:00]

# 搜索 API 響應時間超過 1 秒
response_time:>1000 AND service:api
```

#### 3. 創建可視化

1. 點擊 "Visualize"
2. 選擇可視化類型 (Line, Bar, Pie 等)
3. 選擇數據源 (`logs-*`)
4. 配置指標和分組

### Logstash 配置

配置文件: `monitoring/logstash.conf`

```
input {
  # 接收日誌的各種方式
  tcp { port => 5000 }
  udp { port => 514 }
  http { port => 8080 }
  file { path => "/var/log/sugar-daddy/*.log" }
}

filter {
  # 解析和豐富日誌
  json { source => "message" }
  grok { match => { "message" => "%{PATTERN}" } }
}

output {
  # 輸出到 Elasticsearch
  elasticsearch { hosts => ["elasticsearch:9200"] }
}
```

---

## Health Check API

### 端點

#### 1. 基礎健康檢查 (Kubernetes liveness)
```
GET /health

HTTP 200
{
  "status": "healthy",
  "timestamp": "2024-02-19T10:12:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "memory": { "status": "ok", "details": {...} },
    "cpu": { "status": "ok", "details": {...} }
  }
}
```

#### 2. 就緒檢查 (Kubernetes readiness)
```
GET /ready

HTTP 200
{
  "ready": true,
  "timestamp": "2024-02-19T10:12:00Z",
  "services": {
    "database": true,
    "cache": true,
    "api": true
  }
}
```

#### 3. 深度健康檢查
```
GET /health/deep

HTTP 200
{
  "status": "healthy",
  "checks": {
    "memory": {...},
    "cpu": {...},
    "database": { "status": "ok", "responseTime": 12 },
    "redis": { "status": "ok", "responseTime": 5 },
    "diskSpace": {...}
  }
}
```

#### 4. 依賴檢查
```
GET /health/dependencies

HTTP 200
{
  "dependencies": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "externalAPIs": { "status": "ok" }
  }
}
```

#### 5. 活性檢查
```
GET /live

HTTP 200
{
  "status": "alive",
  "timestamp": "2024-02-19T10:12:00Z",
  "uptime": 3600
}
```

### 集成到應用

```typescript
import HealthCheckService from './health-check-service';
import { PrometheusMetrics } from './prometheus-metrics';

// 在 Express 應用中集成
const healthCheck = new HealthCheckService(pgPool, redisClient);
const metrics = new PrometheusMetrics();

app.use(healthCheck.getRouter());
app.use(metrics.middleware());
app.use(metrics.getMetricsRouter());
```

---

## 告警規則

### 告警配置

配置文件: `monitoring/alert_rules.yml`

### 告警級別

| 級別 | 描述 | 響應時間 |
|------|------|---------|
| critical | 服務宕機，需要立即響應 | 1 分鐘 |
| warning | 性能下降，需要關注 | 5 分鐘 |

### 常見告警

#### API 告警
- **HighAPILatency**: API 響應延遲超過 1 秒 (p95)
- **HighAPIErrorRate**: API 錯誤率超過 5%
- **LowAPIThroughput**: API 吞吐量過低

#### 數據庫告警
- **HighDBConnections**: 數據庫連接超過 80
- **SlowQueries**: 慢查詢速率過高
- **LowCacheHitRatio**: 緩存命中率低於 99%
- **LowDiskSpace**: 數據庫磁盤空間超過 80%

#### Redis 告警
- **HighRedisMemory**: Redis 記憶體使用超過 85%
- **LowRedisHitRate**: Redis 命中率低於 80%
- **TooManyRedisConnections**: Redis 連接超過 1000
- **RedisDown**: Redis 伺服器宕機

#### 基礎設施告警
- **HighCPUUsage**: CPU 使用率超過 80%
- **HighMemoryUsage**: 應用記憶體超過 500MB
- **ApplicationDown**: 應用服務宕機
- **NodeDown**: 系統節點宕機
- **LowDiskSpace**: 磁盤空間不足 15%
- **HighSystemLoad**: 系統負載過高

### 管理告警

#### 查看告警
```bash
# 通過 API
curl http://localhost:9093/api/v1/alerts

# 通過 UI
http://localhost:9093
```

#### 消除告警
```bash
# 通過 API
curl -X POST http://localhost:9093/api/v1/alerts/silence \
  -d '{"matchers": [{"name": "alertname", "value": "HighAPILatency"}]}'
```

---

## 故障排查

### 常見問題

#### 1. Prometheus 無法連接到指標端點

**症狀**: Prometheus 目標顯示 `DOWN`

**解決方案**:
```bash
# 檢查服務健康
docker-compose ps

# 查看容器日誌
docker-compose logs prometheus
docker-compose logs recommendation

# 檢查網絡連通性
docker-compose exec prometheus curl http://recommendation:3000/metrics
```

#### 2. Grafana 面板無數據

**症狀**: Grafana 儀表板顯示 "No data"

**解決方案**:
```bash
# 驗證 Prometheus 有數據
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'

# 檢查查詢語法
# 在 Prometheus UI (http://localhost:9090) 測試查詢

# 重新配置數據源
# 在 Grafana 中測試數據源連接
```

#### 3. 日誌未出現在 Kibana

**症狀**: Kibana 中無日誌數據

**解決方案**:
```bash
# 檢查 Logstash 是否運行
docker-compose ps logstash

# 查看 Logstash 日誌
docker-compose logs logstash

# 驗證 Elasticsearch 索引
curl http://localhost:9200/_cat/indices

# 測試日誌導入
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "level": "INFO"}'
```

#### 4. 告警未觸發

**症狀**: Prometheus 規則正常但未發送告警

**解決方案**:
```bash
# 查看告警規則狀態
curl http://localhost:9090/api/v1/rules

# 檢查 Alertmanager 配置
docker-compose logs alertmanager

# 驗證告警接收者配置
# 編輯 monitoring/alertmanager.yml 確保接收者配置正確

# 測試告警
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels": {"alertname": "test"}, "annotations": {"summary": "Test alert"}}]'
```

#### 5. 容器持續重啟

**症狀**: 容器頻繁重啟或停止

**解決方案**:
```bash
# 查看容器日誌
docker-compose logs <service-name>

# 檢查資源使用
docker stats

# 查看磁盤空間
df -h

# 清理未使用的資源
docker-compose down
docker volume prune
docker-compose up -d
```

### 調試命令

```bash
# 檢查容器連通性
docker-compose exec prometheus ping elasticsearch

# 查看環境變量
docker-compose exec elasticsearch env

# 進入容器進行調試
docker-compose exec prometheus /bin/sh

# 查看網絡狀態
docker network ls
docker network inspect sugar-daddy-network

# 檢查磁盤使用
du -sh ./prometheus_data ./elasticsearch_data ./grafana_data

# 查看容器資源限制
docker inspect <container-id> | grep -A 5 "Memory"
```

### 性能優化

#### 1. Prometheus 優化

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 30s        # 增加收集間隔
  evaluation_interval: 60s    # 增加評估間隔
```

#### 2. Elasticsearch 優化

```yaml
# monitoring/elasticsearch.yml
indices.memory.index_buffer_size: 40%  # 增加索引緩衝
```

#### 3. 磁盤空間管理

```bash
# 查看數據大小
du -sh ./prometheus_data ./elasticsearch_data

# 刪除舊索引
curl -X DELETE http://localhost:9200/logs-2024-02-01

# 配置索引生命週期管理 (ILM)
# 參考 Elasticsearch 文檔
```

---

## 監控最佳實踐

1. **定期檢查告警**: 確保告警規則有效運作
2. **備份配置**: 定期備份 Prometheus、Grafana、Elasticsearch 配置
3. **監控監控系統**: 監控監控棧本身的健康狀態
4. **優化性能**: 定期清理舊數據，調整保留期限
5. **文檔更新**: 保持告警規則和儀表板文檔最新
6. **測試告警**: 定期測試告警通知流程
7. **容量規劃**: 根據數據增長規劃存儲容量

---

## 相關文件

- 配置文件: `./monitoring/`
- 儀表板: `./monitoring/grafana/provisioning/dashboards/`
- Docker Compose: `./docker-compose.yml`

---

**更新日期**: 2024-02-19  
**版本**: 1.0.0
