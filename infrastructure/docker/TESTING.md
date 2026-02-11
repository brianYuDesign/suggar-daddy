# 🧪 Docker 本地測試指南

## 📊 目前狀態

✅ Docker 環境已設定
✅ .env 檔案已建立
✅ Docker Compose 配置檢查通過
⏳ 正在下載映像（PostgreSQL, Redis, Kafka）

---

## 🚀 測試步驟

### 第一階段：基礎設施測試（進行中）

```bash
cd /Users/brianyu/Project/suggar-daddy/infrastructure/docker

# 啟動基礎設施（PostgreSQL + Redis + Kafka）
docker-compose -f docker-compose.test.yml up -d

# 等待映像下載和容器啟動（約 2-5 分鐘）
docker-compose -f docker-compose.test.yml ps

# 查看日誌
docker-compose -f docker-compose.test.yml logs -f
```

### 第二階段：檢查服務健康狀態

```bash
# 檢查 PostgreSQL
docker exec -it suggar-daddy-postgres-test pg_isready -U admin -d suggar_daddy

# 連線測試
docker exec -it suggar-daddy-postgres-test psql -U admin -d suggar_daddy -c "SELECT version();"

# 檢查 Redis
docker exec -it suggar-daddy-redis-test redis-cli ping

# 檢查 Kafka
docker exec -it suggar-daddy-kafka-test kafka-topics.sh --bootstrap-server localhost:9092 --list
```

### 第三階段：啟動微服務（基礎設施正常後）

**注意**: 目前 Docker Compose 中的微服務需要實際的程式碼 build。

我們有兩個選擇：

#### 選項 A：等待 Claude Code 完成後端開發
- Claude Code 正在開發 DLQ、WebSocket 等功能
- 開發完成後再 build Docker 映像

#### 選項 B：先測試現有的微服務（如果已經可以 build）
```bash
# 檢查是否可以 build
cd /Users/brianyu/Project/suggar-daddy
npx nx build api-gateway --prod

# 如果成功，啟動所有服務
cd infrastructure/docker
docker-compose up -d
```

---

## 📋 預期結果

### 成功的指標

✅ **PostgreSQL**
- 狀態: healthy
- 可連線
- 資料庫 `suggar_daddy` 已建立

✅ **Redis**
- 狀態: healthy
- PING 回應 PONG

✅ **Kafka**
- 狀態: healthy (可能需要 1-2 分鐘)
- Broker 可連線

### 常見問題

#### 1. Kafka 啟動時間較長
- **原因**: Kafka 初次啟動需要初始化 metadata
- **解決**: 等待 60-90 秒
- **確認**: `docker logs suggar-daddy-kafka-test` 看到 "Kafka Server started"

#### 2. PostgreSQL 權限問題
```bash
# 如果遇到權限錯誤，檢查 volume
docker volume ls | grep suggar
docker volume inspect postgres_test_data
```

#### 3. Port 衝突
```bash
# 檢查 port 是否被佔用
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :9092  # Kafka

# 如果被佔用，停止衝突的服務或修改 docker-compose.test.yml 的 port
```

---

## 🎯 目前進度

### ✅ 已完成
1. 環境變數設定
2. Docker Compose 配置
3. 啟動基礎設施

### ⏳ 進行中
- Docker 映像下載（PostgreSQL, Kafka）
- 容器啟動

### 📋 待完成
- 檢查服務健康狀態
- 測試連線
- 啟動微服務（等待程式碼 ready）

---

## 💡 即時監控

### 查看所有容器狀態
```bash
watch -n 2 'docker-compose -f docker-compose.test.yml ps'
```

### 即時日誌
```bash
# 所有服務
docker-compose -f docker-compose.test.yml logs -f

# 特定服務
docker-compose -f docker-compose.test.yml logs -f postgres
docker-compose -f docker-compose.test.yml logs -f kafka
```

### 資源使用
```bash
docker stats
```

---

## 🔧 常用命令

### 啟動/停止
```bash
# 啟動
docker-compose -f docker-compose.test.yml up -d

# 停止
docker-compose -f docker-compose.test.yml down

# 停止並移除 volumes（清空資料）
docker-compose -f docker-compose.test.yml down -v
```

### 重啟服務
```bash
docker-compose -f docker-compose.test.yml restart postgres
docker-compose -f docker-compose.test.yml restart kafka
```

### 進入容器
```bash
docker exec -it suggar-daddy-postgres-test bash
docker exec -it suggar-daddy-redis-test sh
docker exec -it suggar-daddy-kafka-test bash
```

---

## 🎊 下一步

1. **等待映像下載完成**（約 2-5 分鐘）
   - 可以運行: `docker-compose -f docker-compose.test.yml logs -f`

2. **驗證服務健康**
   - PostgreSQL, Redis, Kafka 都應該是 healthy

3. **測試連線**
   - 執行上述的健康檢查命令

4. **決定下一步**
   - Option A: 等待 Claude Code 完成開發
   - Option B: 先測試現有微服務

---

需要我：
1. 📊 持續監控映像下載進度？
2. 🔍 檢查是否有錯誤？
3. 🚀 映像下載完成後自動執行健康檢查？

目前 Docker 正在背景下載映像中... ⏳
