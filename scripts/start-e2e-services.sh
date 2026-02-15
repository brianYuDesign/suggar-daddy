#!/bin/bash
# Simple E2E Test Starter

set -e

echo "🚀 Starting E2E Environment..."

# Cleanup old processes
echo "🧹 Cleaning up old processes..."
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :3002 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2

# Start services
cd /Users/brianyu/Project/suggar-daddy

echo "🌐 Starting API Gateway..."
API_GATEWAY_PORT=3000 NODE_ENV=development \
  npx nx serve api-gateway --skip-nx-cache > /tmp/e2e-gateway.log 2>&1 &
GATEWAY_PID=$!
sleep 10

echo "🔐 Starting Auth Service..."
AUTH_SERVICE_PORT=3002 NODE_ENV=development \
  npx nx serve auth-service --skip-nx-cache > /tmp/e2e-auth.log 2>&1 &
AUTH_PID=$!
sleep 12

# Verify
echo "🔍 Verifying services..."
if lsof -i :3000 | grep -q LISTEN && lsof -i :3002 | grep -q LISTEN; then
    echo "✅ Services running!"
    echo "   Gateway: http://localhost:3000"
    echo "   Auth:    http://localhost:3002"
    echo ""
    echo "PIDs: Gateway=$GATEWAY_PID, Auth=$AUTH_PID"
    echo ""
    echo "📝 Logs:"
    echo "   tail -f /tmp/e2e-gateway.log"
    echo "   tail -f /tmp/e2e-auth.log"
    echo ""
    echo "🎬 Run tests: npx playwright test --project=chromium"
    echo "🛑 Stop: kill $GATEWAY_PID $AUTH_PID"
else
    echo "❌ Services failed to start!"
    echo ""
    echo "Gateway log:"
    tail -n 20 /tmp/e2e-gateway.log
    echo ""
    echo "Auth log:"
    tail -n 20 /tmp/e2e-auth.log
    exit 1
fi
