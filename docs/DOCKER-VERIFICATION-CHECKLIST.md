# 🔍 Docker 啟動後驗證檢查清單

**目的：** 在 Docker 環境啟動後，快速驗證所有服務是否正常運行

**使用時機：** 每次啟動 Docker 環境後

---

## ⚡ 快速驗證（5 分鐘）

### 1. 啟動 Docker 環境

```bash
# 方式 1: 使用管理腳本
./scripts/docker-manager.sh start

# 方式 2: 直接使用 docker-compose
docker-compose up -d

# 方式 3: 檢查是否已運行
docker ps
```

**預期結果：** 至少 10 個容器運行中

---

### 2. 執行自動化驗證腳本

```bash
./scripts/quick-verification.sh
```

**預期結果：** 通過率 ≥ 85%

---

### 3. 手動快速檢查

```bash
# 檢查容器狀態
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 檢查 API Gateway
curl http://localhost:3000/health

# 檢查 PostgreSQL
docker exec postgres pg_isready -U postgres

# 檢查 Redis
docker exec redis redis-cli PING
```

---

## 📋 完整驗證檢查清單

### ✅ 基礎設施服務（必須全部通過）

- [ ] **PostgreSQL**
  ```bash
  docker exec postgres pg_isready -U postgres
  # 預期: accepting connections
  ```

- [ ] **Redis**
  ```bash
  docker exec redis redis-cli PING
  # 預期: PONG
  ```

- [ ] **Zookeeper**
  ```bash
  docker exec zookeeper zkServer.sh status
  # 預期: Mode: standalone
  ```

- [ ] **Kafka**
  ```bash
  docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092 | head -1
  # 預期: 有輸出表示 Kafka 正常
  ```

---

### ✅ 微服務健康檢查

#### API Gateway (Port 3000) - 必須通過
```bash
curl http://localhost:3000/health
# 預期: {"status":"ok"}
```

#### 其他微服務（建議全部檢查）
```bash
# User Service (3001)
curl http://localhost:3001/health || curl http://localhost:3001/api/health

# Auth Service (3002)
curl http://localhost:3002/health || curl http://localhost:3002/api/health

# Matching Service (3003)
curl http://localhost:3003/health || curl http://localhost:3003/api/health

# Notification Service (3004)
curl http://localhost:3004/health || curl http://localhost:3004/api/health

# Messaging Service (3005)
curl http://localhost:3005/health || curl http://localhost:3005/api/health

# Content Service (3006)
curl http://localhost:3006/health || curl http://localhost:3006/api/health

# Payment Service (3007)
curl http://localhost:3007/health || curl http://localhost:3007/api/health

# Media Service (3008)
curl http://localhost:3008/health || curl http://localhost:3008/api/health

# Subscription Service (3009)
curl http://localhost:3009/health || curl http://localhost:3009/api/health

# DB Writer Service (3010)
curl http://localhost:3010/health || curl http://localhost:3010/api/health

# Admin Service (3011)
curl http://localhost:3011/health || curl http://localhost:3011/api/health
```

---

### ✅ 資料庫完整性檢查

#### 檢查資料庫是否存在
```bash
docker exec postgres psql -U postgres -l | grep suggar_daddy
# 預期: 顯示 suggar_daddy 資料庫
```

#### 檢查資料表數量
```bash
docker exec postgres psql -U postgres -d suggar_daddy \
  -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
# 預期: table_count > 0
```

#### 檢查主要資料表
```bash
docker exec postgres psql -U postgres -d suggar_daddy \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
# 預期: 列出所有資料表
```

#### 檢查資料表記錄數
```bash
docker exec postgres psql -U postgres -d suggar_daddy \
  -c "SELECT 'users' as table_name, COUNT(*) as row_count FROM users
      UNION ALL
      SELECT 'posts', COUNT(*) FROM posts
      UNION ALL
      SELECT 'subscriptions', COUNT(*) FROM subscriptions;"
```

---

### ✅ Kafka 事件流檢查

#### 列出所有主題
```bash
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

#### 檢查主題詳情
```bash
docker exec kafka kafka-topics --describe --bootstrap-server localhost:9092
```

#### 檢查消費者群組
```bash
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

---

### ✅ Redis 快取檢查

#### 檢查 Keys 數量
```bash
docker exec redis redis-cli DBSIZE
```

#### 檢查記憶體使用
```bash
docker exec redis redis-cli INFO memory | grep used_memory_human
```

#### 測試 SET/GET
```bash
docker exec redis redis-cli SET test_key "test_value"
docker exec redis redis-cli GET test_key
docker exec redis redis-cli DEL test_key
```

---

### ✅ API Gateway 路由測試

#### 測試主要路由
```bash
# Users 路由
curl -v http://localhost:3000/api/users/health 2>&1 | grep "HTTP/"

# Auth 路由
curl -v http://localhost:3000/api/auth/health 2>&1 | grep "HTTP/"

# Posts 路由
curl -v http://localhost:3000/api/posts/health 2>&1 | grep "HTTP/"
```

---

### ✅ 前端應用檢查

#### Web App (Port 4200)
```bash
# 檢查端口是否開放
nc -z localhost 4200 && echo "Web App is running" || echo "Web App is NOT running"

# 如果前端已啟動，檢查首頁
curl -I http://localhost:4200/ | head -1
```

#### Admin App (Port 4300)
```bash
# 檢查端口是否開放
nc -z localhost 4300 && echo "Admin App is running" || echo "Admin App is NOT running"

# 如果前端已啟動，檢查首頁
curl -I http://localhost:4300/ | head -1
```

---

## 🔥 煙霧測試（Smoke Tests）

### 測試 1: 健康檢查端點
```bash
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011; do
  echo "Testing port $port..."
  curl -s -o /dev/null -w "Port $port: %{http_code}\n" http://localhost:$port/health || \
  curl -s -o /dev/null -w "Port $port: %{http_code}\n" http://localhost:$port/api/health
done
```

### 測試 2: 認證流程（如果有測試用戶）
```bash
# 註冊測試用戶
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "name": "Test User"
  }'

# 登入測試
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'
```

### 測試 3: 基本 CRUD 操作
```bash
# 假設已取得 JWT token
TOKEN="your_jwt_token_here"

# 測試取得用戶資料
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"

# 測試建立貼文
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "content": "This is a test post"
  }'
```

---

## 📊 效能檢查

### 資源使用
```bash
# 檢查容器資源使用
docker stats --no-stream

# 檢查特定服務
docker stats --no-stream api-gateway user-service auth-service
```

### 響應時間
```bash
# 測試 API Gateway 響應時間
time curl -s http://localhost:3000/health > /dev/null

# 連續測試 10 次
for i in {1..10}; do
  time curl -s http://localhost:3000/health > /dev/null
done
```

### 併發測試（簡易版）
```bash
# 100 個併發請求
for i in {1..100}; do
  curl -s http://localhost:3000/health > /dev/null &
done
wait
echo "Completed 100 concurrent requests"
```

---

## 🚨 常見問題排查

### 問題 1: 容器無法啟動
```bash
# 檢查容器日誌
docker-compose logs [service_name]

# 檢查所有容器日誌
docker-compose logs --tail=50

# 檢查特定服務
docker logs [container_name]
```

### 問題 2: 服務無法連接
```bash
# 檢查網路
docker network ls
docker network inspect suggar-daddy_default

# 檢查端口佔用
lsof -i :3000
netstat -an | grep 3000
```

### 問題 3: 資料庫連線失敗
```bash
# 檢查 PostgreSQL 日誌
docker logs postgres

# 進入 PostgreSQL 容器
docker exec -it postgres psql -U postgres

# 檢查資料庫連線
docker exec postgres psql -U postgres -c "SELECT version();"
```

### 問題 4: Kafka 連線問題
```bash
# 檢查 Kafka 日誌
docker logs kafka

# 檢查 Zookeeper
docker logs zookeeper

# 測試 Kafka 連線
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

---

## ✅ 驗證通過標準

### 最低標準（可以開始開發）
- ✅ 所有基礎設施服務運行（PostgreSQL, Redis, Kafka, Zookeeper）
- ✅ API Gateway 健康檢查通過
- ✅ 至少 6 個微服務運行並響應
- ✅ 資料庫可以連線

### 推薦標準（可以進行測試）
- ✅ 所有容器運行無錯誤
- ✅ 所有微服務健康檢查通過
- ✅ API Gateway 路由正常工作
- ✅ 資料庫包含必要的資料表
- ✅ Kafka 可以接收和發送訊息

### 生產標準（可以上線）
- ✅ 所有測試 100% 通過
- ✅ 效能測試達標（響應時間 < 200ms）
- ✅ 負載測試通過（100+ 併發用戶）
- ✅ 安全檢查通過
- ✅ 監控和日誌正常

---

## 📝 驗證記錄範本

```
驗證日期: _____________
執行者: _____________
環境: [ ] Development  [ ] Staging  [ ] Production

基礎設施服務:
[ ] PostgreSQL - 狀態: _______ 備註: _____________
[ ] Redis - 狀態: _______ 備註: _____________
[ ] Kafka - 狀態: _______ 備註: _____________
[ ] Zookeeper - 狀態: _______ 備註: _____________

微服務健康:
[ ] API Gateway - 狀態: _______ 備註: _____________
[ ] User Service - 狀態: _______ 備註: _____________
[ ] Auth Service - 狀態: _______ 備註: _____________
[ ] 其他服務 - 狀態: _______ 備註: _____________

功能測試:
[ ] 健康檢查 - 結果: _______ 備註: _____________
[ ] 認證流程 - 結果: _______ 備註: _____________
[ ] API 路由 - 結果: _______ 備註: _____________

效能測試:
[ ] 響應時間 - 結果: _______ 備註: _____________
[ ] 併發測試 - 結果: _______ 備註: _____________

整體評分: _____/10
可以上線: [ ] 是  [ ] 否
遺留問題: _____________________________________________
```

---

## 🎯 下一步

1. **立即執行：** 使用 `./scripts/quick-verification.sh` 進行自動化驗證
2. **記錄結果：** 填寫驗證記錄範本
3. **修復問題：** 處理發現的任何失敗項目
4. **更新報告：** 將結果更新到 FINAL-VERIFICATION-REPORT.md
5. **準備上線：** 如果所有測試通過，進入部署流程

---

**最後更新：** 2026-02-14  
**版本：** 1.0  
**維護者：** QA Team
