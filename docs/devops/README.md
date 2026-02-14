# DevOps 完整指南

> **Sugar Daddy 專案 DevOps 運維與自動化完整文檔**  
> 整合自: DEVOPS_README.md, DEVOPS_SUMMARY.md, DEVOPS_QUICKSTART.md, DEVOPS_ASSESSMENT.md

---

## 📚 目錄

1. [快速導覽](#快速導覽)
2. [評估總覽](#評估總覽)
3. [快速開始](#快速開始)
4. [完整評估報告](#完整評估報告)
5. [實施指南](#實施指南)
6. [常見問題排除](#常見問題排除)
7. [持續改進](#持續改進)

---

## 快速導覽

### 🎯 不同角色的閱讀路徑

#### 專案經理/管理層
**目標**: 了解現狀和計劃
```
1. 閱讀「評估總覽」(5分鐘)
2. 查看「ROI 估算」
3. 檢視「立即行動項目」
4. 與團隊討論優先級
```

#### DevOps 工程師
**目標**: 開始實施改進
```
1. 閱讀「評估總覽」(5分鐘)
2. 跟隨「快速開始」章節
3. 執行 Week 1 計劃
4. 遇到問題查閱「完整評估報告」
5. 使用檢查清單追蹤進度
```

#### 開發人員
**目標**: 了解 CI/CD 流程
```
1. 閱讀「CI/CD 設置」章節
2. 查看 .github/workflows/
3. 了解如何觸發 CI/CD
4. 學習使用環境變數驗證腳本
```

---

## 評估總覽

### 📊 整體評分

**評估日期**: 2024年2月  
**評估範圍**: 基礎設施、容器化、CI/CD、監控、安全性

| 項目 | 評分 | 狀態 |
|------|------|------|
| 基礎設施配置 | ⭐⭐⭐⭐☆ (4/5) | ✅ 良好 |
| 容器化 | ⭐⭐⭐⭐☆ (4/5) | ✅ 良好 |
| 環境變數管理 | ⭐⭐⭐☆☆ (3/5) | ⚠️ 需改進 |
| CI/CD | ⭐⭐⭐☆☆ (3/5) | ✅ 已改進 |
| 監控和日誌 | ⭐⭐⭐☆☆ (3/5) | ⚠️ 需改進 |
| 安全性 | ⭐⭐⭐☆☆ (3/5) | ⚠️ 需改進 |

**總體評分**: ⭐⭐⭐⭐☆ (3.5/5)

### ✅ 優勢

1. **完善的 Docker 配置**
   - ✅ 完整的 docker-compose 配置
   - ✅ 多階段 Dockerfile 優化
   - ✅ 服務健康檢查
   - ✅ 網路隔離

2. **監控基礎設施**
   - ✅ Prometheus + Grafana 堆疊
   - ✅ 多種 Exporter（PostgreSQL, Redis, Node, cAdvisor）
   - ✅ 監控配置文件

3. **IaC 基礎**
   - ✅ Terraform 配置
   - ✅ 環境分離（dev/prod）
   - ✅ 模組化架構

### ⚠️ 關鍵問題與優先級

#### 🔴 P0 - 緊急（立即處理）

1. **CI/CD 流水線** ✅ 已解決
   - 創建了 `.github/workflows/ci.yml`
   - 創建了 `.github/workflows/cd-dev.yml`

2. **安全漏洞** 🔧 需執行
   - ❌ 明文預設密碼
   - ❌ Redis 無密碼保護
   - ❌ 過多端口暴露

#### 🟠 P1 - 高優先級（2週內）

3. **環境變數管理** ✅ 已解決
   - 創建了 `scripts/validate-env.sh`

4. **監控不完整**
   - ⚠️ 應用無指標暴露
   - ⚠️ 無告警規則
   - ⚠️ 無集中式日誌

### 💰 ROI 估算

#### 時間成本

| 階段 | 時間投入 | 人力 |
|------|---------|------|
| Week 1 (P0) | 5-7 天 | 1-2 人 |
| Week 2 (P1) | 3-5 天 | 1 人 |
| Week 3-4 (P2) | 7-10 天 | 1 人 |
| **總計** | **3-4 週** | **1-2 人** |

#### 預期收益

**效率提升**:
- 部署頻率: 1次/週 → 多次/天 (+500%)
- 建構時間: 30分鐘 → 5分鐘 (-83%)
- 部署時間: 1小時 → 10分鐘 (-83%)

**質量提升**:
- 變更失敗率: 20% → 5% (-75%)
- Bug 檢測時間: 天 → 小時 (-90%)
- 安全漏洞: 主動發現並修復

**成本節省**:
- 減少 50% 手動運維時間
- 減少 70% 故障排除時間
- 提升團隊生產力 30%

**年度 ROI**: ~300-500%

---

## 快速開始

### 📋 前置檢查清單

在開始之前，請確保：

- [ ] 閱讀完「評估總覽」章節
- [ ] 確認團隊已同意優先級排序
- [ ] 準備好必要的存取權限（GitHub, AWS, Slack 等）

### 🚀 立即行動（30分鐘）

#### 1. 設置 GitHub Secrets

前往 GitHub Repository → Settings → Secrets and variables → Actions

添加以下 Secrets：

**Development 環境**:
```
DEV_SERVER_IP=your-dev-server-ip
DEV_SSH_PRIVATE_KEY=your-ssh-private-key
SLACK_WEBHOOK_URL=your-slack-webhook (optional)
```

#### 2. 運行環境變數驗證

```bash
./scripts/validate-env.sh
```

#### 3. 測試 CI 流水線

```bash
git add .
git commit -m "feat: setup DevOps infrastructure"
git push origin develop

# 檢查: https://github.com/YOUR_USERNAME/suggar-daddy/actions
```

### 📅 本週完成（Week 1 - P0 項目）

#### Day 1-2: CI/CD 基礎設施 ✅

已完成：
- [x] 創建 `.github/workflows/ci.yml` - CI 流水線
- [x] 創建 `.github/workflows/cd-dev.yml` - 開發環境部署
- [x] 創建 `.dockerignore` - 優化 Docker 建構
- [x] 創建 `scripts/validate-env.sh` - 環境變數驗證

需要配置：
- [ ] GitHub Secrets 設置
- [ ] GitHub Environments 創建
- [ ] 測試 CI Pipeline

#### Day 3-4: 安全性修復

**1. 環境變數安全檢查**

```bash
# 運行驗證腳本
./scripts/validate-env.sh
```

**2. 移除不安全的預設值**

編輯 `docker-compose.yml`:

❌ 移除：
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key}
```

✅ 替換為：
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
```

**3. Redis 密碼保護**

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD:?REDIS_PASSWORD is required}
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD}
```

**4. 限制端口暴露**

只暴露必要的端口（API Gateway）:

```yaml
# ✅ API Gateway - 保留
api-gateway:
  ports:
    - "3000:3000"

# ✅ 其他服務 - 使用 expose
auth-service:
  expose:
    - "3002"
```

#### Day 5: 配置統一與驗證

**驗證配置**

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

### 📊 Week 1 檢查點

完成 Week 1 後，您應該有：

- [ ] ✅ GitHub Actions CI/CD 流水線運行
- [ ] ✅ Docker 映像自動建構並推送到 GHCR
- [ ] ✅ 環境變數驗證腳本
- [ ] ✅ 移除所有不安全的預設密碼
- [ ] ✅ Redis 密碼保護
- [ ] ✅ 統一的 Docker 配置
- [ ] ✅ `.dockerignore` 優化建構

**驗證方法**：

```bash
# 1. CI/CD 驗證
# 查看 GitHub Actions 是否全部通過

# 2. 環境變數驗證
./scripts/validate-env.sh

# 3. Docker 建構驗證
docker-compose -f infrastructure/docker/docker-compose.yml build api-gateway

# 4. 安全驗證
git status | grep .env  # 應該只顯示 .env.example
```

### 🎯 Week 2: P1 高優先級項目

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
  ],
})
export class AppModule {}
```

#### 2. 創建 Prometheus 告警規則

創建 `infrastructure/docker/monitoring/prometheus/rules/alerts.yml`:

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
  ports:
    - "9093:9093"
  volumes:
    - ./monitoring/alertmanager/config.yml:/etc/alertmanager/config.yml
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

## 完整評估報告

### 詳細分析

#### 1. 基礎設施配置 ⭐⭐⭐⭐☆

**優點**：
- Docker Compose 配置完整
- 服務隔離良好
- 健康檢查完善

**改進建議**：
- 添加資源限制（CPU/Memory）
- 實施日誌輪替
- 優化網路配置

#### 2. 容器化 ⭐⭐⭐⭐☆

**優點**：
- 多階段 Dockerfile
- 映像大小優化
- 分層快取利用

**改進建議**：
- 使用 distroless 映像
- 添加安全掃描
- 實施映像簽名

#### 3. CI/CD ⭐⭐⭐☆☆

**現狀**：
- ✅ GitHub Actions 已設置
- ✅ 自動建構和測試
- ✅ 容器映像推送

**改進建議**：
- 添加 E2E 測試
- 實施藍綠部署
- 自動化回滾

#### 4. 監控和日誌 ⭐⭐⭐☆☆

**現狀**：
- Prometheus + Grafana 基礎設施
- 多個 Exporter 配置

**改進建議**：
- 應用層指標暴露
- 告警規則完善
- 集中式日誌管理（ELK）

#### 5. 安全性 ⭐⭐⭐☆☆

**現狀**：
- 基本的網路隔離
- 環境變數管理

**改進建議**：
- 移除預設密碼
- Redis 密碼保護
- Secrets 管理（Vault）
- 定期安全掃描

---

## 實施指南

### 📚 常用命令參考

#### Docker Compose

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

#### 環境變數管理

```bash
# 驗證環境變數
./scripts/validate-env.sh

# 複製範例文件
cp .env.example .env

# 查看當前環境變數（不顯示值）
grep -v '^#' .env | cut -d '=' -f1
```

#### Git 工作流

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

## 常見問題排除

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

## 持續改進

### 🏆 成功標準

#### Week 1 成功標準
- ✅ CI/CD 流水線正常運行
- ✅ 所有測試通過
- ✅ Docker 映像自動建構
- ✅ 無安全漏洞警告
- ✅ 環境變數驗證通過

#### Week 2 成功標準
- ✅ Prometheus 指標收集正常
- ✅ 告警規則配置完成
- ✅ 至少一個告警測試成功
- ✅ Grafana 儀表板可用

#### 長期成功標準
- 📈 部署頻率 > 1次/天
- 📈 變更失敗率 < 5%
- 📈 MTTR < 30分鐘
- 📈 測試覆蓋率 > 80%
- 📈 服務可用性 > 99.9%

### ✅ 進度追蹤

#### Week 1 (P0)
- [ ] GitHub Actions CI 設置
- [ ] GitHub Secrets 配置
- [ ] 環境變數驗證腳本
- [ ] 移除不安全預設值
- [ ] Redis 密碼保護
- [ ] 限制端口暴露
- [ ] 統一 Docker 配置
- [ ] 創建 .dockerignore

#### Week 2 (P1)
- [ ] Prometheus 指標整合
- [ ] 告警規則配置
- [ ] Alertmanager 設置
- [ ] Slack 通知配置
- [ ] Grafana 儀表板

#### Week 3-4 (P2)
- [ ] 資料庫備份腳本
- [ ] Docker 映像優化
- [ ] 部署策略改進
- [ ] 容器安全掃描

### 💡 最佳實踐

#### DO ✅
1. **從 P0 開始** - 先解決最緊急的問題
2. **小步快跑** - 增量改進，快速驗證
3. **文件化一切** - 記錄決策和變更
4. **自動化優先** - 能自動化的不手動
5. **監控驅動** - 用數據說話

#### DON'T ❌
1. **不要跳過測試** - 質量門檻不可妥協
2. **不要忽視安全** - 安全是基礎不是附加
3. **不要過度設計** - 從簡單開始，逐步優化
4. **不要孤軍作戰** - 團隊協作很重要
5. **不要放棄監控** - 可觀測性是可靠性基礎

---

## 📞 支援與資源

### 相關文件
- 📖 完整文件: `docs/`
- 🐳 Docker 配置: `infrastructure/docker/`
- ☸️ Terraform 配置: `infrastructure/terraform/`
- 🔧 腳本: `scripts/`
- 📊 監控配置: `infrastructure/docker/monitoring/`

### 學習資源
- [Docker 最佳實踐](https://docs.docker.com/develop/dev-best-practices/)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [Prometheus 指南](https://prometheus.io/docs/introduction/overview/)
- [Terraform 教學](https://learn.hashicorp.com/terraform)

### 獲取幫助
1. 檢查本文件的「常見問題排除」章節
2. 查看 GitHub Issues
3. 聯絡 DevOps 團隊

---

**最後更新**: 2024年2月  
**維護者**: DevOps Team

🚀 **開始您的 DevOps 之旅！**
