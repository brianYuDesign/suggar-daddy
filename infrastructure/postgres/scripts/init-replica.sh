#!/bin/bash
set -e

# PostgreSQL Replica Initialization Script
# This script sets up the replica database for streaming replication

echo "🚀 Starting PostgreSQL Replica initialization..."

# Configuration variables
MASTER_HOST="${POSTGRES_MASTER_HOST:-postgres-master}"
MASTER_PORT="${POSTGRES_MASTER_PORT:-5432}"
MASTER_USER="${POSTGRES_USER:-postgres}"
REPLICATION_USER="replicator"
REPLICATION_PASSWORD="${REPLICATION_PASSWORD:-replicator_password}"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"

# Check if already initialized
if [ -f "$PGDATA/standby.signal" ]; then
    echo "✅ Replica already initialized, skipping setup..."
    exit 0
fi

# Wait for master to be ready
echo "⏳ Waiting for master database to be ready..."
until PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$MASTER_HOST" -p "$MASTER_PORT" -U "$MASTER_USER" -c '\q' 2>/dev/null; do
  echo "   Master not ready yet, waiting..."
  sleep 5
done
echo "✅ Master database is ready!"

# Stop PostgreSQL if running
if pg_ctl status -D "$PGDATA" > /dev/null 2>&1; then
    echo "🛑 Stopping PostgreSQL..."
    pg_ctl stop -D "$PGDATA" -m fast || true
fi

# Clean up data directory (except for mounted config files)
echo "🧹 Cleaning data directory..."
rm -rf "${PGDATA}"/*

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

echo "✅ PostgreSQL Replica initialization completed!"
echo "📝 Replication configured from: $MASTER_HOST:$MASTER_PORT"
echo "📝 Using replication slot: replica_slot_1"
echo ""
echo "ℹ️  Docker will start the replica server automatically..."
