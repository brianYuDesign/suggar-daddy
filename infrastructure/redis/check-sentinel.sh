#!/bin/bash

# ====================================================================
# Redis Sentinel 健康檢查腳本
# ====================================================================
# 這個腳本用於檢查 Redis Sentinel 集群的健康狀態
# 使用方式：./check-sentinel.sh

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 圖示
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Redis Sentinel 健康檢查${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ── 檢查 Sentinel 容器狀態 ──────────────────────────────────────
echo -e "${YELLOW}[1] 檢查 Sentinel 容器狀態...${NC}"
for i in 1 2 3; do
  container="suggar-daddy-redis-sentinel-$i"
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    status=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$status" = "healthy" ]; then
      echo -e "${CHECK} ${GREEN}Sentinel $i ($container): 運行中 (健康)${NC}"
    else
      echo -e "${WARNING} ${YELLOW}Sentinel $i ($container): 運行中 (狀態: $status)${NC}"
    fi
  else
    echo -e "${CROSS} ${RED}Sentinel $i ($container): 未運行${NC}"
  fi
done
echo ""

# ── 檢查 Redis 實例狀態 ──────────────────────────────────────────
echo -e "${YELLOW}[2] 檢查 Redis 實例狀態...${NC}"

check_redis_instance() {
  local name=$1
  local container=$2
  
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    status=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    role=$(docker exec "$container" redis-cli ROLE 2>/dev/null | head -1 || echo "unknown")
    
    if [ "$status" = "healthy" ]; then
      echo -e "${CHECK} ${GREEN}$name ($container): 運行中 (角色: $role)${NC}"
    else
      echo -e "${WARNING} ${YELLOW}$name ($container): 運行中 (狀態: $status, 角色: $role)${NC}"
    fi
  else
    echo -e "${CROSS} ${RED}$name ($container): 未運行${NC}"
  fi
}

check_redis_instance "Master   " "suggar-daddy-redis-master"
check_redis_instance "Replica 1" "suggar-daddy-redis-replica-1"
check_redis_instance "Replica 2" "suggar-daddy-redis-replica-2"
echo ""

# ── 檢查 Sentinel 配置 ──────────────────────────────────────────
echo -e "${YELLOW}[3] 檢查 Sentinel 配置...${NC}"
sentinel_port=26379
sentinel_container="suggar-daddy-redis-sentinel-1"

if docker ps --format '{{.Names}}' | grep -q "^${sentinel_container}$"; then
  echo -e "${INFO} 查詢 Sentinel 配置..."
  
  # 獲取 Master 信息
  master_info=$(docker exec "$sentinel_container" redis-cli -p "$sentinel_port" SENTINEL master mymaster 2>/dev/null || echo "")
  
  if [ -n "$master_info" ]; then
    master_ip=$(echo "$master_info" | grep -A1 "^ip$" | tail -1)
    master_port=$(echo "$master_info" | grep -A1 "^port$" | tail -1)
    master_flags=$(echo "$master_info" | grep -A1 "^flags$" | tail -1)
    num_slaves=$(echo "$master_info" | grep -A1 "^num-slaves$" | tail -1)
    num_sentinels=$(echo "$master_info" | grep -A1 "^num-other-sentinels$" | tail -1)
    
    echo -e "${INFO} Master IP: ${BLUE}$master_ip${NC}"
    echo -e "${INFO} Master Port: ${BLUE}$master_port${NC}"
    echo -e "${INFO} Master Flags: ${BLUE}$master_flags${NC}"
    echo -e "${INFO} Slaves 數量: ${BLUE}$num_slaves${NC}"
    echo -e "${INFO} Sentinels 數量: ${BLUE}$(($num_sentinels + 1))${NC}"
    
    if echo "$master_flags" | grep -q "master"; then
      echo -e "${CHECK} ${GREEN}Master 狀態正常${NC}"
    else
      echo -e "${WARNING} ${YELLOW}Master 狀態異常: $master_flags${NC}"
    fi
  else
    echo -e "${CROSS} ${RED}無法獲取 Master 信息${NC}"
  fi
else
  echo -e "${CROSS} ${RED}Sentinel 容器未運行${NC}"
fi
echo ""

# ── 檢查複製延遲 ────────────────────────────────────────────────
echo -e "${YELLOW}[4] 檢查複製延遲...${NC}"

check_replication_lag() {
  local container=$1
  local name=$2
  
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    # 獲取複製延遲（從 INFO replication 獲取）
    info=$(docker exec "$container" redis-cli INFO replication 2>/dev/null || echo "")
    role=$(echo "$info" | grep "^role:" | cut -d: -f2 | tr -d '\r')
    
    if [ "$role" = "slave" ]; then
      master_link=$(echo "$info" | grep "^master_link_status:" | cut -d: -f2 | tr -d '\r')
      lag=$(echo "$info" | grep "^master_last_io_seconds_ago:" | cut -d: -f2 | tr -d '\r')
      
      if [ "$master_link" = "up" ]; then
        if [ "$lag" -lt 5 ]; then
          echo -e "${CHECK} ${GREEN}$name: 複製正常 (延遲: ${lag}秒)${NC}"
        else
          echo -e "${WARNING} ${YELLOW}$name: 複製延遲較高 (延遲: ${lag}秒)${NC}"
        fi
      else
        echo -e "${CROSS} ${RED}$name: Master 連接斷開${NC}"
      fi
    else
      echo -e "${INFO} $name 是 Master，跳過複製檢查"
    fi
  fi
}

check_replication_lag "suggar-daddy-redis-replica-1" "Replica 1"
check_replication_lag "suggar-daddy-redis-replica-2" "Replica 2"
echo ""

# ── 檢查所有 Sentinels 是否互相發現 ─────────────────────────────
echo -e "${YELLOW}[5] 檢查 Sentinels 互相發現...${NC}"
for i in 1 2 3; do
  container="suggar-daddy-redis-sentinel-$i"
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    sentinels=$(docker exec "$container" redis-cli -p 26379 SENTINEL sentinels mymaster 2>/dev/null | grep -c "^ip$" || echo 0)
    expected=2  # 應該發現另外兩個 Sentinel
    
    if [ "$sentinels" -eq "$expected" ]; then
      echo -e "${CHECK} ${GREEN}Sentinel $i: 已發現 $sentinels 個其他 Sentinels${NC}"
    else
      echo -e "${WARNING} ${YELLOW}Sentinel $i: 只發現 $sentinels 個其他 Sentinels (期望: $expected)${NC}"
    fi
  fi
done
echo ""

# ── 測試連接 ────────────────────────────────────────────────────
echo -e "${YELLOW}[6] 測試 Redis 連接...${NC}"

test_redis_connection() {
  local container=$1
  local name=$2
  
  if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
    # 寫入測試
    test_key="healthcheck:$(date +%s)"
    test_value="test_value"
    
    result=$(docker exec "$container" redis-cli SET "$test_key" "$test_value" EX 10 2>/dev/null || echo "FAIL")
    
    if [ "$result" = "OK" ]; then
      # 讀取測試
      read_value=$(docker exec "$container" redis-cli GET "$test_key" 2>/dev/null || echo "FAIL")
      
      if [ "$read_value" = "$test_value" ]; then
        echo -e "${CHECK} ${GREEN}$name: 讀寫測試通過${NC}"
        # 清理測試 key
        docker exec "$container" redis-cli DEL "$test_key" >/dev/null 2>&1
      else
        echo -e "${CROSS} ${RED}$name: 讀取測試失敗${NC}"
      fi
    else
      echo -e "${CROSS} ${RED}$name: 寫入測試失敗${NC}"
    fi
  fi
}

# 只測試 Master（因為 Replica 是只讀的）
test_redis_connection "suggar-daddy-redis-master" "Master"
echo ""

# ── 總結 ────────────────────────────────────────────────────────
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}健康檢查完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${INFO} 如需查看詳細日誌，使用以下命令："
echo -e "   docker logs suggar-daddy-redis-master"
echo -e "   docker logs suggar-daddy-redis-sentinel-1"
echo ""
echo -e "${INFO} 如需查看 Sentinel 狀態，使用以下命令："
echo -e "   docker exec suggar-daddy-redis-sentinel-1 redis-cli -p 26379 SENTINEL masters"
echo -e "   docker exec suggar-daddy-redis-sentinel-1 redis-cli -p 26379 SENTINEL slaves mymaster"
echo ""
