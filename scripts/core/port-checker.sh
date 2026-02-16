#!/bin/bash

# ==========================================
# 端口檢查工具
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/error-handler.sh"

# ==========================================
# 端口檢查函數
# ==========================================

# 檢查端口是否被佔用
is_port_in_use() {
  local port=$1
  
  if command -v lsof &> /dev/null; then
    lsof -i ":$port" -sTCP:LISTEN -t >/dev/null 2>&1
  elif command -v netstat &> /dev/null; then
    netstat -an | grep -q ":$port.*LISTEN"
  else
    # 使用 nc 作為後備方案
    nc -z localhost "$port" 2>/dev/null
  fi
}

# 等待端口打開
wait_for_port() {
  local host=${1:-localhost}
  local port=$2
  local timeout=${3:-60}
  local service_name=${4:-"service"}
  
  log_info "Waiting for $service_name ($host:$port) to be ready..."
  
  local elapsed=0
  local interval=1
  
  while [ $elapsed -lt $timeout ]; do
    if nc -z "$host" "$port" 2>/dev/null; then
      log_success "$service_name is ready ($host:$port)"
      return 0
    fi
    
    if [ $((elapsed % 10)) -eq 0 ] && [ $elapsed -gt 0 ]; then
      log_debug "Still waiting for $service_name... (${elapsed}s elapsed)"
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
  done
  
  log_error "$service_name failed to start within ${timeout}s"
  return 1
}

# 查找使用端口的進程
find_process_on_port() {
  local port=$1
  
  if command -v lsof &> /dev/null; then
    lsof -i ":$port" -sTCP:LISTEN -t
  else
    log_warn "lsof not available, cannot find process on port $port"
    return 1
  fi
}

# 殺死佔用端口的進程
kill_process_on_port() {
  local port=$1
  local force=${2:-false}
  
  local pid=$(find_process_on_port "$port")
  
  if [ -z "$pid" ]; then
    log_info "No process found on port $port"
    return 0
  fi
  
  log_warn "Found process $pid on port $port"
  
  if [ "$force" = "true" ]; then
    log_info "Killing process $pid..."
    kill -9 "$pid" 2>/dev/null || true
    sleep 1
    
    if is_port_in_use "$port"; then
      log_error "Failed to kill process on port $port"
      return 1
    fi
    
    log_success "Process killed successfully"
  else
    log_info "Use --force to kill the process"
  fi
  
  return 0
}

# 檢查端口範圍是否可用
check_port_range() {
  local start_port=$1
  local end_port=$2
  local occupied_ports=()
  
  log_info "Checking ports $start_port-$end_port..."
  
  for port in $(seq "$start_port" "$end_port"); do
    if is_port_in_use "$port"; then
      occupied_ports+=("$port")
      log_warn "Port $port is in use"
    fi
  done
  
  if [ ${#occupied_ports[@]} -gt 0 ]; then
    log_error "The following ports are occupied: ${occupied_ports[*]}"
    return 1
  fi
  
  log_success "All ports in range $start_port-$end_port are available"
  return 0
}

# 找到可用的端口
find_available_port() {
  local start_port=${1:-3000}
  local max_attempts=${2:-100}
  
  for port in $(seq "$start_port" $((start_port + max_attempts))); do
    if ! is_port_in_use "$port"; then
      echo "$port"
      return 0
    fi
  done
  
  log_error "Could not find available port starting from $start_port"
  return 1
}

# 批量檢查服務端口
check_services_ports() {
  local -n ports_map=$1
  local all_available=true
  
  log_info "Checking service ports..."
  
  for service in "${!ports_map[@]}"; do
    local port=${ports_map[$service]}
    
    if is_port_in_use "$port"; then
      log_warn "$service port $port is in use"
      all_available=false
    else
      log_debug "$service port $port is available"
    fi
  done
  
  if [ "$all_available" = "true" ]; then
    log_success "All service ports are available"
    return 0
  else
    return 1
  fi
}

# ==========================================
# 導出函數
# ==========================================

export -f is_port_in_use wait_for_port find_process_on_port
export -f kill_process_on_port check_port_range find_available_port
export -f check_services_ports
