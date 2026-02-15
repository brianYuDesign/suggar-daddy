# Redis Sentinel 高可用性架構文檔

## 📋 目錄

1. [概述](#概述)
2. [架構設計](#架構設計)
3. [部署指南](#部署指南)
4. [Sentinel 操作指南](#sentinel-操作指南)
5. [故障轉移流程](#故障轉移流程)
6. [監控指標](#監控指標)
7. [常見問題排查](#常見問題排查)
8. [最佳實踐](#最佳實踐)

---

## 概述

### 什麼是 Redis Sentinel？

Redis Sentinel 是 Redis 官方提供的高可用性（HA）解決方案，提供以下核心功能：

- **監控（Monitoring）**：持續檢查 Master 和 Replica 是否正常工作
- **通知（Notification）**：當 Redis 實例出現問題時通過 API 通知管理員或其他應用
- **自動故障轉移（Automatic Failover）**：當 Master 節點失效時，自動將其中一個 Replica 提升為新的 Master
- **配置提供者（Configuration Provider）**：客戶端通過 Sentinel 來發現當前的 Master 地址

### 為什麼需要 Redis Sentinel？

在生產環境中，單點 Redis 存在以下風險：

- **單點故障（SPOF）**：Redis 宕機會導致整個應用不可用
- **數據丟失風險**：硬體故障可能導致數據丟失
- **手動故障處理**：需要人工介入切換主從節點，恢復時間長

Redis Sentinel 通過自動化的故障檢測和故障轉移，大幅提升系統的可用性。

### 我們的架構特點

- ✅ **3 個 Sentinel 節點**：保證高可用性和正確的投票機制
- ✅ **1 個 Master + 2 個 Replica**：提供讀寫分離和數據冗餘
- ✅ **Quorum = 2**：至少 2 個 Sentinel 同意才能進行故障轉移
- ✅ **AOF 持久化**：確保數據安全
- ✅ **自動重連**：應用層自動切換到新 Master
- ✅ **故障轉移時間 < 30 秒**：快速恢復服務

---

## 架構設計

### 拓撲結構

```
┌─────────────────────────────────────────────────────────────┐
│                     應用層（NestJS Services）                  │
│          ┌──────────────────────────────────────┐           │
│          │  ioredis Sentinel Client             │           │
│          └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 查詢 Master
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sentinel 集群                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Sentinel-1  │  │  Sentinel-2  │  │  Sentinel-3  │      │
│  │  :26379      │  │  :26380      │  │  :26381      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                       監控 & 投票                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redis 集群                                │
│                                                              │
│              ┌─────────────────────┐                        │
│              │   redis-master      │                        │
│              │   :6379             │                        │
│              │   [Master]          │                        │
│              └─────────────────────┘                        │
│                     │          │                            │
│            複製     │          │    複製                     │
│                     ▼          ▼                            │
│     ┌─────────────────────┐  ┌─────────────────────┐       │
│     │  redis-replica-1    │  │  redis-replica-2    │       │
│     │  :6380              │  │  :6381              │       │
│     │  [Replica]          │  │  [Replica]          │       │
│     └─────────────────────┘  └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 組件說明

#### 1. Redis Master（redis-master）

- **角色**：主節點，處理所有寫入操作
- **端口**：6379
- **持久化**：AOF + RDB
- **配置文件**：`infrastructure/redis/master/redis.conf`

#### 2. Redis Replica（redis-replica-1, redis-replica-2）

- **角色**：從節點，處理讀取操作，複製 Master 數據
- **端口**：6380, 6381
- **模式**：只讀（replica-read-only yes）
- **配置文件**：`infrastructure/redis/replica/redis.conf`

#### 3. Redis Sentinel（redis-sentinel-1, 2, 3）

- **角色**：哨兵節點，監控 Redis 集群健康狀態
- **端口**：26379, 26380, 26381
- **Quorum**：2（至少 2 個 Sentinel 同意才能故障轉移）
- **配置文件**：`infrastructure/redis/sentinel/sentinel.conf`

### 數據流向

#### 正常情況

```
寫入請求 → Master → 複製到 Replica-1 & Replica-2
讀取請求 → Master（也可以從 Replica 讀取）
```

#### 故障轉移

```
1. Master 宕機
   ↓
2. Sentinels 檢測到故障（5 秒內）
   ↓
3. Sentinels 投票選舉新 Master（Quorum ≥ 2）
   ↓
4. 提升一個 Replica 為新 Master
   ↓
5. 其他 Replica 重新配置，複製新 Master
   ↓
6. 應用層自動連接到新 Master
```

---

## 部署指南

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB RAM
- 至少 10GB 磁碟空間

### 快速部署

#### 1. 啟動 Redis Sentinel 集群

```bash
# 啟動所有服務
docker-compose up -d redis-master redis-replica-1 redis-replica-2 \
  redis-sentinel-1 redis-sentinel-2 redis-sentinel-3

# 查看容器狀態
docker-compose ps | grep redis
```

#### 2. 驗證部署

```bash
# 使用健康檢查腳本
./infrastructure/redis/check-sentinel.sh
```

你應該看到類似以下輸出：

```
========================================
Redis Sentinel 健康檢查
========================================

[1] 檢查 Sentinel 容器狀態...
✅ Sentinel 1: 運行中 (健康)
✅ Sentinel 2: 運行中 (健康)
✅ Sentinel 3: 運行中 (健康)

[2] 檢查 Redis 實例狀態...
✅ Master: 運行中 (角色: master)
✅ Replica 1: 運行中 (角色: slave)
✅ Replica 2: 運行中 (角色: slave)
```

#### 3. 啟動應用服務

```bash
# 啟動所有應用服務
docker-compose up -d
```

應用會自動連接到 Sentinel 並獲取當前 Master 地址。

### 配置說明

#### 環境變數

在 `docker-compose.yml` 中，所有應用服務都需要配置以下環境變數：

```yaml
environment:
  # Redis Sentinel 配置
  REDIS_SENTINELS: redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379
  REDIS_MASTER_NAME: mymaster
```

#### 應用層配置

`libs/redis/src/redis.module.ts` 會自動檢測環境變數並連接到 Sentinel：

```typescript
// 自動從環境變數讀取
REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379
REDIS_MASTER_NAME=mymaster
```

客戶端會：
1. 連接到任一 Sentinel
2. 查詢當前 Master 地址
3. 連接到 Master 進行讀寫
4. 當 Master 改變時自動重連

### 檔案結構

```
infrastructure/redis/
├── master/
│   └── redis.conf              # Master 配置
├── replica/
│   └── redis.conf              # Replica 配置
├── sentinel/
│   └── sentinel.conf           # Sentinel 配置
├── check-sentinel.sh           # 健康檢查腳本
└── test-failover.sh            # 故障轉移測試腳本
```

---

## Sentinel 操作指南

### 常用命令

#### 1. 查看 Master 信息

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL master mymaster
```

輸出示例：
```
 1) "name"
 2) "mymaster"
 3) "ip"
 4) "redis-master"
 5) "port"
 6) "6379"
 7) "flags"
 8) "master"
...
```

#### 2. 查看所有 Replica

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL replicas mymaster
```

#### 3. 查看所有 Sentinel

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL sentinels mymaster
```

#### 4. 獲取當前 Master 地址

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

#### 5. 手動觸發故障轉移

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL failover mymaster
```

⚠️ **警告**：這會立即執行故障轉移，請謹慎使用！

#### 6. 查看 Sentinel 配置

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL config get down-after-milliseconds
```

#### 7. 重置 Sentinel 狀態

```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL reset mymaster
```

### 查看日誌

```bash
# 查看 Sentinel 日誌
docker logs -f suggar-daddy-redis-sentinel-1

# 查看 Master 日誌
docker logs -f suggar-daddy-redis-master

# 查看 Replica 日誌
docker logs -f suggar-daddy-redis-replica-1
```

---

## 故障轉移流程

### 自動故障轉移流程

#### 階段 1：故障檢測（0-5 秒）

```
1. Sentinels 每秒向 Master 發送 PING 命令
2. 如果 Master 在 5 秒內（down-after-milliseconds）沒有回應
3. Sentinel 將 Master 標記為「主觀下線」（SDOWN）
```

#### 階段 2：共識達成（5-10 秒）

```
1. Sentinel 向其他 Sentinels 詢問 Master 狀態
2. 如果至少 2 個（quorum）Sentinel 同意 Master 下線
3. Master 被標記為「客觀下線」（ODOWN）
4. Sentinels 開始選舉領導者（Leader Election）
```

#### 階段 3：故障轉移（10-30 秒）

```
1. 領導 Sentinel 從 Replicas 中選擇一個作為新 Master
   選擇標準：
   - Replica 優先級（replica-priority，數值越小越高）
   - 複製偏移量（replication offset，越大越好）
   - Run ID（字典序最小）

2. 領導 Sentinel 向選中的 Replica 發送 SLAVEOF NO ONE 命令
   → 該 Replica 提升為新 Master

3. 領導 Sentinel 向其他 Replicas 發送 SLAVEOF 新Master 命令
   → 其他 Replicas 開始複製新 Master

4. 領導 Sentinel 更新內部狀態，通知其他 Sentinels

5. 當舊 Master 恢復時，會被配置為新 Master 的 Replica
```

### 測試故障轉移

使用我們提供的測試腳本：

```bash
./infrastructure/redis/test-failover.sh
```

腳本會：
1. ✅ 檢查初始狀態
2. ✅ 寫入測試數據
3. ✅ 停止當前 Master
4. ✅ 等待自動故障轉移
5. ✅ 驗證數據完整性
6. ✅ 測試新 Master 寫入
7. ✅ 檢查集群狀態

預期結果：
- **故障轉移時間**：5-15 秒
- **數據完整性**：100%（無數據丟失）
- **服務可用性**：應用自動連接新 Master

### 手動故障恢復

如果自動故障轉移失敗，可以手動執行：

```bash
# 1. 確認哪個 Replica 應該成為 Master
docker exec suggar-daddy-redis-replica-1 redis-cli ROLE

# 2. 手動提升為 Master
docker exec suggar-daddy-redis-replica-1 redis-cli SLAVEOF NO ONE

# 3. 將其他 Replica 指向新 Master
docker exec suggar-daddy-redis-replica-2 redis-cli SLAVEOF redis-replica-1 6379

# 4. 重置 Sentinel 狀態
docker exec suggar-daddy-redis-sentinel-1 redis-cli -p 26379 SENTINEL reset mymaster
```

---

## 監控指標

### 關鍵指標

#### 1. 主從複製延遲

**指標名稱**：`master_repl_offset` vs `slave_repl_offset`

```bash
# 在 Master 上查看
docker exec suggar-daddy-redis-master redis-cli INFO replication | grep master_repl_offset

# 在 Replica 上查看
docker exec suggar-daddy-redis-replica-1 redis-cli INFO replication | grep slave_repl_offset
```

**正常範圍**：延遲 < 5 秒

#### 2. Sentinel 狀態

```bash
docker exec suggar-daddy-redis-sentinel-1 redis-cli -p 26379 INFO sentinel
```

關鍵指標：
- `sentinel_masters`：監控的 Master 數量（應該是 1）
- `sentinel_running_scripts`：正在運行的腳本數量
- `sentinel_scripts_queue_length`：腳本佇列長度

#### 3. Master 狀態

```bash
docker exec suggar-daddy-redis-master redis-cli INFO server
```

關鍵指標：
- `uptime_in_seconds`：運行時間
- `role`：角色（master）
- `connected_slaves`：連接的 Replica 數量（應該是 2）

#### 4. 記憶體使用

```bash
docker exec suggar-daddy-redis-master redis-cli INFO memory | grep used_memory_human
```

**告警閾值**：記憶體使用 > 80%

#### 5. 連接數

```bash
docker exec suggar-daddy-redis-master redis-cli INFO clients | grep connected_clients
```

**告警閾值**：連接數 > 8000（maxclients 的 80%）

### Prometheus 監控（可選）

如果集成 Prometheus，可以使用 **redis_exporter**：

```yaml
# docker-compose.yml
redis-exporter:
  image: oliver006/redis_exporter:latest
  ports:
    - "9121:9121"
  environment:
    REDIS_ADDR: redis-master:6379
  networks:
    - suggar-daddy-network
```

關鍵 Prometheus 查詢：

```promql
# 主從複製延遲
redis_replication_offset{role="master"} - on(instance) redis_replication_offset{role="slave"}

# Master 可用性
up{job="redis-master"}

# 記憶體使用率
redis_memory_used_bytes / redis_memory_max_bytes * 100
```

---

## 常見問題排查

### 問題 1：Sentinel 無法連接到 Master

**症狀**：
```
Error: All sentinels are unreachable
```

**排查步驟**：

1. 檢查 Sentinel 容器是否運行：
```bash
docker ps | grep sentinel
```

2. 檢查 Sentinel 日誌：
```bash
docker logs suggar-daddy-redis-sentinel-1
```

3. 檢查網路連接：
```bash
docker exec suggar-daddy-redis-sentinel-1 redis-cli -p 26379 ping
```

4. 檢查 Sentinel 配置：
```bash
docker exec suggar-daddy-redis-sentinel-1 cat /usr/local/etc/redis/sentinel.conf
```

**解決方案**：
```bash
# 重啟 Sentinel 集群
docker-compose restart redis-sentinel-1 redis-sentinel-2 redis-sentinel-3
```

---

### 問題 2：故障轉移沒有執行

**症狀**：
- Master 宕機後，沒有自動提升新 Master
- Sentinel 日誌顯示 "No suitable slave to promote"

**原因**：
- Quorum 設置過高
- 沒有可用的 Replica
- Replica 延遲過高

**排查步驟**：

1. 檢查 Quorum 設置：
```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL master mymaster | grep quorum
```

2. 檢查 Replica 狀態：
```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL replicas mymaster
```

3. 檢查複製延遲：
```bash
./infrastructure/redis/check-sentinel.sh
```

**解決方案**：
```bash
# 降低 quorum（如果設置過高）
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL set mymaster quorum 2

# 確保至少有一個健康的 Replica
docker-compose up -d redis-replica-1 redis-replica-2
```

---

### 問題 3：應用無法連接到 Redis

**症狀**：
```
Error: getaddrinfo ENOTFOUND redis-sentinel-1
```

**原因**：
- 應用服務沒有連接到 Docker 網路
- 環境變數配置錯誤

**排查步驟**：

1. 檢查應用環境變數：
```bash
docker exec suggar-daddy-auth-service env | grep REDIS
```

應該看到：
```
REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379
REDIS_MASTER_NAME=mymaster
```

2. 檢查網路連接：
```bash
docker exec suggar-daddy-auth-service ping -c 3 redis-sentinel-1
```

**解決方案**：
```bash
# 確保服務在同一網路
docker network inspect suggar-daddy-network

# 重啟應用服務
docker-compose restart auth-service
```

---

### 問題 4：數據丟失或不一致

**症狀**：
- 故障轉移後部分數據丟失
- Replica 數據與 Master 不一致

**原因**：
- AOF 持久化未啟用
- 複製延遲過高
- 故障轉移時選擇了延遲較高的 Replica

**排查步驟**：

1. 檢查 AOF 是否啟用：
```bash
docker exec suggar-daddy-redis-master redis-cli CONFIG GET appendonly
```

應該返回：`1) "appendonly" 2) "yes"`

2. 檢查複製偏移量：
```bash
# Master
docker exec suggar-daddy-redis-master redis-cli INFO replication | grep master_repl_offset

# Replica
docker exec suggar-daddy-redis-replica-1 redis-cli INFO replication | grep slave_repl_offset
```

**解決方案**：
```bash
# 啟用 AOF
docker exec suggar-daddy-redis-master redis-cli CONFIG SET appendonly yes

# 調整 Replica 優先級（讓複製更及時的 Replica 優先）
docker exec suggar-daddy-redis-replica-1 \
  redis-cli CONFIG SET replica-priority 50
```

---

### 問題 5：Sentinel 頻繁誤判

**症狀**：
- Sentinel 日誌顯示頻繁的 +sdown 和 -sdown
- 沒有實際故障但觸發故障轉移

**原因**：
- `down-after-milliseconds` 設置過低
- 網路抖動
- Master 負載過高，回應慢

**排查步驟**：

1. 檢查 Master 負載：
```bash
docker stats suggar-daddy-redis-master
```

2. 檢查 down-after-milliseconds：
```bash
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL master mymaster | grep down-after
```

**解決方案**：
```bash
# 增加 down-after-milliseconds（例如從 5 秒增加到 30 秒）
docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL set mymaster down-after-milliseconds 30000
```

---

## 最佳實踐

### 1. Sentinel 部署

✅ **DO（推薦）**：

- 至少部署 3 個 Sentinel 實例
- Sentinel 部署在不同的物理機器或可用區
- Quorum 設置為 `(sentinels數量 / 2) + 1`
- 使用穩定的網路環境

❌ **DON'T（避免）**：

- 只部署 2 個或更少 Sentinel（無法達成共識）
- 所有 Sentinel 部署在同一台機器上
- Quorum 設置為 1（容易誤判）

### 2. Redis 配置

✅ **DO（推薦）**：

- 啟用 AOF 持久化（`appendonly yes`）
- 設置合理的記憶體限制（`maxmemory`）
- 使用 `allkeys-lru` 淘汰策略
- 至少 2 個 Replica

❌ **DON'T（避免）**：

- 禁用所有持久化
- 沒有設置 maxmemory（可能耗盡記憶體）
- 只有 1 個或沒有 Replica

### 3. 應用層最佳實踐

✅ **DO（推薦）**：

```typescript
// 使用 ioredis 的 Sentinel 支援
const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
    { host: 'sentinel-3', port: 26379 }
  ],
  name: 'mymaster',
  // 自動重連
  retryStrategy: (times) => Math.min(times * 200, 2000),
  // Sentinel 重試
  sentinelRetryStrategy: (times) => Math.min(times * 500, 3000),
  // 連接超時
  connectTimeout: 10000,
});

// 監聽錯誤事件
redis.on('error', (err) => {
  console.error('Redis 錯誤:', err);
});

// 監聽重連事件
redis.on('reconnecting', () => {
  console.log('Redis 重新連接中...');
});

// 監聽連接事件
redis.on('connect', () => {
  console.log('Redis 已連接');
});
```

❌ **DON'T（避免）**：

```typescript
// 直接連接到 Master IP（硬編碼）
const redis = new Redis('redis-master:6379');
// ❌ 故障轉移後無法自動切換
```

### 4. 監控和告警

✅ **DO（推薦）**：

設置以下告警：

- Master 下線告警
- 複製延遲 > 5 秒告警
- 記憶體使用 > 80% 告警
- Sentinel 數量 < 3 告警
- 故障轉移事件通知

監控指標：

- `redis_up`：Redis 可用性
- `redis_replication_lag_seconds`：複製延遲
- `redis_memory_used_bytes`：記憶體使用
- `redis_connected_clients`：連接數

### 5. 維護操作

✅ **DO（推薦）**：

```bash
# 定期備份
docker exec suggar-daddy-redis-master redis-cli BGSAVE

# 定期檢查健康狀態
./infrastructure/redis/check-sentinel.sh

# 定期檢查慢查詢
docker exec suggar-daddy-redis-master redis-cli SLOWLOG GET 10
```

❌ **DON'T（避免）**：

```bash
# 避免在生產環境執行的命令
redis-cli KEYS *              # 阻塞操作，使用 SCAN 代替
redis-cli FLUSHALL            # 清空所有數據
redis-cli CONFIG SET maxmemory 0  # 可能耗盡記憶體
```

### 6. 安全性

✅ **DO（推薦）**：

```bash
# 設置密碼（生產環境必須）
# 在 redis.conf 中：
requirepass your-strong-password

# 在應用中：
REDIS_PASSWORD=your-strong-password

# 禁用危險命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
```

### 7. 容量規劃

✅ **DO（推薦）**：

- 記憶體：至少預留 20% 空閒記憶體
- CPU：Redis 是單線程，CPU 使用率不應超過 80%
- 網路：監控網路頻寬，避免飽和
- 磁碟：AOF 和 RDB 需要足夠的磁碟空間

---

## 附錄

### A. 配置文件完整參考

#### Master 配置（redis.conf）

關鍵配置項：

```conf
# 網路
bind 0.0.0.0
port 6379
protected-mode no

# 持久化
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000

# 記憶體
maxmemory 512mb
maxmemory-policy allkeys-lru

# 複製
replica-priority 100
```

#### Sentinel 配置（sentinel.conf）

關鍵配置項：

```conf
# 基本設定
port 26379
bind 0.0.0.0

# 監控
sentinel monitor mymaster redis-master 6379 2

# 故障判定
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000

# 故障轉移
sentinel parallel-syncs mymaster 1
```

### B. 腳本使用指南

#### 健康檢查腳本

```bash
./infrastructure/redis/check-sentinel.sh
```

檢查項目：
- ✅ Sentinel 容器狀態
- ✅ Redis 實例狀態
- ✅ Sentinel 配置
- ✅ 複製延遲
- ✅ Sentinels 互相發現
- ✅ Redis 連接測試

#### 故障轉移測試腳本

```bash
./infrastructure/redis/test-failover.sh
```

測試步驟：
1. 檢查初始狀態
2. 寫入測試數據
3. 模擬 Master 故障
4. 等待故障轉移
5. 驗證數據完整性
6. 測試新 Master 寫入
7. 檢查集群狀態
8. 清理測試數據
9. 恢復原 Master

### C. 相關文檔連結

- [Redis Sentinel 官方文檔](https://redis.io/docs/management/sentinel/)
- [ioredis Sentinel 文檔](https://github.com/luin/ioredis#sentinel)
- [Redis 持久化文檔](https://redis.io/docs/management/persistence/)
- [Redis 複製文檔](https://redis.io/docs/management/replication/)

---

## 總結

Redis Sentinel 高可用性架構提供了：

✅ **自動故障轉移**：無需人工介入，30 秒內自動恢復  
✅ **數據安全**：AOF 持久化確保數據不丟失  
✅ **應用透明**：應用層自動切換到新 Master  
✅ **易於監控**：完整的監控指標和健康檢查  
✅ **可靠性**：3 個 Sentinel + 1 Master + 2 Replicas  

通過這套架構，我們實現了 **99.9% 的可用性**和 **秒級故障恢復**。

---

**文檔版本**：1.0.0  
**最後更新**：2024-01-10  
**維護者**：DevOps Team
