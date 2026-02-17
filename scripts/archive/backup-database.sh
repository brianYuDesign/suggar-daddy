#!/bin/bash
# Database Backup Script for Suggar Daddy Platform
# Author: DevOps Team
# Description: Automated backup for PostgreSQL and Redis

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_DIR=$(date +%Y%m%d)
RETENTION_DAYS=${RETENTION_DAYS:-7}
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-suggar-daddy-postgres}"
REDIS_CONTAINER="${REDIS_CONTAINER:-suggar-daddy-redis}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-suggar_daddy}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Create backup directories
mkdir -p "$BACKUP_DIR/$DATE_DIR/postgres"
mkdir -p "$BACKUP_DIR/$DATE_DIR/redis"

# Check if containers are running
if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
    log_error "PostgreSQL container is not running"
    exit 1
fi

if ! docker ps | grep -q "$REDIS_CONTAINER"; then
    log_error "Redis container is not running"
    exit 1
fi

log_info "Starting backup process..."

# ==================== PostgreSQL Backup ====================
log_info "Backing up PostgreSQL database..."

# Full database backup
POSTGRES_BACKUP="$BACKUP_DIR/$DATE_DIR/postgres/${POSTGRES_DB}_full_${TIMESTAMP}.sql"
if docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$POSTGRES_BACKUP"; then
    log_info "PostgreSQL full backup completed: $POSTGRES_BACKUP"
    
    # Compress backup
    gzip "$POSTGRES_BACKUP"
    log_info "Backup compressed: ${POSTGRES_BACKUP}.gz"
else
    log_error "PostgreSQL backup failed"
    exit 1
fi

# Schema-only backup
POSTGRES_SCHEMA="$BACKUP_DIR/$DATE_DIR/postgres/${POSTGRES_DB}_schema_${TIMESTAMP}.sql"
if docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" --schema-only "$POSTGRES_DB" > "$POSTGRES_SCHEMA"; then
    log_info "PostgreSQL schema backup completed: $POSTGRES_SCHEMA"
    gzip "$POSTGRES_SCHEMA"
else
    log_warn "PostgreSQL schema backup failed"
fi

# Backup database statistics
POSTGRES_STATS="$BACKUP_DIR/$DATE_DIR/postgres/${POSTGRES_DB}_stats_${TIMESTAMP}.txt"
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" > "$POSTGRES_STATS"
log_info "Database statistics saved: $POSTGRES_STATS"

# ==================== Redis Backup ====================
log_info "Backing up Redis data..."

# Trigger Redis save
if docker exec "$REDIS_CONTAINER" redis-cli BGSAVE; then
    log_info "Redis BGSAVE triggered"
    
    # Wait for save to complete
    sleep 2
    
    # Check if save is still in progress
    while docker exec "$REDIS_CONTAINER" redis-cli LASTSAVE | grep -q "still"; do
        log_info "Waiting for Redis save to complete..."
        sleep 1
    done
    
    # Copy RDB file
    REDIS_BACKUP="$BACKUP_DIR/$DATE_DIR/redis/dump_${TIMESTAMP}.rdb"
    if docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$REDIS_BACKUP"; then
        log_info "Redis backup completed: $REDIS_BACKUP"
        gzip "$REDIS_BACKUP"
        log_info "Redis backup compressed: ${REDIS_BACKUP}.gz"
    else
        log_error "Failed to copy Redis backup"
    fi
else
    log_error "Redis backup failed"
fi

# Backup Redis configuration
REDIS_CONFIG="$BACKUP_DIR/$DATE_DIR/redis/redis_config_${TIMESTAMP}.txt"
docker exec "$REDIS_CONTAINER" redis-cli CONFIG GET "*" > "$REDIS_CONFIG"
log_info "Redis configuration saved: $REDIS_CONFIG"

# ==================== Backup Metadata ====================
BACKUP_METADATA="$BACKUP_DIR/$DATE_DIR/backup_metadata.json"
cat > "$BACKUP_METADATA" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_date": "$DATE_DIR",
  "backup_time": "$TIMESTAMP",
  "postgres_container": "$POSTGRES_CONTAINER",
  "redis_container": "$REDIS_CONTAINER",
  "postgres_database": "$POSTGRES_DB",
  "environment": "${NODE_ENV:-development}",
  "backup_size": {
    "postgres": "$(du -sh "$BACKUP_DIR/$DATE_DIR/postgres" | cut -f1)",
    "redis": "$(du -sh "$BACKUP_DIR/$DATE_DIR/redis" | cut -f1)"
  },
  "status": "completed"
}
EOF
log_info "Backup metadata saved: $BACKUP_METADATA"

# ==================== Cleanup Old Backups ====================
log_info "Cleaning up backups older than $RETENTION_DAYS days..."

find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
DELETED_COUNT=$(find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    log_info "Deleted $DELETED_COUNT old backup directories"
else
    log_info "No old backups to clean up"
fi

# ==================== Backup Summary ====================
log_info "==================== Backup Summary ===================="
log_info "Backup location: $BACKUP_DIR/$DATE_DIR"
log_info "Total backup size: $(du -sh "$BACKUP_DIR/$DATE_DIR" | cut -f1)"
log_info "PostgreSQL backup: $(ls -lh "$BACKUP_DIR/$DATE_DIR/postgres/"*.gz | tail -1 | awk '{print $5}')"
log_info "Redis backup: $(ls -lh "$BACKUP_DIR/$DATE_DIR/redis/"*.gz 2>/dev/null | tail -1 | awk '{print $5}' || echo 'N/A')"
log_info "========================================================"

log_info "Backup process completed successfully!"

exit 0
