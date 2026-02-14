# 🚀 階段 2 完成 - 快速開始指南

## ✅ 當前狀態

基礎設施已完全配置並運行中：
- ✅ PostgreSQL 15.15 (port 5432) - Healthy
- ✅ Redis 7.4.7 (port 6379) - Healthy
- ✅ Kafka 7.5.0 (ports 9092, 9094) - Healthy
- ✅ Zookeeper 7.5.0 (port 2181) - Running

## 📚 重要文件

### 1. 詳細文檔
- `infrastructure-health-report.md` - 完整健康檢查報告
- `INFRASTRUCTURE-DIAGRAM.md` - 架構圖和連線模式
- `STAGE2-COMPLETION-SUMMARY.md` - 執行總結和修復記錄

### 2. 快速參考
- `INFRASTRUCTURE-QUICKREF.md` - 常用命令和連線字串

### 3. 配置文件
- `.env` - 已更新的環境變數
- `docker-compose.yml` - Docker 服務配置
- `scripts/init-db.sql` - 資料庫初始化腳本

## 🔌 連線資訊

### 從本地應用連接（開發環境）
```bash
# PostgreSQL
postgresql://postgres:postgres@localhost:5432/suggar_daddy

# Redis
redis://localhost:6379

# Kafka
localhost:9094
```

### 從 Docker 容器連接
```bash
# PostgreSQL
postgresql://postgres:postgres@postgres:5432/suggar_daddy

# Redis
redis://redis:6379

# Kafka
kafka:9092
```

## 🧪 快速測試

```bash
# 檢查所有服務狀態
docker-compose ps

# PostgreSQL 測試
docker exec suggar-daddy-postgres pg_isready -U postgres

# Redis 測試
docker exec suggar-daddy-redis redis-cli ping

# Kafka 測試
docker exec suggar-daddy-kafka kafka-topics --list --bootstrap-server localhost:9092
```

## 🎯 下一步行動

### 1. 資料庫遷移
```bash
# 檢查是否有遷移檔案
ls -la libs/shared/data-access/src/migrations/ 2>/dev/null || echo "No migrations yet"

# 執行遷移（如果使用 TypeORM）
npm run migration:run

# 或使用 Prisma
npx prisma migrate deploy
```

### 2. 啟動應用服務
基礎設施已準備好，可以啟動應用服務：

```bash
# 核心服務
docker-compose up -d api-gateway auth-service user-service

# 付費相關服務
docker-compose up -d payment-service subscription-service

# 資料處理服務
docker-compose up -d db-writer-service

# 檢查服務狀態
docker-compose ps
```

### 3. 健康檢查
啟動服務後，驗證它們是否健康：

```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
```

## 📊 監控

### 查看資源使用
```bash
docker stats
```

### 查看服務日誌
```bash
# 所有基礎設施日誌
docker-compose logs -f postgres redis kafka zookeeper

# 最後 100 行
docker-compose logs --tail=100
```

## 🛠️ 常見操作

### 重啟服務
```bash
docker-compose restart postgres redis zookeeper kafka
```

### 停止服務（保留資料）
```bash
docker-compose stop postgres redis zookeeper kafka
```

### 清理並重新開始（⚠️ 會刪除資料）
```bash
docker-compose down -v
docker-compose up -d postgres redis zookeeper kafka
```

### 查看容器內部
```bash
# PostgreSQL
docker exec -it suggar-daddy-postgres psql -U postgres -d suggar_daddy

# Redis
docker exec -it suggar-daddy-redis redis-cli

# 查看 Kafka 主題
docker exec suggar-daddy-kafka kafka-topics --list --bootstrap-server localhost:9092
```

## ⚠️ 重要提醒

### 安全性
當前配置僅供開發使用，生產環境必須：
- ❌ 更改 PostgreSQL 密碼（目前: postgres）
- ❌ 為 Redis 添加密碼保護
- ❌ 配置 Kafka SSL/SASL
- ❌ 更換 JWT_SECRET
- ❌ 添加資源限制

### 資料持久化
- ✅ 資料存儲在 Docker volumes 中
- ✅ 重啟容器不會丟失資料
- ⚠️ `docker-compose down -v` 會刪除所有資料

## 🆘 故障排除

### 服務無法啟動
```bash
# 查看日誌
docker-compose logs [service-name]

# 重建容器
docker-compose up -d --build [service-name]
```

### 端口被佔用
```bash
# 檢查端口使用
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9092  # Kafka
```

### 容器無法停止
```bash
# 強制刪除
docker rm -f suggar-daddy-postgres
docker rm -f suggar-daddy-redis
docker rm -f suggar-daddy-kafka
docker rm -f suggar-daddy-zookeeper
```

## 📞 獲取幫助

- 查看 `infrastructure-health-report.md` 獲取詳細狀態
- 查看 `INFRASTRUCTURE-QUICKREF.md` 獲取命令參考
- 查看 `INFRASTRUCTURE-DIAGRAM.md` 理解架構

## ✅ 檢查清單

在進入下一階段前，確認：
- [ ] 所有容器狀態為 Healthy 或 Running
- [ ] PostgreSQL 可以連接
- [ ] Redis 可以連接
- [ ] Kafka 可以創建主題
- [ ] 查看過 infrastructure-health-report.md
- [ ] 理解連線字串的使用方式
- [ ] 知道如何查看日誌和監控資源

---

**基礎設施狀態:** 🟢 全系統正常運行  
**準備狀態:** ✅ 可以開始應用部署  
**文檔完整性:** ✅ 所有文檔已產出

**下一階段:** 資料庫遷移和應用服務部署
