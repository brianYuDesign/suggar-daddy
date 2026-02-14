# 基礎設施優化使用指南

## 快速開始

### 1. 應用優化配置

優化後的 `docker-compose.yml` 已經包含了所有改進。直接啟動服務：

```bash
# 啟動所有服務
docker-compose up -d

# 檢查服務狀態
docker-compose ps
```

### 2. 執行健康檢查

```bash
# 執行完整健康檢查
./scripts/health-check.sh

# 預期輸出：12 項檢查，應該有 11-12 項通過
```

### 3. 執行備份

```bash
# 手動執行備份
./scripts/backup-database.sh

# 檢查備份文件
ls -lh backups/
```

---

## 主要改進

### ✅ 資源管理
- 所有服務都有 CPU 和記憶體限制
- 日誌自動輪轉（最大 30MB/容器）
- 健康檢查自動重啟故障服務

### ✅ 效能優化
- PostgreSQL 參數調優
- Redis 記憶體管理和持久化
- Kafka 壓縮和效能配置

### ✅ 可靠性
- 自動備份腳本
- 災難恢復計畫
- 健康檢查機制

### ✅ 可觀測性
- 12 個資料庫監控視圖
- 健康檢查腳本
- 資源使用監控

---

## 檔案說明

### 配置文件

#### `docker-compose.yml` (已優化)
包含所有資源限制、日誌配置和健康檢查。

#### 環境配置
- `.env.development` - 開發環境配置
- `.env.staging` - 預發布環境配置
- `.env.production` - 生產環境配置

**使用方式**:
```bash
# 切換環境
cp .env.development .env    # 開發
cp .env.staging .env        # 預發布
cp .env.production .env     # 生產
```

### 腳本

#### `scripts/backup-database.sh`
自動備份 PostgreSQL 和 Redis 資料。

**功能**:
- PostgreSQL 完整備份
- Redis RDB 快照
- 自動壓縮
- 清理舊備份（保留 7 天）

**配置 cron**:
```bash
# 每天凌晨 2 點執行
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

#### `scripts/health-check.sh`
檢查所有服務的健康狀態。

**檢查項目**:
- 容器運行狀態
- 服務健康狀態
- 資料庫連接性
- Redis 連接性
- Kafka 連接性
- 磁碟空間
- 網路狀態

**配置 cron**:
```bash
# 每 5 分鐘執行
*/5 * * * * /path/to/scripts/health-check.sh
```

#### `scripts/db-monitoring.sql`
PostgreSQL 監控視圖。

**使用方式**:
```bash
# 安裝監控視圖
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -f /app/scripts/db-monitoring.sql

# 查看表大小
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_table_sizes LIMIT 10;"

# 查看慢查詢
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_slow_queries LIMIT 10;"

# 查看快取命中率
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_cache_hit_ratio;"
```

### 文檔

#### `docs/disaster-recovery.md`
完整的災難恢復計畫。

**內容**:
- 備份策略
- 恢復程序
- 故障場景與應對
- RTO/RPO 目標

#### `docs/operations-manual.md`
日常運維手冊。

**內容**:
- 日常維護清單
- 故障排除指南
- 部署流程
- 效能調優

---

## 常見任務

### 查看服務狀態

```bash
# 查看所有容器
docker-compose ps

# 查看資源使用
docker stats --no-stream

# 查看特定服務日誌
docker-compose logs -f api-gateway
```

### 重啟服務

```bash
# 重啟單個服務
docker-compose restart postgres

# 重啟所有服務
docker-compose restart

# 強制重建
docker-compose up -d --force-recreate
```

### 檢查效能

```bash
# PostgreSQL
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "
SELECT count(*) as connections FROM pg_stat_activity;
"

# Redis
docker exec suggar-daddy-redis redis-cli INFO stats

# Kafka
docker exec suggar-daddy-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### 執行備份與恢復

```bash
# 備份
./scripts/backup-database.sh

# 查看備份
ls -lh backups/$(date +%Y%m%d)/

# 恢復（參考 docs/disaster-recovery.md）
```

---

## 監控指標

### 關鍵指標

**系統**:
- CPU < 70%
- Memory < 80%
- Disk < 85%

**PostgreSQL**:
- 連接數 < 160 (80% of 200)
- 快取命中率 > 95%
- 查詢時間 P99 < 500ms

**Redis**:
- 命中率 > 95%
- 記憶體使用 < 400MB (80% of 512MB)
- 碎片率 < 1.5

**Kafka**:
- Consumer Lag < 1000
- 磁碟使用 < 80%

### 查看指標

```bash
# 執行健康檢查（包含所有關鍵指標）
./scripts/health-check.sh

# 查看詳細資源使用
docker stats

# 查看磁碟使用
df -h
docker system df -v
```

---

## 故障排除

### 服務無法啟動

```bash
# 查看日誌
docker-compose logs <service-name>

# 檢查配置
docker-compose config

# 重新創建
docker-compose up -d --force-recreate <service-name>
```

### 資料庫連接失敗

```bash
# 檢查連接
docker exec suggar-daddy-postgres pg_isready -U postgres

# 檢查連接數
docker exec suggar-daddy-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 重啟
docker-compose restart postgres
```

### 磁碟空間不足

```bash
# 清理 Docker
docker system prune -a --volumes -f

# 清理舊備份
find ./backups -type f -mtime +30 -delete

# 清理日誌
docker-compose logs --tail=0 > /dev/null
```

---

## 環境切換

### 開發環境

```bash
cp .env.development .env
docker-compose up -d
```

### 預發布環境

```bash
cp .env.staging .env
docker-compose up -d
```

### 生產環境

```bash
cp .env.production .env

# 確保所有敏感資訊已配置
./scripts/validate-env.sh

# 執行部署
docker-compose up -d
```

---

## 升級與維護

### 更新 Docker 映像

```bash
# 拉取最新映像
docker-compose pull

# 重建服務
docker-compose up -d --build
```

### 資料庫維護

```bash
# VACUUM
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "VACUUM ANALYZE;"

# 檢查需要 VACUUM 的表
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_vacuum_stats WHERE status != 'OK';"
```

### 清理資源

```bash
# 清理未使用的容器、映像、網路
docker system prune -f

# 清理所有（包含 volumes，危險！）
docker system prune -a --volumes -f
```

---

## 效能調優

### PostgreSQL

```bash
# 啟用 pg_stat_statements 擴展
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# 安裝監控視圖
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -f /app/scripts/db-monitoring.sql

# 查看慢查詢
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_slow_queries LIMIT 10;"

# 查看建議的索引
docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -c "SELECT * FROM v_missing_indexes WHERE priority LIKE '%CRITICAL%';"
```

### Redis

```bash
# 檢查記憶體
docker exec suggar-daddy-redis redis-cli INFO memory

# 找出大 key
docker exec suggar-daddy-redis redis-cli --bigkeys

# 檢查慢查詢
docker exec suggar-daddy-redis redis-cli SLOWLOG GET 10
```

### Kafka

```bash
# 檢查 consumer lag
docker exec suggar-daddy-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --all-groups

# 增加分區（高流量 topic）
docker exec suggar-daddy-kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --alter \
  --topic payment.completed \
  --partitions 12
```

---

## 擴展指南

### 垂直擴展（增加資源）

編輯 `docker-compose.yml`:

```yaml
postgres:
  deploy:
    resources:
      limits:
        cpus: '2.0'      # 增加
        memory: 2048M    # 增加
```

### 水平擴展（增加實例）

```bash
# 擴展應用服務
docker-compose up -d --scale api-gateway=3
docker-compose up -d --scale user-service=2
```

---

## 安全最佳實踐

1. **使用強密碼**
   - 生產環境使用 32+ 字元隨機密碼
   - 定期輪換（建議每 90 天）

2. **環境變數管理**
   - 不要提交 `.env` 到 Git
   - 使用密碼管理器（1Password, Vault）

3. **網路隔離**
   - 生產環境使用內部網路
   - 配置防火牆規則

4. **定期更新**
   - 每月更新 Docker 映像
   - 訂閱安全公告

5. **審計日誌**
   - 啟用資料庫審計
   - 定期審查日誌

---

## 獲取幫助

### 文檔
- [完整優化報告](./infrastructure-optimization-report.md)
- [運維手冊](./docs/operations-manual.md)
- [災難恢復計畫](./docs/disaster-recovery.md)

### 聯絡
- DevOps Team: devops@example.com
- On-call: +886-XXX-XXXX

---

## 附錄

### 資源配置總覽

| 服務 | CPU Limit | Memory Limit | Log Max Size |
|------|-----------|--------------|--------------|
| PostgreSQL | 1.0 | 1024M | 30M |
| Redis | 0.5 | 768M | 30M |
| Kafka | 1.0 | 1024M | 30M |
| Zookeeper | 0.5 | 512M | 30M |
| API Gateway | 0.5 | 512M | 30M |
| Auth Service | 0.5 | 512M | 30M |
| User Service | 0.5 | 512M | 30M |
| Payment Service | 0.5 | 512M | 30M |
| Subscription Service | 0.5 | 512M | 30M |
| DB Writer Service | 0.5 | 512M | 30M |

### 檢查清單

**部署前**:
- [ ] 環境變數已配置
- [ ] 密碼已更新
- [ ] 備份已執行
- [ ] 測試已通過

**部署後**:
- [ ] 健康檢查通過
- [ ] 日誌無錯誤
- [ ] 效能指標正常
- [ ] 備份正常運行

**每日**:
- [ ] 執行健康檢查
- [ ] 查看錯誤日誌
- [ ] 檢查資源使用
- [ ] 驗證備份

---

**最後更新**: 2024-01-15  
**版本**: 1.0
