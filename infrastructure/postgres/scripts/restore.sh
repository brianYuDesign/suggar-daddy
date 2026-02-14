#!/bin/bash
# PostgreSQL Backup Restoration Script
# This script restores a database from a backup file

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres-master}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-suggar_daddy}"

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================"
echo "📦 PostgreSQL Restore Script"
echo "======================================"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}📋 Available backups:${NC}"
    echo ""
    ls -lht "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -10 || echo "No backups found"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 /backups/backup_suggar_daddy_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Validate backup file
if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}❌ Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo "Backup file: ${BACKUP_FILE}"
echo "Target database: ${POSTGRES_DB}"
echo "Target host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo ""

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is accessible${NC}"
echo ""

# Warning confirmation
echo -e "${RED}⚠️  WARNING: This will REPLACE all data in database '${POSTGRES_DB}'${NC}"
echo -e "${YELLOW}Press Ctrl+C to cancel, or wait 5 seconds to continue...${NC}"
sleep 5

# Terminate active connections
echo ""
echo "🔌 Terminating active connections..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres <<EOSQL
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '${POSTGRES_DB}'
  AND pid <> pg_backend_pid();
EOSQL

# Drop and recreate database
echo "🗑️  Dropping existing database..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"

echo "🆕 Creating new database..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"

# Restore backup
echo ""
echo "📦 Restoring backup..."
if gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Restore completed successfully${NC}"
else
    echo -e "${RED}❌ Restore failed${NC}"
    exit 1
fi

# Verify restoration
echo ""
echo "🔍 Verifying restoration..."
TABLE_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

echo "Tables restored: ${TABLE_COUNT}"

if [ "${TABLE_COUNT}" -gt 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
    
    # Display table list
    echo ""
    echo "📊 Restored tables:"
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "\dt"
else
    echo -e "${YELLOW}⚠️  Warning: No tables found in restored database${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ Restore process completed!${NC}"
echo "======================================"

exit 0
