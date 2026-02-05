# DevOps 與監控

本文件說明 Sugar Daddy 的 DevOps 環境設定與監控堆疊（Prometheus、Grafana、Service / DB / Redis 等）。

---

## 本地檢查與提交（Lint / Test / Commit）

在專案根目錄可使用自動化腳本，先跑 **lint** 再跑 **test**，通過後再 commit，避免把紅的程式碼推上去。

| 指令 | 說明 |
|------|------|
| `npm run ci:check` | 僅執行 lint + test（適合 CI 或提交前手動檢查） |
| `npm run commit -- "feat: 訊息"` | lint → test 通過後再 `git add` + `git commit` |

更多選項（如 `--no-commit`、`--skip-check`）見 `scripts/README.md`。

---

## 架構概覽

```
                    ┌─────────────────────────────────────────┐
                    │              Grafana :3001               │
                    │         (儀表板、告警、查詢)               │
                    └────────────────────┬──────────────────────┘
                                         │
                    ┌────────────────────▼──────────────────────┐
                    │           Prometheus :9090                 │
                    │     (指標蒐集、儲存、PromQL)                │
                    └──┬──────┬──────┬──────┬──────┬─────────────┘
                       │      │      │      │      │
         ┌─────────────┘      │      │      │      └─────────────┐
         │                    │      │      │                    │
         ▼                    ▼      ▼      ▼                    ▼
   postgres-exporter    redis-exporter  node   cadvisor        grafana
   :9187               :9121           :9100  :8081           :3000
         │                    │
         ▼                    ▼
   PostgreSQL :5432     Redis :6379
```

| 元件 | 埠號 | 說明 |
|------|------|------|
| **Prometheus** | 9090 | 指標儲存與查詢 |
| **Grafana** | 3001 (對外) | 儀表板與告警 |
| **postgres_exporter** | 9187 | PostgreSQL 指標 |
| **redis_exporter** | 9121 | Redis 指標 |
| **node_exporter** | 9100 | 主機 CPU / 記憶體 / 磁碟 |
| **cAdvisor** | 8081 | 容器資源使用 |

---

## 快速啟動

### 1. 環境變數（可選）

```bash
cd infrastructure/docker
cp env.example .env
# 編輯 .env 設定 GRAFANA_ADMIN_PASSWORD 等
```

### 2. 啟動基礎服務 + 監控

監控堆疊需與 Postgres / Redis 同一網路，請**一起**啟動：

```bash
# 在專案根目錄執行
docker compose -f infrastructure/docker/docker-compose.yml \
               -f infrastructure/docker/docker-compose.monitoring.yml \
               up -d
```

### 3. 檢查服務

- **Prometheus**: http://localhost:9090  
  - 狀態 → Targets 可確認各 exporter 是否 UP
- **Grafana**: http://localhost:3001  
  - 預設帳號：`admin` / `admin`（或 .env 中的 `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`）
- **cAdvisor**: http://localhost:8081

---

## 監控項目

### 已蒐集指標

| 對象 | Job 名稱 | 說明 |
|------|----------|------|
| 服務 (未來) | 應用 /metrics | NestJS 可掛 Prometheus 模組暴露指標 |
| PostgreSQL | `postgres` | 連線數、交易、緩衝區、慢查詢等 |
| Redis | `redis` | 記憶體、連線、指令、鍵數量等 |
| Grafana | `grafana` | 請求數、慢查詢等 |
| 主機 | `node` | CPU、記憶體、磁碟、網路 |
| 容器 | `cadvisor` | 各容器 CPU、記憶體、網路 I/O |

### Grafana 儀表板匯入

登入 Grafana 後：**Dashboards → New → Import**，輸入下列 ID 即可：

| 監控對象 | Dashboard ID | 說明 |
|----------|--------------|------|
| **Redis** | 763 | Redis 總覽 |
| **PostgreSQL** | 9628 或 3662 | 資料庫總覽 |
| **Node Exporter** | 1860 或 11074 | 主機指標 |
| **cAdvisor** | 14282 | 容器指標 |
| **Prometheus** | 3661 | Prometheus 自身 |

資料源請選已自動設好的 **Prometheus**。

---

## 僅啟動監控（已有 Postgres / Redis）

若 Postgres、Redis 已在其他 compose 或本機執行，需讓監控能連到它們：

- **同一 Docker 專案**：先 `docker compose -f ... docker-compose.yml up -d`，再疊加 monitoring compose，exporter 會用服務名 `postgres` / `redis` 連線。
- **本機非 Docker**：在 `docker-compose.monitoring.yml` 中為 `postgres-exporter` / `redis-exporter` 加上：
  - `extra_hosts: - "host.docker.internal:host-gateway"`
  - 並將 `postgres` / `redis` 改為 `host.docker.internal`，且 Postgres/Redis 須綁定 0.0.0.0 或 localhost 並開放對應埠。

---

## 應用服務暴露 /metrics（選用）

若要監控 NestJS 服務（如 matching-service），可：

1. 安裝 `@willsoto/nestjs-prometheus` 或 `prom-client`，在 app 暴露 `GET /metrics`。
2. 在 `infrastructure/docker/monitoring/prometheus/prometheus.yml` 的 `scrape_configs` 取消註解並填上實際位址，例如：

```yaml
  - job_name: 'matching-service'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3000']  # 或服務名若在同一 Docker 網路
```

重載 Prometheus：`curl -X POST http://localhost:9090/-/reload`（需已啟用 `--web.enable-lifecycle`）。

---

## 告警（後續）

- 在 Prometheus 加 `alerting` 與 `rule_files`，或改用 Alertmanager。
- 在 Grafana 的 Dashboard 面板上設定 **Alert**，通知可接 Slack / Email / Webhook。

---

## 檔案結構

```
infrastructure/docker/
├── docker-compose.yml              # 基礎：Postgres、Redis
├── docker-compose.monitoring.yml   # 監控堆疊
├── env.example                     # 複製為 .env 使用
└── monitoring/
    ├── prometheus/
    │   └── prometheus.yml
    └── grafana/
        └── provisioning/
            ├── datasources/
            │   └── datasources.yml
            └── dashboards/
                ├── dashboards.yml
                └── json/           # 可放自訂 dashboard JSON
```

---

## 關閉監控

```bash
docker compose -f infrastructure/docker/docker-compose.yml \
               -f infrastructure/docker/docker-compose.monitoring.yml \
               down
```

僅關閉監控、保留 Postgres/Redis：

```bash
docker compose -f infrastructure/docker/docker-compose.monitoring.yml down
```

資料會保留在 volume `prometheus_data`、`grafana_data`，下次 up 會沿用。
