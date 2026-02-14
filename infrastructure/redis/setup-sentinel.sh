#!/bin/bash

# ====================================================================
# Redis Sentinel 高可用架構設置腳本
# ====================================================================
# 此腳本用於設置和驗證 Redis Sentinel 高可用架構
# 使用方式：./setup-sentinel.sh

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 圖示
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"
GEAR="⚙️"

echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}Redis Sentinel 高可用架構設置${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""

# ── 步驟 1: 檢查前置條件 ────────────────────────────────────
echo -e "${YELLOW}[步驟 1/6] 檢查前置條件...${NC}"

# 檢查 Docker
if ! command -v docker &> /dev/null; then
  echo -e "${CROSS} ${RED}Docker 未安裝${NC}"
  exit 1
fi
echo -e "${CHECK} ${GREEN}Docker 已安裝: $(docker --version | head -1)${NC}"

# 檢查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
  echo -e "${CROSS} ${RED}Docker Compose 未安裝${NC}"
  exit 1
fi
echo -e "${CHECK} ${GREEN}Docker Compose 已安裝: $(docker-compose --version)${NC}"

# 檢查配置文件
config_files=(
  "infrastructure/redis/master/redis.conf"
  "infrastructure/redis/replica/redis.conf"
  "infrastructure/redis/sentinel/sentinel.conf"
)

for file in "${config_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${CROSS} ${RED}配置文件不存在: $file${NC}"
    exit 1
  fi
  echo -e "${CHECK} ${GREEN}配置文件存在: $file${NC}"
done

echo ""

# ── 步驟 2: 啟動 Redis 實例 ─────────────────────────────────
echo -e "${YELLOW}[步驟 2/6] 啟動 Redis 實例...${NC}"

# 檢查是否有舊容器在運行
old_containers=$(docker ps -a --filter "name=suggar-daddy-redis" --format "{{.Names}}" | wc -l)
if [ "$old_containers" -gt 0 ]; then
  echo -e "${WARNING} ${YELLOW}檢測到 $old_containers 個舊容器${NC}"
  echo -e "${INFO} 將先停止並移除舊容器..."
  docker-compose stop redis-master redis-replica-1 redis-replica-2 \
    redis-sentinel-1 redis-sentinel-2 redis-sentinel-3 2>/dev/null || true
  docker-compose rm -f redis-master redis-replica-1 redis-replica-2 \
    redis-sentinel-1 redis-sentinel-2 redis-sentinel-3 2>/dev/null || true
fi

# 啟動 Redis Master
echo -e "${ROCKET} 啟動 Redis Master..."
docker-compose up -d redis-master

# 等待 Master 健康
echo -e "${INFO} 等待 Master 啟動..."
for i in {1..30}; do
  if docker exec suggar-daddy-redis-master redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${CHECK} ${GREEN}Master 已啟動並健康${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${CROSS} ${RED}Master 啟動超時${NC}"
    docker logs suggar-daddy-redis-master
    exit 1
  fi
  sleep 1
done

# 啟動 Redis Replicas
echo -e "${ROCKET} 啟動 Redis Replicas..."
docker-compose up -d redis-replica-1 redis-replica-2

# 等待 Replicas 健康
echo -e "${INFO} 等待 Replicas 啟動..."
sleep 5

for replica in "suggar-daddy-redis-replica-1" "suggar-daddy-redis-replica-2"; do
  for i in {1..30}; do
    if docker exec "$replica" redis-cli ping 2>/dev/null | grep -q "PONG"; then
      echo -e "${CHECK} ${GREEN}$replica 已啟動並健康${NC}"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${CROSS} ${RED}$replica 啟動超時${NC}"
      docker logs "$replica"
      exit 1
    fi
    sleep 1
  done
done

echo ""

# ── 步驟 3: 啟動 Sentinel 節點 ──────────────────────────────
echo -e "${YELLOW}[步驟 3/6] 啟動 Sentinel 節點...${NC}"

echo -e "${ROCKET} 啟動 Sentinel 節點..."
docker-compose up -d redis-sentinel-1 redis-sentinel-2 redis-sentinel-3

# 等待 Sentinel 啟動
echo -e "${INFO} 等待 Sentinel 節點啟動..."
sleep 10

for sentinel in "suggar-daddy-redis-sentinel-1" "suggar-daddy-redis-sentinel-2" "suggar-daddy-redis-sentinel-3"; do
  for i in {1..30}; do
    if docker exec "$sentinel" redis-cli -p 26379 ping 2>/dev/null | grep -q "PONG"; then
      echo -e "${CHECK} ${GREEN}$sentinel 已啟動並健康${NC}"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${CROSS} ${RED}$sentinel 啟動超時${NC}"
      docker logs "$sentinel"
      exit 1
    fi
    sleep 1
  done
done

echo ""

# ── 步驟 4: 驗證 Sentinel 集群 ──────────────────────────────
echo -e "${YELLOW}[步驟 4/6] 驗證 Sentinel 集群...${NC}"

# 等待 Sentinel 完成初始化和發現
echo -e "${INFO} 等待 Sentinel 集群完成初始化..."
sleep 15

# 檢查 Sentinel 是否能獲取 Master 信息
master_info=$(docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster 2>/dev/null || echo "")

if [ -z "$master_info" ]; then
  echo -e "${CROSS} ${RED}Sentinel 無法獲取 Master 信息${NC}"
  echo -e "${INFO} 查看 Sentinel 日誌:"
  docker logs --tail 50 suggar-daddy-redis-sentinel-1
  exit 1
fi

master_ip=$(echo "$master_info" | head -1)
master_port=$(echo "$master_info" | tail -1)
echo -e "${CHECK} ${GREEN}Sentinel 已成功連接到 Master${NC}"
echo -e "${INFO} Master 地址: ${CYAN}$master_ip:$master_port${NC}"

# 檢查 Sentinel 是否發現了 Replicas
replicas=$(docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL replicas mymaster 2>/dev/null | grep -c "^name$" || echo 0)

if [ "$replicas" -lt 2 ]; then
  echo -e "${WARNING} ${YELLOW}Sentinel 只發現了 $replicas 個 Replica (期望: 2)${NC}"
  echo -e "${INFO} 這可能需要幾秒鐘..."
else
  echo -e "${CHECK} ${GREEN}Sentinel 已發現 $replicas 個 Replica${NC}"
fi

# 檢查 Sentinel 之間是否互相發現
sentinels=$(docker exec suggar-daddy-redis-sentinel-1 \
  redis-cli -p 26379 SENTINEL sentinels mymaster 2>/dev/null | grep -c "^ip$" || echo 0)

if [ "$sentinels" -lt 2 ]; then
  echo -e "${WARNING} ${YELLOW}Sentinel 只發現了 $sentinels 個其他 Sentinel (期望: 2)${NC}"
else
  echo -e "${CHECK} ${GREEN}Sentinel 已發現 $sentinels 個其他 Sentinel${NC}"
fi

echo ""

# ── 步驟 5: 驗證複製狀態 ────────────────────────────────────
echo -e "${YELLOW}[步驟 5/6] 驗證複製狀態...${NC}"

# 檢查 Master 的複製信息
repl_info=$(docker exec suggar-daddy-redis-master redis-cli INFO replication)
connected_slaves=$(echo "$repl_info" | grep "^connected_slaves:" | cut -d: -f2 | tr -d '\r')

if [ "$connected_slaves" -eq 2 ]; then
  echo -e "${CHECK} ${GREEN}Master 已連接 $connected_slaves 個 Replica${NC}"
else
  echo -e "${WARNING} ${YELLOW}Master 連接了 $connected_slaves 個 Replica (期望: 2)${NC}"
fi

# 檢查每個 Replica 的複製狀態
for replica in "suggar-daddy-redis-replica-1" "suggar-daddy-redis-replica-2"; do
  role=$(docker exec "$replica" redis-cli ROLE 2>/dev/null | head -1 || echo "unknown")
  
  if [ "$role" = "slave" ]; then
    # 檢查與 Master 的連接狀態
    master_link=$(docker exec "$replica" redis-cli INFO replication 2>/dev/null | \
      grep "^master_link_status:" | cut -d: -f2 | tr -d '\r')
    
    if [ "$master_link" = "up" ]; then
      echo -e "${CHECK} ${GREEN}$replica: 複製狀態正常${NC}"
    else
      echo -e "${WARNING} ${YELLOW}$replica: 複製狀態異常 (master_link: $master_link)${NC}"
    fi
  else
    echo -e "${WARNING} ${YELLOW}$replica: 角色異常 (role: $role)${NC}"
  fi
done

echo ""

# ── 步驟 6: 測試讀寫操作 ────────────────────────────────────
echo -e "${YELLOW}[步驟 6/6] 測試讀寫操作...${NC}"

# 寫入測試數據到 Master
test_key="setup:test:$(date +%s)"
test_value="setup_successful_$(date +%Y%m%d_%H%M%S)"

echo -e "${INFO} 寫入測試數據到 Master..."
result=$(docker exec suggar-daddy-redis-master \
  redis-cli SET "$test_key" "$test_value" EX 60 2>/dev/null || echo "FAIL")

if [ "$result" = "OK" ]; then
  echo -e "${CHECK} ${GREEN}寫入成功: $test_key = $test_value${NC}"
else
  echo -e "${CROSS} ${RED}寫入失敗${NC}"
  exit 1
fi

# 等待複製
sleep 2

# 從 Replica 讀取數據
echo -e "${INFO} 從 Replica 讀取數據..."
for replica in "suggar-daddy-redis-replica-1" "suggar-daddy-redis-replica-2"; do
  read_value=$(docker exec "$replica" redis-cli GET "$test_key" 2>/dev/null || echo "")
  
  if [ "$read_value" = "$test_value" ]; then
    echo -e "${CHECK} ${GREEN}$replica: 讀取成功，數據已同步${NC}"
  else
    echo -e "${WARNING} ${YELLOW}$replica: 數據未同步或讀取失敗${NC}"
  fi
done

# 清理測試數據
docker exec suggar-daddy-redis-master redis-cli DEL "$test_key" >/dev/null 2>&1

echo ""

# ── 完成總結 ────────────────────────────────────────────────
echo -e "${MAGENTA}========================================${NC}"
echo -e "${MAGENTA}Redis Sentinel 設置完成！${NC}"
echo -e "${MAGENTA}========================================${NC}"
echo ""

echo -e "${CHECK} ${GREEN}成功啟動的服務:${NC}"
echo -e "   ${CYAN}• Redis Master (suggar-daddy-redis-master:6379)${NC}"
echo -e "   ${CYAN}• Redis Replica 1 (suggar-daddy-redis-replica-1:6380)${NC}"
echo -e "   ${CYAN}• Redis Replica 2 (suggar-daddy-redis-replica-2:6381)${NC}"
echo -e "   ${CYAN}• Sentinel 1 (suggar-daddy-redis-sentinel-1:26379)${NC}"
echo -e "   ${CYAN}• Sentinel 2 (suggar-daddy-redis-sentinel-2:26380)${NC}"
echo -e "   ${CYAN}• Sentinel 3 (suggar-daddy-redis-sentinel-3:26381)${NC}"
echo ""

echo -e "${INFO} ${BLUE}架構特點:${NC}"
echo -e "   ${CYAN}• Quorum: 2 (需要 2 個 Sentinel 同意才能故障轉移)${NC}"
echo -e "   ${CYAN}• 故障檢測時間: 5 秒${NC}"
echo -e "   ${CYAN}• 故障轉移超時: 10 秒${NC}"
echo -e "   ${CYAN}• 持久化: AOF + RDB${NC}"
echo -e "   ${CYAN}• 記憶體限制: 512MB per instance${NC}"
echo ""

echo -e "${GEAR} ${BLUE}下一步操作:${NC}"
echo ""
echo -e "   ${YELLOW}1. 執行健康檢查:${NC}"
echo -e "      ${CYAN}./infrastructure/redis/check-sentinel.sh${NC}"
echo ""
echo -e "   ${YELLOW}2. 測試故障轉移:${NC}"
echo -e "      ${CYAN}./infrastructure/redis/test-failover.sh${NC}"
echo ""
echo -e "   ${YELLOW}3. 查看 Sentinel 狀態:${NC}"
echo -e "      ${CYAN}docker exec suggar-daddy-redis-sentinel-1 redis-cli -p 26379 SENTINEL masters${NC}"
echo ""
echo -e "   ${YELLOW}4. 查看複製狀態:${NC}"
echo -e "      ${CYAN}docker exec suggar-daddy-redis-master redis-cli INFO replication${NC}"
echo ""
echo -e "   ${YELLOW}5. 查看日誌:${NC}"
echo -e "      ${CYAN}docker logs -f suggar-daddy-redis-sentinel-1${NC}"
echo ""
echo -e "   ${YELLOW}6. 更新應用環境變數:${NC}"
echo -e "      ${CYAN}# 編輯 .env 文件${NC}"
echo -e "      ${CYAN}REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26380,redis-sentinel-3:26381${NC}"
echo -e "      ${CYAN}REDIS_MASTER_NAME=mymaster${NC}"
echo ""
echo -e "   ${YELLOW}7. 重啟應用服務:${NC}"
echo -e "      ${CYAN}docker-compose restart auth-service user-service payment-service${NC}"
echo ""

echo -e "${INFO} ${BLUE}參考文檔:${NC}"
echo -e "   ${CYAN}docs/REDIS_SENTINEL.md${NC}"
echo ""
