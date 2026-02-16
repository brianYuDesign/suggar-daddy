#!/bin/bash
# E2E Admin 測試環境啟動腳本
# 用途：啟動 e2e admin 測試所需的最小服務集
# 
# 使用方法：
#   ./scripts/e2e-admin-start.sh        # 啟動服務並保持運行
#   ./scripts/e2e-admin-start.sh --test # 啟動服務後運行測試並停止

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

RUN_TESTS=false
if [ "$1" = "--test" ]; then
  RUN_TESTS=true
fi

cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null
  echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

# ══════════════════════════════════════════════════════════════
# 1. 確認 Docker 基礎設施運行中
# ══════════════════════════════════════════════════════════════
echo -e "${CYAN}[1/4] Checking Docker infrastructure...${NC}"

# 使用 netcat 簡單測試端口
if nc -z localhost 5432 2>/dev/null; then
  echo -e "${GREEN}  ✓ PostgreSQL (port 5432)${NC}"
else
  echo -e "${RED}  ✗ PostgreSQL not accessible${NC}"
  echo -e "${YELLOW}Please run: docker-compose up -d${NC}"
  exit 1
fi

if nc -z localhost 6379 2>/dev/null; then
  echo -e "${GREEN}  ✓ Redis (port 6379)${NC}"
else
  echo -e "${RED}  ✗ Redis not accessible${NC}"
  echo -e "${YELLOW}Please run: docker-compose up -d${NC}"
  exit 1
fi

if nc -z localhost 9094 2>/dev/null; then
  echo -e "${GREEN}  ✓ Kafka (port 9094)${NC}"
else
  echo -e "${RED}  ✗ Kafka not accessible${NC}"
  echo -e "${YELLOW}Please run: docker-compose up -d${NC}"
  exit 1
fi

# ══════════════════════════════════════════════════════════════
# 2. 啟動必要的後端服務
# ══════════════════════════════════════════════════════════════
echo -e "${CYAN}[2/4] Starting backend services...${NC}"

# Admin 測試需要的服務：
# - api-gateway (port 3000) - 必須
# - auth-service (port 3002) - 登入功能需要
# - user-service (port 3001) - 用戶數據需要
BACKEND_SERVICES=(
  "api-gateway:3000"
  "auth-service:3002"
  "user-service:3001"
)

PIDS=()
for svc_port in "${BACKEND_SERVICES[@]}"; do
  svc="${svc_port%%:*}"
  port="${svc_port##*:}"
  
  # 檢查端口是否已被佔用
  if lsof -i :"$port" > /dev/null 2>&1; then
    echo -e "${YELLOW}  ⚠ Port $port already in use, assuming $svc is running${NC}"
  else
    echo -e "  Starting ${YELLOW}$svc${NC} on port $port..."
    npx nx serve "$svc" > "/tmp/e2e-admin-$svc.log" 2>&1 &
    PIDS+=($!)
  fi
done

# 等待 API Gateway 就緒
wait_for_http() {
  local url=$1
  local name=$2
  local max_attempts=${3:-60}
  local attempt=0

  printf "${CYAN}  Waiting for $name...${NC}"
  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo -e " ${GREEN}ready${NC}"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  echo -e " ${RED}timeout${NC}"
  return 1
}

if ! wait_for_http "http://localhost:3000/health" "API Gateway (port 3000)" 60; then
  echo -e "${RED}Check logs: /tmp/e2e-admin-api-gateway.log${NC}"
  tail -50 /tmp/e2e-admin-api-gateway.log
  exit 1
fi

# ══════════════════════════════════════════════════════════════
# 3. 啟動 Admin 前端
# ══════════════════════════════════════════════════════════════
echo -e "${CYAN}[3/4] Starting admin frontend...${NC}"

if lsof -i :4300 > /dev/null 2>&1; then
  echo -e "${YELLOW}  ⚠ Port 4300 already in use, assuming admin is running${NC}"
else
  echo -e "  Starting ${YELLOW}admin${NC} on port 4300..."
  cd apps/admin && npx next dev -p 4300 > /tmp/e2e-admin-frontend.log 2>&1 &
  PIDS+=($!)
  cd "$PROJECT_DIR"
  
  if ! wait_for_http "http://localhost:4300" "admin (port 4300)" 60; then
    echo -e "${RED}Check logs: /tmp/e2e-admin-frontend.log${NC}"
    tail -50 /tmp/e2e-admin-frontend.log
    exit 1
  fi
fi

# ══════════════════════════════════════════════════════════════
# 4. 運行測試或保持服務運行
# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  E2E Admin test environment is ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "  Admin Panel:  ${CYAN}http://localhost:4300${NC}"
echo -e "  API Gateway:  ${CYAN}http://localhost:3000${NC}"
echo -e "  PostgreSQL:   ${CYAN}localhost:5432${NC}"
echo -e "  Redis:        ${CYAN}localhost:6379${NC}"
echo -e "  Kafka:        ${CYAN}localhost:9094${NC}"
echo ""
echo -e "  Backend logs: /tmp/e2e-admin-*.log"
echo ""

if [ "$RUN_TESTS" = true ]; then
  echo -e "${CYAN}[4/4] Running e2e admin tests...${NC}"
  npm run e2e:admin
  TEST_EXIT_CODE=$?
  
  echo ""
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
  else
    echo -e "${RED}✗ Some tests failed${NC}"
  fi
  
  exit $TEST_EXIT_CODE
else
  echo -e "  To run tests: ${YELLOW}npm run e2e:admin${NC}"
  echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
  echo ""
  
  # Keep alive
  wait
fi
