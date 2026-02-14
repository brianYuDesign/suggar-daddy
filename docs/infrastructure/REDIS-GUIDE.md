# Redis 持久化與運維指南

> 合併自 Redis 持久化報告與快速參考
> 最後更新: 2026-02-14

---

## 架構總覽

```
┌──────────────────────────────────────────────┐
│           Redis HA Cluster                   │
├──────────────────────────────────────────────┤
│  ┌────────────────┐                          │
│  │ Master :6379   │  (讀寫)                  │
│  │ AOF + RDB      │                          │
│  └───────┬────────┘                          │
│          │ Replication                        │
│    ┌─────┴──────┐                            │
│ ┌──▼────┐  ┌───▼───┐   ┌──────────┐        │
│ │Rep #1 │  │Rep #2 │   │ Sentinel │        │
│ │:6380  │  │:6381  │   │ (3 nodes)│        │
│ └───────┘  └───────┘   └──────────┘        │
│  (只讀)     (只讀)                           │
└──────────────────────────────────────────────┘
```

- 3 個 Sentinel 節點負責自動故障轉移
- 2 個 Replica 節點提供讀取分流和備份

---

## 持久化配置

### AOF (Append Only File)

| 配置項 | 值 | 說明 |
|--------|-----|------|
| `appendonly` | yes | 啟用 AOF |
| `appendfsync` | everysec | 每秒同步 (推薦) |
| `auto-aof-rewrite-percentage` | 100 | 增長 100% 時自動重寫 |
| `aof-use-rdb-preamble` | yes | 混合持久化 (RDB + AOF 增量) |

### RDB (快照)

| 觸發條件 | 說明 |
|----------|------|
| `save 900 1` | 15 分鐘內 >= 1 次變更 |
| `save 300 10` | 5 分鐘內 >= 10 次變更 |
| `save 60 10000` | 1 分鐘內 >= 10000 次變更 |

### 記憶體管理

| 配置項 | 值 | 說明 |
|--------|-----|------|
| `maxmemory` | 512mb | 最大記憶體限制 |
| `maxmemory-policy` | allkeys-lru | LRU 淘汰策略 |

### 持久化檔案結構

```
/data/
├── appendonlydir/
│   ├── appendonly.aof.1.base.rdb    # RDB 基底
│   └── appendonly.aof.1.incr.aof    # AOF 增量
└── dump.rdb                          # RDB 快照
```

---

## TTL 策略

### TTL 常量

專案提供語意化 TTL 常量，位於 `libs/redis/src/constants/ttl.ts`：

```typescript
import { TTL } from '@suggar-daddy/redis/constants';

// 超短期
TTL.ONE_MINUTE        // 60s
TTL.FIVE_MINUTES      // 300s
TTL.FIFTEEN_MINUTES   // 900s

// 短期
TTL.THIRTY_MINUTES    // 1800s
TTL.ONE_HOUR          // 3600s

// 中期
TTL.ONE_DAY           // 86400s
TTL.THREE_DAYS        // 259200s

// 長期
TTL.ONE_WEEK          // 604800s
TTL.ONE_MONTH         // 2592000s
```

### 各服務建議 TTL

| 服務 | 資料類型 | 建議 TTL |
|------|----------|----------|
| Auth | Access Token | 1 小時 |
| Auth | Refresh Token | 1 週 |
| Auth | 驗證碼 | 15 分鐘 |
| User | 用戶資料快取 | 1 小時 |
| User | 在線狀態 | 5 分鐘 |
| Matching | 推薦列表 | 15 分鐘 |
| Matching | 位置資訊 | 10 分鐘 |
| Messaging | 輸入狀態 | 1 分鐘 |
| Messaging | 未讀計數 | 1 週 |
| Payment | 訂單鎖 | 5 分鐘 |
| Notification | 通知 | 7 天 |

### 使用原則

```typescript
// 推薦：使用 TTL 常量
await redis.set('user:profile:123', data, TTL.ONE_HOUR);

// 不推薦：直接寫數字
await redis.set('user:profile:123', data, 3600);

// 避免：沒有 TTL (導致記憶體洩漏)
await redis.set('user:profile:123', data);
```

---

## 常用運維命令

### 持久化操作

```bash
# 後台保存 RDB (推薦)
redis-cli BGSAVE

# 檢查上次保存時間
redis-cli LASTSAVE

# 強制 AOF 重寫
redis-cli BGREWRITEAOF

# 檢查持久化狀態
redis-cli INFO Persistence
```

### TTL 操作

```bash
# 設置帶 TTL 的 key
redis-cli SETEX mykey 3600 "value"

# 檢查 TTL
redis-cli TTL mykey

# 為現有 key 設定 TTL
redis-cli EXPIRE mykey 3600
```

### 監控

```bash
# 記憶體使用
redis-cli INFO Memory

# 複製狀態
redis-cli INFO Replication

# 慢查詢
redis-cli SLOWLOG GET 10

# Key 數量
redis-cli DBSIZE

# 命令統計
redis-cli INFO commandstats
```

### 檢查持久化

```bash
docker exec suggar-daddy-redis-master redis-cli CONFIG GET appendonly
docker exec suggar-daddy-redis-master redis-cli CONFIG GET save
docker exec suggar-daddy-redis-master ls -lh /data/
```

---

## 測試持久化

```bash
./infrastructure/redis/test-persistence.sh
```

測試內容：寫入多種資料類型 -> 強制 BGSAVE -> 重啟 Redis -> 驗證資料完整恢復。

---

## 故障排查

### Redis 啟動失敗

```bash
docker-compose logs redis-master --tail=50
# 常見原因：配置格式錯誤、持久化檔案損壞、記憶體不足
```

### 資料未持久化

```bash
redis-cli CONFIG GET appendonly   # 確認 AOF 啟用
docker exec suggar-daddy-redis-master ls -lh /data/   # 確認檔案存在
docker inspect suggar-daddy-redis-master | grep -A 10 Mounts  # 確認 Volume
```

### AOF 檔案修復

```bash
docker exec suggar-daddy-redis-master redis-check-aof /data/appendonlydir/appendonly.aof.1.incr.aof
docker exec suggar-daddy-redis-master redis-check-aof --fix /data/appendonlydir/appendonly.aof.1.incr.aof
```

### 記憶體使用過高

- 檢查沒有 TTL 的 key 數量
- 確認 `maxmemory-policy` 設定為 `allkeys-lru`
- 審查各服務是否遵循 TTL 策略

---

## 緊急恢復

```bash
# 1. 停止 Redis
docker stop suggar-daddy-redis-master

# 2. 替換持久化檔案
docker cp backup/dump.rdb suggar-daddy-redis-master:/data/

# 3. 啟動 Redis
docker start suggar-daddy-redis-master

# 4. 驗證
docker exec suggar-daddy-redis-master redis-cli DBSIZE
```

---

## 告警閾值

| 指標 | 閾值 | 動作 |
|------|------|------|
| 沒有 TTL 的 key 數量 | > 100 | 審查程式碼 |
| 記憶體使用率 | > 80% | 檢查 TTL / 擴容 |
| AOF 重寫時間 | > 60 秒 | 調整 rewrite 設定 |
| Replica 延遲 | > 10 秒 | 檢查網路/負載 |

---

## 效能影響

| 項目 | 影響 |
|------|------|
| 寫入效能 | 約 2-5% 降低 (AOF everysec) |
| 記憶體使用 | 無顯著影響 |
| 啟動時間 | 增加 1-3 秒 (載入持久化檔案) |
| 磁碟空間 | AOF 100-500 MB + RDB 50-200 MB |

---

## 相關檔案

- `infrastructure/redis/master/redis.conf` — Master 配置
- `infrastructure/redis/replica/redis.conf` — Replica 配置
- `infrastructure/redis/sentinel/sentinel.conf` — Sentinel 配置
- `infrastructure/redis/test-persistence.sh` — 持久化測試腳本
- `libs/redis/src/constants/ttl.ts` — TTL 常量定義
- `libs/redis/src/redis.service.ts` — Redis 服務
- `docs/REDIS_PERSISTENCE.md` — 持久化詳細文件
- `docs/REDIS_TTL_GUIDE.md` — TTL 使用指南
