# suggar-daddy AWS 部署方案

## 📊 架構概覽

### 微服務清單（11 個服務）
1. api-gateway
2. auth-service
3. user-service
4. matching-service
5. content-service
6. subscription-service
7. payment-service
8. messaging-service
9. notification-service
10. media-service
11. db-writer-service

### 技術棧
- **應用**: NestJS (Node.js)
- **資料庫**: PostgreSQL
- **快取**: Redis
- **訊息佇列**: Kafka
- **檔案儲存**: S3 (媒體檔案)
- **支付**: Stripe

---

## 💰 方案 A：成本最低方案（月費約 $50-80）

### 適用場景
- MVP 階段
- 用戶 < 10,000
- DAU < 1,000

### 架構設計

#### 1. 運算資源
**AWS Lightsail - $40/月**
- **1 個 Lightsail 實例** ($40/月)
  - 8 GB RAM / 4 vCPU / 160 GB SSD
  - 部署所有微服務（使用 Docker Compose）
  - 包含 5 TB 流量

**優勢**：
- 固定價格，不會爆預算
- 包含流量和靜態 IP
- 適合小型專案快速啟動

#### 2. 資料庫
**AWS RDS PostgreSQL - t4g.micro ($15/月)**
- 免費層級可用 12 個月
- 20 GB 儲存
- 自動備份

**成本優化**：
- Dev 環境使用 Docker PostgreSQL（免費）
- Prod 使用 RDS

#### 3. Redis
**ElastiCache Redis - t4g.micro ($12/月)**
- 或使用 Docker Redis on Lightsail（免費）

**建議**：Dev 用 Docker，Prod 用 ElastiCache

#### 4. Kafka
**Docker Kafka on Lightsail（免費）**
- 或使用 Amazon MSK Serverless (按量計費，約 $5-15/月)

#### 5. 儲存
**S3 Standard ($0.023/GB)**
- 媒體檔案儲存
- 預估 100 GB = $2.3/月
- 加上請求費用約 $3-5/月

#### 6. CDN（可選）
**CloudFront ($5-10/月)**
- 加速媒體檔案存取
- 降低 S3 請求費用

### 總成本：$50-80/月
```
Lightsail:        $40
RDS (Prod):       $15
ElastiCache:      $12
S3 + Transfer:    $5
CloudFront:       $5
────────────────────
總計:             ~$77/月
```

---

## 🚀 方案 B：擴展性方案（月費約 $150-250）

### 適用場景
- 用戶 10,000 - 100,000
- DAU 1,000 - 10,000
- 需要高可用性

### 架構設計

#### 1. 運算資源
**AWS ECS Fargate + ALB**

**Application Load Balancer ($16/月)**
- 單一入口
- 路由到不同微服務

**ECS Fargate 任務**：
- **api-gateway**: 0.5 vCPU / 1 GB RAM x 2 = $25/月
- **auth-service**: 0.25 vCPU / 0.5 GB x 2 = $12/月
- **user-service**: 0.5 vCPU / 1 GB x 2 = $25/月
- **content-service**: 0.5 vCPU / 1 GB x 2 = $25/月
- **其他服務**: 0.25 vCPU / 0.5 GB x 7 x 2 = $84/月

**運算成本**: ~$171/月

**優勢**：
- 自動擴展
- 高可用性（跨 AZ）
- 無需管理伺服器

#### 2. 資料庫
**RDS PostgreSQL - t4g.small ($30/月) + Multi-AZ ($60/月)**
- Prod: Multi-AZ 高可用（$60）
- Dev: 單 AZ ($30)

**成本優化**：
- 使用 Reserved Instances（省 30-40%）
- Dev 環境下班時間自動停止

#### 3. Redis
**ElastiCache Redis - t4g.small ($25/月)**
- 或 Redis Cluster ($50/月 for Prod)

#### 4. Kafka
**Amazon MSK Serverless ($30-50/月)**
- 自動擴展
- 無需管理 broker

**或 Confluent Cloud（更省事）**：
- Basic: $0/月 + 流量費用

#### 5. 儲存
**S3 + CloudFront**
- S3: $10-20/月
- CloudFront: $15-30/月

### 總成本：$180-280/月
```
ECS Fargate:      $171
ALB:              $16
RDS (Prod):       $60
RDS (Dev):        $30
ElastiCache:      $25
MSK Serverless:   $40
S3 + CloudFront:  $25
────────────────────
總計:             ~$367/月
```

**成本優化後**: ~$200/月
- Dev 環境用 Lightsail
- 使用 Reserved Instances
- CloudFront 只用於 Prod

---

## ⚡ 方案 C：混合方案（推薦，月費約 $80-120）

### Dev 環境（$20/月）
**使用 Lightsail**
- 1 個實例 ($20/月，4GB RAM)
- Docker Compose 部署所有服務
- 本地 PostgreSQL + Redis + Kafka

### Prod 環境（$60-100/月）

#### 運算
**AWS Lightsail Container Service ($40/月)**
- 4 個微服務容器
- 1 GB RAM / 0.5 vCPU per container
- 包含 Load Balancer

**或 ECS Fargate Spot ($30-50/月)**
- 使用 Spot 省 70% 成本
- 適合無狀態微服務

#### 資料庫
**RDS t4g.micro ($15/月)**
- 單 AZ
- 自動備份到 S3

#### Redis
**Docker on Lightsail（包含在 $40 內）**

#### Kafka
**Docker on Lightsail（包含在 $40 內）**

#### 儲存
**S3 + CloudFront ($10/月)**

### 總成本：$85-105/月
```
Dev Lightsail:        $20
Prod Lightsail:       $40
RDS:                  $15
S3 + CloudFront:      $10
────────────────────────
總計:                 $85/月
```

---

## 🎯 我的推薦：方案 C（混合方案）

### 為什麼？

1. **成本可控** ($85/月)
   - Dev 環境極低成本
   - Prod 環境固定費用

2. **易於管理**
   - Lightsail 介面簡單
   - Docker Compose 熟悉的工具

3. **擴展彈性**
   - 初期使用 Lightsail
   - 用戶增長後遷移到 ECS Fargate
   - 資料庫可隨時升級

4. **適合你的專案**
   - 11 個輕量微服務
   - 初期用戶量不大
   - 快速迭代需求

---

## 📋 部署架構圖

### Dev 環境
```
Lightsail Instance ($20/月)
├── Docker Compose
│   ├── api-gateway
│   ├── auth-service
│   ├── user-service
│   ├── ... (其他 8 個服務)
│   ├── PostgreSQL
│   ├── Redis
│   └── Kafka
└── 靜態 IP (包含)
```

### Prod 環境
```
Route 53 (DNS) → CloudFront → ALB

Lightsail Container Service ($40/月)
├── api-gateway (x2)
├── auth-service (x2)
├── user-service (x2)
├── content-service (x2)
└── ... (其他服務各 x1-2)

RDS PostgreSQL ($15/月)
├── 主資料庫
└── 自動備份

S3 ($5/月)
└── 媒體檔案

ElastiCache Redis (可選，$12/月)
或
Docker Redis on Lightsail (免費)
```

---

## 🔧 Infrastructure as Code (建議)

### 使用 Terraform

```hcl
# terraform/environments/dev/main.tf
module "dev_infrastructure" {
  source = "../../modules/lightsail"
  
  environment = "dev"
  instance_size = "medium"  # $20/月
  enable_rds = false        # 使用 Docker PostgreSQL
  enable_elasticache = false
}

# terraform/environments/prod/main.tf
module "prod_infrastructure" {
  source = "../../modules/lightsail-container"
  
  environment = "prod"
  container_count = 11
  container_size = "micro"  # $40/月
  
  rds_instance_class = "db.t4g.micro"
  enable_cloudfront = true
}
```

---

## 💾 資料備份策略

### Dev
- RDS 自動備份（7 天）
- 每日 DB dump 到 S3（$1/月）

### Prod
- RDS 自動備份（30 天）
- Point-in-time recovery
- 每週完整備份到 S3 Glacier（$0.5/月）

---

## 📈 成本擴展路徑

### 階段 1：MVP (0-10K 用戶)
**成本**: $85/月
- 使用方案 C

### 階段 2：成長期 (10K-100K 用戶)
**成本**: $200-300/月
- 遷移到 ECS Fargate
- RDS 升級到 t4g.small
- 啟用 Multi-AZ
- ElastiCache Cluster

### 階段 3：擴展期 (100K+ 用戶)
**成本**: $500-1000/月
- ECS Fargate Auto Scaling
- RDS Aurora Serverless
- ElastiCache Cluster (Multi-AZ)
- MSK 或 Confluent Cloud
- CloudFront + WAF

---

## 🛠️ CI/CD 建議

### GitHub Actions（免費）
```yaml
# .github/workflows/deploy-dev.yml
name: Deploy to Dev
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
      - name: Push to ECR
      - name: Deploy to Lightsail
```

### 或使用 AWS CodePipeline
- CodeBuild: $1/月（100 分鐘免費）
- CodeDeploy: 免費

---

## 🎯 下一步行動

1. **立即開始**：
   ```bash
   # 1. 建立 infrastructure 目錄
   mkdir -p infrastructure/{terraform,docker}
   
   # 2. 我可以幫你生成完整的 Terraform 配置
   # 3. 設定 Docker Compose for Dev
   # 4. 準備部署腳本
   ```

2. **成本監控**：
   - 設定 AWS Cost Explorer
   - CloudWatch Billing Alerts ($5/月門檻)

3. **安全加固**：
   - VPC 隔離
   - Security Groups
   - Secrets Manager ($0.4/secret/月)

---

需要我幫你：
1. 📝 生成完整的 Terraform 配置？
2. 🐳 建立 Docker Compose 檔案？
3. 🚀 撰寫部署腳本？
4. 📊 設定成本監控？

或是你想調整哪部分的方案？
