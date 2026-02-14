# 基礎設施完整指南

> **Sugar Daddy 專案基礎設施架構、運維與優化完整文檔**  
> 整合自: INFRASTRUCTURE-OPTIMIZATION-GUIDE.md, INFRASTRUCTURE-DIAGRAM.md, INFRASTRUCTURE-QUICKREF.md, INFRASTRUCTURE-OPTIMIZATION-SUMMARY.md

---

## 📚 目錄

1. [架構概覽](#架構概覽)
2. [快速開始](#快速開始)
3. [優化總結](#優化總結)
4. [運維操作](#運維操作)
5. [監控與告警](#監控與告警)
6. [故障排除](#故障排除)
7. [效能調優](#效能調優)

---

## 架構概覽

### 🏗️ 當前運行的基礎設施

```
┌─────────────────────────────────────────────────────────────────┐
│                     HOST MACHINE (macOS)                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         Docker Network: suggar-daddy-network               │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │  PostgreSQL  │  │    Redis     │  │  Zookeeper   │    │ │
│  │  │   :5432      │  │    :6379     │  │    :2181     │    │ │
│  │  │              │  │              │  │              │    │ │
│  │  │  postgres:   │  │  redis:7-    │  │  cp-zookeeper│    │ │
│  │  │  15-alpine   │  │  alpine      │  │  :7.5.0      │    │ │
│  │  │              │  │              │  │              │    │ │
│  │  │ ✅ Healthy   │  │ ✅ Healthy   │  │ ✅ Running   │    │ │
│  │  │ 57.45 MiB    │  │ 12.15 MiB    │  │ 205.9 MiB    │    │ │
│  │  └──────────────┘  └──────────────┘  └───────┬──────┘    │ │
│  │                                               │            │ │
│  │  ┌──────────────────────────────────────────┼──────────┐ │ │
│  │  │              Apache Kafka                 │          │ │ │
│  │  │          :9092 (internal)                 │          │ │ │
│  │  │          :9094 (external)                 │          │ │ │
│  │  │                                           │          │ │ │
│  │  │         cp-kafka:7.5.0                    ▼          │ │ │
│  │  │                                    (depends on)      │ │ │
│  │  │         ✅ Healthy                                   │ │ │
│  │  │         479.1 MiB                                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  📊 Port Mappings:                                               │
│  • PostgreSQL:  localhost:5432  → postgres:5432                 │
│  • Redis:       localhost:6379  → redis:6379                    │
│  • Kafka:       localhost:9094  → kafka:9092                    │
│  • Zookeeper:   localhost:2181  → zookeeper:2181               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 💾 數據持久化

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Volumes                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  postgres_data ────────► PostgreSQL Database Files          │
│  redis_data ───────────► Redis Persistence Files            │
│  kafka_data ───────────► Kafka Logs & Data                  │
│  zookeeper_data ───────► Zookeeper Data                     │
│  zookeeper_logs ───────► Zookeeper Logs                     │
│                                                               │
│  ⚠️ Persisted across container restarts                     │
│  ⚠️ Only deleted with: docker-compose down -v               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 🔄 服務依賴關係

```
                    ┌─────────────┐
                    │  Zookeeper  │
                    │   :2181     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Kafka    │
                    │ :9092/:9094 │
                    └─────────────┘

    ┌─────────────┐                 ┌─────────────┐
    │ PostgreSQL  │                 │    Redis    │
    │   :5432     │                 │    :6379    │
    └─────────────┘                 └─────────────┘
```

### 📊 資源總覽

| 服務 | CPU 使用 | 記憶體使用 | 狀態 | 映像 | CPU Limit | Memory Limit |
|------|---------|-----------|------|------|-----------|--------------|
| PostgreSQL | ~0.00% | 57.45 MiB | ✅ Healthy | postgres:15-alpine | 1.0 | 1024M |
| Redis | ~1.22% | 12.15 MiB | ✅ Healthy | redis:7-alpine | 0.5 | 768M |
| Kafka | ~5.10% | 479.1 MiB | ✅ Healthy | cp-kafka:7.5.0 | 1.0 | 1024M |
| Zookeeper | ~0.30% | 205.9 MiB | ✅ Running | cp-zookeeper:7.5.0 | 0.5 | 512M |
| **總計** | **~6.62%** | **~754 MiB** | **All OK** | | | |

---

## 快速開始

### 🚀 基本操作

```bash
# 啟動所有基礎設施服務
docker-compose up -d postgres redis zookeeper kafka

# 檢查狀態
docker-compose ps

# 查看日誌
docker-compose logs -f postgres redis kafka zookeeper

# 停止服務
docker-compose stop postgres redis zookeeper kafka

# 完全清理（包括數據）⚠️
docker-compose down -v
```

### 🔗 連接配置

#### 從主機（本地開發）

```bash
# PostgreSQL
postgresql://postgres:postgres@localhost:5432/suggar_daddy

# Redis
redis://localhost:6379

# Kafka
localhost:9094

# Zookeeper
localhost:2181
```

#### 從 Docker 容器內

```bash
# PostgreSQL
postgresql://postgres:postgres@postgres:5432/suggar_daddy

# Redis
redis://redis:6379

# Kafka
kafka:9092

# Zookeeper
zookeeper:2181
```

#### 在應用程式中使用（JavaScript/TypeScript）

**從 Docker 容器內（應用服務）:**
```javascript
// PostgreSQL
const dbConfig = {
  host: 'postgres',
  port: 5432,
  database: 'suggar_daddy',
  username: 'postgres',
  password: process.env.POSTGRES_PASSWORD
};

// Redis
const redisConfig = {
  host: 'redis',
  port: 6379
};

// Kafka
const kafkaConfig = {
  brokers: ['kafka:9092']
};
```

**從主機（本地開發）:**
```javascript
// PostgreSQL
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'suggar_daddy',
  username: 'postgres',
  password: process.env.POSTGRES_PASSWORD
};

// Redis
const redisConfig = {
  host: 'localhost',
  port: 6379
};

// Kafka
const kafkaConfig = {
  brokers: ['localhost:9094']
};
```

### 🧪 健康檢查

```bash
# PostgreSQL
docker exec suggar-daddy-postgres pg_isready -U postgres

# Redis
docker exec suggar-daddy-redis redis-cli ping

# Kafka
docker exec suggar-daddy-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# 執行完整健康檢查腳本
./scripts/health-check.sh
```

---

## 優化總結

### ✅ 已完成的優化項目

**執行日期**: 2024-01-15  
**狀態**: ✅ 完成  
**成功率**: 91.67% (11/12 檢查通過)

#### 1. Docker 資源優化
- ✅ 為所有服務設定 CPU 和記憶體限制
- ✅ 配置日誌輪轉（每容器最大 30MB）
- ✅ 增強健康檢查機制
- ✅ 改善依賴關係管理

#### 2. PostgreSQL 優化
- ✅ 效能參數調優（shared_buffers, work_mem 等）
- ✅ 創建 12 個監控視圖
- ✅ 啟用慢查詢日誌（>200ms）
- ✅ SSD 優化配置

**當前狀態**:
- 大小: 8.3 MB
- 連接數: 6/200 (3%)
- 快取命中率: 待監控

#### 3. Redis 優化
- ✅ 設定記憶體限制（512MB）
- ✅ 配置 LRU 淘汰策略
- ✅ RDB + AOF 持久化
- ✅ TCP 連接優化

**當前狀態**:
- 記憶體: 1.21M / 512MB (0.24%)
- 命中率: 100%
- Keys: 0

#### 4. Kafka 優化
- ✅ 調整 I/O 和網路線程
- ✅ 啟用 lz4 壓縮
- ✅ 設定 7 天保留策略
- ✅ 優化緩衝區大小

**當前狀態**:
- Topics: 26
- 磁碟: 1.573GB
- Consumer Lag: 0

#### 5. 備份與恢復
- ✅ 自動備份腳本（`backup-database.sh`）
- ✅ 災難恢復文檔
- ✅ 備份保留策略（7 天）
- ✅ 備份完整性驗證

#### 6. 監控與告警
- ✅ 健康檢查腳本（`health-check.sh`）
- ✅ 資源使用監控
- ✅ 資料庫效能監控視圖
- ✅ 磁碟空間監控

#### 7. 環境管理
- ✅ 三套環境配置（dev/staging/prod）
- ✅ 環境變數驗證
- ✅ 安全配置分離

### 📊 關鍵指標

**磁碟空間**:
- 總計: 932GB
- 已用: 289GB (31%)
- 可用: 623GB

---

## 運維操作

### PostgreSQL 操作

```bash
# 連接到資料庫
docker exec -it suggar-daddy-postgres psql -U postgres -d suggar_daddy

# 執行 SQL 查詢
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT version();"

# 列出所有資料庫
docker exec suggar-daddy-postgres psql -U postgres -c "\l"

# 列出所有表
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "\dt"

# 查看表結構
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "\d table_name"

# 備份資料庫
docker exec suggar-daddy-postgres pg_dump -U postgres suggar_daddy > backup.sql

# 或使用自動備份腳本
./scripts/backup-database.sh

# 恢復資料庫
cat backup.sql | docker exec -i suggar-daddy-postgres psql -U postgres -d suggar_daddy

# 查看資料庫大小
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "
  SELECT pg_size_pretty(pg_database_size('suggar_daddy'));
"

# 查看表大小
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Redis 操作

```bash
# 連接到 Redis CLI
docker exec -it suggar-daddy-redis redis-cli

# 獲取所有 keys
docker exec suggar-daddy-redis redis-cli KEYS "*"

# 監控命令
docker exec suggar-daddy-redis redis-cli MONITOR

# 獲取資訊
docker exec suggar-daddy-redis redis-cli INFO

# 獲取記憶體統計
docker exec suggar-daddy-redis redis-cli INFO memory

# 檢查特定 key
docker exec suggar-daddy-redis redis-cli GET key_name

# 設置 key
docker exec suggar-daddy-redis redis-cli SET key_name value

# 刪除 key
docker exec suggar-daddy-redis redis-cli DEL key_name

# 清空所有資料 ⚠️
docker exec suggar-daddy-redis redis-cli FLUSHALL
```

### Kafka 操作

```bash
# 列出所有 topics
docker exec suggar-daddy-kafka kafka-topics --list --bootstrap-server localhost:9092

# 創建 topic
docker exec suggar-daddy-kafka kafka-topics \
  --create \
  --topic my-topic \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

# 描述 topic
docker exec suggar-daddy-kafka kafka-topics \
  --describe \
  --topic my-topic \
  --bootstrap-server localhost:9092

# 生產訊息（互動式）
docker exec -it suggar-daddy-kafka kafka-console-producer \
  --topic my-topic \
  --bootstrap-server localhost:9092

# 消費訊息（從頭開始）
docker exec -it suggar-daddy-kafka kafka-console-consumer \
  --topic my-topic \
  --from-beginning \
  --bootstrap-server localhost:9092

# 查看 consumer groups
docker exec suggar-daddy-kafka kafka-consumer-groups \
  --list \
  --bootstrap-server localhost:9092

# 查看 consumer group 詳情
docker exec suggar-daddy-kafka kafka-consumer-groups \
  --describe \
  --group my-group \
  --bootstrap-server localhost:9092

# 刪除 topic
docker exec suggar-daddy-kafka kafka-topics \
  --delete \
  --topic my-topic \
  --bootstrap-server localhost:9092
```

### 備份操作

```bash
# 執行完整備份
./scripts/backup-database.sh

# 檢查備份文件
ls -lh backups/

# 設置自動備份（cron）
# 每天凌晨 2 點執行
crontab -e
# 添加以下行：
# 0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/backup.log 2>&1

# 恢復備份
# PostgreSQL
cat backups/backup-YYYYMMDD-HHMMSS.sql | \
  docker exec -i suggar-daddy-postgres psql -U postgres -d suggar_daddy

# Redis
docker exec -i suggar-daddy-redis redis-cli --pipe < backups/redis-backup-YYYYMMDD-HHMMSS.rdb
```

---

## 監控與告警

### 資源監控

```bash
# 實時統計
docker stats

# 檢查磁碟使用
docker system df

# 檢查特定容器
docker stats suggar-daddy-postgres

# 執行健康檢查
./scripts/health-check.sh
```

### 日誌管理

```bash
# 跟隨日誌
docker-compose logs -f

# 最後 100 行
docker-compose logs --tail=100

# 特定服務
docker-compose logs -f postgres

# 自特定時間以來
docker-compose logs --since 2024-01-01T00:00:00

# 導出日誌
docker-compose logs > logs.txt
```

### PostgreSQL 監控視圖

已創建 12 個監控視圖，可在 PostgreSQL 中查詢：

```sql
-- 查看所有可用的監控視圖
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'monitor_%';

-- 查看慢查詢（需要 pg_stat_statements 擴展）
SELECT * FROM monitor_slow_queries LIMIT 10;

-- 查看資料庫大小
SELECT * FROM monitor_database_size;

-- 查看活躍連接
SELECT * FROM monitor_active_connections;
```

---

## 故障排除

### 服務無法啟動

```bash
# 檢查日誌
docker-compose logs [service-name]

# 重啟服務
docker-compose restart [service-name]

# 重新建構並啟動
docker-compose up -d --build [service-name]

# 強制重新創建
docker-compose up -d --force-recreate [service-name]
```

### 端口被占用

```bash
# 查找使用端口的進程
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9092  # Kafka
lsof -i :2181  # Zookeeper

# 查看 PID 並停止進程（如果需要）
# 或修改 docker-compose.yml 中的端口映射
```

### 容器無法停止

```bash
# 強制移除
docker rm -f suggar-daddy-postgres
docker rm -f suggar-daddy-redis
docker rm -f suggar-daddy-kafka
docker rm -f suggar-daddy-zookeeper

# 或全部移除
docker-compose down --remove-orphans
```

### 清空所有數據 ⚠️ 危險操作

```bash
# 停止並移除容器、網路、volumes
docker-compose down -v

# 移除特定 volume
docker volume rm suggar-daddy_postgres_data
docker volume rm suggar-daddy_redis_data
docker volume rm suggar-daddy_kafka_data
```

### PostgreSQL 連接問題

```bash
# 檢查 PostgreSQL 是否運行
docker exec suggar-daddy-postgres pg_isready

# 檢查連接配置
docker exec suggar-daddy-postgres psql -U postgres -c "SHOW listen_addresses;"

# 查看當前連接
docker exec suggar-daddy-postgres psql -U postgres -c "
  SELECT pid, usename, application_name, client_addr, state 
  FROM pg_stat_activity;
"

# 終止特定連接
docker exec suggar-daddy-postgres psql -U postgres -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE pid <> pg_backend_pid() AND usename = 'postgres';
"
```

### Redis 連接問題

```bash
# 測試連接
docker exec suggar-daddy-redis redis-cli ping

# 檢查配置
docker exec suggar-daddy-redis redis-cli CONFIG GET "*"

# 查看客戶端列表
docker exec suggar-daddy-redis redis-cli CLIENT LIST

# 查看慢日誌
docker exec suggar-daddy-redis redis-cli SLOWLOG GET 10
```

### Kafka 問題

```bash
# 檢查 broker 狀態
docker exec suggar-daddy-kafka kafka-broker-api-versions \
  --bootstrap-server localhost:9092

# 查看 topic 配置
docker exec suggar-daddy-kafka kafka-configs \
  --describe \
  --entity-type topics \
  --entity-name my-topic \
  --bootstrap-server localhost:9092

# 檢查 consumer lag
docker exec suggar-daddy-kafka kafka-consumer-groups \
  --describe \
  --group my-group \
  --bootstrap-server localhost:9092
```

---

## 效能調優

### PostgreSQL 調優

已應用的優化參數：

```sql
-- 查看當前配置
SHOW ALL;

-- 關鍵參數
SHOW shared_buffers;      -- 256MB
SHOW effective_cache_size; -- 1GB
SHOW work_mem;             -- 16MB
SHOW maintenance_work_mem; -- 128MB
SHOW max_connections;      -- 200
```

**進一步優化建議**：

1. **索引優化**
```sql
-- 查找缺少索引的表
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND tablename NOT IN (
    SELECT tablename 
    FROM pg_indexes 
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  );

-- 查看索引使用情況
SELECT * FROM pg_stat_user_indexes;
```

2. **查詢優化**
```sql
-- 啟用查詢分析
EXPLAIN ANALYZE SELECT ...;

-- 查看慢查詢
SELECT * FROM monitor_slow_queries LIMIT 20;
```

### Redis 調優

已應用的優化：
- 記憶體限制: 512MB
- 淘汰策略: allkeys-lru
- 持久化: RDB + AOF

**監控命令**：

```bash
# 記憶體使用
docker exec suggar-daddy-redis redis-cli INFO memory

# 命中率
docker exec suggar-daddy-redis redis-cli INFO stats | grep hit

# 慢日誌
docker exec suggar-daddy-redis redis-cli SLOWLOG GET 10
```

### Kafka 調優

已應用的優化：
- 壓縮: lz4
- 保留策略: 7 天
- 緩衝區優化

**監控命令**：

```bash
# 查看 broker 指標
docker exec suggar-daddy-kafka kafka-run-class kafka.tools.JmxTool \
  --object-name kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec

# 查看 consumer lag
docker exec suggar-daddy-kafka kafka-consumer-groups \
  --describe \
  --all-groups \
  --bootstrap-server localhost:9092
```

---

## 🔐 安全注意事項

### ⚠️ 開發環境

當前配置僅用於**開發環境**：
- ❌ 使用預設密碼
- ❌ 未配置加密
- ❌ Redis 無認證
- ❌ Kafka 使用 PLAINTEXT 協議

### ✅ 生產環境建議

1. **更改所有預設密碼**
2. **啟用 SSL/TLS**
3. **配置認證機制**
4. **設置資源限制**
5. **使用 Secrets 管理**
6. **啟用審計日誌**
7. **定期安全掃描**
8. **網路隔離**

---

## 📚 相關資源

### 文件
- 📖 運維手冊: `docs/operations-manual.md`
- 🚨 災難恢復: `docs/disaster-recovery.md`
- 📊 資料庫監控: `infrastructure/db-monitoring.sql`
- 🔧 腳本: `scripts/`

### 外部文檔
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**最後更新**: 2024-01-15  
**維護者**: Infrastructure Team

🚀 **基礎設施運行正常！**
