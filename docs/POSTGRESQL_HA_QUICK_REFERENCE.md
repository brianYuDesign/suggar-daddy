# PostgreSQL HA - 快速參考指南

## 🚀 快速開始

```bash
# 啟動 PostgreSQL HA 架構
docker-compose up -d postgres-master postgres-replica

# 驗證配置
./infrastructure/postgres/scripts/verify-ha.sh

# 檢查複製狀態
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh
```

## 📊 服務端口

| 服務 | 端口 | 用途 |
|------|------|------|
| postgres-master | 5432 | 讀寫操作 |
| postgres-replica | 5433 | 只讀操作 |

## 🔑 環境變數

```bash
POSTGRES_HA_ENABLED=true
POSTGRES_MASTER_HOST=postgres-master
POSTGRES_REPLICA_HOST=postgres-replica
REPLICATION_PASSWORD=replicator_password
```

## 📝 常用命令

### 連接數據庫

```bash
# Master (讀寫)
docker exec -it suggar-daddy-postgres-master psql -U postgres

# Replica (只讀)
docker exec -it suggar-daddy-postgres-replica psql -U postgres
```

### 檢查狀態

```bash
# 檢查複製狀態
docker exec suggar-daddy-postgres-master psql -U postgres -c "
  SELECT * FROM pg_stat_replication;
"

# 檢查複製延遲
docker exec suggar-daddy-postgres-replica psql -U postgres -c "
  SELECT now() - pg_last_xact_replay_timestamp() AS lag;
"

# 檢查節點角色
docker exec suggar-daddy-postgres-master psql -U postgres -t -c "
  SELECT pg_is_in_recovery();
"
# Master 應返回 'f'，Replica 應返回 't'
```

### 故障轉移

```bash
# 1. 提升 Replica 為 Master
docker exec suggar-daddy-postgres-replica psql -U postgres -c "SELECT pg_promote();"

# 2. 更新環境變數
export POSTGRES_MASTER_HOST=postgres-replica

# 3. 重啟應用
docker-compose restart api-gateway auth-service user-service
```

### 備份恢復

```bash
# 邏輯備份
docker exec suggar-daddy-postgres-master \
  pg_dump -U postgres -Fc suggar_daddy > backup.dump

# 恢復備份
docker exec -i suggar-daddy-postgres-master \
  pg_restore -U postgres -d suggar_daddy -c < backup.dump

# 物理備份
docker exec suggar-daddy-postgres-master \
  pg_basebackup -U postgres -D /backups/basebackup -Ft -z -P
```

## 🏥 監控指標

### 關鍵指標閾值

| 指標 | 正常值 | 警告 | 嚴重 |
|------|--------|------|------|
| 複製延遲 | < 1s | > 5s | > 30s |
| 連接數 | < 100 | > 150 | > 180 |
| CPU 使用率 | < 70% | > 80% | > 90% |
| 記憶體使用 | < 80% | > 85% | > 90% |
| 磁碟使用 | < 70% | > 80% | > 90% |

### 監控查詢

```sql
-- 複製延遲（秒）
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));

-- 複製延遲（字節）
SELECT pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn());

-- 活躍連接數
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- 數據庫大小
SELECT pg_size_pretty(pg_database_size('suggar_daddy'));

-- 慢查詢
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## 🔧 故障排查

### Replica 無法連接

```bash
# 檢查 Master 是否運行
docker ps | grep postgres-master

# 檢查網路連接
docker exec suggar-daddy-postgres-replica ping postgres-master

# 檢查複製用戶
docker exec suggar-daddy-postgres-master psql -U postgres -c "
  SELECT rolname, rolreplication FROM pg_roles WHERE rolname = 'replicator';
"

# 查看 Replica 日誌
docker-compose logs postgres-replica
```

### 複製延遲過高

```bash
# 檢查 Master 負載
docker exec suggar-daddy-postgres-master psql -U postgres -c "
  SELECT * FROM pg_stat_activity WHERE state = 'active';
"

# 檢查 Replica 資源
docker stats suggar-daddy-postgres-replica

# 檢查 WAL 堆積
docker exec suggar-daddy-postgres-master psql -U postgres -c "
  SELECT pg_size_pretty(pg_wal_size());
"
```

### 只讀副本接受寫入

```bash
# 確認 Replica 在恢復模式
docker exec suggar-daddy-postgres-replica psql -U postgres -t -c "
  SELECT pg_is_in_recovery();
"
# 應返回 't'

# 如果返回 'f'，需要重新配置為從節點
```

## 📚 更多資源

- 完整文檔: `docs/POSTGRESQL_HA.md`
- 實施報告: `docs/POSTGRESQL_HA_IMPLEMENTATION_REPORT.md`
- 驗證腳本: `./infrastructure/postgres/scripts/verify-ha.sh`
- 監控腳本: `./infrastructure/postgres/scripts/check-replication.sh`

## 🆘 緊急聯絡

**生產環境問題**：
1. 查看日誌: `docker-compose logs postgres-master postgres-replica`
2. 執行健康檢查: `./infrastructure/postgres/scripts/check-replication.sh`
3. 參考故障轉移流程: `docs/POSTGRESQL_HA.md#故障轉移`

**常見問題**: 參考 `docs/POSTGRESQL_HA.md#常見問題`
