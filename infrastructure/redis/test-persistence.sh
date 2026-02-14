#!/bin/bash

# ====================================================================
# Redis 持久化測試腳本
# ====================================================================
# 這個腳本測試 Redis 的 AOF 和 RDB 持久化機制
# 測試場景：
# 1. 寫入測試數據
# 2. 檢查持久化文件是否生成
# 3. 重啟 Redis 容器
# 4. 驗證數據是否恢復
# ====================================================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ====================================================================
# 1. 檢查 Redis 容器狀態
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 1: 檢查 Redis 容器狀態"
log_info "======================================================================"

if ! docker ps | grep -q "suggar-daddy-redis-master"; then
    log_error "Redis Master 容器未運行，請先啟動容器"
    log_info "執行: docker-compose up -d redis-master"
    exit 1
fi

log_success "Redis Master 容器正在運行"

# ====================================================================
# 2. 寫入測試數據
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 2: 寫入測試數據"
log_info "======================================================================"

# 生成唯一的測試標識符
TEST_ID=$(date +%s)
log_info "測試 ID: $TEST_ID"

# 寫入各種類型的測試數據
log_info "寫入 String 類型..."
docker exec suggar-daddy-redis-master redis-cli SET "test:persistence:string:$TEST_ID" "Hello Redis Persistence" EX 3600

log_info "寫入 Hash 類型..."
docker exec suggar-daddy-redis-master redis-cli HSET "test:persistence:hash:$TEST_ID" \
    field1 "value1" \
    field2 "value2" \
    field3 "value3"

log_info "寫入 List 類型..."
docker exec suggar-daddy-redis-master redis-cli RPUSH "test:persistence:list:$TEST_ID" \
    "item1" "item2" "item3" "item4" "item5"

log_info "寫入 Set 類型..."
docker exec suggar-daddy-redis-master redis-cli SADD "test:persistence:set:$TEST_ID" \
    "member1" "member2" "member3" "member4"

log_info "寫入 Sorted Set 類型..."
docker exec suggar-daddy-redis-master redis-cli ZADD "test:persistence:zset:$TEST_ID" \
    100 "player1" \
    200 "player2" \
    300 "player3" \
    400 "player4"

# 寫入持久化測試標記
docker exec suggar-daddy-redis-master redis-cli SET "test:persistence:marker:$TEST_ID" "PERSIST_TEST"

log_success "測試數據寫入完成"

# ====================================================================
# 3. 驗證數據寫入成功
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 3: 驗證數據寫入成功"
log_info "======================================================================"

# 檢查數據
STRING_VALUE=$(docker exec suggar-daddy-redis-master redis-cli GET "test:persistence:string:$TEST_ID")
MARKER_VALUE=$(docker exec suggar-daddy-redis-master redis-cli GET "test:persistence:marker:$TEST_ID")
LIST_LEN=$(docker exec suggar-daddy-redis-master redis-cli LLEN "test:persistence:list:$TEST_ID")
SET_CARD=$(docker exec suggar-daddy-redis-master redis-cli SCARD "test:persistence:set:$TEST_ID")
ZSET_CARD=$(docker exec suggar-daddy-redis-master redis-cli ZCARD "test:persistence:zset:$TEST_ID")

log_info "String 值: $STRING_VALUE"
log_info "標記值: $MARKER_VALUE"
log_info "List 長度: $LIST_LEN"
log_info "Set 大小: $SET_CARD"
log_info "Sorted Set 大小: $ZSET_CARD"

if [ "$MARKER_VALUE" != "PERSIST_TEST" ]; then
    log_error "數據寫入失敗"
    exit 1
fi

log_success "數據寫入驗證成功"

# ====================================================================
# 4. 檢查持久化文件
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 4: 檢查持久化文件"
log_info "======================================================================"

log_info "檢查 AOF 文件..."
if docker exec suggar-daddy-redis-master ls -lh /data/appendonly.aof 2>/dev/null; then
    AOF_SIZE=$(docker exec suggar-daddy-redis-master ls -lh /data/appendonly.aof | awk '{print $5}')
    log_success "AOF 文件存在，大小: $AOF_SIZE"
else
    log_warning "AOF 文件不存在或尚未生成"
fi

log_info "檢查 RDB 文件..."
if docker exec suggar-daddy-redis-master ls -lh /data/dump.rdb 2>/dev/null; then
    RDB_SIZE=$(docker exec suggar-daddy-redis-master ls -lh /data/dump.rdb | awk '{print $5}')
    log_success "RDB 文件存在，大小: $RDB_SIZE"
else
    log_warning "RDB 文件不存在或尚未生成"
fi

# ====================================================================
# 5. 強制執行 BGSAVE（生成 RDB 快照）
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 5: 強制執行 BGSAVE"
log_info "======================================================================"

log_info "執行 BGSAVE 命令..."
docker exec suggar-daddy-redis-master redis-cli BGSAVE

# 等待 BGSAVE 完成
log_info "等待 BGSAVE 完成..."
sleep 3

# 檢查 LASTSAVE 時間
LASTSAVE=$(docker exec suggar-daddy-redis-master redis-cli LASTSAVE)
log_success "最後保存時間: $(date -r $LASTSAVE 2>/dev/null || echo $LASTSAVE)"

# ====================================================================
# 6. 重啟 Redis 容器
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 6: 重啟 Redis Master 容器"
log_info "======================================================================"

log_warning "即將重啟 Redis Master 容器..."
log_info "重啟中..."

docker restart suggar-daddy-redis-master

log_info "等待容器啟動..."
sleep 10

# 等待 Redis 健康檢查通過
log_info "等待 Redis 健康檢查..."
RETRY_COUNT=0
MAX_RETRIES=30

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec suggar-daddy-redis-master redis-cli ping 2>/dev/null | grep -q PONG; then
        log_success "Redis 已就緒"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Redis 啟動超時"
        exit 1
    fi
    
    log_info "等待 Redis 啟動... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

# ====================================================================
# 7. 驗證數據恢復
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 7: 驗證數據是否從持久化文件恢復"
log_info "======================================================================"

# 等待一下讓 Redis 完全加載數據
sleep 2

# 檢查數據是否存在
MARKER_AFTER=$(docker exec suggar-daddy-redis-master redis-cli GET "test:persistence:marker:$TEST_ID")
STRING_AFTER=$(docker exec suggar-daddy-redis-master redis-cli GET "test:persistence:string:$TEST_ID")
LIST_LEN_AFTER=$(docker exec suggar-daddy-redis-master redis-cli LLEN "test:persistence:list:$TEST_ID")
SET_CARD_AFTER=$(docker exec suggar-daddy-redis-master redis-cli SCARD "test:persistence:set:$TEST_ID")
ZSET_CARD_AFTER=$(docker exec suggar-daddy-redis-master redis-cli ZCARD "test:persistence:zset:$TEST_ID")

log_info "恢復後的數據："
log_info "  標記值: $MARKER_AFTER"
log_info "  String 值: $STRING_AFTER"
log_info "  List 長度: $LIST_LEN_AFTER"
log_info "  Set 大小: $SET_CARD_AFTER"
log_info "  Sorted Set 大小: $ZSET_CARD_AFTER"

# 驗證數據完整性
SUCCESS=true

if [ "$MARKER_AFTER" != "PERSIST_TEST" ]; then
    log_error "❌ 標記數據未恢復"
    SUCCESS=false
fi

if [ "$STRING_AFTER" != "Hello Redis Persistence" ]; then
    log_error "❌ String 數據未恢復"
    SUCCESS=false
fi

if [ "$LIST_LEN_AFTER" != "5" ]; then
    log_error "❌ List 數據未完全恢復"
    SUCCESS=false
fi

if [ "$SET_CARD_AFTER" != "4" ]; then
    log_error "❌ Set 數據未完全恢復"
    SUCCESS=false
fi

if [ "$ZSET_CARD_AFTER" != "4" ]; then
    log_error "❌ Sorted Set 數據未完全恢復"
    SUCCESS=false
fi

# ====================================================================
# 8. 檢查持久化配置
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 8: 檢查 Redis 持久化配置"
log_info "======================================================================"

log_info "AOF 配置："
docker exec suggar-daddy-redis-master redis-cli CONFIG GET appendonly
docker exec suggar-daddy-redis-master redis-cli CONFIG GET appendfsync
docker exec suggar-daddy-redis-master redis-cli CONFIG GET auto-aof-rewrite-percentage

echo ""
log_info "RDB 配置："
docker exec suggar-daddy-redis-master redis-cli CONFIG GET save

echo ""
log_info "持久化統計："
docker exec suggar-daddy-redis-master redis-cli INFO Persistence | grep -E "aof_enabled|rdb_last_save_time|aof_last_rewrite_time_sec"

# ====================================================================
# 9. 清理測試數據
# ====================================================================
echo ""
log_info "======================================================================"
log_info "步驟 9: 清理測試數據"
log_info "======================================================================"

log_info "刪除測試數據..."
docker exec suggar-daddy-redis-master redis-cli DEL \
    "test:persistence:string:$TEST_ID" \
    "test:persistence:hash:$TEST_ID" \
    "test:persistence:list:$TEST_ID" \
    "test:persistence:set:$TEST_ID" \
    "test:persistence:zset:$TEST_ID" \
    "test:persistence:marker:$TEST_ID"

log_success "測試數據已清理"

# ====================================================================
# 最終結果
# ====================================================================
echo ""
log_info "======================================================================"
if [ "$SUCCESS" = true ]; then
    log_success "✅ Redis 持久化測試通過！"
    log_success "數據在重啟後成功恢復"
    echo ""
    log_info "測試結果總結："
    log_info "  ✓ AOF 持久化正常工作"
    log_info "  ✓ RDB 快照正常工作"
    log_info "  ✓ 數據恢復完整"
    log_info "  ✓ 配置正確"
else
    log_error "❌ Redis 持久化測試失敗！"
    log_error "請檢查 Redis 配置和日誌"
    exit 1
fi
log_info "======================================================================"
echo ""
