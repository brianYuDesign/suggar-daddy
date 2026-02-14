#!/bin/bash
# Custom entrypoint wrapper for PostgreSQL Replica
# This script handles replica initialization before starting PostgreSQL

set -e

# Configuration
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
MASTER_HOST="${POSTGRES_MASTER_HOST:-postgres-master}"
MASTER_PORT="${POSTGRES_MASTER_PORT:-5432}"
REPLICATION_USER="replicator"
REPLICATION_PASSWORD="${REPLICATION_PASSWORD:-replicator_password}"

# Check if this is the first run (no standby.signal)
if [ ! -f "$PGDATA/standby.signal" ] && [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "🚀 First run detected - initializing replica..."
    
    # Wait for master to be ready
    echo "⏳ Waiting for master database to be ready..."
    until PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$MASTER_HOST" -p "$MASTER_PORT" -U "${POSTGRES_USER:-postgres}" -c '\q' 2>/dev/null; do
      echo "   Master not ready yet, waiting..."
      sleep 5
    done
    echo "✅ Master database is ready!"
    
    # Perform base backup from master
    echo "📦 Performing base backup from master..."
    PGPASSWORD="${REPLICATION_PASSWORD}" pg_basebackup \
        -h "$MASTER_HOST" \
        -p "$MASTER_PORT" \
        -U "$REPLICATION_USER" \
        -D "$PGDATA" \
        -Fp \
        -Xs \
        -P \
        -R \
        -v \
        --slot=replica_slot_1
    
    # Create standby.signal file (PostgreSQL 12+)
    echo "📝 Creating standby.signal file..."
    touch "$PGDATA/standby.signal"
    
    # Configure primary connection info
    echo "🔧 Configuring primary connection info..."
    cat >> "$PGDATA/postgresql.auto.conf" <<EOF
primary_conninfo = 'host=$MASTER_HOST port=$MASTER_PORT user=$REPLICATION_USER password=$REPLICATION_PASSWORD application_name=replica1'
primary_slot_name = 'replica_slot_1'
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_timeline = 'latest'
EOF
    
    # Set proper permissions
    echo "🔒 Setting permissions..."
    chmod 0700 "$PGDATA"
    chown -R postgres:postgres "$PGDATA"
    
    echo "✅ Replica initialization completed!"
    echo "📝 Replication configured from: $MASTER_HOST:$MASTER_PORT"
fi

# Start PostgreSQL with the original entrypoint
echo "🚀 Starting PostgreSQL replica..."
exec docker-entrypoint.sh "$@"
