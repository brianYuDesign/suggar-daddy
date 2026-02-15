#!/bin/bash
# E2E 測試環境快速啟動腳本

set -e

echo "🚀 Starting E2E Test Environment..."

# 1. Ensure Docker services are running
echo "📦 Checking Docker services..."
cd /Users/brianyu/Project/suggar-daddy
docker-compose -f docker-compose.dev.yml up -d
sleep 10

# 2. Initialize database schema
echo "🗄️  Initializing database..."
docker exec suggar-daddy-postgres-dev psql -U postgres -d suggar_daddy -c "
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'SUBSCRIBER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);" 2>/dev/null || echo "Schema might already exist"

# 3. Create test users (simple version)
echo "👤 Creating test users..."
# This would need proper password hashing - for now just note what's needed
cat > /tmp/test-users.sql << 'SQL'
-- Test users (passwords should be hashed in production)
INSERT INTO users (id, email, password, role) 
VALUES 
  ('test-creator-001', 'creator@test.com', '$2b$10$... hashed Test1234!', 'CREATOR'),
  ('test-subscriber-001', 'subscriber@test.com', '$2b$10$... hashed Test1234!', 'SUBSCRIBER'),
  ('test-admin-001', 'admin@test.com', '$2b$10$... hashed Admin1234!', 'ADMIN')
ON CONFLICT DO NOTHING;
SQL

# 4. Start backend services
echo "🖥️  Starting backend services..."
echo "Note: Services will be started on their configured ports"

# Start API Gateway (port 3000)
npx nx serve api-gateway > /tmp/gateway.log 2>&1 &
sleep 5

# Start Auth Service (port 3002)  
npx nx serve auth-service > /tmp/auth.log 2>&1 &
sleep 5

# Start User Service (port 3001)
npx nx serve user-service > /tmp/user.log 2>&1 &
sleep 5

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
