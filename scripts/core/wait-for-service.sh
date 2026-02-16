#!/bin/bash

# ==========================================
# 智能等待服務就緒（基於 health check）
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/error-handler.sh"
source "$SCRIPT_DIR/port-checker.sh"

# ==========================================
# 健康檢查函數
# ==========================================

# HTTP 健康檢查
check_http_health() {
  local url=$1
  local expected_status=${2:-200}
  
  if ! command -v curl &> /dev/null; then
    log_warn "curl not found, falling back to port check"
    return 1
  fi
  
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  
  if [ "$status" = "$expected_status" ]; then
    return 0
  fi
  
  return 1
}

# PostgreSQL 健康檢查
check_postgres_health() {
  local host=${1:-localhost}
  local port=${2:-5432}
  local user=${3:-postgres}
  local db=${4:-postgres}
  
  if ! command -v pg_isready &> /dev/null; then
    log_debug "pg_isready not found, using psql"
    PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1" &>/dev/null
  else
    pg_isready -h "$host" -p "$port" -U "$user" -d "$db" &>/dev/null
  fi
}

# Redis 健康檢查
check_redis_health() {
  local host=${1:-localhost}
  local port=${2:-6379}
  
  if ! command -v redis-cli &> /dev/null; then
    log_warn "redis-cli not found, falling back to port check"
    nc -z "$host" "$port" 2>/dev/null
  else
    redis-cli -h "$host" -p "$port" ping 2>/dev/null | grep -q "PONG"
  fi
}

# Kafka 健康檢查
check_kafka_health() {
  local host=${1:-localhost}
  local port=${2:-9092}
  
  # Kafka 比較複雜，先檢查端口
  if ! nc -z "$host" "$port" 2>/dev/null; then
    return 1
  fi
  
  # 如果有 kafka-broker-api-versions.sh，使用它
  if command -v kafka-broker-api-versions.sh &> /dev/null; then
    kafka-broker-api-versions.sh --bootstrap-server "$host:$port" &>/dev/null
  else
    # 否則只檢查端口
    return 0
  fi
}

# Docker 容器健康檢查
check_docker_container_health() {
  local container_name=$1
  
  if ! command -v docker &> /dev/null; then
    log_error "docker not found"
    return 1
  fi
  
  # 檢查容器是否運行
  if ! docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
    log_debug "Container $container_name is not running"
    return 1
  fi
  
  # 檢查容器健康狀態
  local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
  
  if [ "$health_status" = "healthy" ]; then
    return 0
  elif [ "$health_status" = "none" ]; then
    # 如果沒有健康檢查，檢查容器是否在運行
    docker inspect --format='{{.State.Running}}' "$container_name" 2>/dev/null | grep -q "true"
  else
    log_debug "Container $container_name health status: $health_status"
    return 1
  fi
}

# ==========================================
# 統一等待函數
# ==========================================

# 等待服務就緒（智能判斷服務類型）
wait_for_service() {
  local service_name=$1
  local timeout=${2:-60}
  
  log_info "Waiting for $service_name to be ready..."
  
  local elapsed=0
  local interval=2
  local check_result=1
  
  while [ $elapsed -lt $timeout ]; do
    case "$service_name" in
      postgres|postgresql)
        check_postgres_health
        check_result=$?
        ;;
      redis)
        check_redis_health
        check_result=$?
        ;;
      kafka)
        check_kafka_health
        check_result=$?
        ;;
      api-gateway)
        check_http_health "http://localhost:3000/health"
        check_result=$?
        ;;
      auth-service)
        check_http_health "http://localhost:3002/health"
        check_result=$?
        ;;
      user-service)
        check_http_health "http://localhost:3001/health"
        check_result=$?
        ;;
      payment-service)
        check_http_health "http://localhost:3003/health"
        check_result=$?
        ;;
      subscription-service)
        check_http_health "http://localhost:3004/health"
        check_result=$?
        ;;
      content-service)
        check_http_health "http://localhost:3005/health"
        check_result=$?
        ;;
      notification-service)
        check_http_health "http://localhost:3006/health"
        check_result=$?
        ;;
      messaging-service)
        check_http_health "http://localhost:3007/health"
        check_result=$?
        ;;
      admin-service)
        check_http_health "http://localhost:3008/health"
        check_result=$?
        ;;
      analytics-service)
        check_http_health "http://localhost:3009/health"
        check_result=$?
        ;;
      search-service)
        check_http_health "http://localhost:3010/health"
        check_result=$?
        ;;
      recommendation-service)
        check_http_health "http://localhost:3011/health"
        check_result=$?
        ;;
      media-service)
        check_http_health "http://localhost:3012/health"
        check_result=$?
        ;;
      web)
        check_http_health "http://localhost:4200"
        check_result=$?
        ;;
      admin-web)
        check_http_health "http://localhost:4201"
        check_result=$?
        ;;
      *)
        log_warn "Unknown service: $service_name, falling back to port check"
        return 1
        ;;
    esac
    
    if [ $check_result -eq 0 ]; then
      log_success "$service_name is ready"
      return 0
    fi
    
    if [ $((elapsed % 10)) -eq 0 ] && [ $elapsed -gt 0 ]; then
      log_debug "Still waiting for $service_name... (${elapsed}s elapsed)"
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
  done
  
  log_error "$service_name failed to become ready within ${timeout}s"
  return 1
}

# 並行等待多個服務
wait_for_services() {
  local timeout=${1:-60}
  shift
  local services=("$@")
  
  if [ ${#services[@]} -eq 0 ]; then
    log_error "No services specified"
    return 1
  fi
  
  log_header "Waiting for ${#services[@]} services"
  
  local pids=()
  local failed_services=()
  
  # 並行啟動所有等待
  for service in "${services[@]}"; do
    (wait_for_service "$service" "$timeout") &
    pids+=($!)
  done
  
  # 等待所有檢查完成
  local idx=0
  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      failed_services+=("${services[$idx]}")
    fi
    idx=$((idx + 1))
  done
  
  # 檢查結果
  if [ ${#failed_services[@]} -gt 0 ]; then
    log_error "The following services failed to start: ${failed_services[*]}"
    return 1
  fi
  
  log_success "All services are ready"
  return 0
}

# 等待 Docker Compose 服務
wait_for_docker_compose() {
  local compose_file=${1:-docker-compose.yml}
  local timeout=${2:-120}
  
  log_info "Waiting for Docker Compose services..."
  
  if [ ! -f "$compose_file" ]; then
    log_error "Docker Compose file not found: $compose_file"
    return 1
  fi
  
  # 獲取所有服務名稱
  local services=$(docker-compose -f "$compose_file" config --services 2>/dev/null)
  
  if [ -z "$services" ]; then
    log_error "Failed to get services from $compose_file"
    return 1
  fi
  
  local elapsed=0
  local interval=5
  
  while [ $elapsed -lt $timeout ]; do
    local all_healthy=true
    
    for service in $services; do
      local container_name=$(docker-compose -f "$compose_file" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.Name}}' 2>/dev/null | sed 's|^/||')
      
      if [ -z "$container_name" ]; then
        all_healthy=false
        break
      fi
      
      if ! check_docker_container_health "$container_name"; then
        all_healthy=false
        break
      fi
    done
    
    if [ "$all_healthy" = "true" ]; then
      log_success "All Docker Compose services are healthy"
      return 0
    fi
    
    if [ $((elapsed % 15)) -eq 0 ] && [ $elapsed -gt 0 ]; then
      log_debug "Still waiting for Docker Compose services... (${elapsed}s elapsed)"
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
  done
  
  log_error "Docker Compose services failed to become healthy within ${timeout}s"
  return 1
}

# ==========================================
# 導出函數
# ==========================================

export -f check_http_health check_postgres_health check_redis_health
export -f check_kafka_health check_docker_container_health
export -f wait_for_service wait_for_services wait_for_docker_compose
