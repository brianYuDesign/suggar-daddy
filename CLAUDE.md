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

### Data flow pattern (critical)

```
Client → API Gateway (HTTP proxy, :3000)
           → Service reads from Redis (cache)
           → Service writes to Kafka (events)
                → db-writer-service consumes Kafka → PostgreSQL (persist)
```

Services do NOT write to PostgreSQL directly. `db-writer-service` is the sole Kafka consumer that persists data. This ensures decoupled, eventually consistent writes.

### Backend services (apps/)

| Service | Port | Route prefix |
|---------|------|--------------|
| api-gateway | 3000 | Proxies all `/api/*` routes |
| user-service | 3001 | `/api/v1/users` |
| auth-service | 3002 | `/api/v1/auth` |
| matching-service | 3003 | `/api/v1/matching` |
| subscription-service | 3005 | `/api/subscription-tiers`, `/api/subscriptions` |
| content-service | 3006 | `/api/posts` |
| payment-service | 3007 | `/api/tips`, `/api/post-purchases`, `/api/transactions`, `/api/stripe` |
| media-service | 3008 | `/api/upload`, `/api/media` |
| notification-service | — | Kafka-driven |
| messaging-service | — | Kafka-driven |
| db-writer-service | — | Kafka consumer only |

Route-to-service mapping is in `apps/api-gateway/src/app/proxy.service.ts`.

### Frontend apps (apps/)

| App | Port | Stack |
|-----|------|-------|
| web | 4200 | Next.js 14 (App Router) + Tailwind |
| admin | 4300 | Next.js 14 (App Router) + Tailwind + shadcn/ui |

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

Detailed Chinese-language docs in `docs/` — see `docs/README.md` for index. Key files:
- `02-開發指南.md` — API docs, JWT auth, Kafka integration
- `BUSINESS_LOGIC_GAPS.md` — Known gaps per service
- `STRIPE.md` — Stripe integration details
- `TESTING.md` — Test coverage summary
