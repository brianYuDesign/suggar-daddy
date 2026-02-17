# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Serve individual projects
nx serve api-gateway          # Backend gateway → http://localhost:3000
nx serve auth-service         # Auth → :3002
nx serve user-service         # User → :3001
nx serve web                  # User frontend → http://localhost:4200
nx serve admin                # Admin panel → http://localhost:4300

# Build
nx build web                  # Production build for user frontend
nx build admin                # Production build for admin panel

# Test
nx test <project>             # Single project (e.g., nx test ui, nx test common)
nx run-many -t test --all     # All projects

# Lint
nx run-many -t lint --all

# Show all registered projects
nx show projects
```

## Architecture

**Nx monorepo** with NestJS microservices + Next.js frontends.

詳細架構說明請參考：[服務總覽文檔](docs/architecture/SERVICES_OVERVIEW.md)

### Data flow pattern (critical)

```
Client → API Gateway (HTTP proxy, :3000)
           → Service reads from Redis (cache)
           → Service writes to Kafka (events)
                → db-writer-service consumes Kafka → PostgreSQL (persist)
```

Services do NOT write to PostgreSQL directly. `db-writer-service` is the sole Kafka consumer that persists data. This ensures decoupled, eventually consistent writes.

### Backend services (apps/)

| Service | Port | Route prefix | README |
|---------|------|--------------|--------|
| api-gateway | 3000 | Proxies all `/api/*` routes | [README](apps/api-gateway/README.md) |
| user-service | 3001 | `/api/users` | [README](apps/user-service/README.md) |
| auth-service | 3002 | `/api/auth` | [README](apps/auth-service/README.md) |
| matching-service | 3003 | `/api/matching` | [README](apps/matching-service/README.md) |
| subscription-service | 3005 | `/api/subscription-tiers`, `/api/subscriptions` | [README](apps/subscription-service/README.md) |
| content-service | 3006 | `/api/posts` | [README](apps/content-service/README.md) |
| payment-service | 3007 | `/api/tips`, `/api/post-purchases`, `/api/transactions`, `/api/stripe` | [README](apps/payment-service/README.md) |
| media-service | 3008 | `/api/upload`, `/api/media` | [README](apps/media-service/README.md) |
| skill-service | 3009 | `/api/skills` | [README](apps/skill-service/README.md) |
| admin-service | 3010 | `/api/admin` | [README](apps/admin-service/README.md) |
| notification-service | — | Kafka-driven | [README](apps/notification-service/README.md) |
| messaging-service | — | Kafka-driven | [README](apps/messaging-service/README.md) |
| db-writer-service | — | Kafka consumer only | [README](apps/db-writer-service/README.md) |

Route-to-service mapping is in `apps/api-gateway/src/app/proxy.service.ts`.

### Frontend apps (apps/)

| App | Port | Stack | README |
|-----|------|-------|--------|
| web | 4200 | Next.js 14 (App Router) + Tailwind | [README](apps/web/README.md) |
| admin | 4300 | Next.js 14 (App Router) + Tailwind + shadcn/ui | [README](apps/admin/README.md) |

Both use `next.config.js` rewrites to proxy `/api/*` → `localhost:3000` in development.

### Shared libraries (libs/)

| Library | Purpose |
|---------|---------|
| **common** | Config, auth guards/decorators, Stripe services, Kafka helpers, sharding |
| **auth** | AuthModule, JWT strategy, re-exports from common |
| **database** | TypeORM setup, all entities (User, Post, Match, Subscription, Tip, etc.) |
| **kafka** | KafkaModule, KafkaProducerService, KafkaConsumerService |
| **redis** | RedisModule, RedisService |
| **dto** | Shared TypeScript interfaces (Auth, User, Matching, Messaging, Notification) |
| **ui** | Shared React components (Button with CVA variants) |
| **api-client** | Typed HTTP client for all API endpoints (axios-based) |

## Key conventions

### TypeScript config inheritance

- `tsconfig.base.json` has `emitDecoratorMetadata: true` + `experimentalDecorators: true` for NestJS
- **All frontend** tsconfigs (web, admin, ui, api-client) override both to `false`
- TypeScript `paths` do NOT merge when extending — `apps/admin/tsconfig.json` must redeclare all `@suggar-daddy/*` paths because it also adds `@/*` alias. `apps/web` inherits paths directly from base (no local paths).

### NestJS patterns

- `@Global()` modules: RedisModule, KafkaModule, DatabaseModule — available everywhere via `forRoot()`
- Auth decorators: `@Public()` (skip JWT), `@Roles(UserRole.ADMIN)`, `@CurrentUser()` / `@CurrentUser('userId')`
- Guards: `JwtAuthGuard`, `RolesGuard`, `OptionalJwtGuard`
- User roles: `ADMIN`, `CREATOR`, `SUBSCRIBER`

### Kafka topics

Events follow pattern `domain.action`: `subscription.created`, `payment.completed`, `content.post.created`, `media.uploaded`, `message.created`, `notification.created`

### Environment variables

Services use `ConfigModule.forRoot()` with defaults in code. Key vars: `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `KAFKA_BROKERS`, `REDIS_HOST`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### Testing

- Backend: `testEnvironment: 'node'`, frontend: `testEnvironment: 'jsdom'`
- Jest preset at root `jest.preset.js`, each project has `jest.config.ts`
- Frontend tests use `identity-obj-proxy` for CSS module mocking

## Documentation

完整的專案文檔在 `docs/` 目錄。詳見：[文檔索引 (docs/README.md)](docs/README.md)

### 核心文檔

**架構與服務**
- [服務總覽](docs/architecture/SERVICES_OVERVIEW.md) — 所有微服務的職責與架構圖
- [技術架構](docs/technical/architecture.md) — 系統架構設計
- [API 文檔](docs/technical/api.md) — API 設計與使用

**開發指南**
- [開發指南](docs/technical/development.md) — 本地開發環境設置
- [環境變數完整說明](docs/technical/environment-variables.md) — 所有環境變數的詳細說明
- [快速開始](docs/guides/QUICK_START.md) — 新手入門

**部署與維運**
- [部署指南](docs/technical/deployment.md) — Docker 和生產環境部署
- [Secrets 管理](docs/devops/secrets-management.md) — 敏感資料管理
- [監控告警](docs/devops/MONITORING_ALERTING_SETUP.md) — 系統監控設置

**測試**
- [QA 文檔](docs/qa/) — 測試策略與報告
