# 📊 數據庫備份策略文檔

## 🎯 備份目標

| 指標 | 目標 | 達成方法 |
|------|------|---------|
| **RPO** (Recover Point Objective) | 1 小時 | 每小時增量備份 |
| **RTO** (Recover Time Objective) | 15 分鐘 | 熱備份 + 主從複製 |
| **備份保留期** | 30 天 | S3 生命週期策略 |
| **備份驗證** | 每周 | 自動恢復測試 |

---

## 📋 備份策略

### 1. 全量備份 (Weekly - 每周日 2:00 AM)

```bash
# 觸發時間: 每周日 02:00 UTC
# 保留期: 90 天
# 存儲位置: S3://sugar-daddy-prod-backups/full/

pg_dump -h localhost \
        -U postgres \
        -d sugar_daddy_prod \
        -F c \
        -v \
        -f backup_full_$(date +%Y%m%d).dump
```

**特點**:
- 完整數據庫快照
- 支持並行備份 (加快速度)
- 包含 schema + data + indexes

### 2. 增量備份 (Hourly - 每小時)

```bash
# 觸發時間: 每天 00:00 至 23:59，每小時
# 保留期: 30 天
# 存儲位置: S3://sugar-daddy-prod-backups/incremental/

pg_basebackup -h localhost \
              -U replicator \
              -D ./backup_incremental_$(date +%Y%m%d_%H%M%S) \
              -P \
              -v
```

**特點**:
- 增量數據變更
- WAL (Write-Ahead Logs) 存檔
- 快速恢復到任意時間點

### 3. 實時複製 (Streaming Replication)

```yaml
# PostgreSQL 主從配置
Primary:
  - 啟用 WAL 存檔
  - 配置 hot_standby_feedback
  
Standby:
  - 流式複製 (streaming replication)
  - 同步複製 (synchronous replication)
  - 自動故障轉移
```

**特點**:
- RPO: 0 秒 (同步複製)
- RTO: <1 分鐘 (自動轉移)
- 可讀副本用於查詢

---

## 🛡️ 備份驗證流程

### 日檢查 (Daily)

```bash
#!/bin/bash
# 檢查項:
# 1. 備份文件是否存在
# 2. 備份文件大小是否合理
# 3. 備份是否最近完成

# 檢查最新備份
backup_file=$(ls -t /backups/postgresql/*.dump | head -1)
backup_time=$(stat -f %m "$backup_file" | xargs date -r)
current_time=$(date +%s)
diff=$((current_time - backup_time))

if [ $diff -gt 3600 ]; then
    echo "ALERT: Backup older than 1 hour!"
    # 觸發告警
fi
```

### 周驗證 (Weekly)

```bash
#!/bin/bash
# 恢復測試 (在測試環境)

# 1. 從備份恢復到測試數據庫
pg_restore -h test-db.internal \
           -U postgres \
           -d test_restore \
           -v \
           backup_full_20260219.dump

# 2. 驗證數據完整性
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM content;
SELECT COUNT(*) FROM recommendations;

# 3. 驗證索引和約束
REINDEX DATABASE test_restore;

# 4. 清理測試數據庫
DROP DATABASE test_restore;
```

### 月檢查 (Monthly)

```bash
#!/bin/bash
# 完整的故障恢復演習

# 1. 在隔離環境中恢復備份
# 2. 運行完整的數據驗證
# 3. 性能測試 (查詢速度)
# 4. 應用功能測試
# 5. 文檔失效演習
# 6. 驗證備份文檔完整性
```

---

## 🚀 自動備份設置

### 使用 pg_basebackup

```bash
#!/bin/bash
# 文件: /usr/local/bin/backup-postgres.sh

set -e

BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=30
S3_BUCKET="sugar-daddy-prod-backups"
LOG_FILE="/var/log/postgres-backup.log"

echo "[$(date)] Starting PostgreSQL backup..." | tee -a $LOG_FILE

# 1. 執行備份
pg_dump -h postgres.prod.internal \
        -U prod_user \
        -d sugar_daddy_prod \
        -F c \
        -v \
        -f "${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).dump" 2>&1 | tee -a $LOG_FILE

# 2. 壓縮備份
gzip "${BACKUP_DIR}/backup_"*.dump

# 3. 上傳到 S3
aws s3 sync "${BACKUP_DIR}/" "s3://${S3_BUCKET}/postgres/" \
    --region us-east-1 \
    --sse AES256 \
    --storage-class STANDARD_IA

# 4. 清理本地備份 (保留 7 天)
find "${BACKUP_DIR}" -name "backup_*.dump.gz" -mtime +7 -delete

# 5. 記錄備份完成
echo "[$(date)] Backup completed successfully" | tee -a $LOG_FILE
```

### Cron 配置

```cron
# 全量備份: 每周日 02:00 AM
0 2 * * 0 /usr/local/bin/backup-postgres.sh >> /var/log/postgres-backup.log 2>&1

# 增量備份: 每天 03:00 AM
0 3 * * * /usr/local/bin/backup-postgres-incremental.sh >> /var/log/postgres-backup.log 2>&1

# 備份驗證: 每周一 04:00 AM
0 4 * * 1 /usr/local/bin/verify-backup.sh >> /var/log/postgres-backup.log 2>&1

# S3 生命週期同步: 每天 05:00 AM
0 5 * * * /usr/local/bin/sync-s3-lifecycle.sh >> /var/log/postgres-backup.log 2>&1
```

---

## 📦 S3 生命週期策略

```json
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Filter": { "Prefix": "postgres/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

**效果**:
- 0-30 天: STANDARD ($0.023/GB) - 快速訪問
- 30-90 天: STANDARD_IA ($0.0125/GB) - 成本優化
- 90-365 天: GLACIER ($0.004/GB) - 長期存檔

---

## 🔐 加密和安全

### 傳輸層安全
- ✅ S3 SSL/TLS (HTTPS)
- ✅ 備份文件加密 (Server-Side Encryption with S3-Managed Keys)
- ✅ 足夠強度的密碼和密鑰

### 數據加密
```bash
# 使用 KMS 加密備份
aws s3 cp backup.dump.gz \
    s3://sugar-daddy-prod-backups/ \
    --sse aws:kms \
    --sse-kms-key-id arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
```

### 訪問控制
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/backup-role"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::sugar-daddy-prod-backups/*"
    }
  ]
}
```

---

## 📊 備份狀態監控

### CloudWatch 指標

```yaml
Metrics:
  - BackupDurationMinutes (每日備份時間)
  - BackupSizeGB (備份文件大小)
  - BackupSuccessRate (備份成功率)
  - BackupLatencyHours (備份延遲)
  - S3SyncDuration (S3 同步時間)

Alarms:
  - BackupMissed (24小時未備份)
  - BackupTooLarge (超過 100GB)
  - BackupTooOld (超過 25 小時)
  - S3SyncFailed (S3 同步失敗)
```

### Grafana Dashboard

```sql
-- 備份大小趨勢
SELECT 
    time_bucket('1 day', timestamp) as date,
    AVG(backup_size_gb) as avg_size
FROM backup_metrics
GROUP BY date
ORDER BY date;

-- 備份成功率
SELECT
    time_bucket('1 week', timestamp) as week,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*) * 100 as success_rate
FROM backup_metrics
GROUP BY week;
```

---

## 🚨 故障恢復流程

### 步驟 1: 評估損害 (5 分鐘)

```bash
# 檢查主數據庫狀態
pg_isready -h postgres.prod.internal

# 檢查複製狀態
psql -h postgres.prod.internal -U postgres -c \
  "SELECT usename, application_name, state FROM pg_stat_replication;"
```

### 步驟 2: 選擇恢復點 (5 分鐘)

```bash
# 列出可用的備份
aws s3 ls s3://sugar-daddy-prod-backups/postgres/ --recursive

# 選擇最近的有效備份
backup_time="2026-02-19T02:00:00Z"
```

### 步驟 3: 恢復數據庫 (10 分鐘)

```bash
#!/bin/bash
# 在恢復環境中執行

# 1. 停止應用連接
# 2. 創建新數據庫
createdb -h postgres.prod.internal -U postgres restore_db

# 3. 從備份恢復
aws s3 cp s3://sugar-daddy-prod-backups/postgres/backup_20260219_020000.dump - | \
  pg_restore -h postgres.prod.internal \
             -U postgres \
             -d restore_db \
             -v

# 4. 驗證恢復
psql -h postgres.prod.internal -U postgres -d restore_db -c "SELECT COUNT(*) FROM users;"

# 5. 重新配置應用 (切換連接字符串)
# 6. 驗證應用功能
```

### 步驟 4: 驗證和切換 (5 分鐘)

```bash
# 完整數據驗證
./scripts/validate-database.sh restore_db

# 如果驗證成功，重命名數據庫
ALTER DATABASE sugar_daddy_prod RENAME TO sugar_daddy_prod_old;
ALTER DATABASE restore_db RENAME TO sugar_daddy_prod;

# 啟用應用連接
systemctl restart sugar-daddy-api
```

---

## 📋 備份檢查清單

### 部署前檢查

- [ ] PostgreSQL WAL 存檔已配置
- [ ] 主從複製已配置並驗證
- [ ] S3 bucket 已創建並配置 KMS 加密
- [ ] IAM 角色和權限已配置
- [ ] Cron 任務已配置
- [ ] CloudWatch 告警已配置
- [ ] 備份驗證腳本已測試
- [ ] 故障恢復流程已演習

### 日常檢查

- [ ] 每日備份完成
- [ ] 備份大小正常
- [ ] 無錯誤日誌
- [ ] S3 同步成功

### 周檢查

- [ ] 恢復測試成功
- [ ] 備份驗證通過
- [ ] 複製延遲 < 1 秒
- [ ] 沒有遺失的備份

---

## 📞 聯絡和支持

**備份管理員**: DevOps Team  
**緊急聯絡**: +1-800-XXX-XXXX  
**備份狀態頁**: https://monitoring.sugar-daddy.com/backup
