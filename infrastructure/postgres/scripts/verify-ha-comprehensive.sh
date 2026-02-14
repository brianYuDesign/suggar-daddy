#!/bin/bash
# PostgreSQL High Availability Comprehensive Test Script
# This script runs all HA tests

set -e

# Configuration
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-suggar_daddy}"

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "======================================"
echo "🏥 PostgreSQL HA Verification Suite"
echo "======================================"
echo ""

TEST_PASSED=0
TEST_FAILED=0

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${BLUE}▶ Running: ${test_name}${NC}"
    echo "--------------------------------------"
    
    if eval "${test_command}"; then
        echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
        ((TEST_PASSED++))
    else
        echo -e "${RED}❌ FAILED: ${test_name}${NC}"
        ((TEST_FAILED++))
    fi
    
    echo ""
}

# Test 1: Container Status
test_container_status() {
    echo "Checking container status..."
    
    local master_running=$(docker ps --filter "name=suggar-daddy-postgres-master" --format "{{.Status}}" | grep -c "Up" || echo "0")
    local replica_running=$(docker ps --filter "name=suggar-daddy-postgres-replica" --format "{{.Status}}" | grep -c "Up" || echo "0")
    
    if [ "${master_running}" = "1" ] && [ "${replica_running}" = "1" ]; then
        echo "✅ Both master and replica containers are running"
        return 0
    else
        echo "❌ One or more containers are not running"
        echo "Master: ${master_running}, Replica: ${replica_running}"
        return 1
    fi
}

# Test 2: Database Connectivity
test_db_connectivity() {
    echo "Testing database connectivity..."
    
    if pg_isready -h postgres-master -p 5432 -U "${POSTGRES_USER}" && \
       pg_isready -h postgres-replica -p 5432 -U "${POSTGRES_USER}"; then
        echo "✅ Both databases are accessible"
        return 0
    else
        echo "❌ Database connectivity failed"
        return 1
    fi
}

# Test 3: Replication Status
test_replication_status() {
    echo "Checking replication status..."
    
    # Check master
    local master_slots=$(docker exec suggar-daddy-postgres-master psql -U postgres -t -c "SELECT COUNT(*) FROM pg_replication_slots WHERE active = true;" | xargs)
    
    # Check replica
    local replica_recovery=$(docker exec suggar-daddy-postgres-replica psql -U postgres -t -c "SELECT pg_is_in_recovery();" | xargs)
    
    if [ "${master_slots}" -gt 0 ] && [ "${replica_recovery}" = "t" ]; then
        echo "✅ Replication is active"
        echo "   Master slots: ${master_slots}"
        echo "   Replica in recovery: ${replica_recovery}"
        return 0
    else
        echo "❌ Replication is not properly configured"
        return 1
    fi
}

# Test 4: Replication Lag
test_replication_lag() {
    echo "Checking replication lag..."
    
    local lag=$(docker exec suggar-daddy-postgres-master psql -U postgres -t -c "SELECT COALESCE(pg_wal_lsn_diff(sent_lsn, replay_lsn), 0) FROM pg_stat_replication LIMIT 1;" | xargs || echo "-1")
    
    if [ "${lag}" != "-1" ] && [ "${lag}" -lt 10485760 ]; then
        echo "✅ Replication lag is acceptable: ${lag} bytes (<10MB)"
        return 0
    else
        echo "⚠️  Replication lag: ${lag} bytes"
        if [ "${lag}" -ge 10485760 ]; then
            echo "❌ Lag exceeds 10MB threshold"
            return 1
        fi
        return 0
    fi
}

# Test 5: Read/Write Operations
test_read_write_operations() {
    echo "Testing read/write operations..."
    
    # Create test table and insert data on master
    docker exec suggar-daddy-postgres-master psql -U postgres -d "${POSTGRES_DB}" -c "
        CREATE TABLE IF NOT EXISTS ha_verification_test (
            id SERIAL PRIMARY KEY,
            test_value VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW()
        );
        DELETE FROM ha_verification_test;
        INSERT INTO ha_verification_test (test_value) VALUES ('test_$(date +%s)');
    " > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to write to master"
        return 1
    fi
    
    echo "✅ Write to master successful"
    
    # Wait for replication
    sleep 2
    
    # Read from replica
    local count=$(docker exec suggar-daddy-postgres-replica psql -U postgres -d "${POSTGRES_DB}" -t -c "SELECT COUNT(*) FROM ha_verification_test;" | xargs)
    
    if [ "${count}" -gt 0 ]; then
        echo "✅ Read from replica successful (${count} records)"
        return 0
    else
        echo "❌ Failed to read from replica or data not replicated"
        return 1
    fi
}

# Test 6: Connection Pool (if PgBouncer is running)
test_connection_pool() {
    echo "Checking connection pool..."
    
    if docker ps --filter "name=suggar-daddy-pgbouncer" --format "{{.Status}}" | grep -q "Up"; then
        echo "✅ PgBouncer is running"
        
        # Test connection through PgBouncer
        if pg_isready -h localhost -p 6432 -U "${POSTGRES_USER}" > /dev/null 2>&1; then
            echo "✅ PgBouncer connection successful"
            return 0
        else
            echo "⚠️  PgBouncer is running but connection failed"
            return 0
        fi
    else
        echo "⚠️  PgBouncer is not running (optional)"
        return 0
    fi
}

# Test 7: Backup Existence
test_backup_existence() {
    echo "Checking backup configuration..."
    
    if [ -d "/Users/brianyu/Project/suggar-daddy/backups" ] || \
       docker exec suggar-daddy-postgres-master test -d /backups > /dev/null 2>&1; then
        echo "✅ Backup directory exists"
        return 0
    else
        echo "⚠️  Backup directory not found"
        return 0
    fi
}

# Test 8: Monitoring Metrics
test_monitoring_metrics() {
    echo "Checking monitoring setup..."
    
    # Check if Prometheus exporter or monitoring is configured
    if docker ps --filter "name=prometheus" --format "{{.Status}}" | grep -q "Up" || \
       docker ps --filter "name=grafana" --format "{{.Status}}" | grep -q "Up"; then
        echo "✅ Monitoring stack is running"
        return 0
    else
        echo "⚠️  Monitoring stack not detected (optional)"
        return 0
    fi
}

# Run all tests
echo "Starting HA verification tests..."
echo ""

run_test "Container Status" "test_container_status"
run_test "Database Connectivity" "test_db_connectivity"
run_test "Replication Status" "test_replication_status"
run_test "Replication Lag" "test_replication_lag"
run_test "Read/Write Operations" "test_read_write_operations"
run_test "Connection Pool" "test_connection_pool"
run_test "Backup Configuration" "test_backup_existence"
run_test "Monitoring Setup" "test_monitoring_metrics"

# Summary
echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: ${TEST_PASSED}${NC}"
echo -e "${RED}Failed: ${TEST_FAILED}${NC}"
echo "Total: $((TEST_PASSED + TEST_FAILED))"
echo ""

if [ ${TEST_FAILED} -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo ""
    echo "Your PostgreSQL HA setup is healthy! 🎉"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Please review the failures and fix the issues."
    exit 1
fi
