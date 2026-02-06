# 效能調優指南

本文件說明讀寫分離、Sharding、連線池與相關效能設定。

---

## 1. 讀寫分離（Replication）

僅 **DB Writer 服務** 連線資料庫。啟用讀寫分離後，TypeORM 會將 **寫入** 送往 Master、**讀取** 送往 Replica(s)。

### 環境變數

| 變數 | 說明 | 範例 |
|------|------|------|
| `DB_MASTER_HOST` | Master 主機（寫入） | `master.db.internal` 或 `localhost` |
| `DB_MASTER_PORT` | Master 埠號（可選） | `5432` |
| `DB_REPLICA_HOSTS` | Replica 主機列表，逗號分隔 | `replica1.db.internal,replica2.db.internal` |
| `DB_REPLICA0_PORT`, `DB_REPLICA1_PORT`, ... | 各 Replica 埠號（可選） | `5432` |
| `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | 與單機模式共用 | — |

**啟用條件：** 同時設定 `DB_MASTER_HOST` 與 `DB_REPLICA_HOSTS`（至少一個 Replica）時，`getDatabaseConfig()` 會回傳 replication 設定；否則為單一連線。

### 範例

```bash
# 單機（預設）
DB_HOST=localhost
DB_PORT=5432

# 讀寫分離
DB_MASTER_HOST=pg-master.internal
DB_MASTER_PORT=5432
DB_REPLICA_HOSTS=pg-replica1.internal,pg-replica2.internal
DB_USERNAME=app
DB_PASSWORD=***
DB_DATABASE=suggar_daddy
```

---

## 2. 連線池（Connection Pool）

所有使用 `getDatabaseConfig()` 的服務（含 DB Writer）都會套用以下 pool 設定，可透過環境變數覆寫：

| 變數 | 說明 | 預設 |
|------|------|------|
| `DB_POOL_MAX` | 池內最大連線數 | `20` |
| `DB_POOL_MIN` | 池內最小連線數 | `5` |
| `DB_POOL_IDLE_TIMEOUT_MS` | 閒置連線逾時（ms） | `30000` |
| `DB_CONNECT_TIMEOUT_MS` | 建立連線逾時（ms） | `5000` |

建議依實例 CPU 與 DB 負載調整：寫多讀少時可提高 `DB_POOL_MAX`；Replica 數量多時可適度提高各服務的 pool。

---

## 3. Sharding（分片）

分片鍵策略與 `BACKEND_DESIGN.md` 一致，由 `@suggar-daddy/common` 的 `ShardingService` 提供。

### 使用方式

```ts
import { ShardingService } from '@suggar-daddy/common';

// 注入
constructor(private readonly sharding: ShardingService) {}

// 依 user_id（users, swipes, matches, subscriptions 等）
const shardId = this.sharding.getShardIdByUserId(userId);

// 依 conversation_id（messages）
const shardId = this.sharding.getShardIdByConversationId(conversationId);

// 依 creator_id（posts）
const shardId = this.sharding.getShardIdByCreatorId(creatorId);

// 通用
const shardId = this.sharding.getShardId(anyKey);
```

### 環境變數

| 變數 | 說明 | 預設 |
|------|------|------|
| `SHARD_COUNT` | 分片數量 | `16` |

### 與 Citus / 多資料源整合

- **Citus**：通常單一連線，由 Citus 依 distribution column 路由，`ShardingService.getShardId()` 可作為 routing hint 或對應到 worker 節點。
- **Application-level 多資料源**：可依 `getShardId()` 選擇對應的 TypeORM DataSource（例如 `dataSources[shardId]`），需自行在應用內註冊多個 `TypeOrmModule.forRoot()` 或使用 TypeORM 多 DataSource API。

---

## 4. 資料庫索引建議

下列索引可依實際查詢與 migration 流程加入，以降低延遲與鎖競爭：

| 表 | 建議索引 | 用途 |
|----|----------|------|
| users | `(email)` UNIQUE | 登入 / 註冊查詢 |
| users | `(last_active_at)` | 推薦卡片排序 |
| swipes | `(swiper_id, swiped_id)` 或複合 | 滑動查詢、防重複 |
| matches | `(user_a_id, user_b_id)` | 配對查詢 |
| messages | `(conversation_id, created_at)` | 對話訊息列表 |
| subscriptions | `(subscriber_id)`, `(creator_id)` | 訂閱列表 / 創作者收入 |
| posts | `(creator_id, created_at)` | 創作者貼文列表 |
| transactions | `(user_id, created_at)` | 交易紀錄 |

具體 SQL 與 migration 請見各服務的 `migrations/` 與 `docs/DATABASE_MIGRATIONS.md`。

---

## 5. Redis 與 Kafka 調優要點

- **Redis**：依記憶體設定 `maxmemory` 與 `maxmemory-policy`（如 `allkeys-lru`）；必要時使用 Redis Cluster。
- **Kafka**：依吞吐調整 consumer `fetch.min.bytes`、`max.poll.records`；producer 可調整 `linger.ms`、`batch.size` 以換取吞吐與延遲。

詳細監控與告警見 `docs/DEVOPS.md`。
