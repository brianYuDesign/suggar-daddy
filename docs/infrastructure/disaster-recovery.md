# 災難恢復計畫 (Disaster Recovery Plan)

## 目錄
- [概述](#概述)
- [備份策略](#備份策略)
- [恢復程序](#恢復程序)
- [故障場景與應對](#故障場景與應對)
- [聯絡方式](#聯絡方式)

---

## 概述

### 目標
- **RTO (Recovery Time Objective)**: 4 小時
- **RPO (Recovery Point Objective)**: 1 小時
- **可用性目標**: 99.9% (每月最多 43.8 分鐘停機時間)

### 備份頻率
- **PostgreSQL**: 每天一次完整備份，每小時增量備份
- **Redis**: 每 6 小時一次快照
- **應用配置**: 版本控制 (Git)
- **基礎設施配置**: IaC (Terraform/Docker Compose)

### 備份保留政策
- **日備份**: 保留 7 天
- **週備份**: 保留 4 週
- **月備份**: 保留 12 個月
- **年備份**: 保留 3 年

---

## 備份策略

### 自動備份

#### 1. PostgreSQL 備份

**每日完整備份**
```bash
# 使用備份腳本
./scripts/backup-database.sh

# 或手動執行
docker exec suggar-daddy-postgres pg_dump \
  -U postgres \
  -F c \
  -f /backups/suggar_daddy_$(date +%Y%m%d).backup \
  suggar_daddy
```

**即時增量備份** (使用 WAL)
```bash
# 啟用 WAL 歸檔
docker exec suggar-daddy-postgres psql -U postgres -c \
  "ALTER SYSTEM SET wal_level = 'replica';"

# 設定歸檔命令
docker exec suggar-daddy-postgres psql -U postgres -c \
  "ALTER SYSTEM SET archive_mode = 'on';"
```

#### 2. Redis 備份

**RDB 快照**
```bash
# 立即觸發備份
docker exec suggar-daddy-redis redis-cli BGSAVE

# 複製備份文件
docker cp suggar-daddy-redis:/data/dump.rdb \
  ./backups/redis_$(date +%Y%m%d_%H%M%S).rdb
```

**AOF (Append-Only File) 持久化**
```bash
# 已在 docker-compose.yml 中啟用
# --appendonly yes
```

#### 3. 應用程式碼備份

```bash
# Git 遠端備份
git push origin --all
git push origin --tags

# 打包原始碼
tar -czf suggar-daddy-src-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  .
```

#### 4. Docker Volumes 備份

```bash
# 備份所有 volumes
docker run --rm \
  -v suggar-daddy_postgres_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz -C /source .

docker run --rm \
  -v suggar-daddy_redis_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis_volume_$(date +%Y%m%d).tar.gz -C /source .

docker run --rm \
  -v suggar-daddy_kafka_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/kafka_volume_$(date +%Y%m%d).tar.gz -C /source .
```

---

## 恢復程序

### 完整系統恢復

#### 準備工作
1. 確保 Docker 和 Docker Compose 已安裝
2. 確保網路連接正常
3. 準備好最新的備份文件

#### 恢復步驟

**1. 恢復基礎設施**

```bash
# 克隆代碼庫
git clone <repository-url> suggar-daddy
cd suggar-daddy

# 恢復配置
cp .env.backup .env

# 啟動基礎服務（不啟動應用）
docker-compose up -d postgres redis kafka zookeeper
```

**2. 恢復 PostgreSQL**

```bash
# 等待 PostgreSQL 啟動
sleep 30

# 恢復完整備份
docker exec -i suggar-daddy-postgres psql -U postgres -c "DROP DATABASE IF EXISTS suggar_daddy;"
docker exec -i suggar-daddy-postgres psql -U postgres -c "CREATE DATABASE suggar_daddy;"

# 方法 1: 從 SQL 備份恢復
gunzip -c backups/20240101/postgres/suggar_daddy_full_*.sql.gz | \
  docker exec -i suggar-daddy-postgres psql -U postgres -d suggar_daddy

# 方法 2: 從 pg_dump -F c 備份恢復
docker exec suggar-daddy-postgres pg_restore \
  -U postgres \
  -d suggar_daddy \
  -v \
  /backups/suggar_daddy_20240101.backup

# 驗證恢復
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "\dt"
```

**3. 恢復 Redis**

```bash
# 停止 Redis
docker-compose stop redis

# 恢復 RDB 文件
gunzip -c backups/20240101/redis/dump_*.rdb.gz > /tmp/dump.rdb
docker cp /tmp/dump.rdb suggar-daddy-redis:/data/dump.rdb

# 重啟 Redis
docker-compose start redis

# 驗證恢復
docker exec suggar-daddy-redis redis-cli DBSIZE
```

**4. 恢復 Kafka (如需要)**

```bash
# 停止 Kafka
docker-compose stop kafka

# 恢復 Kafka data volume
docker run --rm \
  -v suggar-daddy_kafka_data:/target \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/kafka_volume_20240101.tar.gz -C /target

# 重啟 Kafka
docker-compose start kafka
```

**5. 啟動應用服務**

```bash
# 啟動所有服務
docker-compose up -d

# 驗證服務狀態
./scripts/health-check.sh
```

**6. 驗證數據完整性**

```bash
# 檢查資料庫
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"

# 檢查 Redis
docker exec suggar-daddy-redis redis-cli INFO keyspace

# 檢查 Kafka topics
docker exec suggar-daddy-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

---

## 故障場景與應對

### 場景 1: PostgreSQL 容器故障

**症狀**
- 資料庫無法連接
- 應用服務顯示資料庫錯誤

**恢復步驟**
```bash
# 1. 重啟容器
docker-compose restart postgres

# 2. 如果無法啟動，檢查日誌
docker logs suggar-daddy-postgres

# 3. 如果數據損壞，從備份恢復
docker-compose stop postgres
docker volume rm suggar-daddy_postgres_data
docker volume create suggar-daddy_postgres_data
# 按照「恢復 PostgreSQL」程序執行
```

**預估時間**: 15-30 分鐘

---

### 場景 2: Redis 容器故障

**症狀**
- 快取功能失效
- API 響應變慢
- 會話數據丟失

**恢復步驟**
```bash
# 1. 重啟容器
docker-compose restart redis

# 2. 檢查持久化文件
docker exec suggar-daddy-redis ls -lh /data/

# 3. 如需從備份恢復
docker-compose stop redis
# 按照「恢復 Redis」程序執行
```

**預估時間**: 5-10 分鐘

**注意**: Redis 故障通常不影響核心功能，只影響效能

---

### 場景 3: Kafka 故障

**症狀**
- 事件無法發送
- 非同步任務停止
- 消費者 lag 增加

**恢復步驟**
```bash
# 1. 檢查 Zookeeper
docker-compose restart zookeeper
sleep 10

# 2. 重啟 Kafka
docker-compose restart kafka

# 3. 檢查 topics
docker exec suggar-daddy-kafka kafka-topics --bootstrap-server localhost:9092 --list

# 4. 重置消費者群組 (如需要)
docker exec suggar-daddy-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group db-writer-group \
  --reset-offsets \
  --to-latest \
  --execute \
  --all-topics
```

**預估時間**: 10-20 分鐘

---

### 場景 4: 整體系統故障 (完全停機)

**症狀**
- 所有服務無法訪問
- Docker daemon 故障
- 主機系統問題

**恢復步驟**
```bash
# 1. 重啟 Docker 服務
sudo systemctl restart docker

# 2. 檢查所有容器
docker ps -a

# 3. 重啟所有服務
cd /path/to/suggar-daddy
docker-compose down
docker-compose up -d

# 4. 如果需要完整恢復
# 按照「完整系統恢復」程序執行
```

**預估時間**: 30 分鐘 - 2 小時

---

### 場景 5: 數據損壞或誤刪除

**症狀**
- 數據不一致
- 重要數據缺失
- 應用邏輯錯誤導致數據污染

**恢復步驟**

**選項 A: 部分恢復 (推薦)**
```bash
# 1. 導出受影響的表
docker exec suggar-daddy-postgres pg_dump \
  -U postgres \
  -d suggar_daddy \
  -t affected_table \
  > /tmp/before_restore.sql

# 2. 從備份恢復特定表
gunzip -c backups/latest/postgres/suggar_daddy_full_*.sql.gz | \
  docker exec -i suggar-daddy-postgres psql -U postgres -d temp_restore_db

# 3. 將數據複製到生產資料庫
docker exec suggar-daddy-postgres psql -U postgres -c "
INSERT INTO suggar_daddy.affected_table 
SELECT * FROM temp_restore_db.affected_table 
WHERE id NOT IN (SELECT id FROM suggar_daddy.affected_table);
"
```

**選項 B: 完整恢復 (影響範圍大)**
```bash
# 按照「恢復 PostgreSQL」完整程序執行
```

**預估時間**: 1-4 小時

---

### 場景 6: 磁碟空間不足

**症狀**
- 容器無法寫入
- 備份失敗
- 資料庫操作失敗

**恢復步驟**
```bash
# 1. 檢查磁碟使用
df -h
docker system df -v

# 2. 清理 Docker 資源
docker system prune -a --volumes

# 3. 清理舊備份
find ./backups -type f -mtime +30 -delete

# 4. 清理應用日誌
docker-compose logs --tail=0 -f > /dev/null

# 5. 如果仍不足，擴展磁碟
# (依據雲端提供商操作)
```

**預估時間**: 15-30 分鐘

---

## 測試計畫

### 定期測試

**每月測試** (第一個週六)
- 執行完整備份
- 在測試環境恢復
- 驗證數據完整性

**每季測試** (每季最後一個月)
- 完整災難恢復演練
- 模擬不同故障場景
- 更新恢復文檔

**測試檢查清單**
- [ ] 備份文件可讀取
- [ ] 備份文件完整性驗證 (checksum)
- [ ] 恢復程序執行成功
- [ ] 數據驗證通過
- [ ] 應用功能正常
- [ ] 效能符合預期
- [ ] 文檔更新

---

## 監控與告警

### 關鍵指標

**備份狀態**
- 最後成功備份時間
- 備份文件大小
- 備份失敗次數

**系統健康**
- 容器運行狀態
- 資源使用率
- 磁碟空間

**應用狀態**
- API 響應時間
- 錯誤率
- 請求量

### 告警規則

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
    
  - name: high_error_rate
    condition: error_rate > 5%
    severity: warning
```

---

## 聯絡方式

### 緊急聯絡人

**一級響應** (立即處理)
- DevOps Lead: +886-XXX-XXXX
- Backend Lead: +886-XXX-XXXX
- 24/7 On-call: oncall@example.com

**二級響應** (30分鐘內)
- CTO: cto@example.com
- Infrastructure Team: infra@example.com

**升級路徑**
1. 一級響應 (0-15 分鐘)
2. 二級響應 (15-45 分鐘)
3. 管理層 (45+ 分鐘)

### 外部支援

**雲端服務商**
- AWS Support: Premium Support Plan
- Contact: support.aws.com

**資料庫專家**
- PostgreSQL Consulting: dba@example.com
- 24/7 Emergency: +886-XXX-XXXX

---

## 文檔版本

| 版本 | 日期 | 作者 | 變更說明 |
|------|------|------|----------|
| 1.0 | 2024-01-01 | DevOps Team | 初始版本 |

---

## 附錄

### A. 備份腳本位置
- 自動備份: `./scripts/backup-database.sh`
- 健康檢查: `./scripts/health-check.sh`

### B. 重要文件位置
- Docker Compose: `./docker-compose.yml`
- 環境變數: `./.env`
- 備份目錄: `./backups/`

### C. 相關文檔
- [運維手冊](./operations-manual.md)
- [基礎設施優化報告](./infrastructure-optimization-report.md)
- [監控指南](./monitoring-guide.md)
