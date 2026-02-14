# PostgreSQL High Availability Architecture

## 📋 目錄

- [概述](#概述)
- [架構設計](#架構設計)
- [部署指南](#部署指南)
- [讀寫分離](#讀寫分離)
- [健康檢查與監控](#健康檢查與監控)
- [故障轉移](#故障轉移)
- [備份與恢復](#備份與恢復)
- [性能優化](#性能優化)
- [常見問題](#常見問題)
- [維護操作](#維護操作)

---

## 概述

本專案實施了 PostgreSQL 主從複製（Master-Replica）架構，以實現：

- ✅ **高可用性**：目標 99.9% 以上
- ✅ **讀寫分離**：分散資料庫負載
- ✅ **數據冗餘**：即時備份保護
- ✅ **故障容錯**：支持快速故障轉移
- ✅ **橫向擴展**：支持多個只讀副本

### 技術規格

- **PostgreSQL 版本**：16 (Alpine)
- **複製模式**：Streaming Replication (異步)
- **WAL 層級**：replica
- **複製延遲**：目標 < 1 秒

---

## 架構設計

### 整體架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ API Gateway  │  │ Auth Service │  │ User Service │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          │ Write (INSERT/  │                  │ Read (SELECT)
          │ UPDATE/DELETE)  │                  │
          │                 │                  │
          ▼                 ▼                  ▼
┌──────────────────────┐          ┌──────────────────────┐
│  PostgreSQL Master   │──────────│  PostgreSQL Replica  │
│  (Read/Write)        │ Streaming│  (Read-Only)         │
│  Port: 5432          │ Repl.    │  Port: 5433          │
└──────────────────────┘          └──────────────────────┘
         │                                 │
         │ WAL Segments                    │
         ▼                                 ▼
┌──────────────────────┐          ┌──────────────────────┐
│ Master Data Volume   │          │ Replica Data Volume  │
└──────────────────────┘          └──────────────────────┘
```

### 複製流程

```
Master (Primary)                    Replica (Standby)
─────────────────                   ──────────────────

1. Client Write Request
   │
   ├─→ Write to WAL
   │
   ├─→ Update Data Files
   │
   ├─→ WAL Sender Process ────────→ 2. WAL Receiver Process
                                      │
                                      ├─→ Write to WAL
                                      │
                                      ├─→ Replay WAL
                                      │
                                      └─→ Update Data Files

3. Confirm to Client ←────────────── 4. Send Feedback
```

### 組件說明

#### 1. PostgreSQL Master (主節點)

**角色**：處理所有寫入操作和部分讀取操作

**配置檔案**：
- `infrastructure/postgres/master/postgresql.conf`
- `infrastructure/postgres/master/pg_hba.conf`

**關鍵設置**：
```ini
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
synchronous_commit = local  # 異步複製
```

**端口**：5432 (主應用端口)

#### 2. PostgreSQL Replica (從節點)

**角色**：處理只讀查詢，減輕主節點負載

**配置檔案**：
- `infrastructure/postgres/replica/postgresql.conf`
- `infrastructure/postgres/replica/pg_hba.conf`

**關鍵設置**：
```ini
hot_standby = on
hot_standby_feedback = on
```

**端口**：5433 (只讀查詢端口)

#### 3. Replication User

**用戶名**：`replicator`
**用途**：專用於主從複製連接
**權限**：REPLICATION 權限

---

## 部署指南

### 前置需求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用記憶體
- 至少 20GB 可用磁碟空間

### 首次部署

#### 1. 設置環境變數

確保 `.env.docker` 包含以下配置：

```bash
# PostgreSQL High Availability
POSTGRES_HA_ENABLED=true
POSTGRES_MASTER_HOST=postgres-master
POSTGRES_REPLICA_HOST=postgres-replica
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=suggar_daddy
REPLICATION_PASSWORD=replicator_password  # 生產環境請修改！
```

#### 2. 啟動服務

```bash
# 啟動 PostgreSQL 主從架構
docker-compose up -d postgres-master postgres-replica

# 查看日誌
docker-compose logs -f postgres-master postgres-replica
```

#### 3. 驗證複製狀態

```bash
# 在 Master 上檢查複製狀態
docker exec -it suggar-daddy-postgres-master /usr/local/bin/check-replication.sh

# 在 Replica 上檢查複製狀態
docker exec -it suggar-daddy-postgres-replica /usr/local/bin/check-replication.sh
```

#### 4. 啟動應用服務

```bash
# 啟動所有服務
docker-compose up -d

# 或啟動特定服務
docker-compose up -d api-gateway auth-service user-service
```

### 快速驗證

```bash
# 1. 檢查 Master 健康狀態
docker exec suggar-daddy-postgres-master pg_isready -U postgres

# 2. 檢查 Replica 健康狀態
docker exec suggar-daddy-postgres-replica pg_isready -U postgres

# 3. 驗證 Replica 是否處於恢復模式（應返回 't'）
docker exec suggar-daddy-postgres-replica \
  psql -U postgres -t -c "SELECT pg_is_in_recovery();"

# 4. 查看複製槽
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT * FROM pg_replication_slots;"

# 5. 查看活躍的複製連接
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

---

## 讀寫分離

### TypeORM 配置

應用程式已自動配置讀寫分離。當 `POSTGRES_HA_ENABLED=true` 時：

```typescript
// libs/database/src/database.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  replication: {
    master: {
      host: 'postgres-master',
      port: 5432,
      // ... 寫入操作
    },
    slaves: [{
      host: 'postgres-replica',
      port: 5432,
      // ... 讀取操作
    }]
  }
})
```

### 自動路由規則

TypeORM 會自動路由查詢：

| 操作類型 | 目標資料庫 |
|---------|----------|
| `INSERT`, `UPDATE`, `DELETE` | Master |
| `SELECT` (default) | Replica |
| `SELECT ... FOR UPDATE` | Master |
| Transactions | Master |

### 手動指定查詢目標

```typescript
// 使用 Replica 讀取（默認）
const users = await userRepository.find();

// 強制使用 Master 讀取
const connection = getConnection();
const queryRunner = connection.createQueryRunner('master');
const users = await queryRunner.manager.find(User);
await queryRunner.release();
```

### 測試讀寫分離

```bash
# 1. 在 Master 插入數據
docker exec suggar-daddy-postgres-master \
  psql -U postgres -d suggar_daddy \
  -c "INSERT INTO users (email, role) VALUES ('test@example.com', 'user');"

# 2. 在 Replica 查詢數據（應該在 1 秒內可見）
docker exec suggar-daddy-postgres-replica \
  psql -U postgres -d suggar_daddy \
  -c "SELECT * FROM users WHERE email = 'test@example.com';"

# 3. 嘗試在 Replica 寫入（應該失敗）
docker exec suggar-daddy-postgres-replica \
  psql -U postgres -d suggar_daddy \
  -c "INSERT INTO users (email, role) VALUES ('fail@example.com', 'user');"
# 預期錯誤：ERROR: cannot execute INSERT in a read-only transaction
```

---

## 健康檢查與監控

### 自動健康檢查

Docker Compose 已配置自動健康檢查：

```yaml
# Master 健康檢查
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres && psql -U postgres -c 'SELECT 1'"]
  interval: 10s
  timeout: 5s
  retries: 5

# Replica 健康檢查
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres && psql -U postgres -c 'SELECT pg_is_in_recovery()' | grep -q 't'"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### 複製監控腳本

使用內建的監控腳本：

```bash
# Master 複製狀態
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh

# Replica 複製狀態
docker exec suggar-daddy-postgres-replica /usr/local/bin/check-replication.sh
```

### 關鍵監控指標

#### 1. 複製延遲

```sql
-- 在 Replica 上執行
SELECT 
    now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

**預期值**：< 1 秒

#### 2. 複製槽狀態

```sql
-- 在 Master 上執行
SELECT 
    slot_name,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;
```

**預期**：`active = true`

#### 3. WAL Sender 狀態

```sql
-- 在 Master 上執行
SELECT 
    client_addr,
    state,
    sync_state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

**預期**：
- `state = streaming`
- `lag_bytes < 10485760` (< 10MB)

#### 4. 連接數監控

```sql
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE pid <> pg_backend_pid();
```

### 設置 Prometheus 監控（可選）

安裝 PostgreSQL Exporter：

```yaml
# docker-compose.yml
postgres-exporter:
  image: prometheuscommunity/postgres-exporter:latest
  environment:
    DATA_SOURCE_NAME: "postgresql://postgres:postgres@postgres-master:5432/postgres?sslmode=disable"
  ports:
    - "9187:9187"
```

---

## 故障轉移

### 手動故障轉移流程

當 Master 失敗時，可以將 Replica 提升為新的 Master。

#### 步驟 1：提升 Replica 為 Master

```bash
# 1. 進入 Replica 容器
docker exec -it suggar-daddy-postgres-replica bash

# 2. 提升為 Master
pg_ctl promote -D /var/lib/postgresql/data

# 或使用 SQL
psql -U postgres -c "SELECT pg_promote();"
```

#### 步驟 2：驗證提升成功

```bash
# 確認不再處於恢復模式（應返回 'f'）
docker exec suggar-daddy-postgres-replica \
  psql -U postgres -t -c "SELECT pg_is_in_recovery();"
```

#### 步驟 3：更新應用配置

```bash
# 更新環境變數
export POSTGRES_MASTER_HOST=postgres-replica

# 或更新 .env.docker
POSTGRES_MASTER_HOST=postgres-replica
```

#### 步驟 4：重啟應用服務

```bash
docker-compose restart api-gateway auth-service user-service
```

### 自動故障轉移（使用 Patroni）

對於生產環境，建議使用 Patroni 實現自動故障轉移：

```yaml
# docker-compose.yml (示例)
patroni-master:
  image: patroni/patroni:latest
  environment:
    PATRONI_NAME: patroni-master
    PATRONI_SCOPE: postgres-cluster
    PATRONI_RESTAPI_CONNECT_ADDRESS: patroni-master:8008
    PATRONI_POSTGRESQL_CONNECT_ADDRESS: postgres-master:5432
    PATRONI_POSTGRESQL_DATA_DIR: /var/lib/postgresql/data
    # ... 更多配置
```

**Patroni 功能**：
- 自動檢測主節點故障
- 自動選舉新的主節點
- 自動重新配置複製
- 提供 REST API 查詢集群狀態

---

## 備份與恢復

### 定期備份

#### 1. 邏輯備份（pg_dump）

```bash
# 完整備份
docker exec suggar-daddy-postgres-master \
  pg_dump -U postgres -Fc suggar_daddy > backup_$(date +%Y%m%d_%H%M%S).dump

# 僅備份架構
docker exec suggar-daddy-postgres-master \
  pg_dump -U postgres -s suggar_daddy > schema_$(date +%Y%m%d_%H%M%S).sql

# 僅備份數據
docker exec suggar-daddy-postgres-master \
  pg_dump -U postgres -a suggar_daddy > data_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. 物理備份（pg_basebackup）

```bash
# 完整物理備份
docker exec suggar-daddy-postgres-master \
  pg_basebackup -U postgres -D /backups/basebackup_$(date +%Y%m%d) -Ft -z -P
```

#### 3. 自動備份腳本

創建 `infrastructure/postgres/scripts/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/backups"
RETENTION_DAYS=7

# 執行備份
docker exec suggar-daddy-postgres-master \
  pg_dump -U postgres -Fc suggar_daddy > "${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).dump"

# 清理舊備份
find "${BACKUP_DIR}" -name "backup_*.dump" -mtime +${RETENTION_DAYS} -delete

echo "✅ Backup completed!"
```

設置 cron 定時任務：

```bash
# 每天凌晨 3 點執行備份
0 3 * * * /path/to/backup.sh
```

### 恢復數據

#### 從 pg_dump 備份恢復

```bash
# 停止應用服務
docker-compose stop api-gateway auth-service user-service

# 恢復數據
docker exec -i suggar-daddy-postgres-master \
  pg_restore -U postgres -d suggar_daddy -c < backup.dump

# 重啟服務
docker-compose start api-gateway auth-service user-service
```

#### 從物理備份恢復

```bash
# 1. 停止 PostgreSQL
docker-compose stop postgres-master postgres-replica

# 2. 清理數據目錄
docker volume rm suggar-daddy_postgres_master_data

# 3. 解壓備份
tar -xzf basebackup.tar.gz -C /path/to/volume

# 4. 重啟服務
docker-compose up -d postgres-master
```

---

## 性能優化

### 1. 連接池配置

```typescript
// 應用層連接池設置
extra: {
  max: 20,           // 最大連接數
  min: 5,            // 最小連接數
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}
```

### 2. PostgreSQL 參數調優

已在 `postgresql.conf` 中配置：

```ini
# 記憶體設置
shared_buffers = 256MB              # 25% of RAM (建議)
effective_cache_size = 1GB          # 50-75% of RAM
work_mem = 8MB                      # 根據併發查詢調整
maintenance_work_mem = 128MB        # 用於維護操作

# I/O 設置
random_page_cost = 1.1              # SSD 優化
effective_io_concurrency = 200      # SSD 並發 I/O

# WAL 設置
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 80MB
```

### 3. 索引優化

```sql
-- 檢查缺失的索引
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY abs(correlation) DESC;

-- 檢查未使用的索引
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 4. 查詢優化

```sql
-- 啟用查詢計劃分析
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- 檢查慢查詢
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 常見問題

### Q1: 複製延遲過高怎麼辦？

**症狀**：複製延遲超過 5 秒

**可能原因**：
1. Master 寫入壓力過大
2. 網路延遲
3. Replica 硬體資源不足

**解決方案**：

```bash
# 1. 檢查 Master 寫入壓力
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 2. 檢查網路延遲
docker exec suggar-daddy-postgres-replica ping postgres-master

# 3. 檢查 Replica 資源
docker stats suggar-daddy-postgres-replica

# 4. 考慮增加 Replica 資源
docker-compose up -d --scale postgres-replica=2
```

### Q2: Replica 無法連接到 Master

**症狀**：Replica 日誌顯示連接錯誤

**檢查步驟**：

```bash
# 1. 檢查 Master 是否運行
docker ps | grep postgres-master

# 2. 檢查網路連接
docker exec suggar-daddy-postgres-replica ping postgres-master

# 3. 檢查 pg_hba.conf 配置
docker exec suggar-daddy-postgres-master cat /etc/postgresql/pg_hba.conf | grep replication

# 4. 檢查防火牆規則
docker exec suggar-daddy-postgres-master netstat -tuln | grep 5432
```

### Q3: 複製槽已滿

**症狀**：`FATAL: number of requested standby connections exceeds max_wal_senders`

**解決方案**：

```sql
-- 增加 max_wal_senders
ALTER SYSTEM SET max_wal_senders = 20;

-- 重啟 PostgreSQL
docker-compose restart postgres-master
```

### Q4: WAL 檔案佔用過多空間

**症狀**：磁碟空間不足

**解決方案**：

```bash
# 1. 檢查 WAL 使用情況
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT pg_size_pretty(pg_wal_size());"

# 2. 清理未使用的複製槽
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT pg_drop_replication_slot('unused_slot');"

# 3. 調整 wal_keep_size
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "ALTER SYSTEM SET wal_keep_size = '512MB';"
```

### Q5: 如何測試故障轉移？

```bash
# 1. 記錄當前 Master 狀態
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT pg_current_wal_lsn();"

# 2. 模擬 Master 故障
docker-compose stop postgres-master

# 3. 提升 Replica
docker exec suggar-daddy-postgres-replica \
  psql -U postgres -c "SELECT pg_promote();"

# 4. 驗證新 Master
docker exec suggar-daddy-postgres-replica \
  psql -U postgres -t -c "SELECT pg_is_in_recovery();"
# 應返回 'f'

# 5. 恢復原 Master 為新 Replica（需要重新配置）
```

---

## 維護操作

### 定期維護任務

#### 1. 每日任務

```bash
# 檢查複製狀態
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh

# 備份數據庫
docker exec suggar-daddy-postgres-master \
  pg_dump -U postgres -Fc suggar_daddy > daily_backup.dump
```

#### 2. 每週任務

```bash
# VACUUM 分析
docker exec suggar-daddy-postgres-master \
  psql -U postgres -d suggar_daddy -c "VACUUM ANALYZE;"

# 重建索引
docker exec suggar-daddy-postgres-master \
  psql -U postgres -d suggar_daddy -c "REINDEX DATABASE suggar_daddy;"

# 檢查數據庫大小
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('suggar_daddy'));"
```

#### 3. 每月任務

```bash
# 完整備份
docker exec suggar-daddy-postgres-master \
  pg_basebackup -U postgres -D /backups/monthly_$(date +%Y%m) -Ft -z -P

# 更新統計信息
docker exec suggar-daddy-postgres-master \
  psql -U postgres -d suggar_daddy -c "ANALYZE VERBOSE;"

# 檢查表膨脹
docker exec suggar-daddy-postgres-master \
  psql -U postgres -d suggar_daddy -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        n_live_tup,
        n_dead_tup,
        round(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio
    FROM pg_stat_user_tables
    ORDER BY n_dead_tup DESC;
  "
```

### 版本升級

#### PostgreSQL 小版本升級

```bash
# 1. 備份數據
docker exec suggar-daddy-postgres-master \
  pg_dump -U postgres -Fc suggar_daddy > pre_upgrade_backup.dump

# 2. 更新 Docker 映像
docker-compose pull postgres-master postgres-replica

# 3. 滾動升級（先 Replica，後 Master）
docker-compose up -d postgres-replica
docker-compose up -d postgres-master

# 4. 驗證版本
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT version();"
```

### 安全加固

```sql
-- 1. 更改默認密碼
ALTER USER postgres WITH PASSWORD 'strong_password_here';
ALTER USER replicator WITH PASSWORD 'strong_replication_password';

-- 2. 限制連接來源
-- 編輯 pg_hba.conf，限制特定 IP 範圍

-- 3. 啟用 SSL 連接
-- ALTER SYSTEM SET ssl = on;

-- 4. 定期審計
SELECT * FROM pg_stat_activity WHERE usename NOT IN ('postgres', 'replicator');
```

---

## 附錄

### A. 配置文件位置

```
infrastructure/postgres/
├── master/
│   ├── postgresql.conf       # Master 主配置
│   └── pg_hba.conf           # Master 訪問控制
├── replica/
│   ├── postgresql.conf       # Replica 主配置
│   └── pg_hba.conf           # Replica 訪問控制
└── scripts/
    ├── init-master.sh        # Master 初始化腳本
    ├── init-replica.sh       # Replica 初始化腳本
    ├── check-replication.sh  # 複製監控腳本
    └── backup.sh             # 備份腳本
```

### B. 環境變數參考

| 變數名 | 說明 | 默認值 |
|--------|------|--------|
| `POSTGRES_HA_ENABLED` | 啟用高可用性模式 | `true` |
| `POSTGRES_MASTER_HOST` | Master 主機名 | `postgres-master` |
| `POSTGRES_REPLICA_HOST` | Replica 主機名 | `postgres-replica` |
| `POSTGRES_USER` | 資料庫用戶 | `postgres` |
| `POSTGRES_PASSWORD` | 資料庫密碼 | `postgres` |
| `POSTGRES_DB` | 資料庫名稱 | `suggar_daddy` |
| `REPLICATION_PASSWORD` | 複製用戶密碼 | `replicator_password` |

### C. 有用的 SQL 查詢

```sql
-- 檢查複製延遲
SELECT 
    application_name,
    client_addr,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    replay_lag
FROM pg_stat_replication;

-- 檢查表大小
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 檢查連接數
SELECT 
    datname,
    count(*) AS connections
FROM pg_stat_activity
GROUP BY datname;

-- 檢查長時間運行的查詢
SELECT 
    pid,
    now() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

### D. 參考資源

- [PostgreSQL Replication Documentation](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [PostgreSQL High Availability](https://www.postgresql.org/docs/current/high-availability.html)
- [Patroni Documentation](https://patroni.readthedocs.io/)
- [TypeORM Replication](https://typeorm.io/replication)

---

## 總結

此 PostgreSQL 高可用性架構提供：

✅ **可靠性**：主從複製確保數據安全  
✅ **可擴展性**：讀寫分離提升性能  
✅ **可維護性**：自動化腳本簡化運維  
✅ **可觀測性**：完整的監控和日誌  

**下一步建議**：
1. 實施自動備份策略
2. 配置監控告警（Prometheus + Grafana）
3. 實施自動故障轉移（Patroni）
4. 添加更多只讀副本（水平擴展）
5. 實施 Point-in-Time Recovery (PITR)

---

**文檔版本**：1.0  
**最後更新**：2024-12  
**維護者**：DevOps Team
