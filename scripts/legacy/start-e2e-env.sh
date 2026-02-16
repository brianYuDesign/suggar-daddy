#!/bin/bash
# E2E 測試環境快速啟動腳本

set -e

# ── Utility Functions ───────────────────────────────────────────
wait_for_service() {
  local url=$1
  local name=$2
  local max_attempts=${3:-30}
  local attempt=0

  echo "⏳ Waiting for $name ($url)..."
  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo "✅ $name is ready!"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo "❌ $name failed to start after ${max_attempts}s"
  return 1
}

wait_for_postgres() {
  local container=$1
  local max_attempts=${2:-30}
  local attempt=0

  echo "⏳ Waiting for PostgreSQL..."
  while [ $attempt -lt $max_attempts ]; do
    if docker exec "$container" pg_isready -U postgres > /dev/null 2>&1; then
      echo "✅ PostgreSQL is ready!"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo "❌ PostgreSQL failed to start after ${max_attempts}s"
  return 1
}

wait_for_redis() {
  local max_attempts=${1:-30}
  local attempt=0

  echo "⏳ Waiting for Redis..."
  while [ $attempt -lt $max_attempts ]; do
    if redis-cli ping 2>/dev/null | grep -q PONG; then
      echo "✅ Redis is ready!"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo "❌ Redis failed to start after ${max_attempts}s"
  return 1
}

wait_for_kafka() {
  local max_attempts=${1:-60}
  local attempt=0

  echo "⏳ Waiting for Kafka..."
  while [ $attempt -lt $max_attempts ]; do
    if docker exec suggar-daddy-kafka kafka-broker-api-versions \
      --bootstrap-server localhost:9092 > /dev/null 2>&1; then
      echo "✅ Kafka is ready!"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo "❌ Kafka failed to start after ${max_attempts}s"
  return 1
}

# ── Main Script ─────────────────────────────────────────────────
echo "🚀 Starting E2E Test Environment..."

# 1. Ensure Docker services are running
echo "📦 Starting Docker services..."
cd /Users/brianyu/Project/suggar-daddy
docker-compose up -d

# Wait for infrastructure to be ready
wait_for_postgres "suggar-daddy-postgres-master"
wait_for_redis
wait_for_kafka

# 2. Initialize database schema
echo "🗄️  Initializing database..."
docker exec suggar-daddy-postgres-master psql -U postgres -d suggar_daddy -c "
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'SUBSCRIBER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" 2>/dev/null || echo "Schema might already exist"

# 3. Seed test users into Redis (auth service reads from Redis, not PostgreSQL)
echo "👤 Seeding test users into Redis..."
node scripts/seed-redis-test-users.js

# 4. Start backend services
echo "🖥️  Starting backend services..."

# Start API Gateway (port 3000)
npx nx serve api-gateway > /tmp/gateway.log 2>&1 &
wait_for_service "http://localhost:3000/health" "API Gateway" 60

# Start Auth Service (port 3002)
npx nx serve auth-service > /tmp/auth.log 2>&1 &
wait_for_service "http://localhost:3002/api/auth/health" "Auth Service" 60

# Start User Service (port 3001)
npx nx serve user-service > /tmp/user.log 2>&1 &
wait_for_service "http://localhost:3001/api/users/health" "User Service" 60

echo "✅ Environment ready!"
echo ""
echo "📊 Service Status:"
echo "  - Docker: $(docker ps --format '{{.Names}}' | wc -l) containers"
echo "  - Gateway: http://localhost:3000"
echo "  - Auth: http://localhost:3002"
echo "  - User: http://localhost:3001"
echo ""
echo "🧪 Run tests with:"
echo "  npx playwright test --headed"
echo ""
echo "📝 Logs available in /tmp/*.log"
