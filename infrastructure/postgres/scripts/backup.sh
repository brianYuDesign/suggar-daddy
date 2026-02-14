#!/bin/bash
# PostgreSQL Automated Backup Script
# This script performs daily backups with retention management

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres-master}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-suggar_daddy}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# ANSI colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "🗄️  PostgreSQL Backup Script"
echo "======================================"
echo "Database: ${POSTGRES_DB}"
echo "Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "Backup Directory: ${BACKUP_DIR}"
echo "Retention: ${RETENTION_DAYS} days"
echo "======================================"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is accessible${NC}"
echo ""

# Perform backup
echo "💾 Starting backup..."
echo "File: ${BACKUP_FILE}"

# Use pg_dump with compression
if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --verbose \
    --format=plain \
    --no-owner \
    --no-acl \
    2>&1 | gzip > "${BACKUP_FILE}"; then
    
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}✅ Backup completed successfully${NC}"
    echo "Size: ${BACKUP_SIZE}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    rm -f "${BACKUP_FILE}"
    exit 1
fi
echo ""

# Create backup metadata
METADATA_FILE="${BACKUP_FILE}.meta"
cat > "${METADATA_FILE}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "database": "${POSTGRES_DB}",
  "host": "${POSTGRES_HOST}",
  "size": "${BACKUP_SIZE}",
  "retention_days": ${RETENTION_DAYS},
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# List current backups
echo "📋 Current backups:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null || echo "No backups found"
echo ""

# Clean up old backups
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=0
while IFS= read -r old_backup; do
    if [ -f "${old_backup}" ]; then
        echo "Deleting: $(basename "${old_backup}")"
        rm -f "${old_backup}"
        rm -f "${old_backup}.meta"
        ((DELETED_COUNT++))
    fi
done < <(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS})

if [ ${DELETED_COUNT} -gt 0 ]; then
    echo -e "${YELLOW}🗑️  Deleted ${DELETED_COUNT} old backup(s)${NC}"
else
    echo -e "${GREEN}✅ No old backups to delete${NC}"
fi
echo ""

# Display backup statistics
echo "📊 Backup Statistics:"
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "Total backups: ${TOTAL_BACKUPS}"
echo "Total size: ${TOTAL_SIZE}"
echo ""

echo "======================================"
echo -e "${GREEN}✅ Backup process completed!${NC}"
echo "======================================"

# Optional: Upload to cloud storage (S3, GCS, etc.)
# if [ -n "${S3_BUCKET}" ]; then
#     echo "☁️  Uploading to S3..."
#     aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/"
#     aws s3 cp "${METADATA_FILE}" "s3://${S3_BUCKET}/backups/"
# fi

exit 0
