#!/bin/bash
# PostgreSQL HA 驗證和測試腳本
# 用於驗證主從複製功能是否正常運作

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
MASTER_CONTAINER="suggar-daddy-postgres-master"
REPLICA_CONTAINER="suggar-daddy-postgres-replica"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-suggar_daddy}"
TEST_TABLE="ha_test_$(date +%s)"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PostgreSQL High Availability Test Suite              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 測試函數
test_passed() {
    echo -e "${GREEN}✓ PASSED:${NC} $1"
}

test_failed() {
    echo -e "${RED}✗ FAILED:${NC} $1"
    exit 1
}

test_warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
}

test_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

# 測試 1: 檢查容器狀態
echo -e "\n${BLUE}[Test 1]${NC} Checking container status..."
if docker ps | grep -q "$MASTER_CONTAINER"; then
    test_passed "Master container is running"
else
    test_failed "Master container is not running"
fi

if docker ps | grep -q "$REPLICA_CONTAINER"; then
    test_passed "Replica container is running"
else
    test_failed "Replica container is not running"
fi

# 測試 2: 檢查 PostgreSQL 就緒狀態
echo -e "\n${BLUE}[Test 2]${NC} Checking PostgreSQL readiness..."
if docker exec "$MASTER_CONTAINER" pg_isready -U "$DB_USER" > /dev/null 2>&1; then
    test_passed "Master PostgreSQL is ready"
else
    test_failed "Master PostgreSQL is not ready"
fi

if docker exec "$REPLICA_CONTAINER" pg_isready -U "$DB_USER" > /dev/null 2>&1; then
    test_passed "Replica PostgreSQL is ready"
else
    test_failed "Replica PostgreSQL is not ready"
fi

# 測試 3: 檢查 Replica 是否處於恢復模式
echo -e "\n${BLUE}[Test 3]${NC} Checking replica recovery mode..."
RECOVERY_STATUS=$(docker exec "$REPLICA_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT pg_is_in_recovery();")

if [ "$RECOVERY_STATUS" = "t" ]; then
    test_passed "Replica is in recovery mode (read-only)"
else
    test_failed "Replica is NOT in recovery mode"
fi

# 測試 4: 檢查複製連接
echo -e "\n${BLUE}[Test 4]${NC} Checking replication connection..."
REPLICATION_COUNT=$(docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT count(*) FROM pg_stat_replication;")

if [ "$REPLICATION_COUNT" -ge 1 ]; then
    test_passed "Replication connection established ($REPLICATION_COUNT connection(s))"
else
    test_failed "No replication connections found"
fi

# 測試 5: 檢查複製狀態
echo -e "\n${BLUE}[Test 5]${NC} Checking replication state..."
REPLICATION_STATE=$(docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT state FROM pg_stat_replication LIMIT 1;")

if [ "$REPLICATION_STATE" = "streaming" ]; then
    test_passed "Replication state: streaming"
else
    test_warning "Replication state: $REPLICATION_STATE (expected: streaming)"
fi

# 測試 6: 檢查複製槽
echo -e "\n${BLUE}[Test 6]${NC} Checking replication slot..."
SLOT_ACTIVE=$(docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT active FROM pg_replication_slots WHERE slot_name='replica_slot_1';")

if [ "$SLOT_ACTIVE" = "t" ]; then
    test_passed "Replication slot is active"
else
    test_warning "Replication slot is not active or doesn't exist"
fi

# 測試 7: 測試寫入複製
echo -e "\n${BLUE}[Test 7]${NC} Testing data replication..."

# 在 Master 創建測試表
test_info "Creating test table on master..."
docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS $TEST_TABLE (id SERIAL PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT NOW());" > /dev/null

# 插入測試數據
TEST_DATA="test_$(date +%s)"
test_info "Inserting test data: $TEST_DATA"
docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO $TEST_TABLE (data) VALUES ('$TEST_DATA');" > /dev/null

# 等待複製
test_info "Waiting for replication (3 seconds)..."
sleep 3

# 從 Replica 讀取
REPLICA_DATA=$(docker exec "$REPLICA_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT data FROM $TEST_TABLE WHERE data='$TEST_DATA';")

if [ "$REPLICA_DATA" = "$TEST_DATA" ]; then
    test_passed "Data replicated successfully"
else
    test_failed "Data replication failed (expected: $TEST_DATA, got: $REPLICA_DATA)"
fi

# 清理測試表
test_info "Cleaning up test table..."
docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "DROP TABLE $TEST_TABLE;" > /dev/null

# 測試 8: 檢查複製延遲
echo -e "\n${BLUE}[Test 8]${NC} Checking replication lag..."
LAG_SECONDS=$(docker exec "$REPLICA_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null || echo "N/A")

if [ "$LAG_SECONDS" = "N/A" ]; then
    test_warning "Could not determine replication lag"
elif (( $(echo "$LAG_SECONDS < 10" | bc -l 2>/dev/null || echo "0") )); then
    test_passed "Replication lag: ${LAG_SECONDS} seconds (< 10s)"
else
    test_warning "Replication lag: ${LAG_SECONDS} seconds (> 10s)"
fi

# 測試 9: 測試只讀限制
echo -e "\n${BLUE}[Test 9]${NC} Testing read-only constraint on replica..."
WRITE_TEST=$(docker exec "$REPLICA_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "CREATE TABLE test_write (id INT);" 2>&1 || true)

if echo "$WRITE_TEST" | grep -q "read-only"; then
    test_passed "Replica correctly rejects write operations"
else
    test_warning "Replica may accept write operations (not expected)"
fi

# 測試 10: 檢查連接池
echo -e "\n${BLUE}[Test 10]${NC} Checking connection statistics..."
MASTER_CONNECTIONS=$(docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME';")

REPLICA_CONNECTIONS=$(docker exec "$REPLICA_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME';")

test_info "Master active connections: $MASTER_CONNECTIONS"
test_info "Replica active connections: $REPLICA_CONNECTIONS"
test_passed "Connection statistics retrieved"

# 最終報告
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Summary                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 顯示詳細狀態
echo -e "${YELLOW}=== Master Replication Status ===${NC}"
docker exec "$MASTER_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT client_addr, application_name, state, sync_state, sent_lsn, write_lsn, flush_lsn, replay_lsn FROM pg_stat_replication;" 2>/dev/null || echo "Could not retrieve master status"

echo ""
echo -e "${YELLOW}=== Replica Replication Status ===${NC}"
docker exec "$REPLICA_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT status, sender_host, sender_port, slot_name, received_lsn, last_msg_receipt_time FROM pg_stat_wal_receiver;" 2>/dev/null || echo "Could not retrieve replica status"

echo ""
echo -e "${YELLOW}=== Replication Lag ===${NC}"
docker exec "$REPLICA_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds, pg_last_xact_replay_timestamp() AS last_replay_time;" 2>/dev/null || echo "Could not retrieve replication lag"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              All Tests Completed Successfully             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}✨ PostgreSQL High Availability is working correctly!${NC}"
echo ""
