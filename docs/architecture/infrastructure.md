> 本文件由以下文件合併而來：INFRASTRUCTURE-OPTIMIZATION-GUIDE.md, INFRASTRUCTURE-OPTIMIZATION-INDEX.md, INFRASTRUCTURE-OPTIMIZATION-SUMMARY.md, INFRASTRUCTURE-DIAGRAM.md, INFRASTRUCTURE-QUICKREF.md, infrastructure-health-report.md

# 基礎設施與優化指南

## 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                     HOST MACHINE (macOS)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         Docker Network: suggar-daddy-network               │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │  PostgreSQL  │  │    Redis     │  │  Zookeeper   │    │ │
│  │  │   :5432      │  │    :6379     │  │    :2181     │    │ │
│  │  └──────────────┘  └──────────────┘  └───────┬──────┘    │ │
│  │                                               │            │ │
│  │  ┌──────────────────────────────────────────┼──────────┐ │ │
│  │  │              Apache Kafka                 │          │ │ │
│  │  │          :9092 (internal) / :9094 (external)         │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Application Layer:                                               │
│  API Gateway :3000 │ Auth :3002 │ User :3001 │ Matching :3003   │
│  Payment :3007 │ Subscription :3009 │ DB Writer :3010            │
└───────────────────────────────────────────────────────────────────┘
```

### 服務依賴

```
Zookeeper :2181 ──► Kafka :9092/:9094
PostgreSQL :5432    Redis :6379
```

### 資料持久化（Docker Volumes）

- `postgres_data` — PostgreSQL 資料
- `redis_data` — Redis 持久化
- `kafka_data` — Kafka 日誌與資料
- `zookeeper_data` / `zookeeper_logs` — Zookeeper

---

## 連線字串

### 本機開發（Host → Container）

```
PostgreSQL: postgresql://postgres:postgres@localhost:5432/suggar_daddy
Redis:      redis://localhost:6379
Kafka:      localhost:9094
Zookeeper:  localhost:2181
```

### Docker 容器內（Container → Container）

```
PostgreSQL: postgresql://postgres:postgres@postgres:5432/suggar_daddy
Redis:      redis://redis:6379
Kafka:      kafka:9092
Zookeeper:  zookeeper:2181
```

---

## 快速開始

```bash
# 啟動基礎設施
docker-compose up -d

# 檢查服務狀態
docker-compose ps

# 健康檢查
./scripts/health-check.sh

# 執行備份
./scripts/backup-database.sh
```

---

## 優化項目總覽

### 1. Docker 資源優化

- 所有服務設定 CPU 和記憶體限制
- 日誌輪轉（每容器最大 30MB）
- 增強健康檢查機制

### 2. PostgreSQL 優化

- 效能參數調優（shared_buffers, work_mem 等）
- 12 個監控視圖（`scripts/db-monitoring.sql`）
- 慢查詢日誌（>200ms）
- SSD 優化配置

### 3. Redis 優化

- 記憶體限制（512MB）
- LRU 淘汰策略
- RDB + AOF 持久化
- TCP 連接優化

### 4. Kafka 優化

- I/O 和網路線程調整
- lz4 壓縮
- 7 天保留策略
- 緩衝區大小優化

### 5. 備份與恢復

- `scripts/backup-database.sh` — 自動備份（PostgreSQL + Redis）
- 7 天保留策略，自動壓縮
- Cron: `0 2 * * * /path/to/scripts/backup-database.sh`

### 6. 監控

- `scripts/health-check.sh` — 12 項檢查（容器、DB、Redis、Kafka、磁碟）
- `scripts/db-monitoring.sql` — 表大小、慢查詢、快取命中率等視圖
- Cron: `*/5 * * * * /path/to/scripts/health-check.sh`

---

## 資源配置總覽

| 服務 | CPU Limit | Memory Limit | Log Max Size |
|------|-----------|--------------|--------------|
| PostgreSQL | 1.0 | 1024M | 30M |
| Redis | 0.5 | 768M | 30M |
| Kafka | 1.0 | 1024M | 30M |
| Zookeeper | 0.5 | 512M | 30M |
| 應用服務（各） | 0.5 | 512M | 30M |

---

## 關鍵監控指標

| 類別 | 指標 | 目標 |
|------|------|------|
| 系統 | CPU | < 70% |
| 系統 | Memory | < 80% |
| 系統 | Disk | < 85% |
| PostgreSQL | 連接數 | < 160 (80% of 200) |
| PostgreSQL | 快取命中率 | > 95% |
| PostgreSQL | 查詢 P99 | < 500ms |
| Redis | 命中率 | > 95% |
| Redis | 記憶體 | < 400MB |
| Redis | 碎片率 | < 1.5 |
| Kafka | Consumer Lag | < 1000 |

---

## 環境管理

```bash
# 切換環境
cp .env.development .env    # 開發
cp .env.staging .env        # 預發布
cp .env.production .env     # 生產
```

---

## 常用運維命令

### 健康檢查

```bash
docker exec suggar-daddy-postgres pg_isready -U postgres
docker exec suggar-daddy-redis redis-cli ping
docker exec suggar-daddy-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### PostgreSQL 管理

```bash
docker exec -it suggar-daddy-postgres psql -U postgres -d suggar_daddy
docker exec suggar-daddy-postgres pg_dump -U postgres suggar_daddy > backup.sql
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "VACUUM ANALYZE;"
```

### Redis 管理

```bash
docker exec -it suggar-daddy-redis redis-cli
docker exec suggar-daddy-redis redis-cli INFO memory
docker exec suggar-daddy-redis redis-cli --bigkeys
docker exec suggar-daddy-redis redis-cli SLOWLOG GET 10
```

### Kafka 管理

```bash
docker exec suggar-daddy-kafka kafka-topics --list --bootstrap-server localhost:9092
docker exec suggar-daddy-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --describe --all-groups
```

---

## 效能調優

### PostgreSQL

```bash
# 安裝監控視圖
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -f /app/scripts/db-monitoring.sql

# 查看慢查詢
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_slow_queries LIMIT 10;"
```

---

## 故障排除

### 服務無法啟動

```bash
docker-compose logs <service-name>
docker-compose config
docker-compose up -d --force-recreate <service-name>
```

### Port 佔用

```bash
lsof -i :5432   # PostgreSQL
lsof -i :6379   # Redis
lsof -i :9092   # Kafka
```

### 磁碟空間不足

```bash
docker system prune -a --volumes -f
find ./backups -type f -mtime +30 -delete
```

---

## 擴展指南

### 垂直擴展

編輯 `docker-compose.yml` 調整 `deploy.resources.limits`。

### 水平擴展

```bash
docker-compose up -d --scale api-gateway=3
docker-compose up -d --scale user-service=2
```

---

## 安全最佳實踐

1. 生產環境使用 32+ 字元隨機密碼，定期輪換
2. 不要提交 `.env` 到 Git，使用密碼管理器
3. 生產環境使用內部網路 + 防火牆規則
4. 每月更新 Docker 映像，訂閱安全公告
5. 啟用資料庫審計，定期審查日誌

---

## 安全現況（開發環境）

| Component | Authentication | Encryption | Production Ready |
|-----------|---------------|------------|------------------|
| PostgreSQL | Default pw | No SSL | No |
| Redis | None | No SSL | No |
| Kafka | None | Plain | No |
| Zookeeper | None | Plain | No |

**生產環境需要**：更改密碼、啟用 SSL/TLS、配置認證、設定資源限制、使用 Secrets 管理。

---

## 效能基準與容量

| 指標 | 目標 |
|------|------|
| API Gateway P95 | < 200ms |
| 資料庫查詢 P99 | < 500ms |
| Redis 操作 | < 10ms |
| SLA | 99.9% |
| RTO | 4 小時 |
| RPO | 1 小時 |
| 當前容量 | 100-500 併發 |
| 擴展後容量 | 1000-5000 併發 |

---

## 下一步計劃

### 短期（1-3 個月）
- Prometheus + Grafana 監控
- CI/CD pipeline
- 負載測試
- 告警系統

### 中期（3-6 個月）
- PostgreSQL 讀寫分離
- Redis Cluster
- 日誌聚合（ELK/Loki）
- APM 整合

### 長期（6-12 個月）
- Kubernetes 遷移
- 多區域部署
- 服務網格（Istio）
- 混沌工程

---

## 成本估算

| 環境 | 月成本 | 配置 |
|------|--------|------|
| 開發 | $50-100 | 4 cores, 8GB RAM, 50GB disk |
| 預發布 | $150-250 | 6 cores, 16GB RAM, 100GB disk |
| 生產 | $500-1000 | 8 cores, 32GB RAM, 500GB disk |
