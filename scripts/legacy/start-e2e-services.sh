#!/bin/bash
# Simple E2E Test Starter

set -e

# ── Utility Functions ───────────────────────────────────────────
wait_for_service() {
  local url=$1
  local name=$2
  local max_attempts=${3:-60}
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

# ── Main Script ─────────────────────────────────────────────────
echo "🚀 Starting E2E Environment..."

# Cleanup old processes
echo "🧹 Cleaning up old processes..."
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :3002 2>/dev/null | xargs kill -9 2>/dev/null || true

# Start services
cd /Users/brianyu/Project/suggar-daddy

echo "🌐 Starting API Gateway..."
API_GATEWAY_PORT=3000 NODE_ENV=development \
  npx nx serve api-gateway --skip-nx-cache > /tmp/e2e-gateway.log 2>&1 &
GATEWAY_PID=$!

# Wait for Gateway to be ready
if wait_for_service "http://localhost:3000/health" "API Gateway" 60; then
  echo "🔐 Starting Auth Service..."
  AUTH_SERVICE_PORT=3002 NODE_ENV=development \
    npx nx serve auth-service --skip-nx-cache > /tmp/e2e-auth.log 2>&1 &
  AUTH_PID=$!

  # Wait for Auth Service to be ready
  if wait_for_service "http://localhost:3002/api/auth/health" "Auth Service" 60; then
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
    echo "❌ Auth Service failed to start!"
    echo ""
    echo "Auth log:"
    tail -n 20 /tmp/e2e-auth.log
    kill $GATEWAY_PID 2>/dev/null || true
    exit 1
  fi
else
  echo "❌ API Gateway failed to start!"
  echo ""
  echo "Gateway log:"
  tail -n 20 /tmp/e2e-gateway.log
  exit 1
fi
