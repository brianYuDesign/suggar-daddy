# PostgreSQL High Availability Setup

這個目錄包含 PostgreSQL 高可用配置的所有文件和腳本。

## 🏗️ 架構

```
┌─────────────────────┐         ┌─────────────────────┐
│   postgres-master   │────────▶│  postgres-replica   │
│   (Primary)         │  WAL    │   (Standby)         │
│   Port: 5432        │ Stream  │   Port: 5433        │
│   Read/Write        │         │   Read-Only         │
└─────────────────────┘         └─────────────────────┘
```

## 🚀 快速開始

### 啟動 PostgreSQL HA

```bash
# 啟動 master 和 replica
docker-compose up -d postgres-master postgres-replica

# 檢查狀態
docker ps | grep postgres

# 驗證複製
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh
```

### 檢查健康狀態

```bash
# Master 健康檢查
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh

# Replica 健康檢查
docker exec suggar-daddy-postgres-replica /usr/local/bin/check-replication.sh

# 自動化驗證
./infrastructure/postgres/scripts/verify-ha-comprehensive.sh
```

## 📁 目錄結構

```
infrastructure/postgres/
├── master/                      # Master 配置
│   ├── postgresql.conf          # PostgreSQL 主配置
│   ├── pg_hba.conf              # 訪問控制
│   └── README.md
├── replica/                     # Replica 配置
│   ├── postgresql.conf          # PostgreSQL 從配置
│   ├── pg_hba.conf              # 訪問控制
│   ├── entrypoint.sh            # 初始化腳本
│   └── README.md
├── pgbouncer/                   # 連接池配置
│   ├── pgbouncer.ini            # PgBouncer 配置
│   ├── userlist.txt             # 用戶列表
│   ├── Dockerfile               # PgBouncer 鏡像
│   └── entrypoint.sh            # 啟動腳本
├── scripts/                     # 管理腳本
│   ├── init-master.sh           # Master 初始化
│   ├── check-replication.sh     # 健康檢查
│   ├── backup.sh                # 備份腳本
│   ├── restore.sh               # 恢復腳本
│   ├── test-failover.sh         # 故障轉移測試
│   └── verify-ha-comprehensive.sh # 完整驗證
├── monitoring/                  # 監控配置
│   ├── postgres-alerts.yml      # Prometheus 告警規則
│   └── queries.yml              # 自定義查詢指標
└── docker-compose.monitoring.yml # 監控堆棧配置
```

## 🔧 主要功能

### 1. 流複製（Streaming Replication）

- ✅ 異步流複製
- ✅ 複製延遲 < 1 秒
- ✅ 物理複製槽（Physical Replication Slot）
- ✅ WAL 歸檔支持

### 2. 連接池（PgBouncer）

```bash
# 啟動 PgBouncer
docker-compose -f infrastructure/postgres/docker-compose.monitoring.yml up -d pgbouncer

# 通過 PgBouncer 連接
psql -h localhost -p 6432 -U postgres -d suggar_daddy

# 查看連接池狀態
psql -h localhost -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;"
```

**配置:**
- 寫入: `suggar_daddy` → postgres-master:5432
- 讀取: `suggar_daddy_read` → postgres-replica:5432
- Pool Mode: Transaction
- Max Connections: 500

### 3. 備份與恢復

**自動備份:**
```bash
# 每日 02:00 AM 自動備份
docker-compose -f infrastructure/postgres/docker-compose.monitoring.yml up -d postgres-backup-scheduler
```

**手動備份:**
```bash
# 執行備份
./infrastructure/postgres/scripts/backup.sh

# 或在容器內執行
docker exec suggar-daddy-postgres-master /usr/local/bin/backup.sh
```

**恢復數據:**
```bash
# 列出可用備份
./infrastructure/postgres/scripts/restore.sh

# 恢復特定備份
./infrastructure/postgres/scripts/restore.sh /backups/backup_suggar_daddy_20260214_120000.sql.gz
```

**備份保留策略:**
- 保留期限: 7 天
- 自動清理舊備份
- 備份位置: `./backups/`

### 4. 監控與告警

**啟動監控:**
```bash
# 啟動 Prometheus Exporter
docker-compose -f infrastructure/postgres/docker-compose.monitoring.yml up -d \
  postgres-exporter-master \
  postgres-exporter-replica
```

**監控端點:**
- Master Exporter: http://localhost:9187/metrics
- Replica Exporter: http://localhost:9188/metrics

**關鍵指標:**
- `pg_up` - 數據庫可用性
- `pg_replication_lag_bytes` - 複製延遲
- `pg_stat_replication_count` - 活動 replica 數
- `pg_stat_activity_count` - 連接數
- `pg_database_size_bytes` - 數據庫大小

**告警規則:**
- PostgreSQLDown - 數據庫宕機
- PostgreSQLReplicationLagHigh - 複製延遲過高
- PostgreSQLNoActiveReplicas - 無活動 replica
- PostgreSQLConnectionsHigh - 連接數過高
- PostgreSQLCacheHitRatioLow - 緩存命中率低

### 5. 故障轉移測試

```bash
# 運行完整的故障轉移測試
./infrastructure/postgres/scripts/test-failover.sh
```

**測試項目:**
1. 初始健康檢查
2. 數據複製驗證
3. 模擬 Master 故障
4. Replica 可用性測試
5. 數據完整性驗證
6. Master 恢復測試

## 📊 性能優化

### 當前配置

```conf
# 連接
max_connections = 200

# 記憶體
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 8MB
maintenance_work_mem = 128MB

# WAL
wal_buffers = 16MB
wal_keep_size = 1GB

# 複製
max_wal_senders = 10
max_replication_slots = 10
```

### 生產環境建議

**8GB RAM 服務器:**
```conf
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
work_mem = 16MB
maintenance_work_mem = 512MB
max_connections = 200
```

**16GB RAM 服務器:**
```conf
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 32MB
maintenance_work_mem = 1GB
max_connections = 300
```

## 🔐 安全最佳實踐

### 1. 密碼管理

```bash
# 使用環境變數
export POSTGRES_PASSWORD='strong_password_here'
export REPLICATION_PASSWORD='strong_replication_password'

# 或使用 .env 文件
echo "POSTGRES_PASSWORD=strong_password" >> .env
echo "REPLICATION_PASSWORD=strong_replication_password" >> .env
```

### 2. 網絡隔離

```yaml
# docker-compose.yml
networks:
  suggar-daddy-network:
    driver: bridge
    internal: true  # 內部網絡，隔離外部訪問
```

### 3. SSL/TLS 加密（推薦）

```conf
# postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
ssl_ca_file = '/path/to/ca.crt'
```

## 🛠️ 常用命令

### 連接數據庫

```bash
# 連接 Master
docker exec -it suggar-daddy-postgres-master \
  psql -U postgres -d suggar_daddy

# 連接 Replica
docker exec -it suggar-daddy-postgres-replica \
  psql -U postgres -d suggar_daddy

# 通過 PgBouncer 連接
psql -h localhost -p 6432 -U postgres -d suggar_daddy
```

### 查看複製狀態

```bash
# Master 視角
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Replica 視角
docker exec suggar-daddy-postgres-replica \
  psql -U postgres -c "SELECT pg_is_in_recovery(), pg_last_wal_receive_lsn();"
```

### 查看連接

```bash
# 查看所有連接
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# 統計連接狀態
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT state, count(*) 
    FROM pg_stat_activity 
    GROUP BY state;
  "
```

### 查看數據庫大小

```bash
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT 
      pg_database.datname,
      pg_size_pretty(pg_database_size(pg_database.datname))
    FROM pg_database
    ORDER BY pg_database_size(pg_database.datname) DESC;
  "
```

## 🐛 故障排除

### 問題: Replica 無法啟動

**檢查日誌:**
```bash
docker logs suggar-daddy-postgres-replica

# 或查看 PostgreSQL 日誌
docker exec suggar-daddy-postgres-replica \
  cat /var/lib/postgresql/data/pg_log/postgresql-*.log
```

**常見原因:**
1. `max_wal_senders` 配置不一致
2. 複製槽已滿
3. 網絡連接問題
4. 權限配置錯誤

**解決方案:**
```bash
# 1. 確保配置一致
vim infrastructure/postgres/replica/postgresql.conf
# max_wal_senders = 10 (與 master 相同)

# 2. 重置複製
docker-compose down postgres-replica
docker volume rm suggar-daddy_postgres_replica_data
docker-compose up -d postgres-replica
```

### 問題: 複製延遲過高

**檢查延遲:**
```bash
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT 
      client_addr,
      application_name,
      pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes,
      replay_lag
    FROM pg_stat_replication;
  "
```

**可能原因:**
1. 網絡帶寬不足
2. Replica 磁盤 I/O 瓶頸
3. 大量寫入操作
4. checkpoint 配置不當

**優化方案:**
```conf
# 調整 checkpoint 參數
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 2GB

# 增加 WAL sender
max_wal_senders = 20
```

### 問題: 連接池耗盡

**檢查連接:**
```bash
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT count(*), state 
    FROM pg_stat_activity 
    GROUP BY state;
  "
```

**解決方案:**
```bash
# 1. 終止空閒連接
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'idle'
      AND state_change < now() - interval '10 minutes';
  "

# 2. 調整 max_connections
vim infrastructure/postgres/master/postgresql.conf
# max_connections = 300

# 3. 部署 PgBouncer
docker-compose -f infrastructure/postgres/docker-compose.monitoring.yml up -d pgbouncer
```

## 📚 參考文檔

- [完整測試報告](../../docs/POSTGRESQL_HA_TEST_REPORT.md)
- [PostgreSQL 官方文檔](https://www.postgresql.org/docs/16/)
- [流複製文檔](https://www.postgresql.org/docs/16/warm-standby.html)
- [PgBouncer 文檔](https://www.pgbouncer.org/)
- [Patroni 文檔](https://patroni.readthedocs.io/)

## 🤝 支援

如有問題，請查看:
1. [測試報告](../../docs/POSTGRESQL_HA_TEST_REPORT.md) - 詳細配置和測試結果
2. [故障排除指南](#-故障排除) - 常見問題解決方案
3. PostgreSQL 日誌 - 在 `/var/lib/postgresql/data/pg_log/`

## 📄 授權

MIT License

---

**最後更新**: 2026-02-14  
**維護者**: DevOps Team
