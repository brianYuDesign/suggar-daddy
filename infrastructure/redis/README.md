# Redis Sentinel 高可用性架構

🛡️ **Redis Sentinel** 為 Suggar Daddy 應用提供自動故障轉移和高可用性。

## 🚀 快速開始

### 啟動 Redis Sentinel 集群

```bash
# 1. 啟動 Redis 和 Sentinel
docker-compose up -d redis-master redis-replica-1 redis-replica-2 \
  redis-sentinel-1 redis-sentinel-2 redis-sentinel-3

# 2. 驗證健康狀態
./check-sentinel.sh

# 3. 啟動應用服務
docker-compose up -d
```

## 📊 架構概覽

```
應用層 → Sentinel 集群 (3 個節點) → Redis 集群 (1 Master + 2 Replicas)
```

- **3 個 Sentinel**：監控和自動故障轉移
- **1 個 Master**：處理寫入操作
- **2 個 Replica**：處理讀取操作，數據冗餘
- **Quorum = 2**：至少 2 個 Sentinel 同意才能故障轉移
- **故障轉移時間 < 30 秒**

## 📁 檔案結構

```
infrastructure/redis/
├── master/redis.conf           # Master 配置
├── replica/redis.conf          # Replica 配置
├── sentinel/sentinel.conf      # Sentinel 配置
├── check-sentinel.sh          # 健康檢查腳本 ✅
├── test-failover.sh           # 故障轉移測試腳本 🧪
└── README.md                  # 本文件
```

## 🛠️ 常用操作

### 健康檢查

```bash
./check-sentinel.sh
```

檢查項目：
- ✅ Sentinel 容器狀態
- ✅ Redis 實例狀態
- ✅ 複製延遲
- ✅ 連接測試

### 故障轉移測試

```bash
./test-failover.sh
```

這會：
1. 停止當前 Master
2. 等待自動故障轉移
3. 驗證數據完整性
4. 測試新 Master

### 查看狀態

```bash
# 查看 Master 信息
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL master mymaster

# 查看所有 Replica
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL replicas mymaster

# 查看日誌
docker logs -f suggar-daddy-redis-sentinel-1
docker logs -f suggar-daddy-redis-master
```

### 手動故障轉移

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL failover mymaster
```

## 🔧 環境變數

應用服務需要配置：

```yaml
environment:
  REDIS_SENTINELS: redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379
  REDIS_MASTER_NAME: mymaster
```

ioredis 客戶端會自動：
1. 連接到 Sentinel 集群
2. 查詢當前 Master 地址
3. 連接到 Master
4. 當 Master 改變時自動重連

## 📈 監控指標

關鍵指標：

| 指標 | 正常範圍 | 告警閾值 |
|------|---------|---------|
| 複製延遲 | < 1 秒 | > 5 秒 |
| 記憶體使用 | < 70% | > 80% |
| Master 可用性 | 100% | < 99.9% |
| Replica 數量 | 2 | < 1 |
| Sentinel 數量 | 3 | < 2 |

## ⚠️ 常見問題

### Sentinel 無法連接

```bash
# 重啟 Sentinel
docker-compose restart redis-sentinel-1 redis-sentinel-2 redis-sentinel-3

# 檢查網路
docker network inspect suggar-daddy-network
```

### 應用無法連接

```bash
# 檢查環境變數
docker exec suggar-daddy-auth-service env | grep REDIS

# 重啟應用
docker-compose restart auth-service
```

### 故障轉移沒有執行

```bash
# 檢查 Quorum
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL master mymaster | grep quorum

# 檢查 Replica 狀態
./check-sentinel.sh
```

## 📚 完整文檔

詳細文檔請參閱：[docs/REDIS_SENTINEL.md](../../docs/REDIS_SENTINEL.md)

包含：
- 📋 架構設計
- 🚀 部署指南
- 🛠️ Sentinel 操作指南
- 🔄 故障轉移流程
- 📊 監控指標
- 🔍 常見問題排查
- ✅ 最佳實踐

## 🎯 最佳實踐

✅ **DO（推薦）**：

- 至少 3 個 Sentinel 實例
- 啟用 AOF 持久化
- 定期執行健康檢查
- 監控關鍵指標

❌ **DON'T（避免）**：

- 只部署 1-2 個 Sentinel
- 禁用持久化
- 直接連接 Master IP
- 在生產環境執行 FLUSHALL

## 🔐 安全性

生產環境建議：

```bash
# 設置密碼
requirepass your-strong-password

# 禁用危險命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
```

## 📞 支援

如有問題，請聯繫 DevOps 團隊或查閱完整文檔。

---

**版本**：1.0.0  
**最後更新**：2024-01-10
