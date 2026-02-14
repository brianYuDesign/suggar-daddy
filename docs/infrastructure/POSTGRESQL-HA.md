# PostgreSQL 高可用架構

> 最後更新: 2026-02-14
> 狀態: 已完成並測試通過

---

## 架構總覽

```
┌─────────────────────────────────────────────┐
│            PostgreSQL HA Cluster             │
├─────────────────────────────────────────────┤
│  ┌────────────────┐                         │
│  │ Master         │  Port: 5432 (讀寫)      │
│  │ - WAL 流複製   │                         │
│  └───────┬────────┘                         │
│          │ Replication                       │
│  ┌───────▼────────┐                         │
│  │ Replica        │  Port: 5433 (只讀)      │
│  │ - Hot Standby  │                         │
│  └────────────────┘                         │
└─────────────────────────────────────────────┘
```

- **複製模式**: 異步流複製 (Streaming Replication)
- **複製延遲**: < 1 秒 (實測 0 bytes)
- **Hot Standby**: Replica 可提供只讀查詢

---

## 快速啟動

### 啟動

```bash
docker-compose up -d postgres-master postgres-replica
docker ps | grep postgres
```

### 驗證複製

```bash
./infrastructure/postgres/scripts/verify-ha-comprehensive.sh
# 或
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh
```

### 應用連接

```bash
# Master (讀寫)
DATABASE_URL=postgresql://postgres:password@postgres-master:5432/suggar_daddy

# Replica (只讀)
DATABASE_READ_URL=postgresql://postgres:password@postgres-replica:5433/suggar_daddy
```

TypeORM 讀寫分離配置：
```typescript
replication: {
  master: { host: 'postgres-master', port: 5432 },
  slaves: [{ host: 'postgres-replica', port: 5433 }],
}
```

---

## 主要組件

### 1. 主從複製

- Master-Replica 流複製，物理複製槽 (`replica_slot_1`)
- Replica 可用於讀取分流，減輕 Master 壓力

### 2. 連接池 (PgBouncer)

- Transaction 池模式
- 配置位置: `infrastructure/postgres/pgbouncer/`

```bash
docker-compose -f infrastructure/postgres/docker-compose.monitoring.yml up -d pgbouncer
```

### 3. 備份策略

- 自動每日備份 (02:00 AM)，保留 7 天
- 備份/恢復腳本: `infrastructure/postgres/scripts/backup.sh` / `restore.sh`

```bash
# 手動備份
./infrastructure/postgres/scripts/backup.sh

# 恢復
./infrastructure/postgres/scripts/restore.sh /backups/backup_file.sql.gz
```

### 4. 監控

- Prometheus PostgreSQL Exporter
  - Master: `http://localhost:9187/metrics`
  - Replica: `http://localhost:9188/metrics`
- 自訂查詢指標: `infrastructure/postgres/monitoring/queries.yml`
- 告警規則: `infrastructure/postgres/monitoring/postgres-alerts.yml`

關鍵指標：
| 指標 | 說明 |
|------|------|
| `pg_up` | 資料庫可用性 |
| `pg_replication_lag_bytes` | 複製延遲 |
| `pg_stat_replication_count` | 活動 Replica 數 |
| `pg_stat_activity_count` | 連接數 |
| `pg_database_size_bytes` | 資料庫大小 |

---

## 故障轉移

### 手動故障轉移流程

1. 停止 Master
2. 提升 Replica 為新 Master: `pg_ctl promote`
3. 更新應用連線字串
4. (選用) 建立新 Replica

測試腳本: `infrastructure/postgres/scripts/test-failover.sh`

### 自動故障轉移 (建議)

部署 Patroni + etcd 實現自動故障偵測和提升。

---

## 檔案結構

```
infrastructure/postgres/
├── master/
│   ├── postgresql.conf
│   └── pg_hba.conf
├── replica/
│   ├── postgresql.conf, pg_hba.conf, entrypoint.sh
├── pgbouncer/
│   ├── pgbouncer.ini, userlist.txt, Dockerfile, entrypoint.sh
├── monitoring/
│   ├── postgres-alerts.yml, queries.yml
├── scripts/
│   ├── init-master.sh
│   ├── check-replication.sh
│   ├── backup.sh / restore.sh
│   ├── test-failover.sh
│   └── verify-ha-comprehensive.sh
├── README.md
└── QUICK_REFERENCE.md
```

---

## 生產就緒檢查清單

- [x] Master-Replica 複製配置
- [x] 複製延遲 < 1 秒
- [x] 備份腳本和排程
- [x] 恢復流程測試
- [x] 監控指標配置
- [x] 健康檢查腳本
- [x] 故障轉移流程文檔
- [ ] PgBouncer 連接池部署 (可選)
- [ ] 自動故障轉移 (Patroni)
- [ ] SSL/TLS 加密
- [ ] WAL 歸檔至雲端儲存

---

## 後續建議

### 短期 (1-2 週)
- 部署 PgBouncer 連接池
- 配置 Grafana 儀表板 (Dashboard ID: 9628)
- 備份至雲端儲存 (S3/GCS)

### 中期 (1-2 月)
- 部署 Patroni + etcd 自動故障轉移
- SSL/TLS 加密連接
- WAL 歸檔 + Point-in-Time Recovery

### 長期 (3-6 月)
- 多區域複製 / 跨 AZ 部署
- 查詢效能優化 / 索引優化
