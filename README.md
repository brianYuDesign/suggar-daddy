# Suggar Daddy

A microservices-based dating platform built with NestJS, Next.js, and PostgreSQL.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start with Docker](#quick-start-with-docker)
- [Development](#development)
- [Testing](#testing)
- [Recent Improvements](#recent-improvements)
- [Services](#services)
- [Tech Stack](#tech-stack)

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

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Key environment variables:

```env
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=suggar_daddy

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# API Gateway
API_GATEWAY_PORT=3000

# Service Ports
AUTH_SERVICE_PORT=3001
PAYMENT_SERVICE_PORT=3002
DB_WRITER_SERVICE_PORT=3003
NOTIFICATION_SERVICE_PORT=3004
WEBSOCKET_SERVICE_PORT=3005
```

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

### Local Development Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Database Setup

Run migrations:

```bash
npm run migration:run
```

Seed database (optional):

```bash
npm run seed
```

#### 3. Start Services Locally

Start all services in development mode:

```bash
npm run dev
```

Start specific service:

```bash
# Auth service
nx serve auth-service

# Payment service
nx serve payment-service

# Frontend
nx serve web
```

### Available NPM Scripts

```bash
# Development
npm run dev                    # Start all services
npm run dev:gateway            # Start API Gateway only
npm run dev:auth               # Start Auth Service only
npm run dev:payment            # Start Payment Service only
npm run dev:web                # Start Frontend only

# Build
npm run build                  # Build all projects
npm run build:gateway          # Build API Gateway
npm run build:auth             # Build Auth Service
npm run build:payment          # Build Payment Service

# Database
npm run migration:generate     # Generate new migration
npm run migration:run          # Run pending migrations
npm run migration:revert       # Revert last migration
npm run seed                   # Seed database

# Testing
npm test                       # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:cov               # Run tests with coverage
npm run test:e2e               # Run E2E tests

# Linting
npm run lint                   # Lint all projects
npm run lint:fix               # Lint and auto-fix

# Code Quality
npm run format                 # Format code with Prettier
npm run type-check             # TypeScript type checking
```

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
