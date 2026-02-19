# Auth Service - Quick Start Guide

Get the Auth Service up and running in 10 minutes.

## 🚀 Start in 3 Steps

### Step 1: Clone & Install (2 minutes)

```bash
cd auth-service
npm install
cp .env.example .env
```

### Step 2: Setup Database (3 minutes)

```bash
# Start PostgreSQL (Docker recommended)
docker run --name auth-db \
  -e POSTGRES_USER=auth_user \
  -e POSTGRES_PASSWORD=auth_password \
  -e POSTGRES_DB=sugar_daddy_auth \
  -p 5432:5432 \
  -d postgres:14

# Run migrations
npm run migration:run
```

### Step 3: Run Service (1 minute)

```bash
npm run start:dev
```

✅ Service running at `http://localhost:3002`

---

## 🧪 Test Endpoints

### 1. Register User

```bash
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "password": "SecurePassword123"
  }'
```

**Response**: Tokens + user data

```json
{
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900,
      "tokenType": "Bearer"
    }
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

Save the `accessToken` from response.

### 3. Get Current User

```bash
TOKEN="your-access-token-here"

curl http://localhost:3002/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Validate Token

```bash
TOKEN="your-access-token-here"

curl -X POST http://localhost:3002/api/v1/auth/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

### 5. Refresh Token

```bash
REFRESH_TOKEN="your-refresh-token-here"

curl -X POST http://localhost:3002/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

### 6. Logout

```bash
TOKEN="your-access-token-here"

curl -X POST http://localhost:3002/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

### 7. Get User Profile

```bash
TOKEN="your-access-token-here"

curl http://localhost:3002/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Update Profile

```bash
TOKEN="your-access-token-here"

curl -X PATCH http://localhost:3002/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jonathan",
    "lastName": "DoeSomething"
  }'
```

### 9. Change Password

```bash
TOKEN="your-access-token-here"

curl -X POST http://localhost:3002/api/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "SecurePassword123",
    "newPassword": "NewPassword456",
    "confirmPassword": "NewPassword456"
  }'
```

---

## 🛠️ Development Commands

```bash
# Start in watch mode
npm run start:dev

# Build for production
npm run build

# Run all tests
npm test

# Run tests with coverage
npm test:cov

# Watch tests
npm run test:watch

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format

# Run database migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## 📝 Environment Setup

Edit `.env` file:

```env
# Server
PORT=3002
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=auth_user
DB_PASSWORD=auth_password
DB_NAME=sugar_daddy_auth

# JWT (minimum 32 characters each)
JWT_SECRET=your-super-secret-key-change-in-production-123456
JWT_EXPIRATION=900
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-123456
JWT_REFRESH_EXPIRATION=604800

# Bcrypt
BCRYPT_ROUNDS=10

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
```

---

## 🐳 Docker Quick Start

### Using Docker Compose (Easiest)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f auth-service

# Stop services
docker-compose down
```

### Manual Docker

```bash
# Build image
docker build -t auth-service:latest .

# Run container
docker run -p 3002:3002 \
  --env-file .env \
  auth-service:latest
```

---

## 🔍 Database Inspection

### Connect to PostgreSQL

```bash
psql -h localhost -U auth_user -d sugar_daddy_auth
```

### View Tables

```sql
\dt                          # List all tables
SELECT * FROM users;        # View all users
SELECT * FROM roles;        # View all roles
SELECT * FROM permissions;  # View all permissions
```

---

## 🧪 Postman Collection

### Setup in Postman

1. Import collection from `docs/postman-collection.json`
2. Set variables:
   - `BASE_URL` = `http://localhost:3002`
   - `accessToken` = Your JWT token
   - `refreshToken` = Your refresh token

### Available Requests
- Register
- Login
- Get Profile
- List Users (Admin)
- Manage Roles
- Manage Permissions

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3002
lsof -i :3002
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check credentials in .env
cat .env | grep DB_
```

### Token Invalid/Expired
```bash
# Get new token via refresh
curl -X POST http://localhost:3002/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'

# Or login again
```

### Tests Failing
```bash
# Ensure database is running
docker ps | grep postgres

# Clear database and retry
npm run migration:revert
npm run migration:run
npm test
```

---

## 📚 Learn More

- [Full README](./README.md) - Complete API documentation
- [Architecture](./ARCHITECTURE.md) - System design details
- [API Spec](./docs/openapi.yaml) - OpenAPI specification

---

## ✅ Checklist

- ✅ Install dependencies
- ✅ Configure `.env`
- ✅ Start PostgreSQL
- ✅ Run migrations
- ✅ Start service
- ✅ Register user
- ✅ Login with user
- ✅ Get JWT tokens
- ✅ Test protected endpoints
- ✅ Run tests

---

**Ready to go!** 🚀

For issues, check the [Troubleshooting](#-troubleshooting) section or review logs:

```bash
npm run start:dev 2>&1 | tee debug.log
```

