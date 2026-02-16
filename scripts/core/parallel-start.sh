#!/bin/bash

# ==========================================
# 並行啟動助手
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/error-handler.sh"

# ==========================================
# 並行執行函數
# ==========================================

# 並行執行命令並收集結果
parallel_exec() {
  local -n commands_array=$1
  local max_parallel=${2:-10}
  
  if [ ${#commands_array[@]} -eq 0 ]; then
    log_error "No commands provided"
    return 1
  fi
  
  log_info "Executing ${#commands_array[@]} commands in parallel (max: $max_parallel)"
  
  local pids=()
  local results=()
  local idx=0
  
  for cmd in "${commands_array[@]}"; do
    # 如果達到最大並行數，等待一個完成
    if [ ${#pids[@]} -ge $max_parallel ]; then
      wait "${pids[0]}"
      results+=($?)
      pids=("${pids[@]:1}")
    fi
    
    # 在後台執行命令
    eval "$cmd" &
    pids+=($!)
    
    idx=$((idx + 1))
  done
  
  # 等待所有剩餘命令完成
  for pid in "${pids[@]}"; do
    wait "$pid"
    results+=($?)
  done
  
  # 檢查結果
  local failed=0
  for result in "${results[@]}"; do
    if [ "$result" -ne 0 ]; then
      failed=$((failed + 1))
    fi
  done
  
  if [ $failed -gt 0 ]; then
    log_error "$failed out of ${#commands_array[@]} commands failed"
    return 1
  fi
  
  log_success "All commands completed successfully"
  return 0
}

# 並行啟動服務
parallel_start_services() {
  local -n services_config=$1
  local log_dir=${2:-/tmp/suggar-daddy-logs}
  
  mkdir -p "$log_dir"
  
  log_header "Starting ${#services_config[@]} services in parallel"
  
  local pids=()
  local service_names=()
  
  for service in "${!services_config[@]}"; do
    local cmd="${services_config[$service]}"
    local log_file="$log_dir/${service}.log"
    
    log_info "Starting $service..."
    log_debug "Command: $cmd"
    log_debug "Log: $log_file"
    
    # 在後台啟動服務，輸出到日誌文件
    eval "$cmd" > "$log_file" 2>&1 &
    local pid=$!
    
    pids+=($pid)
    service_names+=("$service")
    
    # 記錄 PID 到文件
    echo "$pid" > "$log_dir/${service}.pid"
  done
  
  log_success "All services started in background"
  
  # 返回 PIDs 和服務名稱
  echo "${pids[*]}"
}

# 停止並行啟動的服務
stop_parallel_services() {
  local log_dir=${1:-/tmp/suggar-daddy-logs}
  
  log_info "Stopping services..."
  
  local stopped=0
  local failed=0
  
  for pid_file in "$log_dir"/*.pid; do
    if [ ! -f "$pid_file" ]; then
      continue
    fi
    
    local pid=$(cat "$pid_file")
    local service=$(basename "$pid_file" .pid)
    
    if kill -0 "$pid" 2>/dev/null; then
      log_info "Stopping $service (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
      
      # 等待最多 5 秒
      local count=0
      while kill -0 "$pid" 2>/dev/null && [ $count -lt 50 ]; do
        sleep 0.1
        count=$((count + 1))
      done
      
      # 如果還活著，強制殺死
      if kill -0 "$pid" 2>/dev/null; then
        log_warn "Force killing $service..."
        kill -9 "$pid" 2>/dev/null || true
        failed=$((failed + 1))
      else
        stopped=$((stopped + 1))
      fi
    fi
    
    rm -f "$pid_file"
  done
  
  if [ $stopped -gt 0 ]; then
    log_success "Stopped $stopped services"
  fi
  
  if [ $failed -gt 0 ]; then
    log_warn "Failed to stop $failed services gracefully (force killed)"
  fi
  
  return 0
}

# 並行等待多個後台任務
wait_parallel() {
  local -n pids_array=$1
  local timeout=${2:-300}
  
  log_info "Waiting for ${#pids_array[@]} background tasks..."
  
  local start_time=$(date +%s)
  local failed_pids=()
  
  for pid in "${pids_array[@]}"; do
    local elapsed=$(($(date +%s) - start_time))
    local remaining=$((timeout - elapsed))
    
    if [ $remaining -le 0 ]; then
      log_error "Timeout waiting for background tasks"
      return 124
    fi
    
    if ! wait_pid_with_timeout "$pid" "$remaining"; then
      failed_pids+=($pid)
    fi
  done
  
  if [ ${#failed_pids[@]} -gt 0 ]; then
    log_error "${#failed_pids[@]} tasks failed: ${failed_pids[*]}"
    return 1
  fi
  
  log_success "All background tasks completed"
  return 0
}

# 等待單個 PID 完成（帶超時）
wait_pid_with_timeout() {
  local pid=$1
  local timeout=$2
  
  local elapsed=0
  local interval=1
  
  while [ $elapsed -lt $timeout ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      # 進程已結束，獲取退出碼
      wait "$pid" 2>/dev/null
      return $?
    fi
    
    sleep $interval
    elapsed=$((elapsed + interval))
  done
  
  log_error "PID $pid did not complete within ${timeout}s"
  return 124
}

# 並行執行並顯示進度
parallel_exec_with_progress() {
  local -n commands=$1
  local max_parallel=${2:-10}
  
  local total=${#commands[@]}
  local completed=0
  local pids=()
  local cmd_indices=()
  
  log_info "Executing $total commands..."
  
  # 啟動初始批次
  local idx=0
  while [ $idx -lt $max_parallel ] && [ $idx -lt $total ]; do
    eval "${commands[$idx]}" &
    pids+=($!)
    cmd_indices+=($idx)
    idx=$((idx + 1))
  done
  
  # 持續監控和啟動新任務
  while [ ${#pids[@]} -gt 0 ]; do
    # 檢查完成的任務
    local new_pids=()
    local new_indices=()
    
    for i in "${!pids[@]}"; do
      local pid="${pids[$i]}"
      
      if ! kill -0 "$pid" 2>/dev/null; then
        # 任務完成
        wait "$pid"
        completed=$((completed + 1))
        show_progress $completed $total "Completed"
        
        # 啟動新任務（如果還有）
        if [ $idx -lt $total ]; then
          eval "${commands[$idx]}" &
          new_pids+=($!)
          new_indices+=($idx)
          idx=$((idx + 1))
        fi
      else
        new_pids+=("$pid")
        new_indices+=("${cmd_indices[$i]}")
      fi
    done
    
    pids=("${new_pids[@]}")
    cmd_indices=("${new_indices[@]}")
    
    sleep 0.5
  done
  
  log_success "All $total commands completed"
}

# ==========================================
# 導出函數
# ==========================================

export -f parallel_exec parallel_start_services stop_parallel_services
export -f wait_parallel wait_pid_with_timeout parallel_exec_with_progress
