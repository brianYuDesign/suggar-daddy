# 部署與運維指南

## 基礎設施依賴

| 元件 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 16 (Alpine) | 主資料庫，Master-Replica 架構 |
| Redis | 7 (Alpine) | 快取、GEO 查詢、Rate Limiting、Session |
| Kafka | Confluent 7.5.0 | 事件驅動訊息佇列 |
| Zookeeper | Confluent 7.5.0 | Kafka 叢集協調 |
| Node.js | 20 (Alpine) | 服務 Runtime |
| Jaeger | latest | 分散式追蹤 (可選) |

### PostgreSQL

Master-Replica Streaming Replication 架構：

- **Master** (`:5432`)：處理所有寫入，db-writer-service 的目標
- **Replica** (`:5433`)：唯讀副本，可用於讀取分流

連接參數：

```
Host: postgres-master (容器) / localhost (本機)
Port: 5432
User: postgres
Password: postgres (開發環境)
Database: suggar_daddy
```

### Redis

Master + 2 Replica 架構，支援 Sentinel 高可用：

- **Master** (`:6379`)：讀寫
- **Replica-1** (`:6380`)、**Replica-2** (`:6381`)：唯讀

### Kafka

單 Broker 開發配置：

- **Broker** (`:9092` 容器內, `:9094` 主機端)
- **Zookeeper** (`:2181`)
- 自動建立 Topics (`auto.create.topics.enable=true`)
- 日誌保留 168 小時 (7 天)
- 壓縮格式：lz4

---

## 環境變數

完整清單，從 `.env.example` 和 `docker-compose.yml` 整理：

### 核心

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `NODE_ENV` | `development` | 執行環境 |
| `PORT` | 依服務而異 | 服務監聽埠 |
| `CORS_ORIGINS` | `http://localhost:4200,http://localhost:4300` | 允許的 CORS 來源 |

### Database

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `POSTGRES_HOST` / `POSTGRES_MASTER_HOST` | `postgres-master` | 主資料庫位址 |
| `POSTGRES_PORT` | `5432` | 主資料庫埠 |
| `POSTGRES_USER` | `postgres` | 資料庫使用者 |
| `POSTGRES_PASSWORD` | `postgres` | 資料庫密碼 |
| `POSTGRES_DB` | `suggar_daddy` | 資料庫名稱 |
| `POSTGRES_REPLICA_HOST` | `postgres-replica` | 唯讀副本位址 |
| `POSTGRES_REPLICA_PORT` | `5433` | 唯讀副本埠 |
| `POSTGRES_HA_ENABLED` | `true` | 是否啟用讀寫分離 |
| `REPLICATION_PASSWORD` | — | Replication 密碼 |
| `DATABASE_POOL_MAX` | `20` | 連線池上限 |
| `DATABASE_POOL_MIN` | `5` | 連線池下限 |

### Redis

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `REDIS_HOST` | `redis-master` | Redis 位址（單機模式） |
| `REDIS_PORT` | `6379` | Redis 埠 |
| `REDIS_URL` | — | Redis 連接字串（優先於 HOST/PORT） |
| `REDIS_SENTINELS` | — | Sentinel 節點清單，如 `host1:26379,host2:26380` |
| `REDIS_MASTER_NAME` | `mymaster` | Sentinel Master 名稱 |

### Kafka

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `KAFKA_BROKERS` | `kafka:9092` | Broker 清單 |
| `KAFKA_CLIENT_ID` | 依服務而異 | Client 識別碼 |
| `KAFKA_GROUP_ID` | 依服務而異 | Consumer Group |

### 認證

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `JWT_SECRET` | `your-super-secret-jwt-key-...` | JWT 簽名密鑰（生產環境務必更換） |
| `JWT_EXPIRES_IN` | `7d` | JWT 有效期 |

### Stripe

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `STRIPE_SECRET_KEY` | — | Stripe API 密鑰 |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe Webhook 驗證密鑰 |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe 前端公開金鑰 |

### 媒體上傳 (Cloudinary)

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary 雲端名稱 |
| `CLOUDINARY_API_KEY` | — | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API Secret |

### Email (SMTP)

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `SMTP_HOST` | `localhost` | SMTP 伺服器 |
| `SMTP_PORT` | `587` | SMTP 埠 |
| `SMTP_USER` | — | SMTP 帳號 |
| `SMTP_PASSWORD` | — | SMTP 密碼 |
| `EMAIL_FROM` | `noreply@suggar-daddy.com` | 寄件人地址 |

### Firebase (可選)

| 變數 | 說明 |
|------|------|
| `FIREBASE_PROJECT_ID` | Firebase 專案 ID |
| `FIREBASE_CLIENT_EMAIL` | Service Account Email |
| `FIREBASE_PRIVATE_KEY` | Service Account 私鑰 |

### 追蹤 (Jaeger / OpenTelemetry)

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `JAEGER_ENDPOINT` | `http://jaeger:4318/v1/traces` | OTLP HTTP 端點 |
| `OTEL_SAMPLING_RATE` | `1.0` | 取樣率 (0.0~1.0) |

### Frontend

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | 前端呼叫的 API 位址 |

---

## Docker Compose 本地開發

### 啟動核心服務

```bash
# 啟動基礎設施 + 核心後端服務
docker compose up -d

# 預設啟動：postgres-master, postgres-replica, redis-master, redis-replica-1/2,
#           zookeeper, kafka, jaeger,
#           api-gateway, auth-service, user-service, payment-service,
#           subscription-service, db-writer-service, content-service, media-service
```

### 啟動完整服務（含可選服務）

```bash
# 加上 matching, notification, messaging, admin-service
docker compose --profile full up -d
```

### 啟動前端

```bash
# 加上 web (4200) 和 admin (4300)
docker compose --profile frontend up -d
```

### 本機開發模式（不用 Docker 跑服務）

```bash
# 僅啟動基礎設施
docker compose up -d postgres-master redis-master zookeeper kafka

# 用 Nx 啟動各服務
nx serve api-gateway
nx serve auth-service
nx serve user-service
# ... 其他服務
nx serve web    # 前端 :4200
nx serve admin  # Admin :4300
```

### 常用操作

```bash
# 查看日誌
docker compose logs -f api-gateway

# 重建特定服務
docker compose up -d --build auth-service

# 清除所有資料
docker compose down -v
```

---

## 服務啟動順序

啟動有嚴格的依賴順序，`docker-compose.yml` 透過 `depends_on` + `healthcheck` 自動管理：

```
1. postgres-master  ─→  postgres-replica
2. redis-master     ─→  redis-replica-1, redis-replica-2
3. zookeeper        ─→  kafka
4. db-writer-service（依賴 postgres, redis, kafka）
5. auth-service, user-service, payment-service, subscription-service,
   content-service, media-service（依賴 postgres, redis, kafka）
6. api-gateway（依賴 postgres, redis, kafka）
7. web, admin（依賴 api-gateway）
```

手動啟動時，請確保基礎設施就緒後再啟動後端服務。

---

## Kafka Topics 與 Consumer

### Topics 完整清單

所有 topic 定義於 `libs/common/src/kafka/kafka.events.ts`：

| Domain | Topic | 說明 |
|--------|-------|------|
| **User** | `user.created` | 使用者註冊 |
| | `user.updated` | 使用者資料更新 |
| | `user.blocked` / `user.unblocked` | 封鎖/解除封鎖 |
| | `user.reported` | 檢舉使用者 |
| **Matching** | `matching.matched` / `matching.unmatched` | 配對/解除配對 |
| **Subscription** | `subscription.created` / `subscription.updated` / `subscription.cancelled` | 訂閱生命週期 |
| | `subscription.tier.created` / `subscription.tier.updated` | 訂閱方案管理 |
| **Payment** | `payment.completed` / `payment.failed` / `payment.refunded` | 付款狀態 |
| | `payment.tip.sent` | 打賞 |
| | `payment.post.purchased` | 付費貼文購買 |
| | `payment.wallet.credited` | 錢包入帳 |
| | `payment.withdrawal.requested` / `payment.withdrawal.completed` | 提款 |
| **Social** | `social.user.followed` / `social.user.unfollowed` | 追蹤/取消追蹤 |
| **Content** | `content.post.created` / `content.post.updated` / `content.post.deleted` | 貼文 CRUD |
| | `content.post.liked` / `content.post.unliked` | 按讚 |
| | `content.comment.created` / `content.comment.deleted` | 留言 |
| | `content.post.bookmarked` / `content.post.unbookmarked` | 收藏 |
| | `content.post.reported` / `content.post.taken_down` / `content.post.reinstated` | 內容審核 |
| | `content.story.created` / `content.story.deleted` / `content.story.viewed` | 限時動態 |
| **Media** | `media.uploaded` / `media.deleted` / `media.processed` | 媒體生命週期 |
| | `media.video.processed` | 影片轉碼完成 |
| **Messaging** | `messaging.dm.purchased` | 付費私訊 |
| | `messaging.broadcast.sent` | 群發訊息 |
| **System** | `dead-letter-queue` | 死信佇列 |

### Consumer Group

| Service | Group ID | 消費的 Topics |
|---------|----------|---------------|
| db-writer-service | `db-writer-group` | 上表中大部分 topic（負責寫入 PostgreSQL） |
| auth-service | `auth-service-group` | 認證相關事件 |

### 重試與 DLQ 策略

db-writer-service 的 Consumer 實作了：

- **最多 3 次重試**，指數退避（500ms → 1s → 2s）
- 重試失敗後寫入 **Dead Letter Queue** (`dead-letter-queue` topic)
- DLQ 訊息包含原始 topic、payload、錯誤訊息和重試次數

---

## Redis 使用模式

Redis 在系統中扮演多重角色：

### 1. Cache（快取）

服務先讀 Redis，寫入透過 Kafka 事件異步持久化到 PostgreSQL。

- 預設 TTL：**24 小時**（`RedisService.set()` 無指定 ttl 時）
- payment-stats 查詢快取：**5 分鐘** TTL
- 使用 `setex` 設定帶過期的快取

### 2. GEO 查詢

用於使用者地理位置配對：

- Key：`geo:users`
- 指令：`GEOADD`、`GEOSEARCH`（半徑查詢）、`GEODIST`
- `RedisService` 封裝了 `geoAdd()`、`geoSearch()`、`geoDist()`、`geoPos()`

### 3. Rate Limiting

- Key pattern：`auth:login-attempts:*`
- 用於防止暴力破解登入

### 4. Sorted Set（Feed / Timeline）

- 用於使用者 Feed、Trending 排序
- 支援 `zAdd`、`zRevRange`、`zIncrBy` 等操作
- `batchAddToFeed()` 方法自動維護 Feed 最大長度

### 5. Pipeline 批次操作

`RedisService` 提供多個 batch 方法減少網路來回：

- `pipeline()`：通用批次指令
- `batchSIsMember()`、`batchExists()`、`batchZScore()`
- `batchZAddWithExpire()`、`batchLRange()`

### 注意事項

- 已棄用 `keys()` 改用 `scan()`（避免阻塞）
- `geodist()` 需使用 `client.call('GEODIST', ...)` 方式呼叫
- 單機模式設定 `connectTimeout: 10000`, `keepAlive: 30000`

---

## 健康檢查

### API Gateway

```
GET http://localhost:3000/health
```

回傳 `{ status: 'ok' }` 表示服務正常。

### Docker Healthcheck

所有容器都配置了 healthcheck：

| 服務 | 檢查方式 | 間隔 |
|------|----------|------|
| postgres-master | `pg_isready + SELECT 1` | 10s |
| postgres-replica | `pg_isready + pg_is_in_recovery()` | 10s |
| redis-* | `redis-cli ping` | 10s |
| zookeeper | `nc -z localhost 2181` | 10s |
| kafka | `kafka-broker-api-versions` | 10s |
| api-gateway | `wget http://localhost:3000/health` | 30s |
| jaeger | `curl http://localhost:14269/` | 10s |

---

## 生產部署注意事項

### 安全

- **務必更換** `JWT_SECRET`、`POSTGRES_PASSWORD`、`REPLICATION_PASSWORD`
- 設定真實的 `STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET`
- 使用 Redis Sentinel 模式（設定 `REDIS_SENTINELS` 和 `REDIS_MASTER_NAME`）
- Dockerfile production stage 以非 root 使用者 (`nestjs:1001`) 執行
- 所有 DTO 已加上 `MaxLength`、`Max`、`ArrayMaxSize` 驗證
- `passwordHash` 已加 `@Exclude()` 避免外洩

### 效能

- PostgreSQL 調整 `shared_buffers`、`effective_cache_size`、`work_mem`
- Kafka 開啟 lz4 壓縮、調整 `num.io.threads`
- Redis 連線池限制 `maxRetriesPerRequest: 3`
- 各 Entity 已建立適當的 DB Index（Match, Swipe, Subscription, PostComment, Transaction, User）

### 資源限制

Docker Compose 已配置 `deploy.resources`：

| 服務 | CPU 上限 | 記憶體上限 |
|------|----------|-----------|
| postgres-master/replica | 1.0 | 1024M |
| redis-master | 0.5 | 768M |
| kafka | 1.0 | 1024M |
| zookeeper | 0.5 | 512M |
| api-gateway | 0.5 | 512M |
| jaeger | 0.5 | 512M |

### 監控建議

1. **Jaeger**（已整合）：分散式追蹤，UI 在 `:16686`
2. **Prometheus + Grafana**：監控基礎設施 (`infrastructure/docker/docker-compose.monitoring.yml`)
3. 建議監控指標：
   - API 回應時間 P50/P95/P99
   - Kafka Consumer Lag
   - Redis 記憶體使用量和命中率
   - PostgreSQL 連線數和查詢延遲
   - 錯誤率和 DLQ 訊息數量
4. 建議告警：
   - 5xx 錯誤率 > 5%
   - Kafka Consumer Lag > 1000
   - Redis 記憶體 > 80%
   - PostgreSQL 連線數 > 80% 上限
   - DLQ 有新訊息

---

## 常用維運指令

```bash
# 查看所有容器狀態
docker compose ps

# 查看特定服務日誌
docker compose logs -f --tail=100 api-gateway

# 進入 PostgreSQL
docker exec -it suggar-daddy-postgres-master psql -U postgres -d suggar_daddy

# 進入 Redis
docker exec -it suggar-daddy-redis-master redis-cli

# Kafka topic 列表
docker exec -it suggar-daddy-kafka kafka-topics --list --bootstrap-server localhost:9092

# Kafka consumer group 狀態
docker exec -it suggar-daddy-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 --describe --group db-writer-group

# 重啟單一服務
docker compose restart auth-service

# 查看資源使用
docker stats
```
