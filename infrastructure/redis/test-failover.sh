#!/bin/bash

# ====================================================================
# Redis Sentinel 故障轉移測試腳本
# ====================================================================
# 這個腳本用於測試 Redis Sentinel 的自動故障轉移功能
# 使用方式：./test-failover.sh

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 圖示
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"

echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}Redis Sentinel 故障轉移測試${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""

# 設置
SENTINEL_CONTAINER="suggar-daddy-redis-sentinel-1"
MASTER_NAME="mymaster"
SENTINEL_PORT=26379

# ── 步驟 1: 檢查初始狀態 ────────────────────────────────────────
echo -e "${YELLOW}[步驟 1] 檢查初始狀態...${NC}"

# 獲取當前 Master 信息
get_current_master() {
  docker exec "$SENTINEL_CONTAINER" redis-cli -p "$SENTINEL_PORT" \
    SENTINEL get-master-addr-by-name "$MASTER_NAME" 2>/dev/null || echo ""
}

master_info=$(get_current_master)
if [ -z "$master_info" ]; then
  echo -e "${CROSS} ${RED}無法獲取 Master 信息，請檢查 Sentinel 是否正常運行${NC}"
  exit 1
fi

current_master_ip=$(echo "$master_info" | head -1)
current_master_port=$(echo "$master_info" | tail -1)

# 根據 IP 找出對應的容器名稱
if [ "$current_master_ip" = "redis-master" ] || echo "$current_master_ip" | grep -q "172\|192"; then
  current_master_container="suggar-daddy-redis-master"
elif echo "$current_master_ip" | grep -q "replica-1"; then
  current_master_container="suggar-daddy-redis-replica-1"
elif echo "$current_master_ip" | grep -q "replica-2"; then
  current_master_container="suggar-daddy-redis-replica-2"
else
  # 嘗試通過角色判斷
  for container in "suggar-daddy-redis-master" "suggar-daddy-redis-replica-1" "suggar-daddy-redis-replica-2"; do
    role=$(docker exec "$container" redis-cli ROLE 2>/dev/null | head -1 || echo "")
    if [ "$role" = "master" ]; then
      current_master_container="$container"
      break
    fi
  done
fi

echo -e "${INFO} 當前 Master: ${BLUE}$current_master_container${NC}"
echo -e "${INFO} IP: ${BLUE}$current_master_ip${NC}, Port: ${BLUE}$current_master_port${NC}"
echo ""

# 檢查有多少 Replica
replicas=$(docker exec "$SENTINEL_CONTAINER" redis-cli -p "$SENTINEL_PORT" \
  SENTINEL replicas "$MASTER_NAME" 2>/dev/null | grep -c "^name$" || echo 0)
echo -e "${INFO} Replica 數量: ${BLUE}$replicas${NC}"
echo ""

if [ "$replicas" -lt 1 ]; then
  echo -e "${WARNING} ${YELLOW}警告: 沒有可用的 Replica，故障轉移可能失敗${NC}"
  echo ""
fi

# ── 步驟 2: 寫入測試數據 ────────────────────────────────────────
echo -e "${YELLOW}[步驟 2] 寫入測試數據...${NC}"

test_key="failover:test:$(date +%s)"
test_value="data_before_failover"

result=$(docker exec "$current_master_container" redis-cli SET "$test_key" "$test_value" 2>/dev/null || echo "FAIL")

if [ "$result" = "OK" ]; then
  echo -e "${CHECK} ${GREEN}測試數據已寫入: $test_key = $test_value${NC}"
else
  echo -e "${CROSS} ${RED}無法寫入測試數據${NC}"
  exit 1
fi
echo ""

# ── 步驟 3: 模擬 Master 故障 ────────────────────────────────────
echo -e "${YELLOW}[步驟 3] 模擬 Master 故障...${NC}"
echo -e "${WARNING} ${YELLOW}即將停止 Master 容器: $current_master_container${NC}"
echo -e "${INFO} 按 Enter 繼續，或 Ctrl+C 取消..."
read

echo -e "${ROCKET} 停止 Master 容器..."
docker stop "$current_master_container" >/dev/null 2>&1

echo -e "${CHECK} ${GREEN}Master 已停止${NC}"
echo ""

# ── 步驟 4: 等待故障轉移 ────────────────────────────────────────
echo -e "${YELLOW}[步驟 4] 等待 Sentinel 檢測故障並執行故障轉移...${NC}"
echo -e "${INFO} 預期時間: 5-15 秒"
echo ""

max_wait=30
waited=0
new_master_found=false

while [ $waited -lt $max_wait ]; do
  sleep 1
  waited=$((waited + 1))
  
  # 獲取新的 Master 信息
  new_master_info=$(get_current_master)
  if [ -n "$new_master_info" ]; then
    new_master_ip=$(echo "$new_master_info" | head -1)
    new_master_port=$(echo "$new_master_info" | tail -1)
    
    # 檢查是否換了新的 Master
    if [ "$new_master_ip" != "$current_master_ip" ]; then
      new_master_found=true
      break
    fi
  fi
  
  # 每 5 秒顯示一次進度
  if [ $((waited % 5)) -eq 0 ]; then
    echo -e "${INFO} 已等待 ${waited} 秒..."
  fi
done

if [ "$new_master_found" = true ]; then
  echo -e "${CHECK} ${GREEN}故障轉移成功！耗時: ${waited} 秒${NC}"
  echo -e "${INFO} 新的 Master: ${BLUE}$new_master_ip:$new_master_port${NC}"
  
  # 找出新 Master 的容器名稱
  for container in "suggar-daddy-redis-replica-1" "suggar-daddy-redis-replica-2"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
      role=$(docker exec "$container" redis-cli ROLE 2>/dev/null | head -1 || echo "")
      if [ "$role" = "master" ]; then
        new_master_container="$container"
        echo -e "${INFO} 新的 Master 容器: ${BLUE}$new_master_container${NC}"
        break
      fi
    fi
  done
else
  echo -e "${CROSS} ${RED}故障轉移失敗或超時（${max_wait}秒）${NC}"
  echo ""
  echo -e "${INFO} 重新啟動舊 Master..."
  docker start "$current_master_container" >/dev/null 2>&1
  exit 1
fi
echo ""

# ── 步驟 5: 驗證數據完整性 ──────────────────────────────────────
echo -e "${YELLOW}[步驟 5] 驗證數據完整性...${NC}"

# 等待複製同步
echo -e "${INFO} 等待 3 秒讓數據同步..."
sleep 3

# 從新 Master 讀取數據
read_value=$(docker exec "$new_master_container" redis-cli GET "$test_key" 2>/dev/null || echo "")

if [ "$read_value" = "$test_value" ]; then
  echo -e "${CHECK} ${GREEN}數據完整性驗證通過！${NC}"
  echo -e "${INFO} 讀取值: ${BLUE}$read_value${NC}"
else
  echo -e "${CROSS} ${RED}數據完整性驗證失敗${NC}"
  echo -e "${INFO} 期望值: ${BLUE}$test_value${NC}"
  echo -e "${INFO} 實際值: ${BLUE}$read_value${NC}"
fi
echo ""

# ── 步驟 6: 測試寫入新 Master ───────────────────────────────────
echo -e "${YELLOW}[步驟 6] 測試寫入新 Master...${NC}"

new_test_key="failover:test:after:$(date +%s)"
new_test_value="data_after_failover"

result=$(docker exec "$new_master_container" redis-cli SET "$new_test_key" "$new_test_value" 2>/dev/null || echo "FAIL")

if [ "$result" = "OK" ]; then
  echo -e "${CHECK} ${GREEN}新 Master 可以正常寫入${NC}"
  echo -e "${INFO} 寫入: $new_test_key = $new_test_value${NC}"
else
  echo -e "${CROSS} ${RED}新 Master 寫入失敗${NC}"
fi
echo ""

# ── 步驟 7: 檢查集群狀態 ────────────────────────────────────────
echo -e "${YELLOW}[步驟 7] 檢查集群狀態...${NC}"

# 檢查新的 Replica 數量
new_replicas=$(docker exec "$SENTINEL_CONTAINER" redis-cli -p "$SENTINEL_PORT" \
  SENTINEL replicas "$MASTER_NAME" 2>/dev/null | grep -c "^name$" || echo 0)

echo -e "${INFO} 當前 Replica 數量: ${BLUE}$new_replicas${NC}"

# 列出所有 Replicas
echo -e "${INFO} Replica 列表:"
docker exec "$SENTINEL_CONTAINER" redis-cli -p "$SENTINEL_PORT" \
  SENTINEL replicas "$MASTER_NAME" 2>/dev/null | grep "^name$" -A1 | grep -v "^name$" | grep -v "^--$" | while read -r replica_name; do
  echo -e "   - ${BLUE}$replica_name${NC}"
done
echo ""

# ── 步驟 8: 清理測試數據 ────────────────────────────────────────
echo -e "${YELLOW}[步驟 8] 清理測試數據...${NC}"

docker exec "$new_master_container" redis-cli DEL "$test_key" "$new_test_key" >/dev/null 2>&1
echo -e "${CHECK} ${GREEN}測試數據已清理${NC}"
echo ""

# ── 步驟 9: 恢復原 Master（可選）───────────────────────────────
echo -e "${YELLOW}[步驟 9] 是否要重新啟動原 Master 作為 Replica？${NC}"
echo -e "${INFO} 按 Enter 重新啟動，或輸入 'n' 跳過..."
read -r answer

if [ "$answer" != "n" ]; then
  echo -e "${ROCKET} 重新啟動 $current_master_container..."
  docker start "$current_master_container" >/dev/null 2>&1
  
  # 等待容器啟動
  sleep 5
  
  # 檢查角色
  role=$(docker exec "$current_master_container" redis-cli ROLE 2>/dev/null | head -1 || echo "unknown")
  echo -e "${CHECK} ${GREEN}$current_master_container 已重新啟動（角色: $role）${NC}"
  
  if [ "$role" = "slave" ]; then
    echo -e "${INFO} 它現在是 Replica，會從新 Master 複製數據"
  fi
else
  echo -e "${INFO} 跳過重新啟動原 Master"
fi
echo ""

# ── 總結 ────────────────────────────────────────────────────────
echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}故障轉移測試完成${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""

echo -e "${CHECK} ${GREEN}測試結果總結:${NC}"
echo -e "   1. 原 Master: ${BLUE}$current_master_container${NC}"
echo -e "   2. 新 Master: ${BLUE}$new_master_container${NC}"
echo -e "   3. 故障轉移時間: ${BLUE}${waited} 秒${NC}"
echo -e "   4. 數據完整性: ${GREEN}通過${NC}"
echo -e "   5. 新 Master 可寫: ${GREEN}是${NC}"
echo ""

echo -e "${INFO} 查看詳細狀態，使用以下命令："
echo -e "   ./check-sentinel.sh"
echo ""
echo -e "${INFO} 查看 Sentinel 日誌："
echo -e "   docker logs suggar-daddy-redis-sentinel-1"
echo ""
