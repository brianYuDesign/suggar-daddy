# PostgreSQL High Availability 更新說明

## 🎯 重要變更

本專案已實施 PostgreSQL 主從複製（Master-Replica）架構，實現高可用性和讀寫分離。

## 📦 新增服務

### 之前
```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
```

### 現在
```yaml
services:
  postgres-master:      # 主節點（讀寫）
    image: postgres:16-alpine
    ports: ["5432:5432"]
    
  postgres-replica:     # 從節點（只讀）
    image: postgres:16-alpine
    ports: ["5433:5432"]
```

## 🔄 應用程式變更

### 環境變數更新

需要在 `.env` 或 `.env.docker` 中添加：

```bash
# PostgreSQL High Availability
POSTGRES_HA_ENABLED=true              # 啟用 HA 模式
POSTGRES_MASTER_HOST=postgres-master  # Master 主機
POSTGRES_REPLICA_HOST=postgres-replica # Replica 主機
REPLICATION_PASSWORD=your_secure_password
```

### 自動讀寫分離

當 `POSTGRES_HA_ENABLED=true` 時，TypeORM 會自動路由查詢：

- ✅ **寫操作** (INSERT, UPDATE, DELETE) → Master
- ✅ **讀操作** (SELECT) → Replica
- ✅ **事務** → Master

無需修改應用程式代碼！

## 🚀 使用方法

### 啟動服務

```bash
# 啟動 PostgreSQL HA 架構
docker-compose up -d postgres-master postgres-replica

# 驗證配置
./infrastructure/postgres/scripts/verify-ha.sh
```

### 連接數據庫

```bash
# Master (讀寫操作)
psql -h localhost -p 5432 -U postgres -d suggar_daddy

# Replica (只讀操作)
psql -h localhost -p 5433 -U postgres -d suggar_daddy
```

### 檢查複製狀態

```bash
# 使用內建監控腳本
docker exec suggar-daddy-postgres-master /usr/local/bin/check-replication.sh
docker exec suggar-daddy-postgres-replica /usr/local/bin/check-replication.sh
```

## 📊 架構圖

```
┌─────────────────────────────────────────┐
│         Application Services             │
│  (api-gateway, auth, user, payment...)  │
└─────────────┬───────────────────────────┘
              │
         Write│Read    Read
              │         │
    ┌─────────▼─┐   ┌──▼────────────┐
    │  Master   │──→│   Replica     │
    │ (Port     │   │  (Port 5433)  │
    │  5432)    │   │  Read-Only    │
    └───────────┘   └───────────────┘
         │                 │
    WAL Streaming    WAL Replay
```

## 🛠️ 兼容性

### 向後兼容

為確保向後兼容，所有現有服務仍可使用：

```yaml
environment:
  POSTGRES_HOST: postgres-master  # 或保持 'postgres'
```

### 遷移路徑

1. **無需 HA 功能**：設置 `POSTGRES_HA_ENABLED=false`
2. **漸進式遷移**：先啟動 Master，測試後再啟動 Replica
3. **完全 HA 模式**：同時運行 Master 和 Replica

## 📚 文檔

- **完整文檔**: [docs/POSTGRESQL_HA.md](docs/POSTGRESQL_HA.md)
- **實施報告**: [docs/POSTGRESQL_HA_IMPLEMENTATION_REPORT.md](docs/POSTGRESQL_HA_IMPLEMENTATION_REPORT.md)
- **快速參考**: [docs/POSTGRESQL_HA_QUICK_REFERENCE.md](docs/POSTGRESQL_HA_QUICK_REFERENCE.md)

## 🔧 故障轉移

如果 Master 故障：

```bash
# 1. 提升 Replica 為新 Master
docker exec suggar-daddy-postgres-replica psql -U postgres -c "SELECT pg_promote();"

# 2. 更新環境變數
export POSTGRES_MASTER_HOST=postgres-replica

# 3. 重啟應用服務
docker-compose restart api-gateway auth-service user-service
```

詳細流程請參考: [docs/POSTGRESQL_HA.md#故障轉移](docs/POSTGRESQL_HA.md#故障轉移)

## ⚠️ 注意事項

### 生產環境

**必須修改密碼**：

```bash
POSTGRES_PASSWORD=<strong_password>
REPLICATION_PASSWORD=<strong_replication_password>
```

**建議配置**：
- 設置 Prometheus 監控
- 配置自動備份
- 實施 Patroni 自動故障轉移
- 啟用 SSL 連接

### 資源需求

- **最低**: 4GB RAM, 20GB 磁碟
- **建議**: 8GB RAM, 50GB 磁碟
- **生產**: 16GB+ RAM, 100GB+ SSD

## 🎯 效能提升

預期效果：
- ✅ 可用性：99.9%+
- ✅ 讀操作性能：提升 20-40%
- ✅ Master 負載：降低 40-60%
- ✅ 複製延遲：< 1 秒
- ✅ 故障轉移：< 1 分鐘

## 🆘 獲取幫助

- **驗證配置**: `./infrastructure/postgres/scripts/verify-ha.sh`
- **監控狀態**: `./infrastructure/postgres/scripts/check-replication.sh`
- **查看日誌**: `docker-compose logs postgres-master postgres-replica`
- **常見問題**: [docs/POSTGRESQL_HA.md#常見問題](docs/POSTGRESQL_HA.md#常見問題)

## 📅 版本歷史

- **v2.0** (2024-12): PostgreSQL HA 架構實施
  - 主從複製（Streaming Replication）
  - 讀寫分離（TypeORM）
  - 自動化監控腳本
  - 完整文檔

- **v1.0** (之前): 單節點 PostgreSQL
  - 單個 PostgreSQL 15 實例
  - 無高可用性

---

**升級日期**: 2024-12
**PostgreSQL 版本**: 16-alpine
**複製模式**: Streaming Replication (異步)
**狀態**: ✅ 生產就緒
