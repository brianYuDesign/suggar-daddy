#!/bin/bash
# Comprehensive Health Check Script for Suggar Daddy Platform
# Author: DevOps Team
# Description: Monitor all services and infrastructure components

set -e

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Status tracking
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Logging
log_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -e "${BLUE}[CHECK $TOTAL_CHECKS]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Health check functions
check_container_running() {
    local container=$1
    log_check "Checking if $container is running..."
    
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        log_pass "$container is running"
        return 0
    else
        log_fail "$container is not running"
        return 1
    fi
}

check_container_health() {
    local container=$1
    log_check "Checking health status of $container..."
    
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
    
    if [ "$health_status" = "healthy" ]; then
        log_pass "$container is healthy"
        return 0
    elif [ "$health_status" = "no-healthcheck" ]; then
        log_warn "$container has no health check defined"
        return 0
    else
        log_fail "$container health status: $health_status"
        return 1
    fi
}

check_postgres() {
    log_check "Checking PostgreSQL connectivity..."
    
    if docker exec suggar-daddy-postgres pg_isready -U postgres > /dev/null 2>&1; then
        log_pass "PostgreSQL is accepting connections"
        
        # Check database size
        local db_size=$(docker exec suggar-daddy-postgres psql -U postgres -d suggar_daddy -t -c "SELECT pg_size_pretty(pg_database_size('suggar_daddy'));" | xargs)
        log_info "Database size: $db_size"
        
        # Check connection count
        local conn_count=$(docker exec suggar-daddy-postgres psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
        log_info "Active connections: $conn_count"
        
        # Check for long-running queries
        local long_queries=$(docker exec suggar-daddy-postgres psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';" | xargs)
        if [ "$long_queries" -gt 0 ]; then
            log_warn "Found $long_queries long-running queries (>5 minutes)"
        fi
        
        return 0
    else
        log_fail "PostgreSQL is not accepting connections"
        return 1
    fi
}

check_redis() {
    log_check "Checking Redis connectivity..."
    
    if docker exec suggar-daddy-redis redis-cli ping | grep -q "PONG"; then
        log_pass "Redis is responding"
        
        # Check memory usage
        local mem_used=$(docker exec suggar-daddy-redis redis-cli INFO memory | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
        log_info "Redis memory usage: $mem_used"
        
        # Check keyspace
        local total_keys=$(docker exec suggar-daddy-redis redis-cli DBSIZE | cut -d: -f2 | tr -d '\r')
        log_info "Total keys in Redis: $total_keys"
        
        # Check hit rate
        local stats=$(docker exec suggar-daddy-redis redis-cli INFO stats)
        local hits=$(echo "$stats" | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r')
        local misses=$(echo "$stats" | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r')
        
        if [ -n "$hits" ] && [ -n "$misses" ] && [ "$((hits + misses))" -gt 0 ]; then
            local hit_rate=$(echo "scale=2; $hits * 100 / ($hits + $misses)" | bc)
            log_info "Redis cache hit rate: ${hit_rate}%"
            
            if (( $(echo "$hit_rate < 70" | bc -l) )); then
                log_warn "Redis hit rate is below 70%"
            fi
        fi
        
        return 0
    else
        log_fail "Redis is not responding"
        return 1
    fi
}

check_kafka() {
    log_check "Checking Kafka connectivity..."
    
    if docker exec suggar-daddy-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
        log_pass "Kafka broker is responding"
        
        # List topics
        local topic_count=$(docker exec suggar-daddy-kafka kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null | wc -l)
        log_info "Total Kafka topics: $topic_count"
        
        # Check consumer lag
        local groups=$(docker exec suggar-daddy-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list 2>/dev/null | grep -v "^$")
        
        if [ -n "$groups" ]; then
            while IFS= read -r group; do
                local lag=$(docker exec suggar-daddy-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group "$group" 2>/dev/null | grep -v "^$" | tail -n +2 | awk '{sum+=$5} END {print sum}')
                
                if [ -n "$lag" ] && [ "$lag" -gt 100 ]; then
                    log_warn "Consumer group '$group' has lag: $lag messages"
                elif [ -n "$lag" ]; then
                    log_info "Consumer group '$group' lag: $lag messages"
                fi
            done <<< "$groups"
        fi
        
        return 0
    else
        log_fail "Kafka broker is not responding"
        return 1
    fi
}

check_disk_space() {
    log_check "Checking disk space..."
    
    # Check Docker volumes
    local volumes=$(docker volume ls --format '{{.Name}}' | grep "suggar-daddy")
    
    for volume in $volumes; do
        local size=$(docker system df -v | grep "$volume" | awk '{print $3}')
        if [ -n "$size" ]; then
            log_info "Volume $volume: $size"
        fi
    done
    
    # Check available disk space
    local available=$(df -h . | tail -1 | awk '{print $4}')
    local usage=$(df -h . | tail -1 | awk '{print $5}' | tr -d '%')
    
    log_info "Available disk space: $available (${usage}% used)"
    
    if [ "$usage" -gt 90 ]; then
        log_fail "Disk usage is above 90%"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log_warn "Disk usage is above 80%"
    fi
    
    return 0
}

check_resource_usage() {
    log_check "Checking container resource usage..."
    
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep "suggar-daddy"
    
    # Check for high memory usage
    local high_mem=$(docker stats --no-stream --format "{{.Name}}\t{{.MemPerc}}" | grep "suggar-daddy" | awk '{if ($2+0 > 80) print $1}')
    
    if [ -n "$high_mem" ]; then
        log_warn "High memory usage detected in: $high_mem"
    fi
    
    return 0
}

check_network() {
    log_check "Checking Docker network..."
    
    if docker network inspect suggar-daddy-network > /dev/null 2>&1; then
        log_pass "Docker network exists"
        
        local containers=$(docker network inspect suggar-daddy-network --format '{{range .Containers}}{{.Name}} {{end}}')
        log_info "Connected containers: $containers"
        
        return 0
    else
        log_fail "Docker network not found"
        return 1
    fi
}

generate_report() {
    echo ""
    echo "=========================================="
    echo "        Health Check Summary"
    echo "=========================================="
    echo "Time: $(date)"
    echo "Total checks: $TOTAL_CHECKS"
    echo "Failed checks: $FAILED_CHECKS"
    echo "Success rate: $(echo "scale=2; ($TOTAL_CHECKS - $FAILED_CHECKS) * 100 / $TOTAL_CHECKS" | bc)%"
    echo "=========================================="
    
    if [ "$FAILED_CHECKS" -eq 0 ]; then
        echo -e "${GREEN}All health checks passed!${NC}"
        return 0
    else
        echo -e "${RED}Some health checks failed!${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "    Suggar Daddy Health Check"
    echo "=========================================="
    echo ""
    
    # Container status checks
    check_container_running "suggar-daddy-postgres"
    check_container_running "suggar-daddy-redis"
    check_container_running "suggar-daddy-zookeeper"
    check_container_running "suggar-daddy-kafka"
    
    echo ""
    
    # Health status checks
    check_container_health "suggar-daddy-postgres"
    check_container_health "suggar-daddy-redis"
    check_container_health "suggar-daddy-kafka"
    
    echo ""
    
    # Service-specific checks
    check_postgres
    check_redis
    check_kafka
    
    echo ""
    
    # Resource checks
    check_disk_space
    check_network
    check_resource_usage
    
    echo ""
    
    # Generate report
    generate_report
    
    exit $FAILED_CHECKS
}

# Run main function
main
