#!/bin/bash
set -e

# PostgreSQL Replication Health Check Script
# This script monitors the replication status and lag

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🏥 PostgreSQL Replication Health Check"
echo "========================================"
echo ""

# Check if this is master or replica
IS_REPLICA=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT pg_is_in_recovery();" | xargs)

if [ "$IS_REPLICA" = "t" ]; then
    echo "📍 Server Role: REPLICA (Standby)"
    echo ""
    
    # Check replication status on replica
    echo "📊 Replication Status:"
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -x <<-EOSQL
        SELECT 
            now() as current_time,
            pg_last_wal_receive_lsn() as receive_lsn,
            pg_last_wal_replay_lsn() as replay_lsn,
            pg_last_xact_replay_timestamp() as last_replay_time,
            now() - pg_last_xact_replay_timestamp() as replication_lag
        ;
EOSQL
    
    # Calculate lag in bytes
    echo ""
    echo "📏 Replication Lag (bytes):"
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
        SELECT 
            pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) as lag_bytes,
            CASE 
                WHEN pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) > 10485760 THEN '⚠️  WARNING: Lag > 10MB'
                WHEN pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) > 1048576 THEN '⚡ CAUTION: Lag > 1MB'
                ELSE '✅ OK'
            END as status
        ;
EOSQL

else
    echo "📍 Server Role: MASTER (Primary)"
    echo ""
    
    # Check replication slots
    echo "🔌 Replication Slots:"
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -x <<-EOSQL
        SELECT 
            slot_name,
            slot_type,
            active,
            restart_lsn,
            confirmed_flush_lsn
        FROM pg_replication_slots
        ORDER BY slot_name;
EOSQL
    
    echo ""
    echo "📡 Active Replication Connections:"
    
    # Check if there are active replicas
    ACTIVE_REPLICAS=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM pg_stat_replication;" | xargs)
    
    if [ "$ACTIVE_REPLICAS" -gt 0 ]; then
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -x <<-EOSQL
            SELECT 
                client_addr,
                client_hostname,
                application_name,
                state,
                sync_state,
                sent_lsn,
                write_lsn,
                flush_lsn,
                replay_lsn,
                pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes,
                write_lag,
                flush_lag,
                replay_lag
            FROM pg_stat_replication
            ORDER BY application_name;
EOSQL
        echo -e "${GREEN}✅ $ACTIVE_REPLICAS active replica(s) connected${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING: No active replicas connected!${NC}"
    fi
fi

echo ""
echo "📊 Database Connection Stats:"
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid();
EOSQL

echo ""
echo "💾 Database Size:"
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<-EOSQL
    SELECT 
        pg_database.datname as database_name,
        pg_size_pretty(pg_database_size(pg_database.datname)) as size
    FROM pg_database
    WHERE pg_database.datname = current_database();
EOSQL

echo ""
echo "========================================"
echo "✅ Health check completed!"
