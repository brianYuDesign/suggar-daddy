# PostgreSQL HA 快速參考卡

## 🚀 啟動/停止

```bash
# 啟動
docker-compose up -d postgres-master postgres-replica

# 停止
docker-compose stop postgres-master postgres-replica

# 重啟
docker-compose restart postgres-master postgres-replica

# 查看狀態
docker ps | grep postgres
```

## 🔍 健康檢查

```bash
# 快速檢查
./infrastructure/postgres/scripts/verify-ha-comprehensive.sh

# Master 檢查
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh

# Replica 檢查
docker exec suggar-daddy-postgres-replica /usr/local/bin/check-replication.sh
```

## 📊 監控

```bash
# 複製狀態
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# 複製延遲
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT 
      pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes,
      replay_lag
    FROM pg_stat_replication;
  "

# 連接數
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 數據庫大小
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT 
      datname,
      pg_size_pretty(pg_database_size(datname))
    FROM pg_database
    WHERE datname = 'suggar_daddy';
  "
```

## 💾 備份/恢復

```bash
# 手動備份
./infrastructure/postgres/scripts/backup.sh

# 列出備份
ls -lh backups/

# 恢復備份
./infrastructure/postgres/scripts/restore.sh /backups/backup_suggar_daddy_20260214_120000.sql.gz
```

## 🔧 連接

```bash
# 連接 Master (讀寫)
psql -h localhost -p 5432 -U postgres -d suggar_daddy

# 連接 Replica (只讀)
psql -h localhost -p 5433 -U postgres -d suggar_daddy

# 通過 PgBouncer
psql -h localhost -p 6432 -U postgres -d suggar_daddy        # 寫入
psql -h localhost -p 6432 -U postgres -d suggar_daddy_read   # 讀取
```

## 🚨 故障處理

```bash
# 查看日誌
docker logs suggar-daddy-postgres-master --tail 100
docker logs suggar-daddy-postgres-replica --tail 100

# 終止長時間運行的查詢
docker exec suggar-daddy-postgres-master \
  psql -U postgres -c "
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'active'
      AND query_start < now() - interval '10 minutes';
  "

# 重置複製
docker-compose down postgres-replica
docker volume rm suggar-daddy_postgres_replica_data
docker-compose up -d postgres-replica
```

## 📈 關鍵指標

| 指標 | 健康閾值 | 檢查命令 |
|------|---------|---------|
| 複製延遲 | < 10 MB | `pg_stat_replication.lag_bytes` |
| 連接數 | < 160 (80%) | `pg_stat_activity count` |
| 緩存命中率 | > 90% | `pg_stat_database.blks_hit / (blks_hit + blks_read)` |
| 複製槽狀態 | active = true | `pg_replication_slots.active` |
| 死元組比率 | < 10% | `pg_stat_user_tables.n_dead_tup / n_live_tup` |

## 🔑 環境變數

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=suggar_daddy
REPLICATION_PASSWORD=your_replication_password
POSTGRES_MASTER_HOST=postgres-master
POSTGRES_REPLICA_HOST=postgres-replica
```

## 📱 監控端點

- Master Exporter: http://localhost:9187/metrics
- Replica Exporter: http://localhost:9188/metrics
- PgBouncer: http://localhost:6432
- Prometheus: http://localhost:9090 (需啟動)
- Grafana: http://localhost:3001 (需啟動)

## 🆘 緊急聯繫

- 完整文檔: `docs/POSTGRESQL_HA_TEST_REPORT.md`
- README: `infrastructure/postgres/README.md`
- 腳本位置: `infrastructure/postgres/scripts/`

---

**提示**: 將此文件保存為 `QUICK_REFERENCE.md` 並列印或添加到收藏夾！
