# 運維手冊 (Operations Manual)

## 目錄
1. [日常維護](#日常維護)
2. [監控與告警](#監控與告警)
3. [故障排除](#故障排除)
4. [部署流程](#部署流程)
5. [效能調優](#效能調優)
6. [安全維護](#安全維護)
7. [擴展指南](#擴展指南)

---

## 日常維護

### 每日檢查清單

#### 1. 服務健康檢查
```bash
# 執行完整健康檢查
cd /path/to/suggar-daddy
./scripts/health-check.sh

# 檢查所有容器狀態
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 檢查容器資源使用
docker stats --no-stream
```

#### 2. 日誌檢查
```bash
# 檢查錯誤日誌
docker-compose logs --tail=100 | grep -i error

# 檢查最近 1 小時的日誌
docker-compose logs --since 1h

# 檢查特定服務日誌
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
```

#### 3. 備份驗證
```bash
# 檢查最近備份
ls -lht backups/ | head -5

# 驗證備份完整性
./scripts/backup-database.sh

# 檢查備份大小
du -sh backups/*
```

### 每週維護任務

#### 1. 資料庫維護
```bash
# 資料庫優化
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "VACUUM ANALYZE;"

# 檢查資料庫統計
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -f scripts/db-monitoring.sql
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_table_sizes LIMIT 10;"
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_vacuum_stats WHERE status != 'OK';"
```

#### 2. 清理作業
```bash
# 清理未使用的 Docker 資源
docker system prune -f

# 清理舊日誌（保留最近 7 天）
find /var/lib/docker/containers -name "*.log" -mtime +7 -delete

# 清理舊備份（已在備份腳本中自動處理）
```

#### 3. 效能審查
```bash
# 檢查慢查詢
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_slow_queries LIMIT 10;"

# 檢查 Redis 效能
docker exec suggar-daddy-redis redis-cli INFO stats

# 檢查 Kafka lag
docker exec suggar-daddy-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --describe --all-groups
```

### 每月維護任務

#### 1. 安全更新
```bash
# 更新 Docker 映像
docker-compose pull

# 重建映像（如有程式碼更新）
docker-compose build --no-cache

# 滾動重啟服務
docker-compose up -d --force-recreate
```

#### 2. 容量規劃
```bash
# 檢查磁碟使用趨勢
df -h
docker system df -v

# 檢查資料庫增長
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_database_size;"

# 預測未來需求
# (基於當前增長率)
```

#### 3. 備份測試
```bash
# 在測試環境恢復備份
# 參考 docs/disaster-recovery.md
```

---

## 監控與告警

### 關鍵指標

#### 1. 系統指標
- **CPU 使用率**: < 70%
- **記憶體使用率**: < 80%
- **磁碟使用率**: < 85%
- **網路延遲**: < 100ms

#### 2. 資料庫指標
- **連接數**: < 80% max_connections
- **快取命中率**: > 95%
- **查詢時間**: P99 < 500ms
- **死鎖**: 0

#### 3. 應用指標
- **API 響應時間**: P95 < 200ms
- **錯誤率**: < 1%
- **請求量**: 監控趨勢
- **活躍用戶**: 監控趨勢

### 監控命令

```bash
# 即時監控容器資源
watch -n 5 'docker stats --no-stream'

# 監控 PostgreSQL
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "
SELECT count(*) as connections FROM pg_stat_activity;
"

# 監控 Redis
docker exec suggar-daddy-redis redis-cli INFO | grep -E "used_memory|connected_clients|ops_per_sec"

# 監控 Kafka
docker exec suggar-daddy-kafka kafka-topics --bootstrap-server localhost:9092 --describe
```

---

## 故障排除

### 常見問題與解決方案

#### 問題 1: 容器無法啟動

**診斷**
```bash
# 檢查容器日誌
docker logs suggar-daddy-postgres

# 檢查容器退出碼
docker inspect suggar-daddy-postgres | grep ExitCode

# 檢查端口衝突
netstat -tulpn | grep 5432
```

**解決方案**
```bash
# 重啟容器
docker-compose restart postgres

# 或重新創建
docker-compose up -d --force-recreate postgres
```

---

#### 問題 2: 資料庫連接失敗

**診斷**
```bash
# 測試連接
docker exec suggar-daddy-postgres pg_isready -U postgres

# 檢查連接數
docker exec suggar-daddy-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 檢查 max_connections
docker exec suggar-daddy-postgres psql -U postgres -c "SHOW max_connections;"
```

**解決方案**
```bash
# 如果連接數過多，終止空閒連接
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < now() - interval '1 hour';
"

# 增加 max_connections（在 docker-compose.yml 中）
# 重啟服務
docker-compose restart postgres
```

---

#### 問題 3: Redis 記憶體不足

**診斷**
```bash
# 檢查記憶體使用
docker exec suggar-daddy-redis redis-cli INFO memory

# 檢查 key 數量
docker exec suggar-daddy-redis redis-cli DBSIZE

# 找出大 key
docker exec suggar-daddy-redis redis-cli --bigkeys
```

**解決方案**
```bash
# 清理過期 key
docker exec suggar-daddy-redis redis-cli --scan --pattern "*:expired:*" | xargs docker exec -i suggar-daddy-redis redis-cli DEL

# 調整 maxmemory（在 docker-compose.yml 中）
# 重啟 Redis
docker-compose restart redis
```

---

#### 問題 4: Kafka 消費者 Lag 過高

**診斷**
```bash
# 檢查 lag
docker exec suggar-daddy-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group db-writer-group

# 檢查 topic 詳情
docker exec suggar-daddy-kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic user.created
```

**解決方案**
```bash
# 增加消費者實例
docker-compose up -d --scale db-writer-service=3

# 或增加 topic 分區數
docker exec suggar-daddy-kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --alter \
  --topic user.created \
  --partitions 6
```

---

#### 問題 5: 磁碟空間不足

**診斷**
```bash
# 檢查磁碟使用
df -h
docker system df -v

# 找出大文件
du -sh /* | sort -h
```

**解決方案**
```bash
# 清理 Docker
docker system prune -a --volumes -f

# 清理日誌
truncate -s 0 $(docker inspect --format='{{.LogPath}}' $(docker ps -qa))

# 清理舊備份
find ./backups -type f -mtime +30 -delete
```

---

## 部署流程

### 標準部署流程

#### 1. 準備階段
```bash
# 拉取最新程式碼
git pull origin main

# 檢查變更
git log --oneline -5

# 備份當前環境
./scripts/backup-database.sh
```

#### 2. 建構階段
```bash
# 建構 Docker 映像
docker-compose build

# 或使用 Nx 建構
npm run build
```

#### 3. 測試階段
```bash
# 執行測試
npm run test

# 檢查 lint
npm run lint

# 檢查類型
npm run type-check
```

#### 4. 部署階段
```bash
# 滾動更新（零停機）
docker-compose up -d --no-deps --build api-gateway
docker-compose up -d --no-deps --build auth-service
docker-compose up -d --no-deps --build user-service

# 或全部重啟
docker-compose up -d --force-recreate
```

#### 5. 驗證階段
```bash
# 健康檢查
./scripts/health-check.sh

# 檢查日誌
docker-compose logs -f --tail=50

# 手動測試 API
curl http://localhost:3000/health
```

#### 6. 回滾程序（如需要）
```bash
# 停止服務
docker-compose down

# 恢復前一版本
git checkout <previous-commit>
docker-compose build
docker-compose up -d

# 或恢復備份
# 參考 docs/disaster-recovery.md
```

### 藍綠部署（推薦生產環境）

```bash
# 1. 準備綠環境
docker-compose -f docker-compose.green.yml up -d

# 2. 測試綠環境
curl http://localhost:3001/health

# 3. 切換流量（在負載均衡器）
# 更新 Nginx/ALB 配置指向綠環境

# 4. 監控一段時間

# 5. 關閉藍環境
docker-compose -f docker-compose.blue.yml down
```

---

## 效能調優

### PostgreSQL 調優

#### 1. 查詢優化
```sql
-- 啟用 pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 找出慢查詢
SELECT * FROM v_slow_queries LIMIT 10;

-- 分析查詢計畫
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- 創建索引
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

#### 2. 連接池優化
```bash
# 在應用層使用連接池（已配置 TypeORM）
# 調整 pool size
MAX_CONNECTIONS=200  # 在 .env
```

#### 3. 定期維護
```sql
-- 自動 VACUUM（已啟用）
-- 手動強制 VACUUM
VACUUM FULL ANALYZE;

-- 更新統計資訊
ANALYZE;

-- 重建索引
REINDEX DATABASE suggar_daddy;
```

### Redis 調優

```bash
# 啟用 RDB + AOF 持久化（已配置）
# 調整記憶體限制
# --maxmemory 512mb --maxmemory-policy allkeys-lru

# 監控碎片率
docker exec suggar-daddy-redis redis-cli INFO memory | grep fragmentation

# 如果碎片率 > 1.5，考慮重啟
```

### Kafka 調優

```bash
# 調整分區數（高流量 topic）
docker exec suggar-daddy-kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --alter --topic payment.completed \
  --partitions 12

# 調整保留時間
# 在 docker-compose.yml:
# KAFKA_LOG_RETENTION_HOURS: 168

# 增加消費者實例
docker-compose up -d --scale db-writer-service=3
```

---

## 安全維護

### 1. 密碼管理
```bash
# 定期更新密碼（每 90 天）
# 使用密碼管理器（如 1Password, Vault）

# 更新資料庫密碼
docker exec suggar-daddy-postgres psql -U postgres -c "
ALTER USER postgres WITH PASSWORD 'new_secure_password';
"
# 同步更新 .env
```

### 2. SSL/TLS 配置
```bash
# 檢查證書有效期
openssl x509 -in /etc/ssl/certs/server.crt -noout -dates

# 更新證書（Let's Encrypt）
certbot renew

# 配置 PostgreSQL SSL
# 在 docker-compose.yml 添加 SSL 配置
```

### 3. 日誌審計
```bash
# 啟用審計日誌
# PostgreSQL: log_statement = 'all'
# 定期審查敏感操作
grep "DROP\|DELETE\|TRUNCATE" postgres_logs.log
```

### 4. 訪問控制
```bash
# 定期審查用戶權限
docker exec suggar-daddy-postgres psql -U postgres -c "\du"

# 撤銷不必要的權限
REVOKE ALL ON DATABASE suggar_daddy FROM public;
```

---

## 擴展指南

### 垂直擴展（單機升級）

```yaml
# docker-compose.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'      # 增加 CPU
          memory: 2048M    # 增加記憶體
```

### 水平擴展（多實例）

```bash
# 擴展應用服務
docker-compose up -d --scale api-gateway=3
docker-compose up -d --scale user-service=2

# 需要配置負載均衡器（Nginx/HAProxy/ALB）
```

### 資料庫擴展

#### 1. 讀寫分離
```yaml
# 添加 PostgreSQL 從庫
postgres-replica:
  image: postgres:15-alpine
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_HOST: postgres
```

#### 2. 分片（Sharding）
- 依據用戶 ID 分片
- 使用 Citus 或 Vitess

#### 3. 快取層優化
- Redis Cluster
- 添加 CDN

---

## 附錄

### A. 常用命令速查

```bash
# 服務管理
docker-compose up -d              # 啟動所有服務
docker-compose down               # 停止所有服務
docker-compose restart <service>  # 重啟特定服務
docker-compose logs -f <service>  # 查看日誌

# 健康檢查
./scripts/health-check.sh

# 備份
./scripts/backup-database.sh

# 資料庫
docker exec -it suggar-daddy-postgres psql -U postgres -d suggar_daddy

# Redis
docker exec -it suggar-daddy-redis redis-cli

# Kafka
docker exec -it suggar-daddy-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### B. 緊急聯絡

- DevOps Lead: oncall@example.com
- 24/7 Hotline: +886-XXX-XXXX

### C. 相關文檔

- [災難恢復計畫](./disaster-recovery.md)
- [基礎設施優化報告](../infrastructure-optimization-report.md)
- [API 文檔](../api-documentation-report.md)
