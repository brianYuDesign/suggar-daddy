# Sugar Daddy 後端設計文件 v2

## 專案概述

結合 Tinder（配對交友）與 OnlyFans（訂閱 Sugar Baby）的平台後端。

**目標規模：** 10 萬同時在線用戶

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 架構 | Nx Monorepo + 微服務 |
| 框架 | NestJS (TypeScript) |
| 主資料庫 | PostgreSQL (讀寫分離 + Sharding) |
| 快取 | Redis Cluster |
| 訊息佇列 | Kafka |
| 檔案儲存 | AWS S3 / Cloudflare R2 |
| 金流 | Stripe Connect |
| 容器 | Docker + Kubernetes |
| API Gateway | Kong / AWS API Gateway |
| 服務發現 | Kubernetes Service / Consul |
| 監控 | Prometheus + Grafana |
| 日誌 | ELK Stack (Elasticsearch, Logstash, Kibana) |
| 追蹤 | Jaeger / OpenTelemetry |

---

## 微服務架構

```
專案根目錄/
├── apps/
│   ├── api-gateway/           # API 網關 (Kong/自建)
│   ├── user-service/          # 用戶服務
│   ├── auth-service/          # 認證服務
│   ├── matching-service/      # 配對服務 ⭐ Phase 1
│   ├── subscription-service/  # 訂閱服務 ⭐ Phase 2
│   ├── content-service/       # 內容服務 (貼文/媒體)
│   ├── messaging-service/     # 即時訊息服務
│   ├── payment-service/       # 支付服務
│   ├── notification-service/  # 通知服務
│   └── media-service/         # 媒體處理服務
│
├── libs/
│   ├── common/                # 共用工具、常數、型別
│   ├── database/              # DB 連線、Repository 基類
│   ├── kafka/                 # Kafka producer/consumer
│   ├── redis/                 # Redis 快取封裝
│   ├── auth/                  # JWT、Guard、Decorator
│   └── dto/                   # 共用 DTO/Entity
│
├── infrastructure/
│   ├── docker/
│   ├── k8s/
│   ├── terraform/
│   └── scripts/
│
└── docs/
```

---

## 服務職責與通訊

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│                   (Rate Limit, Auth, Routing)                    │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────┬───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │  Auth   │ │  User   │ │ Matching│ │ Subscr. │ │ Content │
   │ Service │ │ Service │ │ Service │ │ Service │ │ Service │
   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │           │           │
        └───────────┴───────────┴───────────┴───────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
              ┌──────────┐           ┌──────────┐
              │  Kafka   │           │  Redis   │
              │ (Events) │           │ (Cache)  │
              └────┬─────┘           └──────────┘
                   │
        ┌──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ Payment │ │  Notif. │ │Messaging│ │  Media  │
   │ Service │ │ Service │ │ Service │ │ Service │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 服務間通訊

| 類型 | 用途 | 工具 |
|------|------|------|
| 同步 | 即時查詢、驗證 | gRPC / HTTP |
| 非同步 | 事件驅動、解耦 | Kafka |

### ⚠️ 資料流架構原則（重要）

**用戶 API 不直接操作 DB。** 讀寫分離 + 異步寫入。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          用戶 API（User-facing Services）                      │
│           matching-service, user-service, auth-service, ...                   │
└─────────────────────────────────────────────────────────────────────────────┘
        │                                          │
        │ 讀取                                      │ 寫入
        ▼                                          ▼
┌──────────────┐                          ┌──────────────┐
│    Redis     │                          │    Kafka     │
│  (快取/讀取)  │                          │  (事件佇列)   │
└──────────────┘                          └──────┬───────┘
        │                                          │
        │ Cache Miss 時                             │ 消費者消費
        │ (由 DB Writer 預熱)                        ▼
        │                                   ┌──────────────┐
        │                                   │  DB Writer   │
        │                                   │  (背景服務)   │
        │                                   └──────┬───────┘
        │                                          │
        │                                          │ 僅寫入
        │                                          ▼
        │                                   ┌──────────────┐
        │                                   │  PostgreSQL  │
        │                                   │   Master     │
        │                                   └──────┬───────┘
        │                                          │ replication
        │                                          ▼
        │                                   ┌──────────────┐
        └──────────────────────────────────│  Replica(s)  │
                   (DB Writer 同步到 Redis) │   (唯讀)     │
                                           └──────────────┘
```

| 層級 | 讀取 | 寫入 |
|------|------|------|
| **用戶 API** | Redis（快取） | Kafka（發送事件） |
| **DB Writer** | — | PostgreSQL Master（異步消費 Kafka） |
| **PostgreSQL** | Replica（僅 DB Writer 用於同步/校準） | Master（僅 DB Writer 寫入） |

**要點：**
- 用戶 API **永不** 連線 DB，僅操作 Redis + Kafka
- DB 寫入為 **異步**：API → Kafka → DB Writer → DB
- Redis 為 API 的讀取來源；DB Writer 負責同步 DB → Redis

---

## 資料庫設計

### 讀寫分離架構

```
                    ┌─────────────────┐
                    │   DB Writer     │  ← 唯一連接 DB 的服務（消費 Kafka 後寫入）
                    │  (背景消費者)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
       ┌─────────────┐                ┌─────────────┐
       │   Master    │ ──Streaming──▶ │  Replica 1  │
       │   (Write)   │    Replication │   (Read)    │
       └─────────────┘                ├─────────────┤
                                      │  Replica 2  │
                                      │   (Read)    │
                                      └─────────────┘
```

**實作方式：**
- PostgreSQL Streaming Replication
- **DB Writer** 服務使用 TypeORM replication 設定
- 用戶 API 不引用 libs/database

```typescript
// 僅 DB Writer 服務使用（非用戶 API）
// database.config.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  replication: {
    master: {
      host: 'master.db.internal',
      port: 5432,
      username: 'app',
      password: '***',
      database: 'suggar_daddy',
    },
    slaves: [
      { host: 'replica1.db.internal', port: 5432, ... },
      { host: 'replica2.db.internal', port: 5432, ... },
    ],
  },
});
```

### Sharding 策略

**分片鍵：** `user_id`

| 資料表 | 分片策略 | 說明 |
|--------|----------|------|
| users | Hash(user_id) % N | 用戶資料 |
| swipes | Hash(swiper_id) % N | 滑動記錄 |
| matches | Hash(user_a_id) % N | 配對記錄（雙寫） |
| messages | Hash(conversation_id) % N | 訊息 |
| subscriptions | Hash(subscriber_id) % N | 訂閱關係 |
| posts | Hash(creator_id) % N | 創作者內容 |

**實作選項：**
1. **Citus** (PostgreSQL 擴展) — 推薦，原生支援
2. **Vitess** — 需要額外維護
3. **Application-level sharding** — 靈活但複雜

```typescript
// sharding.service.ts
@Injectable()
export class ShardingService {
  private readonly SHARD_COUNT = 16;
  
  getShardId(userId: string): number {
    const hash = createHash('md5').update(userId).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % this.SHARD_COUNT;
  }
  
  getDataSource(userId: string): DataSource {
    const shardId = this.getShardId(userId);
    return this.dataSources[`shard_${shardId}`];
  }
}
```

---

## Phase 1: 配對系統 (Matching Service)

### 核心功能

1. **用戶卡片推薦** — 基於位置、偏好
2. **滑動操作** — Like / Pass / Super Like
3. **配對檢測** — 雙向 Like 觸發配對
4. **配對管理** — 查看、取消配對

### 資料模型

```sql
-- users (簡化，完整在 user-service)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL, -- sugar_baby, sugar_daddy
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    location GEOGRAPHY(POINT, 4326),
    birth_date DATE,
    preferences JSONB DEFAULT '{}',
    verification_status VARCHAR(20) DEFAULT 'unverified',
    last_active_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 地理位置索引
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_last_active ON users(last_active_at);

-- swipes (分片表)
CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id UUID NOT NULL,
    swiped_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- like, pass, super_like
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(swiper_id, swiped_id)
);

CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_swipes_mutual ON swipes(swiped_id, swiper_id) WHERE action = 'like';

-- matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL,
    user_b_id UUID NOT NULL,
    matched_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active', -- active, unmatched, blocked
    UNIQUE(user_a_id, user_b_id)
);

CREATE INDEX idx_matches_user_a ON matches(user_a_id) WHERE status = 'active';
CREATE INDEX idx_matches_user_b ON matches(user_b_id) WHERE status = 'active';
```

### API 設計

```yaml
# Matching Service APIs

POST /api/v1/matching/swipe
  body: { targetUserId: string, action: 'like' | 'pass' | 'super_like' }
  response: { matched: boolean, matchId?: string }

GET /api/v1/matching/cards
  query: { limit: number, filters?: object }
  response: { cards: UserCard[], nextCursor?: string }

GET /api/v1/matching/matches
  query: { limit: number, cursor?: string }
  response: { matches: Match[], nextCursor?: string }

DELETE /api/v1/matching/matches/:matchId
  response: { success: boolean }
```

### 高併發設計

#### 1. 推薦卡片快取 (Redis)

```typescript
// matching.service.ts
@Injectable()
export class MatchingService {
  private readonly CARD_CACHE_TTL = 300; // 5 分鐘
  private readonly CARD_BATCH_SIZE = 50;
  
  async getCards(userId: string, limit: number): Promise<UserCard[]> {
    const cacheKey = `cards:${userId}`;
    
    // 1. 嘗試從 Redis 取得
    let cards = await this.redis.lrange(cacheKey, 0, limit - 1);
    
    if (cards.length < limit) {
      // 2. 補充卡片
      const newCards = await this.generateCards(userId, this.CARD_BATCH_SIZE);
      await this.redis.rpush(cacheKey, ...newCards.map(c => JSON.stringify(c)));
      await this.redis.expire(cacheKey, this.CARD_CACHE_TTL);
      
      cards = await this.redis.lrange(cacheKey, 0, limit - 1);
    }
    
    // 3. 移除已取得的卡片
    await this.redis.ltrim(cacheKey, limit, -1);
    
    return cards.map(c => JSON.parse(c));
  }
  
  private async generateCards(userId: string, count: number): Promise<UserCard[]> {
    // 地理位置 + 偏好 + 排除已滑過
    const swipedIds = await this.getSwipedUserIds(userId);
    
    return this.userRepository
      .createQueryBuilder('u')
      .where('u.id != :userId', { userId })
      .andWhere('u.id NOT IN (:...swipedIds)', { swipedIds })
      .andWhere('ST_DWithin(u.location, :location, :radius)', {
        location: userLocation,
        radius: 50000, // 50km
      })
      .orderBy('u.last_active_at', 'DESC')
      .limit(count)
      .getMany();
  }
}
```

#### 2. 滑動操作 + 配對檢測 (Kafka 事件)

```typescript
// swipe.handler.ts
@Injectable()
export class SwipeHandler {
  async handleSwipe(swiperId: string, swipedId: string, action: string): Promise<SwipeResult> {
    // 1. 寫入滑動記錄
    await this.swipeRepository.upsert({
      swiperId,
      swipedId,
      action,
    }, ['swiperId', 'swipedId']);
    
    // 2. 檢查是否配對 (只有 like 需要)
    if (action === 'like' || action === 'super_like') {
      const mutualLike = await this.checkMutualLike(swiperId, swipedId);
      
      if (mutualLike) {
        // 3. 建立配對
        const match = await this.createMatch(swiperId, swipedId);
        
        // 4. 發送 Kafka 事件
        await this.kafkaProducer.send({
          topic: 'matching.matched',
          messages: [{
            key: match.id,
            value: JSON.stringify({
              matchId: match.id,
              userAId: swiperId,
              userBId: swipedId,
              matchedAt: new Date(),
            }),
          }],
        });
        
        return { matched: true, matchId: match.id };
      }
    }
    
    return { matched: false };
  }
  
  private async checkMutualLike(userA: string, userB: string): Promise<boolean> {
    // 使用 Redis 快取最近的 like
    const cacheKey = `likes:${userB}`;
    const cached = await this.redis.sismember(cacheKey, userA);
    
    if (cached) return true;
    
    // Fallback to DB
    const swipe = await this.swipeRepository.findOne({
      where: { swiperId: userB, swipedId: userA, action: In(['like', 'super_like']) },
    });
    
    return !!swipe;
  }
}
```

#### 3. 配對事件消費者

```typescript
// notification.consumer.ts
@Controller()
export class MatchingConsumer {
  @EventPattern('matching.matched')
  async handleMatched(@Payload() data: MatchedEvent) {
    // 發送推播通知給雙方
    await Promise.all([
      this.notificationService.send(data.userAId, {
        type: 'new_match',
        title: "It's a Match! 💕",
        body: 'You have a new match!',
        data: { matchId: data.matchId },
      }),
      this.notificationService.send(data.userBId, {
        type: 'new_match',
        title: "It's a Match! 💕",
        body: 'You have a new match!',
        data: { matchId: data.matchId },
      }),
    ]);
  }
}
```

---

## Phase 2: 訂閱系統 (Subscription Service)

### 核心功能

1. **創作者頁面** — Sugar Baby 個人頁
2. **訂閱方案** — 多層級訂閱
3. **付費內容** — PPV 單篇購買
4. **打賞** — 小費功能

### 資料模型

```sql
-- subscription_tiers
CREATE TABLE subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2),
    benefits JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired
    stripe_subscription_id VARCHAR(100),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP
);

CREATE INDEX idx_subs_subscriber ON subscriptions(subscriber_id) WHERE status = 'active';
CREATE INDEX idx_subs_creator ON subscriptions(creator_id) WHERE status = 'active';

-- posts
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL,
    content_type VARCHAR(20) NOT NULL, -- text, image, video
    caption TEXT,
    media_urls JSONB DEFAULT '[]',
    visibility VARCHAR(20) DEFAULT 'public', -- public, subscribers, tier_specific, ppv
    required_tier_id UUID REFERENCES subscription_tiers(id),
    ppv_price DECIMAL(10, 2),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_creator ON posts(creator_id, created_at DESC);
CREATE INDEX idx_posts_feed ON posts(created_at DESC) WHERE visibility = 'public';

-- post_purchases (PPV)
CREATE TABLE post_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id),
    buyer_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    stripe_payment_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, buyer_id)
);

-- tips
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    message TEXT,
    stripe_payment_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Stripe 整合

```typescript
// payment.service.ts
@Injectable()
export class PaymentService {
  constructor(private stripe: Stripe) {}
  
  // 創建訂閱
  async createSubscription(
    subscriberId: string,
    tierId: string,
    paymentMethodId: string,
  ): Promise<Subscription> {
    const tier = await this.tierRepository.findOneOrFail(tierId);
    const subscriber = await this.userRepository.findOneOrFail(subscriberId);
    
    // 1. 確保用戶有 Stripe Customer
    let customerId = subscriber.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: subscriber.email,
        metadata: { userId: subscriberId },
      });
      customerId = customer.id;
      await this.userRepository.update(subscriberId, { stripeCustomerId: customerId });
    }
    
    // 2. 附加支付方式
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    
    // 3. 創建 Stripe 訂閱
    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: tier.stripePriceId }],
      default_payment_method: paymentMethodId,
      metadata: {
        subscriberId,
        creatorId: tier.creatorId,
        tierId,
      },
      application_fee_percent: 20, // 平台抽成 20%
      transfer_data: {
        destination: tier.creator.stripeAccountId, // Creator 的 Stripe Connect 帳戶
      },
    });
    
    // 4. 儲存訂閱記錄
    return this.subscriptionRepository.save({
      subscriberId,
      creatorId: tier.creatorId,
      tierId,
      stripeSubscriptionId: stripeSubscription.id,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    });
  }
  
  // Webhook 處理
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;
    }
  }
}
```

---

## 高可用架構

### Kubernetes 部署

```yaml
# k8s/matching-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: matching-service
spec:
  replicas: 6  # 高可用
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: matching-service
  template:
    metadata:
      labels:
        app: matching-service
    spec:
      containers:
      - name: matching-service
        image: suggar-daddy/matching-service:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        ports:
        - containerPort: 3000
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 20
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secrets
              key: url
        - name: KAFKA_BROKERS
          value: "kafka-0.kafka:9092,kafka-1.kafka:9092,kafka-2.kafka:9092"
---
apiVersion: v1
kind: Service
metadata:
  name: matching-service
spec:
  selector:
    app: matching-service
  ports:
  - port: 3000
    targetPort: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: matching-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: matching-service
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
```

### Redis Cluster

```yaml
# k8s/redis-cluster.yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: redis-cluster
spec:
  clusterSize: 6  # 3 master + 3 replica
  kubernetesConfig:
    image: redis:7-alpine
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: 500m
        memory: 1Gi
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

### Kafka Cluster

```yaml
# k8s/kafka.yaml (Strimzi Operator)
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: kafka-cluster
spec:
  kafka:
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
    storage:
      type: persistent-claim
      size: 50Gi
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 10Gi
```

---

## 容量規劃 (10 萬同時在線)

### 預估 QPS

| 操作 | 預估 QPS | 說明 |
|------|----------|------|
| 取得卡片 | 5,000 | 每用戶每分鐘刷新 3 次 |
| 滑動操作 | 10,000 | 每用戶每分鐘滑 6 張 |
| 配對檢查 | 3,000 | Like 時檢查 |
| 訊息發送 | 8,000 | 配對後聊天 |
| Feed 請求 | 4,000 | 瀏覽訂閱內容 |

### 資源配置建議

| 服務 | Pods | CPU/Pod | Memory/Pod |
|------|------|---------|------------|
| API Gateway | 4 | 1 core | 1 GB |
| Auth Service | 3 | 500m | 512 MB |
| User Service | 4 | 1 core | 1 GB |
| Matching Service | 6 | 1 core | 1 GB |
| Messaging Service | 6 | 1 core | 2 GB |
| Subscription Service | 4 | 500m | 1 GB |
| Notification Service | 3 | 500m | 512 MB |
| Payment Service | 2 | 500m | 512 MB |

### 資料庫配置

| 類型 | 配置 |
|------|------|
| PostgreSQL Master | 8 vCPU, 32 GB RAM, 500 GB SSD |
| PostgreSQL Replica x2 | 4 vCPU, 16 GB RAM, 500 GB SSD |
| Redis Cluster | 6 nodes, 8 GB each |
| Kafka Cluster | 3 brokers, 4 vCPU, 16 GB RAM each |

---

## Kafka Topics

```
matching.swipe              # 滑動事件
matching.matched            # 配對成功
subscription.created        # 新訂閱
subscription.cancelled      # 取消訂閱
payment.completed           # 支付完成
payment.failed              # 支付失敗
content.published           # 新內容發布
notification.send           # 發送通知
user.updated                # 用戶資料更新
user.verified               # 用戶驗證完成
```

---

## Phase 1 功能完成度檢核

以下依設計文件逐項對照實作，區分為 **✅ 已完成**、**🟡 部分完成**、**❌ 未完成**。

### 1. Nx Monorepo 與 Common Libs

| 項目 | 狀態 | 說明 |
|------|------|------|
| Nx Monorepo 專案初始化 | ✅ | 已有 `apps/`、`libs/`、`infrastructure/`、各服務可獨立 build/serve |
| libs/common | ✅ | 常數、工具、index 匯出 |
| libs/dto | ✅ | auth / user / matching / notification / messaging DTO |
| libs/database | ✅ | DatabaseModule、Swipe/Match entity（供日後 DB Writer 使用） |
| libs/redis | ✅ | RedisModule.forRoot()、RedisService（get/set/setex/del）、Auth 已使用 |
| libs/kafka | 🟡 | 僅空模組，**無 Producer/Consumer**，尚未被任何服務 import |
| libs/auth | ✅ | JWT Strategy、JwtAuthGuard、CurrentUser decorator、AuthModule |

### 2. User Service

| 項目 | 狀態 | 說明 |
|------|------|------|
| GET /api/v1/users/me | ✅ | 取得當前用戶完整資料（query userId，待改為 JWT） |
| GET /api/v1/users/profile/:userId | ✅ | 取得指定用戶對外資料 |
| PUT /api/v1/users/profile | ✅ | 更新當前用戶資料 |
| POST /api/v1/users | ✅ | 創建用戶（註冊用） |
| 讀取來源為 Redis | ❌ | 目前 **in-memory Map**，未接 Redis |
| 寫入經 Kafka | ❌ | 註解 TODO，未發送 `user.created` / `user.updated` |

### 3. Auth Service

| 項目 | 狀態 | 說明 |
|------|------|------|
| POST /api/v1/auth/register | ✅ | 註冊、寫入 Redis、回傳 JWT |
| POST /api/v1/auth/login | ✅ | 登入、Redis 驗證、回傳 JWT |
| POST /api/v1/auth/refresh | ✅ | 用 refreshToken 換新 accessToken |
| POST /api/v1/auth/logout | ✅ | 使 refreshToken 失效 |
| GET /api/v1/auth/me | ✅ | JWT Guard 保護，回傳當前用戶 |
| JWT + Redis 存用戶/refresh | ✅ | 已實作 |
| OAuth（如 Google/Apple 登入） | ❌ | 設計列為 Phase 1，**未實作** |

### 4. Matching Service（設計 API 對照）

| 設計 API | 狀態 | 說明 |
|----------|------|------|
| POST /api/v1/matching/swipe | ✅ | body: targetUserId, action；response: matched, matchId? |
| GET /api/v1/matching/cards | ✅ | query: limit, cursor；設計另有 filters?，目前未實作 filters |
| GET /api/v1/matching/matches | ✅ | query: limit, cursor |
| DELETE /api/v1/matching/matches/:matchId | ✅ | 取消配對 |
| 卡片推薦：Redis 快取 + 地理位置/偏好 | ❌ | 目前 **in-memory mock 卡片**，未接 Redis、無地理位置 |
| 滑動寫入 Kafka、配對發 matching.matched | ❌ | 未使用 Kafka，僅 in-memory 陣列 |
| userId 來源 | 🟡 | 目前 query `userId` / mock，**未強制從 JWT 取** |

### 5. Notification Service

| 項目 | 狀態 | 說明 |
|------|------|------|
| 發送推播介面（供內部/Kafka 消費者呼叫） | ✅ | POST /send，body: userId, type, title, body?, data? |
| 用戶通知列表、標記已讀 | ✅ | GET /list、POST /read/:id |
| 消費 matching.matched 並推播雙方 | ❌ | **無 Kafka 消費者**，配對成功不會自動發通知 |
| 實際裝置推播（FCM/APNs） | ❌ | 僅 in-memory 儲存，未接 Firebase/Apple Push |

### 6. Messaging Service

| 項目 | 狀態 | 說明 |
|------|------|------|
| 發送訊息、對話列表、訊息列表 API | ✅ | POST /send；GET /conversations；GET /conversations/:id/messages |
| 設計列為「WebSocket」即時訊息 | ❌ | 目前僅 **REST**，**無 WebSocket Gateway** |
| 配對後自動建立對話 | 🟡 | MessagingService 有 ensureConversation()，但 **Matching 配對成功未呼叫** |

### 7. 架構原則（設計：用戶 API 不直連 DB）

| 項目 | 狀態 | 說明 |
|------|------|------|
| 用戶 API 讀取來自 Redis | 🟡 | 僅 Auth 使用 Redis；User / Matching 為 in-memory |
| 用戶 API 寫入經 Kafka | ❌ | 無服務發送 Kafka 事件；Kafka lib 為空模組 |
| DB Writer 服務 | ❌ | **未建立**，無消費者寫入 PostgreSQL |

---

### Phase 1 總結

| 類別 | 已完成 | 部分完成 | 未完成 |
|------|--------|----------|--------|
| 服務骨架與 API 路徑 | 5 服務齊全、API 與設計對齊 | — | — |
| 資料流（Redis 讀 / Kafka 寫） | Auth 使用 Redis | User/Matching 仍 mock | Kafka 未接、無 DB Writer |
| 整合與進階功能 | — | Matching/Notification/Messaging 介面已有 | OAuth、WebSocket、matching.matched→推播、cards filters |

**結論：** Phase 1 的 **API 與服務骨架已齊全**，可跑通註冊→登入→滑動→配對→通知列表→發訊。尚未完成的部分：**Kafka 產消、User/Matching 接 Redis、配對後發 matching.matched 並觸發推播與建立對話、OAuth、WebSocket、真實推播**。若以「可演示的 MVP」為 Phase 1 完成標準，目前達標；若以「符合設計文件資料流與非同步事件」為標準，需補齊上述項目。

---

## 開發順序

### Phase 1: 配對系統 (4-6 週)
- [x] Nx Monorepo 專案初始化
- [x] Common libs (database, redis, kafka, auth)
- [x] User Service (CRUD, profile) — in-memory；待接 Redis/Kafka 即符合架構
- [x] Auth Service (JWT, Redis 存用戶/refresh)；OAuth 未做
- [x] Matching Service (swipe, cards, matches, unmatch) — in-memory；待接 Redis/Kafka + JWT
- [x] Notification Service (push API 與列表/已讀)；未接 Kafka 消費者與真實推播
- [x] Messaging Service (REST 訊息 API)；WebSocket 未做；配對後未自動建對話

### Phase 2: 訂閱系統 (4-6 週)
- [ ] Subscription Service
- [ ] Content Service
- [ ] Payment Service (Stripe)
- [ ] Media Service (S3 upload, processing)

### Phase 3: 擴展 & 優化 (持續)
- [ ] 讀寫分離實作
- [ ] Sharding 導入
- [ ] 監控 & 告警
- [ ] 效能調優

---

**目前進度：** Phase 1 各服務 API 與骨架均已就緒，可端到端演示；與設計文件一致的資料流（Redis 讀、Kafka 寫、DB Writer、配對→推播/對話）及 OAuth、WebSocket 尚未實作。詳見上方 **Phase 1 功能完成度檢核**。Phase 2 可開始。
