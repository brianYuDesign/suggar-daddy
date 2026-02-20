# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dating platform built as an Nx monorepo with 13 NestJS microservices, 2 Next.js frontends, PostgreSQL (master-replica), Redis, and Kafka.

## Commands

### Build
```bash
npm run build                    # Build all backend services + entities
nx build <project-name>          # Build single project (e.g. nx build api-gateway)
npm run build:backend            # Backend only
npm run build:frontend           # Frontend only
```

### Serve (development)
```bash
npm run dev                      # Start all services + infrastructure (Docker)
npm run dev:core                 # Core services only
npm run dev:stop                 # Stop all
nx serve <service-name>          # Single service (e.g. nx serve api-gateway)
npm run serve:web                # Next.js web frontend (port 4200)
npm run serve:admin              # Admin dashboard (port 4300)
```

### Test
```bash
# Unit tests (Jest)
npm run test:unit                           # All unit tests
npm run test:unit -- --testPathPattern=auth  # Filter by path pattern
nx test <project-name>                      # Single project tests (e.g. nx test auth-service)

# Integration tests
npm run test:integration

# UI component tests (jsdom)
npm run test:ui

# E2E tests (Playwright)
npm run test:e2e                    # All E2E tests
npx playwright test <spec-file>    # Single spec file
npm run test:e2e:headed             # With browser visible
npm run test:e2e:debug              # Debug mode
npm run test:e2e:report             # View last report
```

### Lint
```bash
npm run lint              # Lint all projects
nx lint <project-name>    # Lint single project
```

### Database
```bash
npm run db:migrate        # Run migrations
npm run db:seed           # Seed data
npm run db:seed:rich      # Rich fake data (tools/seed-data)
```

## Architecture

### Service Communication
- **Client → API Gateway (port 3000)** → routes to individual services via HTTP
- **Async events**: Services produce to Kafka → `db-writer-service` consumes and persists (CQRS write side)
- **Real-time**: Socket.io WebSocket for messaging and notifications
- **Caching**: Redis for feeds, trending content, rate limiting, and geo queries (`geo:users` key)

### Microservices (apps/)
| Service | Port | Domain |
|---------|------|--------|
| api-gateway | 3000 | Request routing, auth proxy |
| user-service | 3001 | Profiles, search, reporting |
| auth-service | 3002 | JWT auth, Google/Apple OAuth |
| matching-service | 3003 | Matching, discovery, swipes |
| subscription-service | 3005 | Plans, billing, auto-renewal |
| content-service | 3006 | Posts, stories, comments |
| payment-service | 3007 | Stripe, wallet, tips |
| media-service | 3008 | Upload, compression, CDN |
| notification-service | — | Push, email, in-app |
| messaging-service | — | Chat, WebSocket |
| recommendation-service | — | Feed, trending |
| db-writer-service | — | Kafka consumer, DB writes |
| admin-service | — | Admin operations |

### Frontends
- **web** (Next.js 14 App Router, port 4200) — User-facing app with route groups: `(auth)/` and `(main)/`
- **admin** (Next.js, port 4300) — Management dashboard

### Shared Libraries (libs/)
| Import path | Purpose |
|-------------|---------|
| `@suggar-daddy/entities` | All TypeORM entities (centralized) |
| `@suggar-daddy/dto` | DTOs and validation schemas |
| `@suggar-daddy/common` | Utilities: exception filters, tracing, S3, Stripe helpers, circuit breaker |
| `@suggar-daddy/database` | TypeORM configuration and DB module |
| `@suggar-daddy/redis` | Redis module with connection pooling |
| `@suggar-daddy/kafka` | Kafka producer/consumer with retry + DLQ |
| `@suggar-daddy/auth` | JWT/OAuth strategies, guards (JwtAuthGuard, OptionalJwtGuard, RolesGuard) |
| `@suggar-daddy/api-client` | Typed frontend API client |
| `@suggar-daddy/ui` | React component library |

Path aliases defined in `tsconfig.base.json`.

### Database
- **PostgreSQL**: Master (5432, writes) + Replica (5433, reads) with streaming replication
- **ORM**: TypeORM 0.3 — entities in `libs/entities/src/lib/` organized by domain
- **Redis**: Single-mode or Sentinel HA; geo queries use `client.call('GEODIST', key, a, b, 'km')` (not `geodist()`)

### Key Patterns
- **CQRS**: Write events → Kafka → db-writer-service → PostgreSQL; Read from DB/Redis
- **Kafka consumers**: Use exponential backoff retry with DLQ (see `db-writer.consumer.ts` pattern)
- **Auth guards**: `JwtAuthGuard` (required), `OptionalJwtGuard` (public-friendly), `RolesGuard` (role-based)
- **ValidationPipe**: Global with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- **Tracing**: OpenTelemetry + Jaeger — each service calls `TracingService.init()` before app creation

## Code Style
- ESLint: `no-explicit-any` is error (warn in tests), `no-console` (only `warn`/`error` allowed), `explicit-function-return-type` warn (off for React/tests), max 500 lines per file
- Unused vars: prefix with `_` to suppress lint errors
- Frontend (React/Next.js): explicit return types not required
- Prettier integrated — config in `.prettierrc`

## Infrastructure
- Docker Compose manages all infrastructure: `docker-compose.yml`
- PM2 for local service orchestration: `ecosystem.config.js`
- Environment: `.env` (local), `.env.example` (template), `.env.docker` (compose)
- CI/CD: GitHub Actions in `.github/workflows/`

## Testing Notes
- Unit test files: `*.spec.ts` in `apps/*/src/` and `libs/*/src/`
- Integration test files: `*.integration.spec.ts`
- E2E specs: `test/e2e/specs/`
- Jest configs: `test/config/jest/jest.{unit,integration,ui}.config.ts`
- Playwright config: `playwright.config.ts` (runs with 1 worker for consistency)
- E2E rate limiting issues: tests use serial mode + Redis rate limit clearing + retries
- When mocking RedisService in tests, mock ALL methods used (incomplete mocks cause failures)
