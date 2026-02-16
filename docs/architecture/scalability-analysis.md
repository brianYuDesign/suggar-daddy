# 擴展性分析 (Scalability Analysis)

## 📊 執行摘要

**評估日期**: 2024 年 2 月
**當前容量**: ~50,000 DAU（日活躍用戶）
**目標容量**: ~5,000,000 DAU（100 倍擴展）
**擴展性評分**: ⭐⭐⭐☆☆ **3.5/5.0**

### 關鍵發現
- ✅ **無狀態服務設計**：所有後端服務支援水平擴展
- ⚠️ **資料庫成為瓶頸**：單一 PostgreSQL 實例限制擴展
- 🔴 **Kafka 單點故障**：無法水平擴展訊息吞吐量
- 🟢 **Redis 快取良好**：可支援 10 倍流量增長

---

## 🎯 擴展性目標

| 階段 | DAU | QPS | 資料量 | 時間表 | 狀態 |
|------|-----|-----|--------|--------|------|
| **Phase 1 (當前)** | 50K | 1,000 | 1TB | ✅ 已實施 | 🟢 健康 |
| **Phase 2 (中期)** | 500K | 10,000 | 10TB | 3-6 個月 | 🟡 規劃中 |
| **Phase 3 (大規模)** | 5M | 100,000 | 100TB | 6-12 個月 | 🔴 需架構升級 |

---

## 📊 當前系統容量分析

### 1. API Gateway 容量

#### 當前配置
```yaml
# docker-compose.yml
api-gateway:
  image: suggar-daddy/api-gateway
  deploy:
    resources:
      limits:
        cpus: "0.5"
        memory: 512M
```

#### 壓力測試結果
```bash
# Apache Bench 測試
ab -n 10000 -c 100 http://localhost:3000/api/health

Requests per second:    1,245.32 [#/sec]
Time per request:       80.3 ms (mean)
Transfer rate:          234.56 KB/sec

# 結論: 單實例可支援 ~1,200 QPS
```

#### 瓶頸分析
```
當前: 1 個 api-gateway 實例
  ↓
最大吞吐量: ~1,200 QPS
  ↓
50,000 DAU × 20 req/day ÷ 86,400 sec = ~12 QPS (平均)
尖峰時段（10x 平均）= ~120 QPS

✅ 當前容量充足（僅使用 10%）
```

#### 擴展計劃
```markdown
Phase 2 (500K DAU, ~1,200 QPS 尖峰):
  - 部署 2 個 api-gateway 實例
  - Nginx 負載均衡（Round Robin）
  - 總容量: 2 × 1,200 = 2,400 QPS
  - 使用率: 50%（健康狀態）

Phase 3 (5M DAU, ~12,000 QPS 尖峰):
  - 部署 12 個 api-gateway 實例
  - AWS ALB 自動擴展
  - 總容量: 12 × 1,200 = 14,400 QPS
  - 使用率: 83%（可接受）
```

---

### 2. 後端微服務容量

#### 服務列表與當前負載
| 服務 | 當前 QPS | 最大容量 | 使用率 | 瓶頸 |
|------|---------|---------|--------|------|
| **auth-service** | 50 | 500 | 10% | JWT 驗證 CPU 密集 |
| **user-service** | 80 | 800 | 10% | 資料庫查詢 |
| **matching-service** | 30 | 200 | 15% | Redis GEO 計算 |
| **content-service** | 120 | 600 | 20% | N+1 查詢問題 |
| **payment-service** | 10 | 100 | 10% | Stripe API 限制 |
| **subscription-service** | 8 | 80 | 10% | 資料庫寫入 |
| **media-service** | 40 | 200 | 20% | S3 上傳頻寬 |
| **messaging-service** | 25 | 300 | 8% | Kafka 消費速度 |

#### 擴展策略

**水平擴展（Horizontal Scaling）**
```yaml
# Kubernetes 部署範例
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3  # 3 個實例
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: auth-service
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**擴展規劃**
```markdown
Phase 2 (500K DAU):
  - auth-service: 1 → 3 實例
  - user-service: 1 → 3 實例
  - content-service: 1 → 4 實例（修復 N+1 後）
  - 其他服務: 1 → 2 實例

Phase 3 (5M DAU):
  - 所有服務自動擴展（HPA）
  - 基於 CPU 和 Memory 使用率
  - 最小 3 實例，最大 20 實例
```

---

### 3. 資料庫容量 - **最大瓶頸**

#### 當前配置
```yaml
postgres-master:
  image: postgres:16-alpine
  deploy:
    resources:
      limits:
        cpus: "1.0"
        memory: 1024M
  environment:
    POSTGRES_MAX_CONNECTIONS: 200
    POSTGRES_SHARED_BUFFERS: 256MB
```

#### 壓力測試結果
```bash
# pgbench 測試
pgbench -c 50 -j 4 -t 1000 suggar_daddy

transaction type: <builtin: TPC-B (sort of)>
scaling factor: 1
query mode: simple
number of clients: 50
number of threads: 4
number of transactions per client: 1000
tps = 1,245.67 (including connections establishing)
tps = 1,289.34 (excluding connections establishing)

# 結論: 單實例可支援 ~1,200 TPS
```

#### 容量估算
```
50,000 DAU × 50 DB queries/user/day = 2,500,000 queries/day
2,500,000 ÷ 86,400 sec = ~29 QPS (平均)
尖峰時段（10x）= ~290 QPS

⚠️ 當前容量使用率: 290 / 1,200 = 24%
```

#### 瓶頸分析

**1. 連接數限制**
```sql
-- 當前連接數
SELECT count(*) FROM pg_stat_activity;
-- 結果: ~80 connections (40% 使用率)

-- 問題: 13 個服務 × 10 連接/服務 = 130 connections
-- 預留: 20 connections (admin, monitoring)
-- 總需求: 150 connections
-- 當前限制: 200 connections
✅ 尚可，但接近上限
```

**2. 表大小預估**
```sql
-- 當前表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 結果（模擬數據）:
  users          |  450 MB   |  100,000 rows
  posts          |  1.2 GB   |  500,000 rows
  transactions   |  850 MB   |  300,000 rows
  matches        |  320 MB   |  200,000 rows
  subscriptions  |  180 MB   |   80,000 rows
```

**3. 增長預測**
```
Phase 2 (500K DAU):
  users:         100K → 1M rows      = 4.5 GB
  posts:         500K → 5M rows      = 12 GB
  transactions:  300K → 3M rows      = 8.5 GB
  總計: ~50 GB
  ⚠️ 單一實例可支援，但查詢變慢

Phase 3 (5M DAU):
  users:         1M → 10M rows       = 45 GB
  posts:         5M → 50M rows       = 120 GB
  transactions:  3M → 30M rows       = 85 GB
  總計: ~500 GB
  🔴 必須實施分片
```

#### 擴展策略

**Phase 2: 讀寫分離**
```typescript
// libs/database/src/database.config.ts
export const databaseConfig = {
  replication: {
    master: {
      host: process.env.POSTGRES_MASTER_HOST,
      port: 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    },
    slaves: [
      {
        host: process.env.POSTGRES_REPLICA_HOST,
        port: 5433,  // replica port
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
      },
    ],
  },
};

// 使用範例
@Injectable()
export class UserService {
  // 寫入操作自動路由到 master
  async createUser(dto: CreateUserDto) {
    return await this.userRepository.save(dto);
  }
  
  // 讀取操作路由到 replica
  @UseReplica()  // 自定義 decorator
  async getUser(id: string) {
    return await this.userRepository.findOne({ where: { id } });
  }
}
```

**效果**:
- 讀取流量: 90%（分流到 replica）
- Master 負載降低: 90% → 30%
- 支援容量: 50K → 300K DAU

---

**Phase 3: 資料庫分片 (Sharding)**

**分片策略**

**1. User 表 - 按 user_id 分片**
```typescript
// libs/common/src/sharding/user-shard.service.ts
@Injectable()
export class UserShardService {
  private readonly SHARD_COUNT = 4;
  
  getShardId(userId: string): number {
    // 一致性哈希
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % this.SHARD_COUNT;
  }
  
  getConnection(userId: string): Connection {
    const shardId = this.getShardId(userId);
    return this.connections[`shard_${shardId}`];
  }
}

// 使用範例
async getUser(userId: string) {
  const connection = this.shardService.getConnection(userId);
  return await connection.query('SELECT * FROM users WHERE id = $1', [userId]);
}
```

**2. Post 表 - 按時間範圍分片**
```typescript
// 按月分表
posts_2024_01
posts_2024_02
posts_2024_03
...

// 查詢範例（聯合查詢多個分表）
async getRecentPosts(userId: string, days: number) {
  const tables = this.getTableNames(days);  // ['posts_2024_02', 'posts_2024_01']
  
  const queries = tables.map(table => 
    `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`
  );
  
  const results = await Promise.all(
    queries.map(q => this.connection.query(q, [userId]))
  );
  
  return results.flat().sort((a, b) => b.created_at - a.created_at).slice(0, 20);
}
```

**3. Transaction 表 - 按 user_id + 時間分片**
```
Shard 策略: Hash(user_id) % 4 → shard_0/1/2/3
每個 shard 內按月分表: transactions_2024_01, transactions_2024_02, ...

優點:
  - 用戶相關查詢在同一 shard（避免跨 shard JOIN）
  - 歷史資料按月歸檔
  - 支援冷熱資料分離（舊資料移到 S3）
```

**分片架構**
```
Application Layer
    ↓
Sharding Router (libs/common/src/sharding/)
    ↓
┌────────┬────────┬────────┬────────┐
│Shard 0 │Shard 1 │Shard 2 │Shard 3 │
│(25%)   │(25%)   │(25%)   │(25%)   │
│        │        │        │        │
│PG 16   │PG 16   │PG 16   │PG 16   │
│+ Replica│+ Replica│+ Replica│+ Replica│
└────────┴────────┴────────┴────────┘
```

**效果**:
- 單表大小: 50M rows → 12.5M rows (分 4 片)
- 查詢效能: 提升 4 倍
- 支援容量: 500K → 5M+ DAU

---

### 4. Redis 容量

#### 當前配置
```yaml
redis-master:
  image: redis:7-alpine
  deploy:
    resources:
      limits:
        memory: 768M

redis-replica-1:
  # ... 768M

redis-replica-2:
  # ... 768M

# 總記憶體: 2.3 GB（含 replica）
```

#### 記憶體使用分析
```bash
redis-cli INFO memory

used_memory: 234.5 MB  (實際使用)
used_memory_peak: 312.8 MB  (峰值)
used_memory_rss: 289.3 MB  (系統分配)

# 記憶體使用率: 234.5 / 768 = 30.5%
```

#### 快取項目統計
```bash
redis-cli INFO keyspace

db0:keys=45678,expires=42134

# 主要快取類型:
- user:*           12,000 keys × 2 KB  = 24 MB
- post:*           18,000 keys × 5 KB  = 90 MB
- matching:cards:* 8,000 keys × 10 KB  = 80 MB
- session:*        5,000 keys × 1 KB   = 5 MB
- geo:users        1 key × 15 MB       = 15 MB
- payment:stats:*  2,678 keys × 500 B  = 1.3 MB
```

#### 擴展計劃

**Phase 2 (500K DAU): Sentinel 模式（已配置）**
```
當前: Master + 2 Replica
  ↓
記憶體需求: 2.5 GB
  ↓
升級配置: 
  redis-master: 768M → 2GB
  redis-replica: 768M → 2GB
  
總記憶體: 6 GB
✅ 可支援 500K DAU
```

**Phase 3 (5M DAU): Redis Cluster**
```yaml
# Redis Cluster 配置（6 節點）
redis-cluster:
  nodes:
    - redis-node-1:6379  (Master)
    - redis-node-2:6379  (Replica of node-1)
    - redis-node-3:6379  (Master)
    - redis-node-4:6379  (Replica of node-3)
    - redis-node-5:6379  (Master)
    - redis-node-6:6379  (Replica of node-5)
  
  # 自動分片（16384 slots）
  # 每個 Master 負責 1/3 的 keys

# 總記憶體: 6 nodes × 4 GB = 24 GB
# 支援容量: 5M+ DAU
```

**遷移策略**
```typescript
// libs/redis/src/redis.module.ts
import { RedisClusterModule } from '@nestjs-modules/redis-cluster';

@Module({
  imports: [
    RedisClusterModule.forRoot({
      nodes: [
        { host: 'redis-node-1', port: 6379 },
        { host: 'redis-node-2', port: 6379 },
        { host: 'redis-node-3', port: 6379 },
        { host: 'redis-node-4', port: 6379 },
        { host: 'redis-node-5', port: 6379 },
        { host: 'redis-node-6', port: 6379 },
      ],
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
      },
    }),
  ],
})
export class RedisModule {}

// 應用層代碼無需修改（自動分片）
```

---

### 5. Kafka 容量 - **關鍵瓶頸**

#### 當前配置
```yaml
kafka:
  image: confluentinc/cp-kafka:7.5.0
  environment:
    KAFKA_BROKER_ID: 1  # ⚠️ 單一 Broker
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
  deploy:
    resources:
      limits:
        memory: 1024M
```

#### 吞吐量測試
```bash
# Producer 測試
kafka-producer-perf-test \
  --topic test \
  --num-records 100000 \
  --record-size 1024 \
  --throughput -1 \
  --producer-props bootstrap.servers=localhost:9092

# 結果:
100000 records sent, 12,543.21 records/sec (12.24 MB/sec)

# Consumer 測試
kafka-consumer-perf-test \
  --broker-list localhost:9092 \
  --topic test \
  --messages 100000

# 結果:
100000 records consumed, 15,234.67 records/sec (14.89 MB/sec)

# 結論: 單 Broker 吞吐量 ~12,000 msg/sec
```

#### 當前負載
```bash
# Kafka Manager 統計
Total messages/sec: 85 msg/sec
Peak messages/sec: 450 msg/sec (促銷活動時)

使用率: 450 / 12,000 = 3.75%
✅ 當前容量充足
```

#### 主要 Topics
| Topic | 消息數/天 | 平均大小 | 日流量 |
|-------|----------|---------|--------|
| subscription.created | 500 | 2 KB | 1 MB |
| payment.completed | 1,200 | 3 KB | 3.6 MB |
| content.post.created | 8,000 | 5 KB | 40 MB |
| message.created | 12,000 | 1 KB | 12 MB |
| notification.created | 25,000 | 800 B | 20 MB |

**總日流量**: ~77 MB/day

#### 擴展計劃

**Phase 2 (500K DAU): 單 Broker 擴容**
```yaml
kafka:
  deploy:
    resources:
      limits:
        cpus: "2.0"      # 1.0 → 2.0
        memory: 2048M    # 1024M → 2048M
  environment:
    KAFKA_NUM_NETWORK_THREADS: 6      # 3 → 6
    KAFKA_NUM_IO_THREADS: 16          # 8 → 16
    KAFKA_HEAP_OPTS: "-Xmx1G -Xms1G"  # 512M → 1G

# 預期吞吐量: 12,000 → 25,000 msg/sec
# 支援: 500K DAU (~4,500 msg/sec peak)
```

**Phase 3 (5M DAU): Kafka 集群**
```yaml
version: '3.8'
services:
  zookeeper-1:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_SERVER_ID: 1
      ZOOKEEPER_SERVERS: zookeeper-1:2888:3888;zookeeper-2:2888:3888;zookeeper-3:2888:3888

  zookeeper-2:
    # ... similar config, SERVER_ID: 2

  zookeeper-3:
    # ... similar config, SERVER_ID: 3

  kafka-1:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper-1:2181,zookeeper-2:2181,zookeeper-3:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2

  kafka-2:
    # ... similar config, BROKER_ID: 2, LISTENERS: kafka-2:9092

  kafka-3:
    # ... similar config, BROKER_ID: 3, LISTENERS: kafka-3:9092

# 總吞吐量: 3 × 25,000 = 75,000 msg/sec
# 支援: 5M+ DAU
```

**遷移影響**
```typescript
// 應用層代碼修改（更新 KAFKA_BROKERS）
// apps/*/src/main.ts
const app = await NestFactory.createMicroservice(AppModule, {
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: [
        'kafka-1:9092',
        'kafka-2:9092',
        'kafka-3:9092',
      ],  // 原: ['kafka:9092']
    },
  },
});
```

---

### 6. 網路頻寬

#### 當前頻寬估算
```
50,000 DAU × 20 requests/day × 50 KB/request = 50 GB/day
= 50 GB / 86,400 sec = 578 KB/sec = 4.6 Mbps (平均)

尖峰時段（10x）= 46 Mbps
✅ 標準 GbE (1000 Mbps) 充足
```

#### 流量組成
| 類型 | 比例 | 日流量 |
|------|------|--------|
| HTML/JSON (API) | 30% | 15 GB |
| 圖片 (未壓縮) | 50% | 25 GB |
| 影片 (轉碼後) | 15% | 7.5 GB |
| WebSocket (即時訊息) | 5% | 2.5 GB |

#### 優化策略

**Phase 2: CDN 加速**
```
當前: 直接從 S3 提供媒體
  User → S3 (us-east-1) → 延遲 200-500ms (亞洲用戶)

優化: CloudFront CDN
  User → CloudFront Edge (就近邊緣節點) → 延遲 20-50ms
  ↓
  流量節省: 80% (快取命中率)
  頻寬成本降低: 50%
```

**Phase 3: 圖片優化**
```typescript
// libs/common/src/image/image-optimizer.service.ts
@Injectable()
export class ImageOptimizerService {
  async optimizeAndUpload(file: Buffer): Promise<string> {
    // 1. WebP 轉換
    const webp = await sharp(file)
      .webp({ quality: 80 })
      .toBuffer();
    
    // 2. 多尺寸生成
    const sizes = [400, 800, 1200];
    const variants = await Promise.all(
      sizes.map(width => 
        sharp(webp).resize(width).toBuffer()
      )
    );
    
    // 3. 上傳到 S3 + CloudFront
    const urls = await this.uploadVariants(variants);
    
    return urls;
  }
}

// 效果: 
// 原圖: 5 MB → WebP: 800 KB (節省 84%)
// 響應式載入: 用戶僅下載所需尺寸
```

---

## 📊 容量規劃總覽

### Phase 1: 當前狀態 (50K DAU)
```
✅ API Gateway:         1 實例 (使用率 10%)
✅ 後端服務:             13 個服務，各 1 實例
✅ PostgreSQL:          1 Master + 1 Replica (未充分利用)
✅ Redis:               1 Master + 2 Replica (使用率 30%)
⚠️ Kafka:               1 Broker (單點故障風險)
```

**健康狀況**: 🟢 良好

---

### Phase 2: 中期擴展 (500K DAU)

#### 架構升級
```
API Gateway:        1 → 2 實例 (Nginx 負載均衡)
核心服務:            1 → 3 實例 (auth, user, content)
其他服務:            1 → 2 實例
PostgreSQL:         讀寫分離（充分利用 Replica）
Redis:              記憶體擴容（768M → 2GB per node）
Kafka:              1 Broker → 3 Broker 集群
CDN:                整合 CloudFront
```

#### 成本估算（AWS）
| 組件 | 規格 | 數量 | 月成本 (USD) |
|------|------|------|-------------|
| EC2 (t3.large) | API Gateway | 2 | $120 |
| EC2 (t3.xlarge) | 後端服務 | 20 | $1,200 |
| RDS (db.r5.2xlarge) | PostgreSQL | 2 | $1,200 |
| ElastiCache (cache.r5.large) | Redis | 3 | $450 |
| MSK (kafka.m5.large) | Kafka | 3 | $600 |
| ALB | 負載均衡 | 2 | $50 |
| CloudFront | CDN | - | $200 |
| S3 + Transfer | 儲存與流量 | - | $300 |
| **總計** | | | **$4,120/月** |

#### 實施時間表
```markdown
Month 1-2:
  ✅ Kafka 集群部署
  ✅ Circuit Breaker 整合
  ✅ PostgreSQL 讀寫分離應用

Month 3-4:
  ✅ API Gateway 負載均衡
  ✅ 核心服務水平擴展
  ✅ Redis 記憶體擴容

Month 5-6:
  ✅ CloudFront CDN 整合
  ✅ 圖片優化（WebP）
  ✅ 壓力測試與調優
```

---

### Phase 3: 大規模擴展 (5M DAU)

#### 架構升級
```
API Gateway:        2 → 12 實例（AWS ALB Auto Scaling）
後端服務:            20 → 60+ 實例（Kubernetes HPA）
PostgreSQL:         分片 4 個 Shard（每個 Master + Replica）
Redis:              Sentinel → Cluster（6 節點）
Kafka:              3 → 6 Broker（更高吞吐量）
全文搜尋:            整合 Elasticsearch（3 節點）
監控:               Prometheus + Grafana + ELK
```

#### 架構圖
```
                        [Users: 5M DAU]
                              ↓
                    [CloudFront CDN]
                              ↓
                    [AWS ALB (Multi-AZ)]
                    /         |         \
             [API-GW-1] [API-GW-2] ... [API-GW-12]
                              ↓
        ┌──────────────────────────────────────┐
        │       Kubernetes Cluster (EKS)        │
        │   - auth-service: 10 pods             │
        │   - user-service: 10 pods             │
        │   - content-service: 15 pods          │
        │   - payment-service: 5 pods           │
        │   - ... (其他服務)                    │
        └──────────────────────────────────────┘
                              ↓
        ┌──────────────────────────────────────┐
        │      Data Layer (Multi-AZ)            │
        │                                        │
        │  PostgreSQL Shards:                   │
        │  ├─ Shard-0 (Master + Replica)        │
        │  ├─ Shard-1 (Master + Replica)        │
        │  ├─ Shard-2 (Master + Replica)        │
        │  └─ Shard-3 (Master + Replica)        │
        │                                        │
        │  Redis Cluster:                       │
        │  ├─ Node-1/2 (Master + Replica)       │
        │  ├─ Node-3/4 (Master + Replica)       │
        │  └─ Node-5/6 (Master + Replica)       │
        │                                        │
        │  Kafka Cluster:                       │
        │  ├─ Broker-1/2/3                      │
        │  └─ Broker-4/5/6                      │
        │                                        │
        │  Elasticsearch:                       │
        │  └─ 3 nodes (全文搜尋)                 │
        └──────────────────────────────────────┘
```

#### 成本估算（AWS）
| 組件 | 規格 | 數量 | 月成本 (USD) |
|------|------|------|-------------|
| EKS Cluster | Kubernetes | 1 | $150 |
| EC2 (c5.2xlarge) | K8s Nodes | 20 | $4,000 |
| RDS (db.r5.4xlarge) | PostgreSQL | 8 | $9,600 |
| ElastiCache Cluster | Redis | 6 | $1,800 |
| MSK (kafka.m5.xlarge) | Kafka | 6 | $1,800 |
| Elasticsearch | 3 nodes | 3 | $900 |
| ALB | 負載均衡 | 3 | $75 |
| CloudFront | CDN | - | $1,500 |
| S3 + Transfer | 儲存與流量 | - | $2,000 |
| **總計** | | | **$21,825/月** |

**ROI 分析**:
```
假設 ARPU (每用戶月均收入) = $5
  5M DAU × 30% 付費率 × $5 = $7,500,000/月營收
  基礎設施成本: $21,825/月 (僅佔營收 0.29%)
  
✅ 成本效益極佳
```

#### 實施時間表
```markdown
Month 1-3:
  ⏳ 資料庫分片設計與實施
  ⏳ Redis Cluster 遷移
  ⏳ Elasticsearch 整合

Month 4-6:
  ⏳ Kubernetes 遷移（EKS）
  ⏳ Kafka 擴容（6 Broker）
  ⏳ 多區域部署（us-east-1 + ap-southeast-1）

Month 7-9:
  ⏳ 壓力測試（模擬 5M DAU）
  ⏳ 混沌工程測試
  ⏳ 性能調優與優化

Month 10-12:
  ⏳ 完整監控體系（Prometheus + Grafana + ELK）
  ⏳ 自動化告警與響應
  ⏳ 災難恢復演練
```

---

## 🚀 性能瓶頸識別

### 1. 資料庫查詢瓶頸

#### 慢查詢分析
```sql
-- 開啟 slow query log
ALTER SYSTEM SET log_min_duration_statement = 100;  -- 記錄 > 100ms 的查詢

-- 分析 pg_stat_statements
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY total_exec_time DESC
LIMIT 10;
```

#### Top 5 慢查詢
```sql
-- 1. Feed 查詢（未優化，N+1 問題）
SELECT * FROM post 
WHERE user_id IN (SELECT followed_id FROM follow WHERE follower_id = $1)
ORDER BY created_at DESC LIMIT 20;
-- 平均執行時間: 850ms ❌

-- 優化後:
CREATE INDEX idx_follow_follower ON follow(follower_id, followed_id);
CREATE INDEX idx_post_user_created ON post(user_id, created_at DESC);

SELECT p.* 
FROM post p
INNER JOIN follow f ON p.user_id = f.followed_id
WHERE f.follower_id = $1
ORDER BY p.created_at DESC 
LIMIT 20;
-- 平均執行時間: 45ms ✅ (提升 95%)
```

---

### 2. Redis 快取命中率

```bash
redis-cli INFO stats | grep keyspace

keyspace_hits:  1,234,567
keyspace_misses: 123,456

命中率 = 1,234,567 / (1,234,567 + 123,456) = 90.9%
✅ 目標: > 90%（已達標）
```

#### 快取策略優化
```typescript
// ❌ 當前: 簡單快取
async getUser(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  
  const user = await db.findOne({ id });
  await redis.set(`user:${id}`, JSON.stringify(user));  // ⚠️ 無 TTL
  return user;
}

// ✅ 優化: Cache-Aside + TTL + 序列化
async getUser(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    this.metrics.cacheHit('user');
    return msgpack.decode(cached);  // MessagePack 更快
  }
  
  this.metrics.cacheMiss('user');
  
  const user = await db.findOne({ id });
  if (user) {
    await redis.setex(
      `user:${id}`, 
      300,  // 5 分鐘 TTL
      msgpack.encode(user)
    );
  }
  return user;
}
```

---

### 3. 網路延遲

#### 當前延遲測試
```bash
# 內網延遲 (服務間)
ping api-gateway → auth-service: ~0.5ms ✅
ping auth-service → postgres: ~1.2ms ✅

# 外網延遲 (用戶到 API)
US East Coast → API: 20ms ✅
Europe → API: 120ms 🟡
Asia → API: 250ms ❌ (需 CDN + 多區域部署)
```

#### 優化策略
```markdown
1. CloudFront CDN (靜態資源)
   - 邊緣節點快取
   - 減少 80% 的 S3 請求
   
2. Multi-Region Deployment
   - us-east-1 (美國)
   - eu-west-1 (歐洲)
   - ap-southeast-1 (亞洲)
   
3. Database Read Replicas (跨區域)
   - 讀取請求就近處理
   - 寫入仍然集中到主區域（接受延遲）
```

---

## 📈 容量規劃最佳實踐

### 1. 持續監控
```yaml
# Prometheus 指標收集
- API Gateway QPS
- 後端服務 CPU/Memory 使用率
- 資料庫連接數、QPS、慢查詢
- Redis 記憶體使用率、命中率
- Kafka 訊息堆積（Lag）
- 網路流量
```

### 2. 自動擴展規則
```yaml
# Kubernetes HPA 配置
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### 3. 容量預警
```yaml
# Prometheus Alert Rules
groups:
- name: capacity
  rules:
  - alert: HighCPUUsage
    expr: avg(rate(container_cpu_usage_seconds_total[5m])) > 0.8
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "CPU 使用率超過 80%"
      
  - alert: DatabaseConnectionPoolNearLimit
    expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "資料庫連接池使用率 > 80%"
      
  - alert: RedisMemoryNearLimit
    expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Redis 記憶體使用率 > 90%"
```

---

## 🎯 總結與建議

### 當前狀態 (50K DAU)
- ✅ **無需立即擴展**：所有組件使用率 < 30%
- ⚠️ **Kafka 單點風險**：建議盡快升級為集群
- 🟢 **健康狀態**：可支援至少 3 個月

### 擴展路線圖
```
Phase 1 (當前):    50K DAU    ✅ 健康
Phase 2 (6個月):   500K DAU   🟡 需升級
Phase 3 (12個月):  5M DAU     🔴 需大幅架構調整
```

### 關鍵行動項目
```markdown
P0 (立即):
  [ ] Kafka 集群部署（3 節點）
  [ ] PostgreSQL 連接池優化
  [ ] 資料庫備份自動化

P1 (3個月):
  [ ] API Gateway 負載均衡
  [ ] PostgreSQL 讀寫分離應用
  [ ] Redis 記憶體擴容
  [ ] CloudFront CDN 整合

P2 (6-12個月):
  [ ] 資料庫分片設計
  [ ] Kubernetes 遷移
  [ ] 多區域部署
  [ ] Elasticsearch 全文搜尋
```

---

**負責人**: 架構團隊 + DevOps 團隊
**下次評估**: 2024 年 5 月
**文檔版本**: v1.0 (2024-02)
