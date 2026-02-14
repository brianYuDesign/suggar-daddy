# 運維手冊（Operations Guide）

**版本**：1.0  
**最後更新**：2026-02-13  
**維護者**：DevOps Team

---

## 📋 目錄

1. [系統概覽](#系統概覽)
2. [日常運維流程](#日常運維流程)
3. [服務管理](#服務管理)
4. [監控與告警](#監控與告警)
5. [故障排查指南](#故障排查指南)
6. [備份與恢復](#備份與恢復)
7. [擴展指南](#擴展指南)
8. [安全運維](#安全運維)
9. [維護窗口](#維護窗口)
10. [緊急聯絡](#緊急聯絡)

---

## 系統概覽

### 架構組件

```
┌─────────────────────────────────────────────────────────────┐
│                         用戶端                                │
│              Web (4200) + Admin (4300)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (:3000)                       │
│                    統一入口 + Rate Limiting                   │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├──► Auth Service (:3002)
              ├──► User Service (:3001)
              ├──► Matching Service (:3003)
              ├──► Notification Service (:3004)
              ├──► Messaging Service (:3005)
              ├──► Content Service (:3006)
              ├──► Payment Service (:3007)
              ├──► Media Service (:3008)
              ├──► Subscription Service (:3009)
              └──► Admin Service (:3011)
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    數據層                                     │
│  Redis (6379) + Kafka (9092) + PostgreSQL (5432)           │
└─────────────────────────────────────────────────────────────┘
```

### 服務清單

| 服務 | 容器名稱 | 埠號 | 狀態檢查 | 重要性 |
|------|---------|------|---------|--------|
| API Gateway | api-gateway | 3000 | `GET /api/health` | 🔴 Critical |
| Auth Service | auth-service | 3002 | `GET /api/health` | 🔴 Critical |
| User Service | user-service | 3001 | `GET /api/health` | 🔴 Critical |
| Matching Service | matching-service | 3003 | `GET /api/health` | 🟡 Important |
| Notification Service | notification-service | 3004 | `GET /api/health` | 🟡 Important |
| Messaging Service | messaging-service | 3005 | `GET /api/health` | 🟡 Important |
| Content Service | content-service | 3006 | `GET /api/health` | 🟡 Important |
| Payment Service | payment-service | 3007 | `GET /api/health` | 🔴 Critical |
| Media Service | media-service | 3008 | `GET /api/health` | 🟡 Important |
| Subscription Service | subscription-service | 3009 | `GET /api/health` | 🔴 Critical |
| Admin Service | admin-service | 3011 | `GET /api/health` | 🟢 Normal |
| DB Writer Service | db-writer-service | - | Logs | 🔴 Critical |
| Web Frontend | web | 4200 | `GET /` | 🟡 Important |
| Admin Frontend | admin | 4300 | `GET /` | 🟢 Normal |

### 基礎設施組件

| 組件 | 容器名稱 | 埠號 | 數據目錄 | 重要性 |
|------|---------|------|---------|--------|
| PostgreSQL | postgres | 5432 | `./data/postgres` | 🔴 Critical |
| Redis | redis | 6379 | `./data/redis` | 🔴 Critical |
| Kafka | kafka | 9092 | `./data/kafka` | 🔴 Critical |
| Zookeeper | zookeeper | 2181 | `./data/zookeeper` | 🔴 Critical |

---

## 日常運維流程

### 每日檢查清單

#### 上午例行檢查（9:00 AM）

```bash
#!/bin/bash
# 每日健康檢查腳本

echo "=== 每日系統健康檢查 $(date) ==="

# 1. 檢查所有容器狀態
echo -e "\n[1/7] 檢查容器狀態..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. 檢查服務健康
echo -e "\n[2/7] 檢查服務健康..."
services=(
  "http://localhost:3000/api/health"
  "http://localhost:3001/api/health"
  "http://localhost:3002/api/health"
  "http://localhost:3003/api/health"
  "http://localhost:3004/api/health"
  "http://localhost:3005/api/health"
  "http://localhost:3006/api/health"
  "http://localhost:3007/api/health"
  "http://localhost:3008/api/health"
  "http://localhost:3009/api/health"
  "http://localhost:3011/api/health"
)

for url in "${services[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" == "200" ]; then
    echo "✅ $url"
  else
    echo "❌ $url (Status: $status)"
  fi
done

# 3. 檢查資料庫連線
echo -e "\n[3/7] 檢查資料庫連線..."
docker exec postgres pg_isready -U suggar_daddy_user

# 4. 檢查 Redis
echo -e "\n[4/7] 檢查 Redis..."
docker exec redis redis-cli ping

# 5. 檢查 Kafka
echo -e "\n[5/7] 檢查 Kafka..."
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092 | head -n 1

# 6. 檢查磁碟空間
echo -e "\n[6/7] 檢查磁碟空間..."
df -h | grep -E "Filesystem|/dev/disk"

# 7. 檢查記憶體使用
echo -e "\n[7/7] 檢查記憶體使用..."
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo -e "\n=== 檢查完成 ==="
```

保存為 `scripts/daily-health-check.sh` 並執行：

```bash
chmod +x scripts/daily-health-check.sh
./scripts/daily-health-check.sh
```

#### 下午例行檢查（3:00 PM）

```bash
# 檢查日誌錯誤
docker-compose logs --since 6h | grep -i "error" | tail -n 20

# 檢查 Kafka Consumer Lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group db-writer-group \
  --describe

# 檢查 Redis 記憶體使用
docker exec redis redis-cli info memory | grep used_memory_human
```

---

### 每週檢查清單（週一）

```bash
#!/bin/bash
# 每週系統檢查

echo "=== 每週系統檢查 $(date) ==="

# 1. 檢查備份狀態
echo -e "\n[1/5] 檢查備份..."
ls -lh backups/ | tail -n 7

# 2. 檢查日誌大小
echo -e "\n[2/5] 檢查日誌大小..."
docker ps -q | xargs docker inspect --format='{{.Name}} {{.LogPath}}' | \
  xargs -I {} sh -c 'echo {} && du -h $(echo {} | awk "{print \$2}")'

# 3. 檢查未使用的 Docker 資源
echo -e "\n[3/5] 檢查 Docker 資源..."
docker system df

# 4. 檢查資料庫連線數
echo -e "\n[4/5] 檢查資料庫連線..."
docker exec postgres psql -U suggar_daddy_user -d suggar_daddy_db -c \
  "SELECT count(*) as connections FROM pg_stat_activity;"

# 5. 檢查 Redis Key 數量
echo -e "\n[5/5] 檢查 Redis Keys..."
docker exec redis redis-cli dbsize

echo -e "\n=== 檢查完成 ==="
```

---

### 每月檢查清單（每月 1 日）

```bash
# 1. 清理舊日誌（保留最近 30 天）
find ./logs -name "*.log" -mtime +30 -delete

# 2. 清理舊備份（保留最近 90 天）
find ./backups -name "*.sql" -mtime +90 -delete

# 3. 檢查 SSL 憑證過期時間
openssl x509 -in /path/to/cert.pem -noout -dates

# 4. 更新依賴套件
npm audit
npm audit fix

# 5. 檢查安全性漏洞
docker scan api-gateway:latest
```

---

## 服務管理

### 啟動服務

#### 啟動所有服務

```bash
# 使用 Docker Compose
docker-compose up -d

# 查看啟動日誌
docker-compose logs -f

# 等待服務就緒（約 30-60 秒）
```

#### 啟動單一服務

```bash
# 啟動特定服務
docker-compose up -d api-gateway

# 查看服務日誌
docker-compose logs -f api-gateway
```

#### 使用 Nx 啟動（開發模式）

```bash
# 啟動單一微服務
npx nx serve api-gateway

# 啟動前端
npx nx serve web      # Port 4200
npx nx serve admin    # Port 4300
```

---

### 停止服務

#### 停止所有服務

```bash
# 優雅停止（給予 10 秒鐘 graceful shutdown）
docker-compose stop

# 強制停止
docker-compose kill

# 停止並移除容器
docker-compose down
```

#### 停止單一服務

```bash
# 停止特定服務
docker-compose stop api-gateway

# 重啟服務
docker-compose restart api-gateway
```

---

### 重啟服務

#### 重啟所有服務

```bash
# 方法 1: 直接重啟
docker-compose restart

# 方法 2: 停止後重新啟動（推薦）
docker-compose down && docker-compose up -d
```

#### 重啟單一服務

```bash
# 重啟特定服務
docker-compose restart api-gateway

# 重建並重啟（代碼變更後）
docker-compose up -d --build api-gateway
```

---

### 查看服務狀態

```bash
# 查看所有容器狀態
docker-compose ps

# 查看詳細資源使用
docker stats

# 查看服務健康狀態
curl http://localhost:3000/api/health | jq
```

---

### 查看日誌

#### 即時日誌

```bash
# 所有服務
docker-compose logs -f

# 特定服務
docker-compose logs -f api-gateway

# 多個服務
docker-compose logs -f api-gateway auth-service user-service

# 最近 100 行
docker-compose logs -f --tail=100 api-gateway
```

#### 歷史日誌

```bash
# 最近 1 小時
docker-compose logs --since 1h api-gateway

# 最近 24 小時
docker-compose logs --since 24h

# 特定時間範圍
docker-compose logs --since "2026-02-13T09:00:00" --until "2026-02-13T17:00:00"
```

#### 錯誤日誌篩選

```bash
# 查找錯誤
docker-compose logs | grep -i error

# 查找特定錯誤碼
docker-compose logs | grep "500\|502\|503"

# 查找數據庫錯誤
docker-compose logs postgres | grep -i error
```

---

### 擴展服務

#### 水平擴展（增加副本）

```bash
# 擴展 API Gateway 至 3 個副本
docker-compose up -d --scale api-gateway=3

# 擴展多個服務
docker-compose up -d --scale api-gateway=3 --scale auth-service=2

# 查看副本狀態
docker-compose ps
```

**注意事項**：
- 需要配置負載均衡器（Nginx 或 HAProxy）
- 確保服務無狀態
- 埠號會自動分配

#### 垂直擴展（增加資源）

修改 `docker-compose.yml`：

```yaml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          cpus: '2.0'      # 增加至 2 核心
          memory: 2G       # 增加至 2GB
        reservations:
          cpus: '1.0'
          memory: 1G
```

然後重啟服務：

```bash
docker-compose up -d --force-recreate api-gateway
```

---

## 監控與告警

### 手動監控

#### 檢查服務健康

```bash
# 創建健康檢查腳本
cat > scripts/check-health.sh << 'EOF'
#!/bin/bash
services=(
  "api-gateway:3000"
  "auth-service:3002"
  "user-service:3001"
  "matching-service:3003"
  "notification-service:3004"
  "messaging-service:3005"
  "content-service:3006"
  "payment-service:3007"
  "media-service:3008"
  "subscription-service:3009"
  "admin-service:3011"
)

for service in "${services[@]}"; do
  name="${service%:*}"
  port="${service#*:}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/api/health")
  if [ "$status" == "200" ]; then
    echo "✅ $name"
  else
    echo "❌ $name (Status: $status)"
  fi
done
EOF

chmod +x scripts/check-health.sh
./scripts/check-health.sh
```

#### 監控 PostgreSQL

```bash
# 連線數
docker exec postgres psql -U suggar_daddy_user -d suggar_daddy_db -c \
  "SELECT count(*) FROM pg_stat_activity;"

# 慢查詢（> 1 秒）
docker exec postgres psql -U suggar_daddy_user -d suggar_daddy_db -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '1 seconds';"

# 資料庫大小
docker exec postgres psql -U suggar_daddy_user -d suggar_daddy_db -c \
  "SELECT pg_size_pretty(pg_database_size('suggar_daddy_db'));"

# 表格大小
docker exec postgres psql -U suggar_daddy_user -d suggar_daddy_db -c \
  "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

#### 監控 Redis

```bash
# 記憶體使用
docker exec redis redis-cli info memory | grep -E "used_memory_human|used_memory_peak_human"

# Key 數量
docker exec redis redis-cli dbsize

# 命中率
docker exec redis redis-cli info stats | grep -E "keyspace_hits|keyspace_misses"

# 連線數
docker exec redis redis-cli info clients | grep connected_clients

# 慢查詢
docker exec redis redis-cli slowlog get 10
```

#### 監控 Kafka

```bash
# 檢查 Topic 列表
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# 檢查 Consumer Group
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list

# 檢查 Consumer Lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group db-writer-group \
  --describe

# 檢查 Topic 詳情
docker exec kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic user.created
```

---

### 自動化監控（計劃中）

#### Prometheus + Grafana

**安裝步驟**（待實施）：

1. 添加到 `docker-compose.yml`：

```yaml
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

2. 創建 `prometheus.yml`：

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']
  # ... 其他服務
```

3. 啟動監控：

```bash
docker-compose up -d prometheus grafana
```

#### 告警規則（待實施）

創建 `alerts.yml`：

```yaml
groups:
  - name: service_alerts
    interval: 30s
    rules:
      # 服務不可用
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服務 {{ $labels.instance }} 不可用"
          
      # 高錯誤率
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "服務 {{ $labels.service }} 錯誤率過高"
          
      # 高記憶體使用
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "容器 {{ $labels.name }} 記憶體使用過高"
```

---

## 故障排查指南

### 常見問題排查

#### 問題 1：服務無法啟動

**症狀**：
- `docker-compose up` 失敗
- 容器不斷重啟

**排查步驟**：

```bash
# 1. 檢查容器日誌
docker-compose logs api-gateway

# 2. 檢查埠號衝突
lsof -i :3000

# 3. 檢查環境變數
docker-compose config

# 4. 檢查依賴服務
docker-compose ps postgres redis kafka

# 5. 檢查磁碟空間
df -h
```

**常見原因**：
- ✅ 埠號被佔用：更改 `docker-compose.yml` 中的埠號
- ✅ 環境變數缺失：檢查 `.env` 檔案
- ✅ 依賴服務未啟動：先啟動 PostgreSQL、Redis、Kafka
- ✅ 磁碟空間不足：清理 Docker 資源

---

#### 問題 2：資料庫連線失敗

**症狀**：
- `ECONNREFUSED` 錯誤
- `password authentication failed` 錯誤

**排查步驟**：

```bash
# 1. 檢查 PostgreSQL 狀態
docker-compose ps postgres

# 2. 檢查連線
docker exec postgres pg_isready -U suggar_daddy_user

# 3. 測試連線
docker exec postgres psql -U suggar_daddy_user -d suggar_daddy_db -c "SELECT 1;"

# 4. 檢查環境變數
echo $DATABASE_HOST
echo $DATABASE_PORT
echo $DATABASE_USER
echo $DATABASE_PASSWORD
```

**解決方案**：
- ✅ 確保 PostgreSQL 已啟動
- ✅ 檢查 `.env` 中的資料庫認證資訊
- ✅ 確認網路連通性（Docker 網路）

---

#### 問題 3：Redis 連線失敗

**症狀**：
- `ECONNREFUSED ::1:6379` 錯誤
- 快取無法寫入

**排查步驟**：

```bash
# 1. 檢查 Redis 狀態
docker-compose ps redis

# 2. 測試連線
docker exec redis redis-cli ping

# 3. 檢查記憶體
docker exec redis redis-cli info memory | grep used_memory_human
```

**解決方案**：
- ✅ 確保 Redis 已啟動
- ✅ 檢查 `REDIS_HOST` 和 `REDIS_PORT`
- ✅ 清理記憶體：`docker exec redis redis-cli FLUSHDB`

---

#### 問題 4：Kafka 消費延遲

**症狀**：
- Consumer Lag 持續增加
- 數據未寫入資料庫

**排查步驟**：

```bash
# 1. 檢查 Consumer Lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group db-writer-group \
  --describe

# 2. 檢查 DB Writer 服務日誌
docker-compose logs db-writer-service | grep -i error

# 3. 檢查 Kafka Broker
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

**解決方案**：
- ✅ 重啟 DB Writer 服務
- ✅ 增加 Consumer 副本數
- ✅ 檢查資料庫寫入效能

---

#### 問題 5：API 回應緩慢

**症狀**：
- API 回應時間 > 1 秒
- 用戶體驗不佳

**排查步驟**：

```bash
# 1. 檢查服務健康
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# curl-format.txt 內容：
# time_namelookup:  %{time_namelookup}\n
# time_connect:  %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer:  %{time_pretransfer}\n
# time_redirect:  %{time_redirect}\n
# time_starttransfer:  %{time_starttransfer}\n
# time_total:  %{time_total}\n

# 2. 檢查資料庫慢查詢
docker exec postgres psql -U suggar_daddy_user -d suggar_daddy_db -c \
  "SELECT query, calls, total_time, mean_time 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;"

# 3. 檢查 Redis 慢查詢
docker exec redis redis-cli slowlog get 10

# 4. 檢查服務資源使用
docker stats --no-stream
```

**解決方案**：
- ✅ 優化慢查詢（添加索引）
- ✅ 增加 Redis 快取
- ✅ 擴展服務副本
- ✅ 檢查網路延遲

---

### 緊急故障處理流程

#### 服務完全不可用

1. **立即響應（5 分鐘內）**：
   ```bash
   # 檢查所有服務狀態
   docker-compose ps
   
   # 檢查日誌
   docker-compose logs --tail=100
   
   # 重啟所有服務
   docker-compose restart
   ```

2. **通知團隊**：
   - 發送緊急通知給 Tech Lead
   - 在團隊頻道發布故障通知
   - 啟動事故管理流程

3. **恢復服務（30 分鐘內）**：
   ```bash
   # 如果重啟失敗，完全重建
   docker-compose down
   docker-compose up -d
   
   # 檢查服務健康
   ./scripts/check-health.sh
   ```

4. **事後分析**：
   - 收集日誌
   - 分析根本原因
   - 制定預防措施
   - 更新運維文檔

---

## 備份與恢復

### PostgreSQL 備份

#### 每日自動備份

創建備份腳本 `scripts/backup-postgres.sh`：

```bash
#!/bin/bash
# PostgreSQL 自動備份腳本

BACKUP_DIR="./backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

# 執行備份
echo "開始備份 PostgreSQL 資料庫..."
docker exec postgres pg_dump -U suggar_daddy_user suggar_daddy_db > "$BACKUP_FILE"

# 壓縮備份
gzip "$BACKUP_FILE"

# 刪除 30 天前的備份
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "備份完成: $BACKUP_FILE.gz"
```

設置 Cron Job（每天凌晨 2 點）：

```bash
crontab -e
# 添加以下行：
0 2 * * * /path/to/scripts/backup-postgres.sh >> /var/log/backup.log 2>&1
```

#### 手動備份

```bash
# 完整備份
docker exec postgres pg_dump -U suggar_daddy_user suggar_daddy_db > backup.sql

# 僅備份結構
docker exec postgres pg_dump -U suggar_daddy_user --schema-only suggar_daddy_db > schema.sql

# 僅備份數據
docker exec postgres pg_dump -U suggar_daddy_user --data-only suggar_daddy_db > data.sql

# 備份特定表格
docker exec postgres pg_dump -U suggar_daddy_user -t users suggar_daddy_db > users.sql
```

---

### PostgreSQL 恢復

#### 完整恢復

```bash
# 1. 停止所有服務
docker-compose stop

# 2. 刪除現有資料庫
docker exec postgres psql -U suggar_daddy_user -c "DROP DATABASE suggar_daddy_db;"

# 3. 創建新資料庫
docker exec postgres psql -U suggar_daddy_user -c "CREATE DATABASE suggar_daddy_db;"

# 4. 恢復備份
docker exec -i postgres psql -U suggar_daddy_user suggar_daddy_db < backup.sql

# 5. 啟動服務
docker-compose up -d
```

#### 部分恢復

```bash
# 恢復特定表格
docker exec -i postgres psql -U suggar_daddy_user suggar_daddy_db < users.sql
```

---

### Redis 備份

#### 手動備份

```bash
# 觸發 RDB 快照
docker exec redis redis-cli BGSAVE

# 複製 RDB 檔案
docker cp redis:/data/dump.rdb ./backups/redis/dump_$(date +%Y%m%d).rdb
```

#### 自動備份

Redis 已配置自動快照（`docker-compose.yml`）：

```yaml
  redis:
    command: redis-server --save 60 1 --loglevel warning
    # 每 60 秒如果有 1 個 key 變更，則自動保存
```

---

### Redis 恢復

```bash
# 1. 停止 Redis
docker-compose stop redis

# 2. 複製備份檔案
docker cp ./backups/redis/dump_20260213.rdb redis:/data/dump.rdb

# 3. 啟動 Redis
docker-compose start redis

# 4. 驗證數據
docker exec redis redis-cli dbsize
```

---

### Kafka 備份（進階）

Kafka 備份較為複雜，建議使用以下策略：

1. **事件溯源**：Kafka 本身保留所有事件（配置 retention）
2. **Topic 導出**：
   ```bash
   # 導出 Topic 數據
   docker exec kafka kafka-console-consumer \
     --bootstrap-server localhost:9092 \
     --topic user.created \
     --from-beginning \
     --max-messages 10000 > user_created_backup.json
   ```
3. **定期快照**：定期備份 Kafka 數據目錄 `./data/kafka`

---

## 擴展指南

### 水平擴展

#### 擴展微服務

```bash
# 擴展至 3 個副本
docker-compose up -d --scale api-gateway=3

# 配置負載均衡器（Nginx 範例）
upstream api_gateway {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    location / {
        proxy_pass http://api_gateway;
    }
}
```

#### 擴展資料庫（讀寫分離）

1. **設置 PostgreSQL 主從複製**：

```yaml
# docker-compose.yml 添加
  postgres-replica:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: replicator
      POSTGRES_PASSWORD: replicator_password
    command: |
      postgres -c wal_level=replica -c max_wal_senders=3
```

2. **應用層配置讀寫分離**：

```typescript
// libs/database/src/lib/database.config.ts
export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    replication: {
      master: {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
      },
      slaves: [
        {
          host: process.env.DATABASE_REPLICA_HOST,
          port: parseInt(process.env.DATABASE_REPLICA_PORT || '5432'),
          username: process.env.DATABASE_USER,
          password: process.env.DATABASE_PASSWORD,
          database: process.env.DATABASE_NAME,
        },
      ],
    },
  };
};
```

---

### 垂直擴展

#### 增加容器資源

修改 `docker-compose.yml`：

```yaml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '2.0'
          memory: 2G
```

重啟服務以應用變更：

```bash
docker-compose up -d --force-recreate
```

---

### 效能優化建議

#### PostgreSQL 優化

```sql
-- 1. 添加索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_creator_id ON posts(creator_id);
CREATE INDEX idx_matches_user1_user2 ON matches(user1_id, user2_id);

-- 2. 分析查詢計劃
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- 3. 更新統計信息
ANALYZE;

-- 4. 清理死亡行
VACUUM FULL;
```

#### Redis 優化

```bash
# 1. 配置記憶體淘汰策略
docker exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 2. 設置最大記憶體
docker exec redis redis-cli CONFIG SET maxmemory 2gb

# 3. 啟用 AOF 持久化（可選）
docker exec redis redis-cli CONFIG SET appendonly yes
```

#### Kafka 優化

```bash
# 1. 增加分區數
docker exec kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --alter \
  --topic user.created \
  --partitions 6

# 2. 調整 Retention
docker exec kafka kafka-configs \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name user.created \
  --alter \
  --add-config retention.ms=604800000  # 7 天
```

---

## 安全運維

### 安全檢查清單

```bash
# 1. 檢查開放埠號
netstat -tulpn | grep LISTEN

# 2. 檢查防火牆規則
sudo ufw status

# 3. 檢查 Docker 安全配置
docker inspect api-gateway | grep -i security

# 4. 掃描漏洞
docker scan api-gateway:latest

# 5. 檢查敏感資訊洩漏
grep -r "password\|secret\|token" .env
```

### 更新 SSL 憑證

```bash
# 1. 備份舊憑證
cp /path/to/cert.pem /path/to/cert.pem.bak

# 2. 安裝新憑證
cp /path/to/new/cert.pem /path/to/cert.pem
cp /path/to/new/key.pem /path/to/key.pem

# 3. 重啟服務
docker-compose restart api-gateway

# 4. 驗證憑證
openssl x509 -in /path/to/cert.pem -noout -dates
```

---

## 維護窗口

### 計劃性維護

**建議維護時間**：每週日凌晨 2:00 - 4:00 AM

**維護流程**：

1. **提前通知**（至少 24 小時）：
   - 發送維護通知給用戶
   - 在系統中顯示維護公告

2. **執行維護**：
   ```bash
   # 1. 啟用維護模式
   # 在 API Gateway 顯示維護頁面
   
   # 2. 備份數據
   ./scripts/backup-postgres.sh
   
   # 3. 執行更新
   docker-compose down
   git pull
   npm install
   docker-compose build
   docker-compose up -d
   
   # 4. 驗證服務
   ./scripts/check-health.sh
   
   # 5. 關閉維護模式
   ```

3. **回滾計劃**：
   ```bash
   # 如果更新失敗，回滾至前一版本
   git checkout <previous-commit>
   docker-compose down
   docker-compose up -d --build
   
   # 恢復資料庫備份
   docker exec -i postgres psql -U suggar_daddy_user suggar_daddy_db < backup.sql
   ```

---

## 緊急聯絡

### 團隊聯絡資訊

| 角色 | 姓名 | 聯絡方式 | 值班時間 |
|------|------|---------|---------|
| **Tech Lead** | Brian Yu | brian@suggar-daddy.com<br>+886-123-456-789 | 24/7 |
| **DevOps Engineer** | TBD | devops@suggar-daddy.com | 週一至週五 9:00-18:00 |
| **Backend Developer** | TBD | backend@suggar-daddy.com | 週一至週五 9:00-18:00 |
| **On-Call Engineer** | 輪值 | oncall@suggar-daddy.com | 24/7 |

### 緊急聯絡流程

1. **P0（嚴重）**：服務完全不可用
   - 立即致電 Tech Lead
   - 同時發送緊急郵件和 Slack 訊息
   - 啟動事故管理流程

2. **P1（重要）**：部分功能不可用
   - 發送 Slack 訊息給 On-Call Engineer
   - 30 分鐘內響應

3. **P2（一般）**：效能下降或非關鍵功能異常
   - 創建工單
   - 下一個工作日處理

### 第三方支援

| 服務 | 支援聯絡 | SLA |
|------|---------|-----|
| **Stripe** | support@stripe.com | 24 小時 |
| **AWS** | AWS Support Console | 依照方案 |
| **Docker** | Docker Support | 依照方案 |

---

## 附錄

### A. 常用命令速查

```bash
# === 服務管理 ===
docker-compose up -d              # 啟動所有服務
docker-compose down               # 停止所有服務
docker-compose restart            # 重啟所有服務
docker-compose ps                 # 查看服務狀態
docker-compose logs -f <service>  # 查看服務日誌

# === 健康檢查 ===
./scripts/check-health.sh         # 檢查所有服務健康
docker exec postgres pg_isready   # 檢查 PostgreSQL
docker exec redis redis-cli ping  # 檢查 Redis

# === 資料庫 ===
./scripts/backup-postgres.sh      # 備份 PostgreSQL
docker exec -i postgres psql ...  # 恢復 PostgreSQL

# === 監控 ===
docker stats                      # 查看資源使用
docker system df                  # 查看 Docker 磁碟使用
docker-compose logs | grep error  # 查找錯誤日誌

# === 清理 ===
docker system prune -a            # 清理未使用的資源
docker volume prune               # 清理未使用的 Volume
```

---

### B. 環境變數參考

參考 `.env.example` 檔案獲取完整的環境變數列表。

---

### C. 版本歷史

| 版本 | 日期 | 修改人 | 說明 |
|------|------|--------|------|
| 1.0 | 2026-02-13 | Brian Yu | 初版完成 |

---

**文檔結束**

*如有任何問題或建議，請聯絡 DevOps Team*
