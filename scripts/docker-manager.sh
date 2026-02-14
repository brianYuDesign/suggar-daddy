#!/bin/bash

# Docker Environment Management Script
# Provides convenient commands for managing the Suggar Daddy Docker environment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

print_usage() {
    echo -e "${BLUE}Suggar Daddy Docker Manager${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start         Start all services"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  status        Show service status"
    echo "  logs          Show logs (all services)"
    echo "  logs [name]   Show logs for specific service"
    echo "  health        Run health check"
    echo "  clean         Stop and remove all containers and volumes"
    echo "  rebuild       Rebuild and restart all services"
    echo "  shell [name]  Open shell in service container"
    echo "  db-shell      Open PostgreSQL shell"
    echo "  redis-shell   Open Redis CLI"
    echo ""
    echo "Examples:"
    echo "  $0 start                  # Start all services"
    echo "  $0 logs api-gateway       # View API Gateway logs"
    echo "  $0 shell user-service     # Open shell in user-service container"
}

start_services() {
    echo -e "${GREEN}Starting all services...${NC}"
    docker-compose up -d
    echo ""
    echo -e "${GREEN}Services started!${NC}"
    echo "Run '$0 status' to check service status"
}

stop_services() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped!${NC}"
}

restart_services() {
    echo -e "${YELLOW}Restarting all services...${NC}"
    docker-compose restart
    echo -e "${GREEN}Services restarted!${NC}"
}

show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    docker-compose ps
}

show_logs() {
    if [ -z "$1" ]; then
        echo -e "${BLUE}Showing logs for all services (Ctrl+C to exit)...${NC}"
        docker-compose logs -f
    else
        echo -e "${BLUE}Showing logs for $1 (Ctrl+C to exit)...${NC}"
        docker-compose logs -f "$1"
    fi
}

health_check() {
    echo -e "${BLUE}Running health check...${NC}"
    echo ""
    
    # Infrastructure
    echo -e "${BLUE}Infrastructure Services:${NC}"
    timeout 2 bash -c "cat < /dev/null > /dev/tcp/localhost/5432" 2>/dev/null && \
        echo -e "${GREEN}✓${NC} PostgreSQL (5432)" || echo -e "${RED}✗${NC} PostgreSQL"
    timeout 2 bash -c "cat < /dev/null > /dev/tcp/localhost/6379" 2>/dev/null && \
        echo -e "${GREEN}✓${NC} Redis (6379)" || echo -e "${RED}✗${NC} Redis"
    timeout 2 bash -c "cat < /dev/null > /dev/tcp/localhost/9092" 2>/dev/null && \
        echo -e "${GREEN}✓${NC} Kafka (9092)" || echo -e "${RED}✗${NC} Kafka"
    echo ""
    
    # Backend Services
    echo -e "${BLUE}Backend Services:${NC}"
    curl -s -m 2 http://localhost:3000/health | grep -q "ok" && \
        echo -e "${GREEN}✓${NC} API Gateway (3000)" || echo -e "${RED}✗${NC} API Gateway"
    curl -s -m 2 http://localhost:3001/ | grep -q "404" && \
        echo -e "${GREEN}✓${NC} User Service (3001)" || echo -e "${RED}✗${NC} User Service"
    curl -s -m 2 http://localhost:3002/ | grep -q "404" && \
        echo -e "${GREEN}✓${NC} Auth Service (3002)" || echo -e "${RED}✗${NC} Auth Service"
    curl -s -m 2 http://localhost:3007/ | grep -q "404" && \
        echo -e "${GREEN}✓${NC} Payment Service (3007)" || echo -e "${RED}✗${NC} Payment Service"
    curl -s -m 2 http://localhost:3009/ | grep -q "404" && \
        echo -e "${GREEN}✓${NC} Subscription Service (3009)" || echo -e "${RED}✗${NC} Subscription Service"
    echo ""
}

clean_environment() {
    echo -e "${RED}WARNING: This will stop and remove all containers and volumes!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cleaning environment...${NC}"
        docker-compose down -v
        echo -e "${GREEN}Environment cleaned!${NC}"
    else
        echo "Cancelled."
    fi
}

rebuild_services() {
    echo -e "${YELLOW}Rebuilding and restarting all services...${NC}"
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo -e "${GREEN}Services rebuilt and started!${NC}"
}

open_shell() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please specify service name${NC}"
        echo "Example: $0 shell user-service"
        exit 1
    fi
    
    local container_name="suggar-daddy-$1"
    echo -e "${BLUE}Opening shell in $container_name...${NC}"
    docker exec -it "$container_name" sh
}

db_shell() {
    echo -e "${BLUE}Opening PostgreSQL shell...${NC}"
    docker exec -it suggar-daddy-postgres psql -U postgres -d suggar_daddy
}

redis_shell() {
    echo -e "${BLUE}Opening Redis CLI...${NC}"
    docker exec -it suggar-daddy-redis redis-cli
}

# Main command handler
case "${1:-}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    health)
        health_check
        ;;
    clean)
        clean_environment
        ;;
    rebuild)
        rebuild_services
        ;;
    shell)
        open_shell "${2:-}"
        ;;
    db-shell)
        db_shell
        ;;
    redis-shell)
        redis_shell
        ;;
    *)
        print_usage
        ;;
esac
