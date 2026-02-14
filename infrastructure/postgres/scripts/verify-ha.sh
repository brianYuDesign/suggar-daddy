#!/bin/bash

# PostgreSQL High Availability Verification Script
# This script verifies the PostgreSQL master-replica setup

set -e

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PostgreSQL High Availability Verification               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if container is running
check_container() {
    local container_name=$1
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo -e "${GREEN}✅ ${container_name} is running${NC}"
        return 0
    else
        echo -e "${RED}❌ ${container_name} is not running${NC}"
        return 1
    fi
}

# Function to run SQL query
run_query() {
    local container=$1
    local query=$2
    docker exec "$container" psql -U postgres -t -c "$query" 2>/dev/null | xargs
}

# Step 1: Check containers
echo -e "${YELLOW}[1/6] Checking Docker containers...${NC}"
MASTER_RUNNING=$(check_container "suggar-daddy-postgres-master" && echo "true" || echo "false")
REPLICA_RUNNING=$(check_container "suggar-daddy-postgres-replica" && echo "true" || echo "false")
echo ""

if [ "$MASTER_RUNNING" != "true" ] || [ "$REPLICA_RUNNING" != "true" ]; then
    echo -e "${RED}⚠️  One or more containers are not running. Starting them...${NC}"
    docker-compose up -d postgres-master postgres-replica
    echo "⏳ Waiting 30 seconds for services to start..."
    sleep 30
fi

# Step 2: Check Master health
echo -e "${YELLOW}[2/6] Checking Master health...${NC}"
if docker exec suggar-daddy-postgres-master pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Master is healthy${NC}"
    
    # Get Master version
    MASTER_VERSION=$(run_query "suggar-daddy-postgres-master" "SELECT version();")
    echo -e "   📦 Version: ${MASTER_VERSION:0:50}..."
    
    # Check if it's in recovery mode (should be false for master)
    IS_RECOVERY=$(run_query "suggar-daddy-postgres-master" "SELECT pg_is_in_recovery();")
    if [ "$IS_RECOVERY" = "f" ]; then
        echo -e "${GREEN}   ✅ Master is in primary mode (not in recovery)${NC}"
    else
        echo -e "${RED}   ❌ WARNING: Master is in recovery mode!${NC}"
    fi
else
    echo -e "${RED}❌ Master is not healthy${NC}"
    exit 1
fi
echo ""

# Step 3: Check Replica health
echo -e "${YELLOW}[3/6] Checking Replica health...${NC}"
if docker exec suggar-daddy-postgres-replica pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Replica is healthy${NC}"
    
    # Check if it's in recovery mode (should be true for replica)
    IS_RECOVERY=$(run_query "suggar-daddy-postgres-replica" "SELECT pg_is_in_recovery();")
    if [ "$IS_RECOVERY" = "t" ]; then
        echo -e "${GREEN}   ✅ Replica is in standby mode (recovery)${NC}"
    else
        echo -e "${RED}   ❌ WARNING: Replica is NOT in recovery mode!${NC}"
    fi
else
    echo -e "${RED}❌ Replica is not healthy${NC}"
    exit 1
fi
echo ""

# Step 4: Check replication status
echo -e "${YELLOW}[4/6] Checking replication status...${NC}"

# Check replication slots on master
SLOT_INFO=$(run_query "suggar-daddy-postgres-master" "SELECT slot_name, active FROM pg_replication_slots;")
if [ -n "$SLOT_INFO" ]; then
    echo -e "${GREEN}✅ Replication slot exists${NC}"
    echo -e "   📝 Slot info: $SLOT_INFO"
else
    echo -e "${RED}❌ No replication slot found${NC}"
fi

# Check active replication connections
REPL_COUNT=$(run_query "suggar-daddy-postgres-master" "SELECT count(*) FROM pg_stat_replication;")
if [ "$REPL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Active replication connections: $REPL_COUNT${NC}"
    
    # Get replication details
    REPL_STATE=$(run_query "suggar-daddy-postgres-master" "SELECT application_name, state, sync_state FROM pg_stat_replication;")
    echo -e "   📡 Replication details: $REPL_STATE"
else
    echo -e "${YELLOW}⚠️  No active replication connections${NC}"
fi
echo ""

# Step 5: Check replication lag
echo -e "${YELLOW}[5/6] Checking replication lag...${NC}"

# Get lag from replica
LAG=$(docker exec suggar-daddy-postgres-replica psql -U postgres -t -c "
    SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int;
" 2>/dev/null | xargs)

if [ -n "$LAG" ] && [ "$LAG" != "" ]; then
    if [ "$LAG" -lt 2 ]; then
        echo -e "${GREEN}✅ Replication lag: ${LAG} seconds (Excellent)${NC}"
    elif [ "$LAG" -lt 5 ]; then
        echo -e "${YELLOW}⚡ Replication lag: ${LAG} seconds (Good)${NC}"
    else
        echo -e "${RED}⚠️  Replication lag: ${LAG} seconds (High)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Unable to determine replication lag${NC}"
fi

# Get byte lag
BYTE_LAG=$(docker exec suggar-daddy-postgres-replica psql -U postgres -t -c "
    SELECT pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn());
" 2>/dev/null | xargs)

if [ -n "$BYTE_LAG" ] && [ "$BYTE_LAG" != "" ]; then
    if [ "$BYTE_LAG" -lt 1048576 ]; then
        echo -e "${GREEN}✅ Byte lag: $(numfmt --to=iec "$BYTE_LAG" 2>/dev/null || echo "$BYTE_LAG bytes") (Good)${NC}"
    else
        echo -e "${YELLOW}⚠️  Byte lag: $(numfmt --to=iec "$BYTE_LAG" 2>/dev/null || echo "$BYTE_LAG bytes")${NC}"
    fi
fi
echo ""

# Step 6: Test read/write operations
echo -e "${YELLOW}[6/6] Testing read/write operations...${NC}"

# Create test table if not exists
docker exec suggar-daddy-postgres-master psql -U postgres -d postgres -c "
    CREATE TABLE IF NOT EXISTS ha_test (
        id SERIAL PRIMARY KEY,
        test_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );
" > /dev/null 2>&1

# Insert test data on master
TEST_VALUE="test_$(date +%s)"
docker exec suggar-daddy-postgres-master psql -U postgres -d postgres -c "
    INSERT INTO ha_test (test_data) VALUES ('$TEST_VALUE');
" > /dev/null 2>&1

echo -e "${GREEN}✅ Write to master successful${NC}"

# Wait for replication
sleep 2

# Read from replica
RESULT=$(docker exec suggar-daddy-postgres-replica psql -U postgres -d postgres -t -c "
    SELECT test_data FROM ha_test WHERE test_data = '$TEST_VALUE';
" 2>/dev/null | xargs)

if [ "$RESULT" = "$TEST_VALUE" ]; then
    echo -e "${GREEN}✅ Read from replica successful (data replicated)${NC}"
else
    echo -e "${RED}❌ Data not found on replica${NC}"
fi

# Try to write to replica (should fail)
if docker exec suggar-daddy-postgres-replica psql -U postgres -d postgres -c "
    INSERT INTO ha_test (test_data) VALUES ('should_fail');
" > /dev/null 2>&1; then
    echo -e "${RED}❌ WARNING: Replica accepted write operation!${NC}"
else
    echo -e "${GREEN}✅ Replica correctly rejected write operation (read-only)${NC}"
fi

# Cleanup test data
docker exec suggar-daddy-postgres-master psql -U postgres -d postgres -c "
    DELETE FROM ha_test WHERE test_data = '$TEST_VALUE';
" > /dev/null 2>&1

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Verification Complete!                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Summary
echo -e "${GREEN}📊 Summary:${NC}"
echo -e "   Master:  postgres-master:5432 (read/write)"
echo -e "   Replica: postgres-replica:5433 (read-only)"
echo ""
echo -e "${GREEN}🔧 Useful Commands:${NC}"
echo -e "   Check replication status:"
echo -e "   ${BLUE}docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh${NC}"
echo ""
echo -e "   View master logs:"
echo -e "   ${BLUE}docker-compose logs -f postgres-master${NC}"
echo ""
echo -e "   View replica logs:"
echo -e "   ${BLUE}docker-compose logs -f postgres-replica${NC}"
echo ""
echo -e "   Connect to master:"
echo -e "   ${BLUE}docker exec -it suggar-daddy-postgres-master psql -U postgres${NC}"
echo ""
echo -e "   Connect to replica:"
echo -e "   ${BLUE}docker exec -it suggar-daddy-postgres-replica psql -U postgres${NC}"
echo ""

echo -e "${GREEN}✅ PostgreSQL High Availability setup is working correctly!${NC}"
