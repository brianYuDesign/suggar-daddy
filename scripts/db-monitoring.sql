-- PostgreSQL Performance Monitoring Views
-- Database: suggar_daddy

-- ==================== Database Size and Table Statistics ====================

-- View: Database and table sizes
CREATE OR REPLACE VIEW v_database_size AS
SELECT 
    pg_database.datname AS database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();

CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname AS schema_name,
    tablename AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size,
    pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==================== Query Performance ====================

-- View: Slow queries (requires pg_stat_statements extension)
-- Enable: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round(max_exec_time::numeric, 2) AS max_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage_cpu
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 20;

-- View: Most frequent queries
CREATE OR REPLACE VIEW v_frequent_queries AS
SELECT 
    query,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round((100 * calls / sum(calls) OVER ())::numeric, 2) AS percentage_calls
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;

-- ==================== Index Usage ====================

-- View: Index usage statistics
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname AS schema_name,
    tablename AS table_name,
    indexname AS index_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END AS usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- View: Missing indexes (tables with sequential scans)
CREATE OR REPLACE VIEW v_missing_indexes AS
SELECT 
    schemaname AS schema_name,
    tablename AS table_name,
    seq_scan AS sequential_scans,
    seq_tup_read AS rows_read_sequentially,
    idx_scan AS index_scans,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size,
    CASE 
        WHEN seq_scan > 0 AND idx_scan = 0 AND n_live_tup > 1000 THEN 'CRITICAL - No indexes used'
        WHEN seq_scan > idx_scan AND n_live_tup > 10000 THEN 'HIGH - More seq scans than index scans'
        WHEN seq_scan > 100 AND n_live_tup > 1000 THEN 'MEDIUM - High sequential scans'
        ELSE 'OK'
    END AS priority
FROM pg_stat_user_tables
WHERE n_live_tup > 100
ORDER BY seq_scan DESC, n_live_tup DESC;

-- ==================== Connection and Activity ====================

-- View: Current connections
CREATE OR REPLACE VIEW v_connections AS
SELECT 
    datname AS database_name,
    usename AS username,
    application_name,
    client_addr AS client_address,
    state,
    COUNT(*) AS connection_count
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;

-- View: Long running queries
CREATE OR REPLACE VIEW v_long_running_queries AS
SELECT 
    pid,
    usename AS username,
    datname AS database_name,
    client_addr AS client_address,
    application_name,
    state,
    query,
    query_start,
    now() - query_start AS query_duration,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE state = 'active' 
  AND query_start < now() - interval '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

-- View: Blocked queries
CREATE OR REPLACE VIEW v_blocked_queries AS
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ==================== Cache Hit Ratios ====================

-- View: Cache hit ratio
CREATE OR REPLACE VIEW v_cache_hit_ratio AS
SELECT 
    'index hit rate' AS metric,
    round((sum(idx_blks_hit)) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100, 2) AS ratio
FROM pg_statio_user_indexes
UNION ALL
SELECT 
    'table hit rate' AS metric,
    round((sum(heap_blks_hit)) / nullif(sum(heap_blks_hit + heap_blks_read), 0) * 100, 2) AS ratio
FROM pg_statio_user_tables;

-- ==================== Vacuum and Autovacuum ====================

-- View: Tables needing vacuum
CREATE OR REPLACE VIEW v_vacuum_stats AS
SELECT 
    schemaname AS schema_name,
    tablename AS table_name,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    round((n_dead_tup::float / nullif(n_live_tup, 0)) * 100, 2) AS dead_row_percentage,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    CASE 
        WHEN n_dead_tup > n_live_tup * 0.2 THEN 'CRITICAL - Vacuum needed'
        WHEN n_dead_tup > n_live_tup * 0.1 THEN 'WARNING - High dead rows'
        ELSE 'OK'
    END AS status
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY dead_row_percentage DESC NULLS LAST;

-- ==================== Replication (if applicable) ====================

-- View: Replication lag
CREATE OR REPLACE VIEW v_replication_lag AS
SELECT 
    client_addr AS replica_address,
    application_name,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS send_lag_bytes,
    pg_wal_lsn_diff(sent_lsn, write_lsn) AS write_lag_bytes,
    pg_wal_lsn_diff(write_lsn, flush_lsn) AS flush_lag_bytes,
    pg_wal_lsn_diff(flush_lsn, replay_lsn) AS replay_lag_bytes,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;

-- ==================== Useful Queries ====================

-- Get overall database health
COMMENT ON VIEW v_database_size IS 'Shows database size';
COMMENT ON VIEW v_table_sizes IS 'Shows table, index, and total sizes for all tables';
COMMENT ON VIEW v_slow_queries IS 'Shows slowest queries (requires pg_stat_statements)';
COMMENT ON VIEW v_frequent_queries IS 'Shows most frequently executed queries';
COMMENT ON VIEW v_index_usage IS 'Shows index usage statistics';
COMMENT ON VIEW v_missing_indexes IS 'Suggests tables that might need indexes';
COMMENT ON VIEW v_connections IS 'Shows current database connections';
COMMENT ON VIEW v_long_running_queries IS 'Shows queries running for more than 5 minutes';
COMMENT ON VIEW v_blocked_queries IS 'Shows blocked queries and their blockers';
COMMENT ON VIEW v_cache_hit_ratio IS 'Shows cache hit ratios (should be > 95%)';
COMMENT ON VIEW v_vacuum_stats IS 'Shows tables needing vacuum/analyze';
COMMENT ON VIEW v_replication_lag IS 'Shows replication lag (if replication is configured)';

-- Example queries to use these views:
-- SELECT * FROM v_database_size;
-- SELECT * FROM v_table_sizes LIMIT 10;
-- SELECT * FROM v_slow_queries;
-- SELECT * FROM v_missing_indexes WHERE priority LIKE '%CRITICAL%';
-- SELECT * FROM v_cache_hit_ratio;
-- SELECT * FROM v_vacuum_stats WHERE status != 'OK';
