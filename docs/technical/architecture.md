# 系統架構

Suggar Daddy 是一個基於 **Nx monorepo** 的創作者訂閱平台，採用 NestJS 微服務 + Next.js 前端，透過事件驅動架構實現讀寫分離。

## 架構總覽

```
┌─────────────┐  ┌─────────────┐
│  web :4200  │  │ admin :4300 │    ← Next.js 14 (App Router)
└──────┬──────┘  └──────┬──────┘
       │    /api/* rewrite     │
       └────────┬──────────────┘
                ▼
     ┌─────────────────────┐
     │  API Gateway :3000  │         ← HTTP proxy, 路由分發
     └─────────┬───────────┘
               ▼
  ┌────────────────────────────┐
  │      Microservices         │
  │  auth · user · matching    │
  │  content · payment · sub   │     ← NestJS, 各自獨立 port
  │  media · messaging · notif │
  │  admin                     │
  └──────┬──────────┬──────────┘
         │          │
    ┌────▼───┐ ┌───▼────┐
    │ Redis  │ │ Kafka  │            ← 快取 / 事件匯流排
    └────────┘ └───┬────┘
                   ▼
          ┌─────────────────┐
          │ db-writer-service│        ← 唯一寫入 PostgreSQL 的服務
          └────────┬────────┘
                   ▼
            ┌────────────┐
            │ PostgreSQL │
            └────────────┘
```

## 核心數據流

**讀取路徑**：Client → API Gateway → Service → Redis (cache hit) → 回傳

**寫入路徑**：Client → API Gateway → Service → Kafka (produce event) → db-writer-service → PostgreSQL

服務 **不直接寫入** PostgreSQL。所有寫入操作透過 Kafka 事件，由 `db-writer-service` 統一消費並持久化。這確保了寫入解耦與最終一致性。

## 後端服務

| 服務 | Port | 路由前綴 | 職責 |
|------|------|----------|------|
| **api-gateway** | 3000 | `/api/*` | HTTP proxy，路由轉發至下游服務 |
| **auth-service** | 3002 | `/api/auth` | 註冊、登入、JWT 發放與驗證 |
| **user-service** | 3001 | `/api/users` | 用戶 CRUD、個人檔案、偏好設定、檢舉 |
| **matching-service** | 3003 | `/api/matching` | 配對卡片、滑動(swipe)、地理位置篩選 |
| **content-service** | 3006 | `/api/posts`, `/api/stories`, `/api/videos`, `/api/moderation` | 貼文、限動、影片、內容審核 |
| **payment-service** | 3007 | `/api/tips`, `/api/post-purchases`, `/api/dm-purchases`, `/api/transactions`, `/api/stripe`, `/api/wallet` | 打賞、內容購買、錢包、Stripe 整合 |
| **subscription-service** | 3009 | `/api/subscription-tiers`, `/api/subscriptions` | 訂閱方案管理、訂閱關係 |
| **media-service** | 3010 | `/api/upload`, `/api/media` | 檔案上傳、媒體管理 (S3/CloudFront) |
| **messaging-service** | 3005 | `/api/messaging` | 私訊（Kafka 驅動） |
| **notification-service** | 3008 | `/api/notifications` | 通知推送（Kafka 驅動） |
| **admin-service** | 3011 | `/api/admin` | 後台管理 API |
| **db-writer-service** | — | 無 HTTP 端點 | Kafka consumer，統一寫入 PostgreSQL |

> 路由映射定義於 `apps/api-gateway/src/app/proxy.service.ts`，按前綴長度降序匹配。

## 前端應用

| 應用 | Port | 技術棧 | 說明 |
|------|------|--------|------|
| **web** | 4200 | Next.js 14 + Tailwind CSS | 用戶端：動態消息、探索、配對、訊息、訂閱、錢包 |
| **admin** | 4300 | Next.js 14 + Tailwind + shadcn/ui | 管理後台：儀表板、用戶管理、內容審核 |

兩者皆透過 `next.config.js` 將 `/api/*` 請求 rewrite 至 `localhost:3000`。

## 共享庫 (libs/)

| 庫 | 用途 |
|----|------|
| **common** | 全域配置、Auth guards/decorators、Stripe 服務、Kafka helpers、sharding 工具 |
| **auth** | AuthModule、JWT strategy，re-exports from common |
| **database** | TypeORM 設定、所有 Entity 定義（User, Post, Match, Subscription, Transaction 等 18 個） |
| **kafka** | KafkaModule、KafkaProducerService、KafkaConsumerService |
| **redis** | RedisModule、RedisService（快取、GEO 查詢） |
| **dto** | 共享 TypeScript 介面（Auth, User, Matching, Messaging, Notification） |
| **ui** | 共享 React 元件（Button with CVA variants） |
| **api-client** | Typed HTTP client，axios-based，覆蓋所有 API 端點 |

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 14 (App Router), React, Tailwind CSS |
| 後端框架 | NestJS (TypeScript) |
| 資料庫 | PostgreSQL (TypeORM) |
| 快取 | Redis (ioredis) — 資料快取 + GEO 距離查詢 |
| 訊息佇列 | Apache Kafka — 事件驅動寫入 |
| 支付 | Stripe (Webhook + Payment Intent) |
| 儲存 | AWS S3 + CloudFront CDN |
| 建構工具 | Nx monorepo |
| 認證 | JWT (Access Token + Refresh Token) |

## 關鍵設計決策

### 1. 事件驅動寫入 (Event-Driven Write)

所有資料變更透過 Kafka topic 發送事件（如 `subscription.created`、`payment.completed`），由 `db-writer-service` 統一消費寫入 PostgreSQL。好處：

- 服務間完全解耦，新增 consumer 不影響既有服務
- 寫入可批次處理，提升吞吐量
- 事件可重播，支援資料修復

### 2. Redis 快取 + GEO 查詢

- 熱門資料（用戶檔案、貼文、配對卡片）快取於 Redis，減少 DB 負載
- 配對功能使用 Redis GEO（key: `geo:users`）進行距離篩選
- Payment stats 查詢結果快取 5 分鐘 TTL

### 3. JWT 認證架構

- `JwtAuthGuard`：預設所有路由需認證
- `@Public()`：標記公開端點，跳過 JWT 驗證
- `OptionalJwtGuard`：可選認證（如 GET /cards、GET /search）
- `@Roles(UserRole.ADMIN)`：角色控制（ADMIN / CREATOR / SUBSCRIBER）

### 4. API Gateway Proxy 模式

API Gateway 不含業務邏輯，僅負責路由轉發。前綴匹配按長度降序排列，確保更具體的路徑優先匹配（如 `/api/post-purchases` 優先於 `/api/posts`）。

## Kafka Topics

事件命名遵循 `domain.action` 模式：

| Topic | 說明 |
|-------|------|
| `subscription.created` | 新訂閱建立 |
| `payment.completed` | 支付完成 |
| `content.post.created` | 新貼文發布 |
| `media.uploaded` | 媒體上傳完成 |
| `message.created` | 新訊息 |
| `notification.created` | 通知觸發 |

所有 consumer 已實作重試 + 指數退避機制。

## Entity 清單

`libs/database/src/entities/` 包含 18 個 TypeORM Entity：

User, Post, PostComment, PostLike, PostPurchase, Match, Swipe, Subscription, SubscriptionTier, Transaction, Tip, DmPurchase, Follow, Bookmark, Story, StoryView, MediaFile, AuditLog

關鍵 Entity 已加入資料庫索引（Match, Swipe, Subscription, PostComment, Transaction, User）以優化查詢效能。
