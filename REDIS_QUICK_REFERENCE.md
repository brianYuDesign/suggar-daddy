# Redis 持久化與 TTL 快速參考

## 🚀 快速開始

### 檢查持久化狀態

```bash
# 檢查配置
docker exec suggar-daddy-redis-master redis-cli CONFIG GET appendonly
docker exec suggar-daddy-redis-master redis-cli CONFIG GET save

# 檢查持久化統計
docker exec suggar-daddy-redis-master redis-cli INFO Persistence

# 檢查文件
docker exec suggar-daddy-redis-master ls -lh /data/
```

### 運行測試

```bash
# 執行完整的持久化測試
./infrastructure/redis/test-persistence.sh
```

## 📊 配置總覽

### AOF 配置

| 配置項 | 值 | 說明 |
|--------|-----|------|
| `appendonly` | yes | ✅ AOF 已啟用 |
| `appendfsync` | everysec | 每秒同步（推薦） |
| `auto-aof-rewrite-percentage` | 100 | 增長 100% 時重寫 |
| `aof-use-rdb-preamble` | yes | 混合持久化 |

### RDB 配置

| 觸發條件 | 說明 |
|----------|------|
| `save 900 1` | 15分鐘內 ≥1 次變更 |
| `save 300 10` | 5分鐘內 ≥10 次變更 |
| `save 60 10000` | 1分鐘內 ≥10000 次變更 |

### 記憶體配置

| 配置項 | 值 | 說明 |
|--------|-----|------|
| `maxmemory` | 512mb | 最大記憶體限制 |
| `maxmemory-policy` | allkeys-lru | LRU 淘汰策略 |

## 💾 持久化文件

```
/data/
├── appendonlydir/      # AOF 文件目錄
│   ├── appendonly.aof.1.base.rdb
│   └── appendonly.aof.1.incr.aof
└── dump.rdb            # RDB 快照文件
```

## ⏱️ TTL 使用

### 導入 TTL 常量

```typescript
import { TTL } from '@suggar-daddy/redis/constants';
```

### 常用 TTL 值

```typescript
// 超短期（實時數據）
TTL.ONE_MINUTE        // 60 秒
TTL.FIVE_MINUTES      // 300 秒
TTL.FIFTEEN_MINUTES   // 900 秒

// 短期（快取數據）
TTL.THIRTY_MINUTES    // 1800 秒
TTL.ONE_HOUR          // 3600 秒
TTL.TWO_HOURS         // 7200 秒

// 中期（穩定數據）
TTL.ONE_DAY           // 86400 秒
TTL.THREE_DAYS        // 259200 秒

// 長期（靜態數據）
TTL.ONE_WEEK          // 604800 秒
TTL.ONE_MONTH         // 2592000 秒
```

### 使用範例

```typescript
// ✅ 推薦：使用 TTL 常量
await redis.set('user:profile:123', data, TTL.ONE_HOUR);

// ❌ 不推薦：直接寫數字
await redis.set('user:profile:123', data, 3600);

// ❌ 避免：沒有 TTL
await redis.setPermanent('user:profile:123', data);
```

## 📋 按服務分類的 TTL

| 服務 | 數據類型 | 建議 TTL |
|------|----------|----------|
| **Auth** | Access Token | `TTL.ONE_HOUR` |
| | Refresh Token | `TTL.ONE_WEEK` |
| | 驗證碼 | `TTL.FIFTEEN_MINUTES` |
| **User** | 用戶資料 | `TTL.ONE_HOUR` |
| | 在線狀態 | `TTL.FIVE_MINUTES` |
| **Matching** | 推薦列表 | `TTL.FIFTEEN_MINUTES` |
| | 位置信息 | `TTL.TEN_MINUTES` |
| **Messaging** | 輸入狀態 | `TTL.ONE_MINUTE` |
| | 未讀計數 | `TTL.ONE_WEEK` |
| **Payment** | 訂單鎖 | `TTL.FIVE_MINUTES` |
| | 交易歷史 | `TTL.ONE_HOUR` |

## 🔧 常用命令

### 持久化操作

```bash
# 立即保存 RDB 快照（阻塞）
redis-cli SAVE

# 後台保存 RDB 快照（推薦）
redis-cli BGSAVE

# 檢查上次保存時間
redis-cli LASTSAVE

# 強制 AOF 重寫
redis-cli BGREWRITEAOF
```

### 數據操作

```bash
# 設置帶 TTL 的 key
redis-cli SETEX mykey 3600 "value"

# 檢查 TTL（秒）
redis-cli TTL mykey

# 檢查 TTL（毫秒）
redis-cli PTTL mykey

# 移除 TTL（變為永久）
redis-cli PERSIST mykey

# 設置 TTL 到現有 key
redis-cli EXPIRE mykey 3600
```

### 監控命令

```bash
# 查看所有配置
redis-cli CONFIG GET "*"

# 查看持久化信息
redis-cli INFO Persistence

# 查看記憶體信息
redis-cli INFO Memory

# 查看慢查詢
redis-cli SLOWLOG GET 10

# 查看 key 數量
redis-cli DBSIZE
```

## 🔍 故障排查

### 問題：Redis 啟動失敗

```bash
# 檢查日誌
docker-compose logs redis-master --tail=50

# 常見原因
# 1. 配置文件格式錯誤
# 2. 持久化文件損壞
# 3. 記憶體不足
```

### 問題：數據未持久化

```bash
# 1. 檢查 AOF 是否啟用
redis-cli CONFIG GET appendonly

# 2. 檢查文件是否存在
docker exec suggar-daddy-redis-master ls -lh /data/

# 3. 檢查 volume 映射
docker inspect suggar-daddy-redis-master | grep -A 10 Mounts
```

### 問題：記憶體使用過高

```bash
# 檢查記憶體使用
redis-cli INFO Memory

# 檢查沒有 TTL 的 key
redis-cli --scan --pattern "*" | while read key; do
  ttl=$(redis-cli TTL "$key")
  if [ "$ttl" = "-1" ]; then
    echo "$key has no TTL"
  fi
done

# 手動觸發淘汰
# 降低 maxmemory 值會觸發淘汰策略
```

## 📚 相關文檔

- 📖 [Redis 持久化配置指南](./docs/REDIS_PERSISTENCE.md) - 完整的持久化說明
- 📖 [Redis TTL 使用指南](./docs/REDIS_TTL_GUIDE.md) - TTL 最佳實踐
- 🧪 [持久化測試腳本](./infrastructure/redis/test-persistence.sh) - 自動化測試

## ✅ 驗證清單

在生產部署前，確保：

- [ ] `appendonly yes` 已設置
- [ ] `appendfsync everysec` 已設置
- [ ] RDB `save` 規則已配置
- [ ] Volume 正確映射到 `/data`
- [ ] 持久化測試通過
- [ ] 所有 Redis 操作都設置了 TTL
- [ ] 監控和告警已配置

## 🚨 緊急恢復

### 從備份恢復

```bash
# 1. 停止 Redis
docker stop suggar-daddy-redis-master

# 2. 替換持久化文件
docker cp backup/dump.rdb suggar-daddy-redis-master:/data/
# 或
docker cp backup/appendonly.aof suggar-daddy-redis-master:/data/

# 3. 啟動 Redis
docker start suggar-daddy-redis-master

# 4. 驗證數據
docker exec suggar-daddy-redis-master redis-cli DBSIZE
```

### AOF 文件修復

```bash
# 檢查 AOF 文件
docker exec suggar-daddy-redis-master redis-check-aof /data/appendonlydir/appendonly.aof.1.incr.aof

# 修復 AOF 文件
docker exec suggar-daddy-redis-master redis-check-aof --fix /data/appendonlydir/appendonly.aof.1.incr.aof
```

## 📞 聯絡資訊

- 維護團隊：Backend Team
- 文檔版本：1.0
- 最後更新：2024-01-XX

---

**💡 提示：** 這是快速參考指南。詳細信息請參閱完整文檔。
