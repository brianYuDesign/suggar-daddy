# DevOps 快速開始指南

本指南幫助您快速實施 DevOps 評估報告中的優先級改進項目。

## 📋 前置檢查清單

在開始之前，請確保您已經：

- [ ] 閱讀完整的 `DEVOPS_ASSESSMENT.md` 報告
- [ ] 確認團隊已同意優先級排序
- [ ] 準備好必要的存取權限（GitHub, AWS, Slack 等）

---

## 🚀 Week 1: P0 緊急項目

### Day 1-2: CI/CD 基礎設施

#### ✅ 已完成
- [x] 創建 `.github/workflows/ci.yml` - CI 流水線
- [x] 創建 `.github/workflows/cd-dev.yml` - 開發環境部署
- [x] 創建 `.dockerignore` - 優化 Docker 建構
- [x] 創建 `scripts/validate-env.sh` - 環境變數驗證

#### 🔧 需要配置

##### 1. GitHub Secrets 設置

前往 GitHub Repository → Settings → Secrets and variables → Actions

添加以下 Secrets：

**Development 環境**:
```
DEV_SERVER_IP=your-dev-server-ip
DEV_SSH_PRIVATE_KEY=your-ssh-private-key
SLACK_WEBHOOK_URL=your-slack-webhook (optional)
```

**Docker Registry**:
```
GITHUB_TOKEN  # 自動提供，無需手動設置
```

##### 2. 測試 CI Pipeline

```bash
# 1. 提交代碼到 develop 分支
git checkout develop
git add .
git commit -m "feat: setup CI/CD pipeline"
git push origin develop

# 2. 檢查 GitHub Actions
# 前往: https://github.com/YOUR_USERNAME/suggar-daddy/actions

# 3. 驗證所有 jobs 成功執行
```

##### 3. 設置 GitHub Environments

前往 GitHub Repository → Settings → Environments

創建環境：
- `development` - 開發環境
- `staging` - 預發布環境（未來）
- `production` - 生產環境（未來）

為每個環境配置：
- Required reviewers（生產環境建議）
- Environment secrets
- Deployment branches

---

### Day 3-4: 安全性修復

#### 1. 環境變數安全檢查

```bash
# 運行驗證腳本
./scripts/validate-env.sh

# 如果有錯誤，修復 .env 文件
```

#### 2. 移除不安全的預設值

編輯 `docker-compose.yml` 和 `infrastructure/docker/docker-compose.yml`:

**❌ 移除這些**:
```yaml
# 不安全的預設值
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
```

**✅ 替換為**:
```yaml
# 強制要求設置
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
```

#### 3. Redis 密碼保護

更新 Redis 配置:

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD is required}
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD}
```

更新應用配置：
```yaml
# 所有使用 Redis 的服務
environment:
  REDIS_HOST: redis
  REDIS_PORT: 6379
  REDIS_PASSWORD: ${REDIS_PASSWORD}
```

#### 4. 限制端口暴露

只暴露必要的端口（API Gateway）:

```yaml
# ✅ API Gateway - 保留
api-gateway:
  ports:
    - "3000:3000"

# ✅ 其他服務 - 移除 ports，使用 expose
auth-service:
  expose:
    - "3002"
  # 移除 ports: - "3002:3002"
```

---

### Day 5: 配置統一

#### 1. 選擇主要 Docker Compose

建議使用 `infrastructure/docker/docker-compose.yml` 作為主配置。

#### 2. 統一 Kafka 配置

使用 KRaft 模式（無需 Zookeeper）:

```yaml
kafka:
  image: bitnami/kafka:3.6
  environment:
    KAFKA_CFG_NODE_ID: 1
    KAFKA_CFG_PROCESS_ROLES: broker,controller
    KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
    KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
    KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
```

#### 3. 驗證配置

```bash
# 測試啟動所有服務
cd infrastructure/docker
docker-compose up -d

# 檢查健康狀態
docker-compose ps

# 查看日誌
docker-compose logs -f api-gateway

# 停止
docker-compose down
```

---

## 📊 Week 1 檢查點

完成 Week 1 後，您應該有：

- [x] ✅ GitHub Actions CI/CD 流水線運行
- [x] ✅ Docker 映像自動建構並推送到 GHCR
- [x] ✅ 環境變數驗證腳本
- [x] ✅ 移除所有不安全的預設密碼
- [x] ✅ Redis 密碼保護
- [x] ✅ 統一的 Docker 配置
- [x] ✅ `.dockerignore` 優化建構

### 驗證方法

```bash
# 1. CI/CD 驗證
# 查看 GitHub Actions 是否全部通過
# https://github.com/YOUR_USERNAME/suggar-daddy/actions

# 2. 環境變數驗證
./scripts/validate-env.sh

# 3. Docker 建構驗證
docker-compose -f infrastructure/docker/docker-compose.yml build api-gateway

# 4. 安全驗證
# 確保 .env 文件沒有提交到 git
git status | grep .env
# 應該不顯示 .env（只顯示 .env.example）
```

---

## 🎯 Week 2: P1 高優先級項目

### 監控和告警改進

#### 1. 為 NestJS 添加 Prometheus 指標

安裝依賴：
```bash
npm install --save @willsoto/nestjs-prometheus prom-client
```

在每個微服務中添加：
```typescript
// apps/api-gateway/src/main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

#### 2. 創建 Prometheus 告警規則

創建文件 `infrastructure/docker/monitoring/prometheus/rules/alerts.yml`:

```yaml
groups:
  - name: application
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
```

#### 3. 設置 Alertmanager

更新 `docker-compose.monitoring.yml`:

```yaml
alertmanager:
  image: prom/alertmanager:v0.26.0
  container_name: suggar-alertmanager
  ports:
    - "9093:9093"
  volumes:
    - ./monitoring/alertmanager/config.yml:/etc/alertmanager/config.yml
  networks:
    - default
```

創建 `infrastructure/docker/monitoring/alertmanager/config.yml`:

```yaml
route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'severity']

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
```

#### 4. 啟動完整監控堆疊

```bash
cd infrastructure/docker

# 啟動基礎服務
docker-compose up -d

# 啟動監控堆疊
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# 驗證
curl http://localhost:9090  # Prometheus
curl http://localhost:3001  # Grafana (admin/admin)
curl http://localhost:9093  # Alertmanager
```

---

## 📚 常用命令參考

### Docker Compose

```bash
# 啟動所有服務
docker-compose up -d

# 查看狀態
docker-compose ps

# 查看日誌
docker-compose logs -f [service-name]

# 重啟服務
docker-compose restart [service-name]

# 停止並移除
docker-compose down

# 重新建構
docker-compose build [service-name]

# 清理未使用的資源
docker system prune -af
```

### 環境變數管理

```bash
# 驗證環境變數
./scripts/validate-env.sh

# 複製範例文件
cp .env.example .env

# 查看當前環境變數（不顯示值）
grep -v '^#' .env | cut -d '=' -f1
```

### Git 工作流

```bash
# 創建功能分支
git checkout -b feature/my-feature

# 提交變更
git add .
git commit -m "feat: add new feature"

# 推送並創建 PR
git push origin feature/my-feature

# 切換到 develop 進行測試
git checkout develop
git pull origin develop
```

---

## 🐛 常見問題排除

### CI/CD 問題

**問題**: GitHub Actions 建構失敗
```bash
# 解決方案：
1. 檢查 package.json 中的腳本是否存在
2. 確認 Docker 文件路徑正確
3. 查看 Actions 日誌獲取詳細錯誤
```

**問題**: Docker 映像推送失敗
```bash
# 解決方案：
1. 確認 GITHUB_TOKEN 權限
2. 檢查 Container Registry 是否啟用
3. 驗證映像標籤格式正確
```

### Docker 問題

**問題**: 容器無法啟動
```bash
# 檢查日誌
docker-compose logs [service-name]

# 檢查健康狀態
docker-compose ps

# 重新建構
docker-compose build --no-cache [service-name]
```

**問題**: 端口衝突
```bash
# 查看端口使用
lsof -i :[port-number]

# 停止衝突的服務或修改 docker-compose.yml 中的端口映射
```

### 環境變數問題

**問題**: 環境變數未載入
```bash
# 確認 .env 文件存在
ls -la .env

# 檢查格式（無空格）
cat .env | grep -v '^#' | grep -v '^$'

# 重新載入
docker-compose down
docker-compose up -d
```

---

## 📞 獲取幫助

### 資源
- 📖 完整評估報告: `DEVOPS_ASSESSMENT.md`
- 🔧 腳本: `scripts/`
- 🐳 Docker 配置: `infrastructure/docker/`
- ☸️ Terraform 配置: `infrastructure/terraform/`

### 聯絡

如需進一步協助：
1. 查看文件: `docs/`
2. 檢查 GitHub Issues
3. 聯絡 DevOps 團隊

---

## ✅ 進度追蹤

使用以下檢查清單追蹤進度：

### Week 1 (P0)
- [ ] GitHub Actions CI 設置
- [ ] GitHub Secrets 配置
- [ ] 環境變數驗證腳本
- [ ] 移除不安全預設值
- [ ] Redis 密碼保護
- [ ] 限制端口暴露
- [ ] 統一 Docker 配置
- [ ] 創建 .dockerignore

### Week 2 (P1)
- [ ] Prometheus 指標整合
- [ ] 告警規則配置
- [ ] Alertmanager 設置
- [ ] Slack 通知配置
- [ ] Grafana 儀表板

### Week 3-4 (P2)
- [ ] 資料庫備份腳本
- [ ] Docker 映像優化
- [ ] 部署策略改進
- [ ] 容器安全掃描

---

**祝您部署順利！** 🚀

如有問題，請參考完整的評估報告或聯絡團隊。
