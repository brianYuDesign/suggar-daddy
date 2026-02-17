# PostgreSQL 資料庫備份與災難恢復系統

這個目錄包含完整的 PostgreSQL 資料庫備份和災難恢復腳本，專為 Suggar Daddy 平台的 Master-Replica 架構設計。

## 腳本概覽

| 腳本 | 功能 | 說明 |
|------|------|------|
| `backup-database.sh` | 資料庫備份 | 執行備份、壓縮、上傳 S3、清理舊備份 |
| `restore-database.sh` | 資料庫恢復 | 從 S3/本地恢復、驗證數據、安全確認 |
| `setup-backup-cron.sh` | 自動化設定 | 設定 cron 任務、管理備份排程 |

## 快速開始

### 1. 設定環境變數

在 `.env.production` 或 `.env` 中配置：

```bash
# 資料庫配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=suggar_daddy
POSTGRES_CONTAINER=suggar-daddy-postgres-master

# 備份配置
BACKUP_DIR=/mnt/backups
RETENTION_DAYS=30
BACKUP_TO_S3=true
BACKUP_S3_BUCKET=suggar-daddy-backups-prod

# AWS 配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# 通知配置 (可選)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
```

### 2. 安裝自動備份

```bash
# 安裝每日 02:00 自動備份
./scripts/backup/setup-backup-cron.sh

# 安裝每週日完整備份，其他日子標準備份
./scripts/backup/setup-backup-cron.sh --strategy weekly-full --full-day 0

# 自定義排程 (每日 03:00)
./scripts/backup/setup-backup-cron.sh -s "0 3 * * *"
```

### 3. 手動執行備份

```bash
# 標準備份
./scripts/backup/backup-database.sh

# 完整備份 (pg_dumpall)
./scripts/backup/backup-database.sh --full

# 測試模式 (不實際執行)
./scripts/backup/backup-database.sh --dry-run

# 詳細輸出
./scripts/backup/backup-database.sh --verbose
```

### 4. 恢復資料庫

```bash
# 列出可用的 S3 備份
./scripts/backup/restore-database.sh --list

# 從 S3 恢復指定備份
./scripts/backup/restore-database.sh -s "backups/postgres/2024/01/15/postgres_suggar_daddy_20240115_020000.sql.gz"

# 恢復指定日期的最新備份
./scripts/backup/restore-database.sh -d 20240115

# 從本地檔案恢復
./scripts/backup/restore-database.sh -f /path/to/backup.sql.gz

# 恢復到不同資料庫名稱
./scripts/backup/restore-database.sh -d 20240115 -t suggar_daddy_restore

# 測試恢復流程 (不實際修改數據)
./scripts/backup/restore-database.sh --dry-run -f backup.sql.gz
```

## 詳細說明

### backup-database.sh

#### 功能特性

- **自動檢測**: 自動檢測 PostgreSQL 容器和連接狀態
- **壓縮優化**: 使用 gzip -9 最大壓縮率
- **S3 上傳**: 自動上傳到 S3，支持 STANDARD_IA 存儲類別
- **自動清理**: 自動刪除超過保留期的本地和 S3 備份
- **通知系統**: 支持 Slack、Discord、Email 通知
- **完整性驗證**: 備份後自動驗證檔案完整性
- **元數據收集**: 收集資料庫統計信息和備份元數據

#### 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `POSTGRES_HOST` | localhost | PostgreSQL 主機 |
| `POSTGRES_PORT` | 5432 | PostgreSQL 端口 |
| `POSTGRES_USER` | postgres | 資料庫用戶 |
| `POSTGRES_PASSWORD` | - | 資料庫密碼 |
| `POSTGRES_DB` | suggar_daddy | 資料庫名稱 |
| `BACKUP_DIR` | ./backups | 本地備份目錄 |
| `RETENTION_DAYS` | 30 | 備份保留天數 |
| `BACKUP_TO_S3` | true | 是否上傳到 S3 |
| `BACKUP_S3_BUCKET` | - | S3 Bucket 名稱 |
| `S3_STORAGE_CLASS` | STANDARD_IA | S3 存儲類別 |
| `SLACK_WEBHOOK_URL` | - | Slack Webhook URL |
| `DISCORD_WEBHOOK_URL` | - | Discord Webhook URL |

### restore-database.sh

#### 功能特性

- **安全確認**: 多次確認機制，防止誤操作
- **多種來源**: 支持 S3、本地檔案、日期選擇
- **自動下載**: 自動從 S3 下載備份
- **完整性驗證**: 恢復前後自動驗證
- **數據驗證**: 恢復後執行測試查詢驗證
- **詳細報告**: 生成 JSON 格式的恢復報告

#### 安全機制

1. **雙重確認**: 必須輸入資料庫名稱確認
2. **干跑模式**: 支持 `--dry-run` 測試
3. **連接終止**: 自動終止現有資料庫連接
4. **驗證檢查**: 恢復後驗證表數量和數據庫大小

### setup-backup-cron.sh

#### 功能特性

- **簡單安裝**: 一鍵安裝 cron 任務
- **多種策略**: 支持 daily、weekly-full、incremental 策略
- **狀態查看**: 隨時查看備份系統狀態
- **測試功能**: 內建測試模式驗證配置

#### 備份策略

| 策略 | 說明 |
|------|------|
| `daily` | 每日執行標準備份 |
| `weekly-full` | 指定日期完整備份，其他日子標準備份 |
| `incremental` | 增量備份 (需要 WAL 歸檔配置) |

## 目錄結構

```
backups/
├── 20240115/
│   ├── postgres_suggar_daddy_20240115_020000.sql.gz
│   ├── backup_metadata_20240115_020000.json
│   └── ...
└── ...

logs/backup/
├── backup-20240115.log
├── restore-report-20240115-143022.json
└── cron-backup.log

restore/
└── (臨時恢復檔案)
```

## S3 存儲結構

```
s3://your-backup-bucket/
└── backups/
    └── postgres/
        ├── 2024/
        │   ├── 01/
        │   │   ├── 15/
        │   │   │   ├── postgres_suggar_daddy_20240115_020000.sql.gz
        │   │   │   └── backup_metadata_20240115_020000.json
        │   │   └── ...
        │   └── ...
        └── ...
```

## 監控與告警

### 日誌檔案

- 備份日誌: `logs/backup/backup-YYYYMMDD.log`
- 恢復日誌: `logs/backup/restore-YYYYMMDD.log`
- Cron 日誌: `logs/backup/cron-backup.log`

### 通知事件

- ✅ 備份成功 (可配置)
- ❌ 備份失敗 (預設開啟)

### 檢查備份狀態

```bash
# 查看最近備份
ls -lt backups/ | head -10

# 查看備份日誌
tail -f logs/backup/cron-backup.log

# 查看 cron 任務
crontab -l

# 使用腳本查看狀態
./scripts/backup/setup-backup-cron.sh status
```

## 災難恢復演練

### 定期測試恢復

建議每月執行一次恢復測試：

```bash
# 1. 創建測試資料庫
export POSTGRES_DB=suggar_daddy_test

# 2. 執行恢復測試
./scripts/backup/restore-database.sh -d $(date -d '1 day ago' +%Y%m%d) -t suggar_daddy_test

# 3. 驗證數據
# 執行應用測試或數據驗證腳本

# 4. 清理測試資料庫
docker exec suggar-daddy-postgres-master psql -U postgres -c "DROP DATABASE suggar_daddy_test;"
```

## 故障排除

### 備份失敗

```bash
# 檢查 PostgreSQL 容器
docker ps | grep postgres

# 檢查資料庫連接
docker exec suggar-daddy-postgres-master pg_isready -U postgres

# 測試備份腳本
./scripts/backup/backup-database.sh --verbose --dry-run

# 檢查 AWS 認證
aws sts get-caller-identity
aws s3 ls s3://your-backup-bucket/
```

### 恢復失敗

```bash
# 確認備份檔案完整性
gzip -t backup.sql.gz

# 檢查目標資料庫
docker exec suggar-daddy-postgres-master psql -U postgres -c "\l"

# 查看詳細錯誤日誌
cat logs/backup/restore-YYYYMMDD.log
```

### Cron 任務未執行

```bash
# 檢查 cron 服務
sudo systemctl status cron

# 查看 cron 日誌
grep CRON /var/log/syslog
grep CRON /var/log/cron

# 測試手動執行
./scripts/backup/backup-database.sh
```

## 安全建議

1. **AWS IAM**: 使用專用 IAM 用戶，限制 S3 權限
2. **加密**: 啟用 S3 服務端加密 (SSE)
3. **密碼管理**: 使用 AWS Secrets Manager 或環境變數
4. **網路**: 限制資料庫端口訪問
5. **監控**: 定期審查備份和恢復日誌

## 進階配置

### 自定義保留策略

編輯 `backup-database.sh` 或使用環境變數：

```bash
# 保留 90 天
RETENTION_DAYS=90 ./scripts/backup/backup-database.sh
```

### 多區域備份

配置多個 S3 Bucket：

```bash
# 修改 backup-database.sh 添加額外上傳
aws s3 cp "$BACKUP_FILE" "s3://backup-bucket-secondary/$s3_key"
```

### 增量備份

配置 PostgreSQL WAL 歸檔：

```bash
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
```

## 相關連結

- [PostgreSQL Backup and Restore Documentation](https://www.postgresql.org/docs/16/backup.html)
- [AWS S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [Crontab Guru](https://crontab.guru/)
