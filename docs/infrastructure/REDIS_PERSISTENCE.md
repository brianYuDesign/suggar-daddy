# Redis 持久化配置指南

## 概述

本文檔說明 Suggar Daddy 專案中 Redis 的持久化配置，確保數據安全和可靠性。

## 持久化機制

### 1. AOF (Append Only File) - 主要持久化方式

AOF 記錄所有寫入操作，提供最高的數據安全性。

**配置項：**

```conf
# 啟用 AOF
appendonly yes

# AOF 文件名
appendfilename "appendonly.aof"

# 同步策略：每秒同步一次（推薦）
appendfsync everysec

# AOF 重寫條件
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 使用 RDB-AOF 混合持久化（最佳）
aof-use-rdb-preamble yes
```

**同步策略選擇：**

| 策略 | 描述 | 性能 | 安全性 | 適用場景 |
|------|------|------|--------|----------|
| `always` | 每次寫入都同步 | 最慢 | 最高 | 金融數據 |
| `everysec` | 每秒同步一次 | 平衡 | 高 | **推薦（預設）** |
| `no` | 由 OS 決定 | 最快 | 最低 | 快取數據 |

**優勢：**
- ✅ 數據丟失風險最小（最多丟失 1 秒數據）
- ✅ AOF 文件可讀，易於分析和修復
- ✅ 支援自動重寫，控制文件大小

### 2. RDB (Redis Database) - 備份快照

RDB 在指定時間間隔內對數據進行快照，作為備份使用。

**配置項：**

```conf
# RDB 快照觸發條件
save 900 1      # 15分鐘內至少 1 次變更
save 300 10     # 5分鐘內至少 10 次變更
save 60 10000   # 1分鐘內至少 10000 次變更

# RDB 文件名
dbfilename dump.rdb

# 啟用壓縮
rdbcompression yes

# 啟用校驗和
rdbchecksum yes
```

**優勢：**
- ✅ 緊湊的二進制格式，恢復速度快
- ✅ 適合備份和災難恢復
- ✅ 對性能影響小

### 3. 混合持久化（推薦）

Redis 4.0+ 支援 RDB-AOF 混合持久化，結合兩者優勢。

```conf
aof-use-rdb-preamble yes
```

**工作原理：**
1. AOF 重寫時，先寫入 RDB 格式的快照（快速）
2. 再追加增量的 AOF 日誌
3. 恢復時，先加載 RDB 部分（快速），再重放 AOF 日誌

**優勢：**
- ✅ 恢復速度接近 RDB
- ✅ 數據安全性接近 AOF
- ✅ 文件大小更小

## 架構部署

### Master-Replica 架構

```
┌─────────────────────────────────────────────────────────────┐
│                     Redis Cluster                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐                                         │
│  │  Redis Master   │  (寫入 + 讀取)                          │
│  │  Port: 6379     │                                         │
│  │  - AOF: Yes     │                                         │
│  │  - RDB: Yes     │                                         │
│  └────────┬────────┘                                         │
│           │                                                   │
│           │ Replication                                       │
│           │                                                   │
│     ┌─────┴─────┬─────────────┐                             │
│     │           │             │                               │
│  ┌──▼──────┐ ┌──▼──────┐ ┌──▼──────┐                       │
│  │Replica 1│ │Replica 2│ │Sentinel │                        │
│  │Port:6380│ │Port:6381│ │  集群   │                        │
│  │AOF: Yes │ │AOF: Yes │ └─────────┘                        │
│  └─────────┘ └─────────┘                                     │
│   (讀取)      (讀取)                                          │
└─────────────────────────────────────────────────────────────┘
```

### Sentinel 監控

```yaml
# Sentinel 配置
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
```

**Sentinel 功能：**
1. **監控**：持續檢查 Master 和 Replica 狀態
2. **通知**：故障時通知管理員
3. **自動故障轉移**：Master 下線時自動提升 Replica
4. **配置提供**：客戶端連接 Sentinel 發現當前 Master

## 持久化文件位置

### Docker Volume 映射

```yaml
volumes:
  - redis_master_data:/data
  - ./backups:/backups
```

### 文件路徑

| 文件 | 路徑 | 說明 |
|------|------|------|
| AOF | `/data/appendonly.aof` | AOF 持久化文件 |
| RDB | `/data/dump.rdb` | RDB 快照文件 |
| 備份 | `/backups/` | 手動備份目錄 |

## 記憶體管理

### 淘汰策略

```conf
# 最大記憶體
maxmemory 512mb

# 淘汰策略
maxmemory-policy allkeys-lru
```

**淘汰策略對比：**

| 策略 | 描述 | 適用場景 |
|------|------|----------|
| `volatile-lru` | 對有 TTL 的 key 使用 LRU | 混合數據 |
| `allkeys-lru` | 對所有 key 使用 LRU | **推薦（預設）** |
| `volatile-lfu` | 對有 TTL 的 key 使用 LFU | 訪問頻率重要 |
| `allkeys-lfu` | 對所有 key 使用 LFU | 訪問頻率重要 |
| `volatile-random` | 隨機刪除有 TTL 的 key | 快速清理 |
| `allkeys-random` | 隨機刪除所有 key | 快速清理 |
| `volatile-ttl` | 刪除即將過期的 key | 優先過期數據 |
| `noeviction` | 不刪除，寫入報錯 | 關鍵數據 |

### LRU vs LFU

- **LRU (Least Recently Used)**：淘汰最久未使用的數據
  - 適合時間相關的快取
  - 實作簡單，性能好
  
- **LFU (Least Frequently Used)**：淘汰訪問頻率最低的數據
  - 適合熱點數據
  - 更精確但開銷更大

## 效能調優

### 1. AOF 重寫優化

```conf
# 當 AOF 文件大小增長 100% 時觸發重寫
auto-aof-rewrite-percentage 100

# 最小重寫大小
auto-aof-rewrite-min-size 64mb

# 重寫時不阻塞
no-appendfsync-on-rewrite no
```

### 2. RDB 優化

```conf
# 啟用壓縮（CPU vs 磁碟空間權衡）
rdbcompression yes

# 啟用校驗和（安全 vs 性能權衡）
rdbchecksum yes

# 停止寫入在 BGSAVE 錯誤時
stop-writes-on-bgsave-error yes
```

### 3. 複製優化

```conf
# 複製積壓緩衝區大小
repl-backlog-size 1mb

# 複製積壓緩衝區過期時間
repl-backlog-ttl 3600

# 最小 Replica 數量（可選）
# min-replicas-to-write 1
# min-replicas-max-lag 10
```

## 監控指標

### 1. 持久化統計

```bash
# 檢查持久化信息
redis-cli INFO Persistence
```

**關鍵指標：**
- `aof_enabled`: AOF 是否啟用
- `aof_current_size`: 當前 AOF 文件大小
- `aof_base_size`: 上次重寫後的大小
- `rdb_last_save_time`: 最後一次 RDB 保存時間
- `rdb_changes_since_last_save`: 自上次保存以來的變更數

### 2. 記憶體使用

```bash
# 檢查記憶體信息
redis-cli INFO Memory
```

**關鍵指標：**
- `used_memory_human`: 使用的記憶體
- `used_memory_peak_human`: 峰值記憶體
- `maxmemory_human`: 最大記憶體限制
- `mem_fragmentation_ratio`: 記憶體碎片率

### 3. 慢查詢監控

```bash
# 查看慢查詢
redis-cli SLOWLOG GET 10
```

```conf
# 慢查詢閾值（微秒）
slowlog-log-slower-than 10000

# 慢查詢日誌長度
slowlog-max-len 128
```

## 備份策略

### 1. 自動備份（RDB）

RDB 快照會根據配置自動觸發：
- 15分鐘內至少 1 次變更
- 5分鐘內至少 10 次變更
- 1分鐘內至少 10000 次變更

### 2. 手動備份

```bash
# 同步保存（阻塞）
redis-cli SAVE

# 異步保存（後台）
redis-cli BGSAVE

# 檢查上次保存時間
redis-cli LASTSAVE
```

### 3. 備份腳本範例

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 觸發 BGSAVE
docker exec suggar-daddy-redis-master redis-cli BGSAVE

# 等待完成
sleep 5

# 複製 RDB 文件
docker cp suggar-daddy-redis-master:/data/dump.rdb \
  $BACKUP_DIR/dump_$DATE.rdb

# 保留最近 7 天的備份
find $BACKUP_DIR -name "dump_*.rdb" -mtime +7 -delete
```

## 災難恢復

### 恢復流程

1. **停止 Redis 服務**
   ```bash
   docker stop suggar-daddy-redis-master
   ```

2. **替換持久化文件**
   ```bash
   # 從備份恢復 RDB
   docker cp backup/dump.rdb suggar-daddy-redis-master:/data/dump.rdb
   
   # 或恢復 AOF
   docker cp backup/appendonly.aof suggar-daddy-redis-master:/data/appendonly.aof
   ```

3. **啟動 Redis 服務**
   ```bash
   docker start suggar-daddy-redis-master
   ```

4. **驗證數據**
   ```bash
   docker exec suggar-daddy-redis-master redis-cli DBSIZE
   docker exec suggar-daddy-redis-master redis-cli INFO Persistence
   ```

### 恢復優先級

1. **AOF 文件存在** → Redis 優先使用 AOF 恢復（最新數據）
2. **只有 RDB 文件** → 使用 RDB 恢復（可能丟失部分數據）
3. **兩者都不存在** → Redis 啟動為空實例

## 測試驗證

### 執行持久化測試

```bash
# 執行測試腳本
./infrastructure/redis/test-persistence.sh
```

測試內容：
1. ✅ 寫入測試數據（String, Hash, List, Set, Sorted Set）
2. ✅ 檢查持久化文件生成
3. ✅ 強制執行 BGSAVE
4. ✅ 重啟 Redis 容器
5. ✅ 驗證數據完整恢復
6. ✅ 檢查配置正確性
7. ✅ 清理測試數據

### 手動驗證

```bash
# 1. 寫入測試數據
docker exec suggar-daddy-redis-master redis-cli SET test:key "test:value" EX 3600

# 2. 檢查持久化文件
docker exec suggar-daddy-redis-master ls -lh /data/

# 3. 重啟容器
docker restart suggar-daddy-redis-master

# 4. 等待啟動
sleep 10

# 5. 驗證數據
docker exec suggar-daddy-redis-master redis-cli GET test:key
```

## 安全性配置

### 1. 禁用危險命令（生產環境）

```conf
# 重命名危險命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG ""
```

### 2. 連接限制

```conf
# 最大客戶端連接數
maxclients 10000

# 超時設定
timeout 0

# TCP keepalive
tcp-keepalive 300
```

### 3. 日誌配置

```conf
# 日誌級別
loglevel notice

# 日誌文件（Docker 環境輸出到 stdout）
logfile ""
```

## 常見問題

### Q1: AOF 文件過大怎麼辦？

**A:** Redis 會自動重寫 AOF 文件。也可以手動觸發：
```bash
redis-cli BGREWRITEAOF
```

### Q2: 如何選擇 AOF 同步策略？

**A:** 根據業務需求選擇：
- **關鍵業務數據**（支付、訂單）：`always`
- **一般應用數據**：`everysec`（推薦）
- **純快取數據**：`no` 或關閉 AOF

### Q3: 持久化對性能有多大影響？

**A:** 
- **AOF (everysec)**：約 2-5% 性能損失
- **RDB**：BGSAVE 期間 fork 可能短暫影響
- **混合持久化**：最佳平衡

### Q4: 重啟後數據丟失怎麼辦？

**A:** 檢查以下項目：
1. 確認 `appendonly yes` 已設置
2. 檢查 `/data` 目錄掛載是否正確
3. 查看 Redis 日誌是否有錯誤
4. 驗證 AOF 文件是否損壞：`redis-check-aof --fix appendonly.aof`

### Q5: 如何判斷持久化是否正常工作？

**A:** 
```bash
# 檢查配置
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET save

# 檢查統計
redis-cli INFO Persistence

# 檢查文件
docker exec suggar-daddy-redis-master ls -lh /data/
```

## 最佳實踐總結

✅ **DO（推薦做法）：**
1. 啟用 AOF 持久化（`appendonly yes`）
2. 使用 `everysec` 同步策略
3. 配置 RDB 作為備份
4. 啟用混合持久化（`aof-use-rdb-preamble yes`）
5. 設置合理的記憶體限制和淘汰策略
6. 定期備份 RDB 文件
7. 監控持久化指標
8. 測試災難恢復流程

❌ **DON'T（避免做法）：**
1. 不要在生產環境關閉持久化
2. 不要使用 `KEYS` 命令（用 `SCAN`）
3. 不要忘記設置 TTL
4. 不要將 Redis 當作永久存儲
5. 不要忽略監控和告警
6. 不要在記憶體滿時不設淘汰策略

## 參考文檔

- [Redis Persistence](https://redis.io/docs/management/persistence/)
- [Redis Sentinel](https://redis.io/docs/management/sentinel/)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)
- [Redis Configuration](https://redis.io/docs/management/config/)

---

**文檔版本：** 1.0  
**最後更新：** 2024-01-XX  
**維護者：** Backend Team
