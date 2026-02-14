> 本文件來源：docs/disaster-recovery.md

# 災難恢復計畫 (Disaster Recovery Plan)

## 目標

- **RTO (Recovery Time Objective)**: 4 小時
- **RPO (Recovery Point Objective)**: 1 小時
- **可用性目標**: 99.9%

---

## 備份策略

### 備份頻率

| 資料 | 頻率 | 保留 |
|------|------|------|
| PostgreSQL 完整備份 | 每天 | 7 天 |
| PostgreSQL 增量 (WAL) | 每小時 | 7 天 |
| Redis 快照 (RDB) | 每 6 小時 | 7 天 |
| 應用程式碼 | Git push | 永久 |
| 週備份 | 每週 | 4 週 |
| 月備份 | 每月 | 12 個月 |

### 自動備份

#### PostgreSQL

```bash
# 使用備份腳本
./scripts/backup-database.sh

# 手動完整備份
docker exec suggar-daddy-postgres pg_dump -U postgres -F c -f /backups/suggar_daddy_$(date +%Y%m%d).backup suggar_daddy

# 啟用 WAL 歸檔
docker exec suggar-daddy-postgres psql -U postgres -c "ALTER SYSTEM SET wal_level = 'replica';"
docker exec suggar-daddy-postgres psql -U postgres -c "ALTER SYSTEM SET archive_mode = 'on';"
```

#### Redis

```bash
# 立即觸發 RDB 快照
docker exec suggar-daddy-redis redis-cli BGSAVE

# 複製備份
docker cp suggar-daddy-redis:/data/dump.rdb ./backups/redis_$(date +%Y%m%d_%H%M%S).rdb
```

#### Docker Volumes

```bash
docker run --rm -v suggar-daddy_postgres_data:/source:ro -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz -C /source .
docker run --rm -v suggar-daddy_redis_data:/source:ro -v $(pwd)/backups:/backup alpine tar czf /backup/redis_volume_$(date +%Y%m%d).tar.gz -C /source .
docker run --rm -v suggar-daddy_kafka_data:/source:ro -v $(pwd)/backups:/backup alpine tar czf /backup/kafka_volume_$(date +%Y%m%d).tar.gz -C /source .
```

---

## 恢復程序

### 完整系統恢復

```bash
# 1. 克隆代碼庫 & 恢復配置
git clone <repository-url> suggar-daddy && cd suggar-daddy
cp .env.backup .env

# 2. 啟動基礎服務
docker-compose up -d postgres redis kafka zookeeper
sleep 30

# 3. 恢復 PostgreSQL
docker exec -i suggar-daddy-postgres psql -U postgres -c "DROP DATABASE IF EXISTS suggar_daddy;"
docker exec -i suggar-daddy-postgres psql -U postgres -c "CREATE DATABASE suggar_daddy;"
gunzip -c backups/latest/postgres/suggar_daddy_full_*.sql.gz | docker exec -i suggar-daddy-postgres psql -U postgres -d suggar_daddy

# 4. 恢復 Redis
docker-compose stop redis
gunzip -c backups/latest/redis/dump_*.rdb.gz > /tmp/dump.rdb
docker cp /tmp/dump.rdb suggar-daddy-redis:/data/dump.rdb
docker-compose start redis

# 5. 啟動應用服務 & 驗證
docker-compose up -d
./scripts/health-check.sh
```

### 驗證數據完整性

```bash
# PostgreSQL
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# Redis
docker exec suggar-daddy-redis redis-cli INFO keyspace

# Kafka
docker exec suggar-daddy-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

---

## 故障場景與應對

### PostgreSQL 故障（15-30 分鐘）

```bash
docker-compose restart postgres
# 若數據損壞：停機 → 刪 volume → 從備份恢復
```

### Redis 故障（5-10 分鐘）

```bash
docker-compose restart redis
# Redis 故障通常僅影響效能，不影響核心功能
```

### Kafka 故障（10-20 分鐘）

```bash
docker-compose restart zookeeper && sleep 10
docker-compose restart kafka
# 驗證 topics 和 consumer groups
```

### 整體系統故障（30 分鐘 - 2 小時）

```bash
sudo systemctl restart docker
docker-compose down && docker-compose up -d
./scripts/health-check.sh
```

### 數據損壞或誤刪除（1-4 小時）

部分恢復（推薦）：從備份恢復特定表後合併到生產資料庫。
完整恢復：按完整系統恢復程序執行。

### 磁碟空間不足（15-30 分鐘）

```bash
docker system prune -a --volumes
find ./backups -type f -mtime +30 -delete
```

---

## 測試計畫

- **每月**：完整備份 + 測試環境恢復 + 驗證
- **每季**：完整災難恢復演練 + 模擬故障場景

### 測試檢查清單

- [ ] 備份文件可讀取且完整性驗證通過
- [ ] 恢復程序執行成功
- [ ] 數據驗證通過
- [ ] 應用功能正常
- [ ] 效能符合預期

---

## 監控告警

```yaml
alerts:
  - name: backup_failed
    condition: backup_last_success > 24h
    severity: critical
  - name: database_down
    condition: postgres_up == 0
    severity: critical
  - name: disk_space_low
    condition: disk_usage > 85%
    severity: warning
```

---

## 聯絡方式

- **一級響應（0-15 分鐘）**: DevOps Lead, Backend Lead
- **二級響應（15-45 分鐘）**: CTO, Infrastructure Team
- **外部支援**: AWS Support, PostgreSQL Consulting
