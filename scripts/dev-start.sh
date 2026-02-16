#!/bin/bash
# One-click dev environment startup
# Usage: ./scripts/dev-start.sh [--all] [--no-web]
#
# Default: infra + core backend + web
# --all:    include matching, notification, messaging, content, media services
# --no-web: skip web frontend

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

INCLUDE_ALL=false
SKIP_WEB=false

for arg in "$@"; do
  case $arg in
    --all) INCLUDE_ALL=true ;;
    --no-web) SKIP_WEB=true ;;
  esac
done

cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  kill $(jobs -p) 2>/dev/null
  wait 2>/dev/null
  echo -e "${GREEN}All services stopped.${NC}"
}
trap cleanup EXIT INT TERM

# ── 1. Docker infrastructure ──────────────────────────────────
echo -e "${CYAN}[1/3] Starting Docker infrastructure...${NC}"

# Stop any conflicting containers
docker stop suggar-daddy-grafana 2>/dev/null || true

INFRA_SERVICES="postgres-master redis-master redis-replica-1 redis-replica-2 redis-sentinel-1 redis-sentinel-2 redis-sentinel-3 zookeeper kafka"
docker compose up -d $INFRA_SERVICES 2>&1 | tail -3

echo -e "${CYAN}Waiting for infrastructure to be healthy...${NC}"
for svc in postgres-master redis-master kafka; do
  printf "  Waiting for %-20s" "$svc..."
  until docker inspect --format='{{.State.Health.Status}}' "suggar-daddy-$svc" 2>/dev/null | grep -q healthy; do
    sleep 2
  done
  echo -e "${GREEN}ready${NC}"
done

# ── 2. Backend services ───────────────────────────────────────
echo -e "${CYAN}[2/3] Starting backend services...${NC}"

CORE_SERVICES=(api-gateway auth-service user-service payment-service subscription-service db-writer-service)
EXTRA_SERVICES=(matching-service content-service media-service notification-service messaging-service)

SERVICES=("${CORE_SERVICES[@]}")
if [ "$INCLUDE_ALL" = true ]; then
  SERVICES+=("${EXTRA_SERVICES[@]}")
fi

PIDS=()
for svc in "${SERVICES[@]}"; do
  echo -e "  Starting ${YELLOW}$svc${NC}..."
  npx nx serve "$svc" > "/tmp/suggar-daddy-$svc.log" 2>&1 &
  PIDS+=($!)
done

# Wait for api-gateway to be ready
wait_for_http() {
  local url=$1
  local name=$2
  local max_attempts=${3:-60}
  local attempt=0

  printf "  Waiting for $name..."
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

if ! wait_for_http "http://localhost:3000/health" "api-gateway (port 3000)" 60; then
  echo -e "${RED}Check logs: /tmp/suggar-daddy-api-gateway.log${NC}"
  tail -50 /tmp/suggar-daddy-api-gateway.log
fi

# ── 3. Web frontend ──────────────────────────────────────────
if [ "$SKIP_WEB" = false ]; then
  echo -e "${CYAN}[3/3] Starting web frontend...${NC}"
  npx nx serve web > /tmp/suggar-daddy-web.log 2>&1 &
  PIDS+=($!)

  if ! wait_for_http "http://localhost:4200" "web (port 4200)" 60; then
    echo -e "${RED}Check logs: /tmp/suggar-daddy-web.log${NC}"
    tail -50 /tmp/suggar-daddy-web.log
  fi
else
  echo -e "${CYAN}[3/3] Skipping web frontend (--no-web)${NC}"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Dev environment is ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  Web:          ${CYAN}http://localhost:4200${NC}"
echo -e "  API Gateway:  ${CYAN}http://localhost:3000${NC}"
echo -e "  PostgreSQL:   ${CYAN}localhost:5432${NC}"
echo -e "  Redis:        ${CYAN}localhost:6379${NC}"
echo -e "  Kafka:        ${CYAN}localhost:9094${NC}"
echo ""
echo -e "  Logs: /tmp/suggar-daddy-*.log"
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo ""

# Keep alive
wait
