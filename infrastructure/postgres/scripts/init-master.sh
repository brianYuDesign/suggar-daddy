#!/bin/bash
set -e

# PostgreSQL Master Initialization Script
# This script sets up the master database for streaming replication

echo "🚀 Starting PostgreSQL Master initialization..."

# Wait for PostgreSQL to be ready
until pg_isready -U "${POSTGRES_USER:-postgres}"; do
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Create replication user if it doesn't exist
echo "👤 Creating replication user..."
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
            CREATE ROLE replicator WITH REPLICATION PASSWORD '${REPLICATION_PASSWORD:-replicator_password}' LOGIN;
            RAISE NOTICE 'Replication user created';
        ELSE
            RAISE NOTICE 'Replication user already exists';
        END IF;
    END
    \$\$;
EOSQL

# Create replication slot
echo "🔌 Creating replication slot..."
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" <<-EOSQL
    SELECT * FROM pg_create_physical_replication_slot('replica_slot_1');
EOSQL

# Grant necessary permissions
echo "🔑 Granting permissions..."
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" <<-EOSQL
    GRANT CONNECT ON DATABASE ${POSTGRES_DB:-postgres} TO replicator;
    ALTER ROLE replicator WITH REPLICATION;
EOSQL

# Display replication status
echo "📊 Current replication status:"
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" <<-EOSQL
    SELECT slot_name, slot_type, active FROM pg_replication_slots;
    SELECT client_addr, state, sync_state FROM pg_stat_replication;
EOSQL

echo "✅ PostgreSQL Master initialization completed!"
echo "📝 Replication user: replicator"
echo "📝 Replication slot: replica_slot_1"
echo ""
echo "🔐 Remember to set REPLICATION_PASSWORD in your environment!"
