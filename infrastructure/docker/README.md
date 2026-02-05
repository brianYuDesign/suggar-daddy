# Docker 本地開發環境

## 基礎服務（PostgreSQL + Redis）

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

## 含監控（Prometheus + Grafana + DB/Redis 等）

需與基礎 compose 一起啟動：

```bash
docker compose -f infrastructure/docker/docker-compose.yml \
               -f infrastructure/docker/docker-compose.monitoring.yml \
               up -d
```

- **Prometheus**: http://localhost:9090  
- **Grafana**: http://localhost:3001（預設 admin / admin）  
- 詳見 [docs/DEVOPS.md](../../docs/DEVOPS.md)

## 環境變數

基礎服務（各應用可覆寫）：

- `DATABASE_HOST=localhost`
- `DATABASE_PORT=5432`
- `DATABASE_USER=postgres`
- `DATABASE_PASSWORD=postgres`
- `DATABASE_NAME=suggar_daddy`
- `REDIS_URL=redis://localhost:6379`

監控用變數（可選）：複製 `infrastructure/docker/env.example` 為 `.env` 後設定  
`GRAFANA_ADMIN_USER`、`GRAFANA_ADMIN_PASSWORD`、`GRAFANA_ROOT_URL` 等。
