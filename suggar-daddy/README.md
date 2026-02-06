# Sugar Daddy Backend

## Overview
Backend for a dating + subscription platform (Tinder x OnlyFans style).
Built with NestJS, Nx Monorepo, and Microservices architecture.

## Architecture

### Microservices
- **api-gateway**: Entry point, routing, auth guard.
- **user-service**: User profile, auth, roles.
- **matching-service**: Tinder-style matching logic.
- **subscription-service**: OnlyFans-style subscriptions & content.
- **messaging-service**: Real-time chat.

### Infrastructure
- **PostgreSQL**: Primary DB (Read/Write split).
- **Redis**: Caching & Session Store.
- **Kafka**: Event-driven communication between services.
- **Stripe**: Payments.

## Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### Start Infrastructure
```bash
docker-compose up -d
```

### Start Services
```bash
# Start Gateway
npx nx serve api-gateway

# Start User Service (Coming soon)
npx nx serve user-service
```

### Git Flow
- `main`: Stable production branch.
- Feature branches for development.

## Documentation
See `docs/BACKEND_DESIGN.md` for detailed design.
