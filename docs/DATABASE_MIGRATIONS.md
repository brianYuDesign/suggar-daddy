# Database Migrations Guide

## Overview

Each microservice has its own database and migration configuration. This guide explains how to run migrations for each service.

## Prerequisites

- PostgreSQL installed and running
- Environment variables configured (copy `.env.example` to `.env` for each service)

## Services and Databases

| Service | Database Name | Entities |
|---------|---------------|----------|
| subscription-service | suggar_daddy_subscription | SubscriptionTier, Subscription |
| content-service | suggar_daddy_content | Post, PostLike, PostComment |
| payment-service | suggar_daddy_payment | Transaction, PostPurchase, Tip |
| media-service | suggar_daddy_media | MediaFile |

## Running Migrations

### 1. Create Databases

First, create the databases for each service:

```bash
psql -U postgres
CREATE DATABASE suggar_daddy_subscription;
CREATE DATABASE suggar_daddy_content;
CREATE DATABASE suggar_daddy_payment;
CREATE DATABASE suggar_daddy_media;
\q
```

### 2. Run Migrations for Each Service

#### Subscription Service
```bash
cd apps/subscription-service
npx typeorm-ts-node-commonjs migration:run -d ormconfig.ts
```

#### Content Service
```bash
cd apps/content-service
npx typeorm-ts-node-commonjs migration:run -d ormconfig.ts
```

#### Payment Service
```bash
cd apps/payment-service
npx typeorm-ts-node-commonjs migration:run -d ormconfig.ts
```

#### Media Service
```bash
cd apps/media-service
npx typeorm-ts-node-commonjs migration:run -d ormconfig.ts
```

## Migration Commands

### Generate a New Migration
```bash
cd apps/<service-name>
npx typeorm-ts-node-commonjs migration:generate -d ormconfig.ts src/migrations/MigrationName
```

### Create an Empty Migration
```bash
cd apps/<service-name>
npx typeorm-ts-node-commonjs migration:create src/migrations/MigrationName
```

### Revert Last Migration
```bash
cd apps/<service-name>
npx typeorm-ts-node-commonjs migration:revert -d ormconfig.ts
```

### Show Migration Status
```bash
cd apps/<service-name>
npx typeorm-ts-node-commonjs migration:show -d ormconfig.ts
```

## Environment Variables

Each service needs these database environment variables in its `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=<service_database_name>
```

## Initial Schema

The initial migration (`1738814400000-InitialSchema.ts`) creates:

### Subscription Service
- `subscription_tiers` table with indexes
- `subscriptions` table with indexes and unique constraints

### Content Service
- `posts` table with indexes
- `post_likes` table with unique constraint
- `post_comments` table with indexes

### Payment Service
- `transactions` table with indexes
- `post_purchases` table with unique constraint
- `tips` table with indexes

### Media Service
- `media_files` table with indexes

## Production Notes

- **IMPORTANT**: Set `synchronize: false` in production (already configured in ormconfig.ts)
- Always test migrations in development/staging before production
- Backup your database before running migrations in production
- Use migration transactions when possible
- Keep migrations idempotent when feasible

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check database exists: `psql -U postgres -l`
- Verify environment variables are loaded

### Migration Conflicts
- Check migration status: `migration:show`
- Revert problematic migration: `migration:revert`
- Ensure migration timestamps are unique

### TypeORM Errors
- Install ts-node if missing: `npm install -D ts-node`
- Ensure dotenv is installed: `npm install dotenv`
- Check entity paths in ormconfig.ts match your file structure