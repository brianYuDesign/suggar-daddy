# ⚡ 快速啟動指南 - 驗證測試

**在 Docker 啟動後立即執行這些命令**

---

## 🚀 一鍵驗證

```bash
cd /Users/brianyu/Project/suggar-daddy
./scripts/quick-verification.sh
```

這個腳本會自動檢查：
- ✅ Docker 環境
- ✅ 所有基礎設施服務（PostgreSQL, Redis, Kafka, Zookeeper）
- ✅ 所有微服務健康狀態
- ✅ API Gateway 路由
- ✅ 資料庫連線
- ✅ Kafka 主題
- ✅ Redis 操作
- ✅ 資源使用情況

---

## 📋 手動快速檢查（3 分鐘）

### 1. 檢查容器運行
```bash
docker ps
```
**預期：** 至少 10 個容器運行中

### 2. 測試 API Gateway
```bash
curl http://localhost:3000/health
```
**預期：** `{"status":"ok"}`

### 3. 測試資料庫
```bash
docker exec postgres pg_isready -U postgres
```
**預期：** `accepting connections`

### 4. 測試 Redis
```bash
docker exec redis redis-cli PING
```
**預期：** `PONG`

### 5. 測試微服務（任選 3 個）
```bash
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Auth Service
curl http://localhost:3007/health  # Payment Service
```

---

## 🎯 成功標準

**最低要求（可以開始開發）：**
- ✅ 4 個基礎設施容器運行
- ✅ API Gateway 響應正常
- ✅ 至少 3 個微服務運行

**推薦標準（可以測試）：**
- ✅ 所有容器運行無錯誤
- ✅ 所有微服務健康檢查通過
- ✅ 資料庫可以連線

---

## 🚨 快速排錯

### 容器未啟動？
```bash
docker-compose up -d
./scripts/docker-manager.sh start
```

### 服務無響應？
```bash
docker-compose logs [service_name]
docker restart [container_name]
```

### 端口衝突？
```bash
lsof -i :3000  # 檢查端口佔用
kill -9 [PID]  # 殺掉佔用進程
```

---

## 📊 查看完整報告

驗證完成後，查看詳細報告：

```bash
cat FINAL-VERIFICATION-REPORT.md
```

或使用 Markdown 檢視器開啟

---

## 📞 獲取幫助

- 📄 完整檢查清單: `docs/DOCKER-VERIFICATION-CHECKLIST.md`
- 📄 驗證報告: `FINAL-VERIFICATION-REPORT.md`
- 🔧 Docker 管理: `./scripts/docker-manager.sh help`

---

**最後更新：** 2026-02-14  
**快速參考：** 保存此文件用於日常驗證
