# Suggar Daddy

A microservices-based dating platform built with NestJS, Next.js, and PostgreSQL.

## Table of Contents

- [Documentation](#documentation)
- [Architecture](#architecture)
- [Quick Start with Docker](#quick-start-with-docker)
- [Development](#development)
- [Testing](#testing)
- [Recent Improvements](#recent-improvements)
- [Services](#services)
- [Tech Stack](#tech-stack)

---

## 📚 Documentation

### 統一文檔中心

所有專案文檔已整合至 `docs/` 目錄，請訪問 **[文檔索引 (docs/README.md)](./docs/README.md)** 查看完整導航。

### 核心文檔快速鏈接

| 分類 | 文檔 | 描述 |
|------|------|------|
| 🚀 **快速開始** | [Quick Start](./docs/guides/QUICK_START.md) | 新手入門指南 |
| 📖 **指南** | [操作指南](./docs/guides/) | 最佳實踐、FAQ、部署指南 |
| 🔧 **技術** | [技術文檔](./docs/technical/) | 架構、API、開發指南 |
| 👥 **團隊** | [Backend](./docs/backend/) · [Frontend](./docs/frontend/) · [DevOps](./docs/devops/) · [QA](./docs/qa/) | 各團隊專屬文檔 |
| 📊 **報告** | [Reports](./docs/reports/) | 各類專案報告與審查 |

### 快速開始

- **新手**: [快速開始](./docs/guides/QUICK_START.md)
- **開發**: [開發指南](./docs/technical/development.md)
- **部署**: [部署指南](./docs/technical/deployment.md)
- **監控**: [監控告警](./docs/devops/MONITORING_ALERTING_SETUP.md)

### 按角色導航

#### 🚀 新手開發者
- [快速開始](./docs/guides/QUICK_START.md)
- [常見問題](./docs/guides/FAQ.md)
- [開發指南](./docs/technical/development.md)

#### 👨‍💻 後端工程師
- [API 設計](./docs/technical/api.md)
- [架構概覽](./docs/technical/architecture.md)
- [後端文檔](./docs/backend/)

#### 🎨 前端工程師
- [前端文檔](./docs/frontend/)
- [UI/UX 指南](./docs/frontend/component-guidelines.md)

#### 🔧 DevOps 工程師
- [部署指南](./docs/technical/deployment.md)
- [監控告警](./docs/devops/MONITORING_ALERTING_SETUP.md)
- [災難恢復](./docs/devops/DISASTER_RECOVERY.md)

#### 🧪 QA 工程師
- [測試文檔](./docs/qa/)
- [E2E 測試優化](./docs/qa/test-optimization.md)

#### 📋 專案經理
- [專案進度](./docs/pm/PROGRESS.md)
- [上線檢查清單](./docs/pm/LAUNCH_CHECKLIST.md)
- [營運手冊](./docs/pm/OPERATIONS_MANUAL.md)

---

## Architecture

This project follows a microservices architecture using Nx monorepo structure:

### Service Structure

- **API Gateway** (`apps/api-gateway`) - Entry point for all client requests
- **Auth Service** (`apps/auth-service`) - User authentication and authorization
- **Payment Service** (`apps/payment-service`) - Stripe payment integration and wallet management
- **DB Writer Service** (`apps/db-writer-service`) - Centralized database write operations
- **Notification Service** (`apps/notification-service`) - Push notifications and email delivery
- **WebSocket Service** (`apps/websocket-service`) - Real-time communication
- **Web Frontend** (`apps/web`) - Next.js client application

### Shared Libraries

- **@shared/exceptions** - Unified error handling module with standardized error codes
- **@shared/database** - Database configuration and entities
- **@shared/types** - Common TypeScript types and interfaces

### Key Features

- **Unified Error Handling**: Centralized exception module with consistent error codes across all services
- **Event-Driven Architecture**: Services communicate via message queues
- **Database per Service**: Each service manages its own data
- **API Gateway Pattern**: Single entry point with routing to microservices

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/brianYuDesign/suggar-daddy.git
cd suggar-daddy
```

### 2. Environment Setup

#### a. 設置環境變數

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

#### b. 設置 Docker Secrets（推薦）

**重要**：為了安全管理敏感資料（密碼、API keys），我們使用 Docker Secrets。

執行自動設置腳本：

```bash
./scripts/setup-secrets.sh
```

這會自動生成所有需要的 secrets：
- ✅ 資料庫密碼
- ✅ JWT 簽名密鑰
- ✅ Stripe API keys（測試用）
- ✅ Cloudinary keys（測試用）
- ✅ 其他認證資訊

**查看生成的 secrets**：

```bash
ls -la secrets/
```

**生產環境**：

```bash
# 生成強密碼
./scripts/setup-secrets.sh --production

# 然後手動更新真實的 API keys
echo "sk_live_YOUR_KEY" > secrets/stripe_secret_key.txt
```

**詳細文檔**：請參閱 [Secrets 管理指南](./docs/devops/secrets-management.md)

#### c. 主要環境變數

`.env` 檔案中的主要配置：

```env
# Node 環境
NODE_ENV=development

# Database（密碼使用 Docker Secrets）
POSTGRES_HOST=postgres-master
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_DB=suggar_daddy

# Redis
REDIS_HOST=redis-master
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=kafka:9092

# Service Ports
PORT=3000                    # API Gateway
AUTH_SERVICE_PORT=3002       # Auth Service
USER_SERVICE_PORT=3001       # User Service
PAYMENT_SERVICE_PORT=3007    # Payment Service
```

**注意**：敏感資料（如密碼、API keys）不應該放在 `.env` 中，而是使用 Docker Secrets 管理。

### 3. Start Services with Docker Compose

We provide multiple Docker Compose profiles for different use cases:

#### Start All Services (Full Stack)

```bash
docker-compose --profile full up -d
```

This starts:
- PostgreSQL database
- Redis cache
- All microservices (auth, payment, db-writer, notification, websocket)
- API Gateway
- Next.js frontend

#### Start Core Services Only

```bash
docker-compose --profile core up -d
```

This starts:
- PostgreSQL database
- Redis cache
- Core microservices (auth, payment, db-writer)
- API Gateway

#### Start with Frontend Development

```bash
docker-compose --profile frontend up -d
```

This starts:
- All backend services
- Frontend in development mode with hot reload

#### Stop Services

```bash
docker-compose down
```

To remove volumes (database data):

```bash
docker-compose down -v
```

### 4. Service Port Mappings

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Main entry point |
| Auth Service | 3001 | Authentication |
| Payment Service | 3002 | Stripe payments |
| DB Writer Service | 3003 | Database operations |
| Notification Service | 3004 | Notifications |
| WebSocket Service | 3005 | Real-time chat |
| Web Frontend | 3006 | Next.js app |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |

### 5. Access the Application

- **Frontend**: http://localhost:3006
- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api (Swagger)

## Development

### 🚀 快速開始指南

我們提供了全新的**智能腳本系統**，讓開發環境管理變得更簡單！

> 📖 **詳細文檔**: [腳本系統完整指南](./scripts/README.md)

#### 最常用命令

```bash
# 🎯 一鍵啟動開發環境（推薦）
npm run dev

# 🛑 停止所有服務
npm run dev:stop

# 🔄 重置開發環境
npm run dev:reset

# ✅ 運行測試
npm run test:unit        # 單元測試
npm run test:e2e         # E2E 測試

# 🔨 建置項目
npm run build:all        # 建置所有項目
```

### Local Development Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Database Setup

```bash
# 運行資料庫遷移
npm run db:migrate

# 載入種子資料（可選）
npm run db:seed

# 備份資料庫
npm run db:backup
```

#### 3. Start Services Locally

```bash
# 🎯 啟動開發環境（推薦）
npm run dev              # 啟動核心服務 + web 前端

# 🚀 進階啟動選項
npm run dev:all          # 啟動所有服務（包含可選服務）
npm run dev:core         # 只啟動核心後端服務

# 使用底層腳本獲得更多控制
./scripts/dev/start.sh --help           # 查看所有選項
./scripts/dev/start.sh --core-only      # 只啟動核心服務
./scripts/dev/start.sh --no-web         # 不啟動前端
./scripts/dev/start.sh --admin          # 啟動 admin 前端
```

#### 4. 啟動特定服務

使用 Nx 直接啟動單個服務：

```bash
# 後端服務
nx serve api-gateway
nx serve auth-service
nx serve user-service
nx serve payment-service

# 前端應用
nx serve web            # 用戶端
nx serve admin          # 管理後台
```

### 📜 NPM Scripts 完整列表

#### 🔧 開發相關

```bash
npm run dev              # 啟動開發環境（核心 + 推薦服務 + web）
npm run dev:all          # 啟動所有服務
npm run dev:core         # 只啟動核心服務
npm run dev:stop         # 停止所有服務
npm run dev:reset        # 重置開發環境（清理資料）
```

#### 🧪 測試相關

```bash
npm run test:unit              # 單元測試
npm run test:e2e               # E2E 測試
npm run test:integration       # 整合測試
npm run test:coverage          # 生成覆蓋率報告

# 進階測試選項
npm run test:unit -- --help                # 查看測試選項
npm run test:unit -- --watch               # 監聽模式
npm run test:unit -- --coverage            # 帶覆蓋率
npm run test:unit -- api-gateway           # 只測試特定項目
```

#### 🔨 建置相關

```bash
npm run build:all          # 建置所有項目
npm run build:backend      # 建置所有後端服務
npm run build:frontend     # 建置所有前端應用

# 進階建置選項
npm run build:all -- --help                # 查看建置選項
npm run build:all -- --production          # 生產環境建置
npm run build:backend -- api-gateway       # 只建置特定服務
```

#### 💾 資料庫相關

```bash
npm run db:migrate         # 運行資料庫遷移
npm run db:seed            # 載入種子資料
npm run db:backup          # 備份資料庫

# 進階資料庫選項
npm run db:migrate -- --help               # 查看遷移選項
npm run db:migrate -- --rollback           # 回滾遷移
npm run db:migrate -- --dry-run            # 預覽遷移
npm run db:seed -- --force                 # 強制重新載入
```

#### 📝 代碼品質

```bash
npm run lint               # 檢查代碼風格
npm run format             # 格式化代碼
```

### 🎯 智能腳本系統特色

我們的新腳本系統提供：

- ✅ **智能等待** - 基於健康檢查，不浪費時間
- ✅ **並行啟動** - 多服務同時啟動，節省 70% 時間
- ✅ **清晰日誌** - 彩色輸出，一目了然
- ✅ **錯誤處理** - 友好的錯誤提示和自動清理
- ✅ **豐富選項** - 靈活的啟動配置
- ✅ **完整文檔** - 每個腳本都有 `--help`

**範例**:

```bash
# 查看所有可用選項
./scripts/dev/start.sh --help

# 強制重啟（清理舊進程）
./scripts/dev/start.sh --force

# 跳過 Docker 基礎設施啟動
./scripts/dev/start.sh --skip-docker
```

> 💡 **提示**: 所有腳本都支援 `--help` 選項，顯示詳細的使用說明！

### Environment Variables Reference

Create `.env` file with these variables:

#### Database Configuration
- `DATABASE_HOST` - PostgreSQL host (default: localhost)
- `DATABASE_PORT` - PostgreSQL port (default: 5432)
- `DATABASE_USER` - Database username
- `DATABASE_PASSWORD` - Database password
- `DATABASE_NAME` - Database name

#### Redis Configuration
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)

#### Authentication
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_EXPIRES_IN` - Token expiration time (e.g., "7d", "24h")

#### Stripe Integration
- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

#### Service Ports
- `API_GATEWAY_PORT` - API Gateway port (default: 3000)
- `AUTH_SERVICE_PORT` - Auth service port (default: 3001)
- `PAYMENT_SERVICE_PORT` - Payment service port (default: 3002)
- `DB_WRITER_SERVICE_PORT` - DB Writer port (default: 3003)
- `NOTIFICATION_SERVICE_PORT` - Notification port (default: 3004)
- `WEBSOCKET_SERVICE_PORT` - WebSocket port (default: 3005)

## Testing

### Running Tests

#### Unit Tests

Run all unit tests:

```bash
npm test
```

Run tests for specific service:

```bash
# Auth Service
nx test auth-service

# Payment Service
nx test payment-service

# DB Writer Service
nx test db-writer-service
```

Run tests in watch mode:

```bash
npm run test:watch
```

#### Test Coverage

Generate coverage report:

```bash
npm run test:cov
```

Coverage reports are generated in `coverage/` directory.

#### E2E Tests

Run end-to-end tests:

```bash
npm run test:e2e
```

### Test Structure

Tests are located alongside source files:

```
apps/
├── auth-service/
│   └── src/
│       ├── auth.controller.spec.ts
│       └── auth.service.spec.ts
├── payment-service/
│   └── src/
│       ├── payment.controller.spec.ts
│       ├── wallet.service.spec.ts
│       └── stripe-webhook.controller.spec.ts
└── db-writer-service/
    └── src/
        └── db-writer.service.spec.ts
```

### Current Test Coverage

- **Auth Service**: Controller and service unit tests
- **Payment Service**: Payment controller, wallet service, and Stripe webhook tests
- **DB Writer Service**: Service unit tests with repository mocking

## Recent Improvements

### ⚡ Phase A: Critical Security - Rate Limiting (2024-02-16)

#### Rate Limiting Implementation ✅
- **三層限流架構**：
  - 全局限流：100 requests/分鐘/IP（防止 DDoS）
  - 認證端點：5 requests/分鐘/IP（防止暴力破解）
  - 支付端點：10 requests/分鐘/用戶（防止支付濫用）
- **技術實施**：
  - 使用 `@nestjs/throttler` 標準化限流
  - Redis 儲存支援分散式部署
  - 智能 IP 追蹤（X-Forwarded-For, X-Real-IP）
  - 標準 Rate Limit Headers
  - 路徑自動識別與策略選擇
- **文檔**：詳見 [docs/rate-limiting.md](./docs/rate-limiting.md)
- **影響**：
  - ✅ 保護所有 API 端點免受 DDoS 攻擊
  - ✅ 防止暴力破解登入/註冊
  - ✅ 防止支付濫用和重複扣款
  - ✅ 支援高可用 Redis Sentinel 架構

---

### Phase 1 Infrastructure Fixes (Completed)

#### 1. Docker Compose Configuration
- Added comprehensive `docker-compose.yml` with all services
- Multi-profile support (core, full, frontend)
- Proper service dependencies and health checks
- Volume management for data persistence
- Network isolation between services

#### 2. Unified Error Handling Module
- Created `@shared/exceptions` module for consistent error handling
- Standardized error codes across all services:
  - `AUTH_*` - Authentication errors (1000-1999)
  - `PAYMENT_*` - Payment errors (2000-2999)
  - `DB_*` - Database errors (3000-3999)
  - `VALIDATION_*` - Validation errors (4000-4999)
- Custom exception classes with HTTP status mapping
- Global exception filter implementation

#### 3. Unit Test Coverage
- Established unit tests for core services:
  - Auth Service: Authentication controller and service
  - Payment Service: Payment controller, wallet service, Stripe webhooks
  - DB Writer Service: Database operations
- Test utilities and mocking setup
- Coverage reporting configured

#### 4. Error Code Standardization
- Consistent error response format across services
- Proper HTTP status codes
- Detailed error messages for debugging
- Error code documentation

## Services

### API Gateway
Central entry point that routes requests to appropriate microservices.

**Responsibilities:**
- Request routing
- Authentication middleware
- Rate limiting
- API documentation (Swagger)

### Auth Service
Handles user authentication and authorization.

**Features:**
- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- Role-based access control (RBAC)

**Error Codes:**
- `AUTH_INVALID_CREDENTIALS` (1001)
- `AUTH_USER_NOT_FOUND` (1002)
- `AUTH_TOKEN_EXPIRED` (1003)
- `AUTH_INSUFFICIENT_PERMISSIONS` (1004)

### Payment Service
Manages payments and wallet operations using Stripe.

**Features:**
- Stripe payment processing
- Wallet management (credits/coins)
- Transaction history
- Webhook handling for payment events

**Error Codes:**
- `PAYMENT_INSUFFICIENT_FUNDS` (2001)
- `PAYMENT_INVALID_AMOUNT` (2002)
- `PAYMENT_STRIPE_ERROR` (2003)
- `PAYMENT_TRANSACTION_FAILED` (2004)

### DB Writer Service
Centralized service for database write operations.

**Features:**
- User data persistence
- Transaction management
- Data validation
- Audit logging

**Error Codes:**
- `DB_WRITE_FAILED` (3001)
- `DB_CONSTRAINT_VIOLATION` (3002)
- `DB_TRANSACTION_FAILED` (3003)

### Notification Service
Handles push notifications and email delivery.

**Features:**
- Push notification to mobile devices
- Email notifications
- In-app notifications
- Notification preferences

### WebSocket Service
Real-time communication for chat and updates.

**Features:**
- Real-time chat messaging
- Online presence tracking
- Typing indicators
- Read receipts

## Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Cache**: Redis
- **Message Queue**: Bull (Redis-based)
- **Authentication**: JWT, Passport
- **Payment**: Stripe

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **State Management**: React Query

### DevOps
- **Containerization**: Docker, Docker Compose
- **Monorepo**: Nx
- **Testing**: Jest, Supertest
- **Linting**: ESLint, Prettier
- **CI/CD**: GitHub Actions (planned)

## Project Structure

```
suggar-daddy/
├── apps/
│   ├── api-gateway/          # API Gateway
│   ├── auth-service/         # Authentication service
│   ├── payment-service/      # Payment service
│   ├── db-writer-service/    # DB Writer service
│   ├── notification-service/ # Notification service
│   ├── websocket-service/    # WebSocket service
│   └── web/                  # Next.js frontend
├── libs/
│   └── shared/
│       ├── exceptions/       # Unified error handling
│       ├── database/         # Database config
│       └── types/            # Shared types
├── docker-compose.yml        # Docker configuration
├── .env.example              # Environment template
├── nx.json                   # Nx configuration
├── package.json              # Dependencies
└── tsconfig.base.json        # TypeScript config
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Run linting and tests
5. Submit a pull request

## License

MIT

## Support

For questions or issues, please contact the development team or open an issue on GitHub.

## 📖 團隊工作流程

新成員或需要了解開發流程？請閱讀：
- **[團隊工作流程](./docs/TEAM-WORKFLOW.md)** - 完整的開發、測試、部署流程
- [開發指南](./docs/02-開發指南.md) - API 開發參考
- [文檔中心](./docs/INDEX.md) - 所有文檔導航
