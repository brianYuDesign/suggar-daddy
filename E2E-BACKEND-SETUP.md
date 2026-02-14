# E2E Testing Backend Setup

## Issue Summary
The E2E tests require test user accounts to be created in the database, but the backend auth endpoints are returning 500 Internal Server Error.

## Diagnosis
✅ **Working Services:**
- PostgreSQL database (localhost:5432)
- Redis cache (localhost:6379)
- Kafka broker (localhost:9092)
- API Gateway (localhost:3000)
- Auth Service (localhost:3002)
- User Service (localhost:3001)
- Frontend services (web:4200, admin:4300)

❌ **Issue:**
- Auth endpoints (`/api/auth/login`, `/api/auth/register`) returning 500 errors
- Cannot create test users programmatically

## Required Test Users
The E2E tests expect these accounts (defined in `e2e/utils/test-helpers.ts`):

1. **Creator Account**
   - Email: creator@test.com
   - Password: Test1234!
   - Role: sugar_baby
   - Display Name: Test Creator

2. **Subscriber Account**
   - Email: subscriber@test.com
   - Password: Test1234!
   - Role: sugar_daddy
   - Display Name: Test Subscriber

3. **Admin Account**
   - Email: admin@test.com
   - Password: Admin1234!
   - Role: sugar_daddy (with is_admin=true)
   - Display Name: Test Admin

## Manual Setup Options

### Option 1: SQL Script (Recommended)
If you have database access, run:
```bash
# Execute the SQL seed script
docker exec -i $(docker ps -q -f name=postgres) psql -U postgres -d suggar_daddy < scripts/seed-test-users.sql

# Or if you have psql installed locally:
psql -h localhost -U postgres -d suggar_daddy < scripts/seed-test-users.sql
```

The script is at `scripts/seed-test-users.sql` and includes:
- Password hashes for Test1234! and Admin1234!
- ON CONFLICT clause to update existing users
- All three test accounts

### Option 2: Fix Auth Service
The auth service is likely failing due to:
1. **Database schema mismatch** - Check if migrations need to run
2. **Missing dependencies** - Verify bcrypt or other packages are installed
3. **Connection issues** - Though connections test successfully

To investigate:
```bash
# Check auth-service logs (if running via Docker)
docker compose logs auth-service --tail=50

# Or check the service directly
curl -v http://localhost:3002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!","role":"sugar_baby","displayName":"Test"}'
```

### Option 3: Run Without Authentication
Some Playwright tests can run without login:
- Page load tests
- Navigation tests  
- UI component tests
- Responsive design tests

To skip auth-required tests:
```bash
# Run only non-auth tests
npx playwright test --grep-invert "login|auth|authenticated"
```

## Next Steps

1. **Immediate:** Manually insert test users using SQL script
2. **Short-term:** Fix auth service 500 errors
3. **Long-term:** Add database seeding to project setup

## Files Created

- `scripts/seed-test-users.sql` - SQL script to insert test users
- `scripts/seed-test-users.ts` - TypeScript version (not working due to ts-node issues)
- `scripts/test-backend.js` - Connection testing script
- `.env` - Updated with localhost configuration (was using Docker hostnames)

## Environment Configuration

The `.env` file has been updated to use `localhost` instead of Docker service names:
- `DB_HOST=localhost` (was `postgres`)
- `REDIS_HOST=localhost` (was `redis`)
- `KAFKA_BROKERS=localhost:9092` (was `kafka:9092`)

This allows locally-running NestJS services to connect to Docker-hosted infrastructure.
