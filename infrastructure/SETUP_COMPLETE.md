# ✅ Infrastructure 設置完成！

## 📦 已建立的檔案

### 1️⃣ Terraform Infrastructure as Code

```
infrastructure/terraform/
├── modules/
│   ├── lightsail/           # Lightsail 實例模組
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── user_data.sh     # 啟動腳本（安裝 Docker）
│   ├── rds/                 # RDS PostgreSQL 模組
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── s3/                  # S3 媒體儲存模組
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/                 # Dev 環境配置
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── providers.tf
│   └── prod/                # Prod 環境配置
│       ├── main.tf
│       ├── variables.tf
│       └── providers.tf
├── providers.tf             # Provider 設定
└── variables.tf             # 全域變數
```

### 2️⃣ Docker 配置

```
infrastructure/docker/
├── docker-compose.yml       # 完整的 11 個微服務 + 基礎設施
├── Dockerfile               # Multi-stage build
└── .env.example             # 環境變數範本
```

### 3️⃣ 部署工具

```
infrastructure/
├── deploy.sh                # 一鍵部署腳本
└── README.md                # 詳細使用說明
```

---

## 🚀 快速開始

### 本地開發（Docker Compose）

```bash
# 1. 設定環境變數
cd infrastructure/docker
cp .env.example .env
vim .env  # 填入你的密鑰

# 2. 啟動所有服務
docker-compose up -d

# 3. 查看狀態
docker-compose ps
docker-compose logs -f api-gateway

# 訪問 API
curl http://localhost:3000/health
```

### AWS 部署（Terraform）

#### Dev 環境

```bash
# 1. 初始化 Terraform
./infrastructure/deploy.sh dev init

# 2. 檢查計劃
./infrastructure/deploy.sh dev plan

# 3. 部署
./infrastructure/deploy.sh dev apply

# 4. 取得 SSH 金鑰
./infrastructure/deploy.sh dev ssh-key

# 5. 連線到實例
./infrastructure/deploy.sh dev ssh
```

#### Prod 環境

```bash
# 設定 RDS 密碼（敏感資訊）
export TF_VAR_rds_master_password="your_secure_password"

# 部署
./infrastructure/deploy.sh prod init
./infrastructure/deploy.sh prod plan
./infrastructure/deploy.sh prod apply
```

---

## 💰 成本預估

### Dev 環境（$25/月）
- **Lightsail**: $20/月（4 GB RAM, 2 vCPU）
- **S3**: $2-5/月
- **RDS**: 使用 Docker PostgreSQL（免費）

### Prod 環境（$65/月）
- **Lightsail**: $40/月（8 GB RAM, 2 vCPU）
- **RDS PostgreSQL**: $15/月
- **S3 + CloudFront**: $10/月

---

## 📊 架構圖

### Dev 環境
```
┌─────────────────────────────────────┐
│   Lightsail Instance ($20/月)       │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Docker Compose              │  │
│  ├──────────────────────────────┤  │
│  │  • 11 個微服務                │  │
│  │  • PostgreSQL                │  │
│  │  • Redis                     │  │
│  │  • Kafka                     │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
            ↓
     ┌─────────────┐
     │  S3 Bucket  │
     └─────────────┘
```

### Prod 環境
```
┌─────────────────────────────────────┐
│   Lightsail Instance ($40/月)       │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Docker Compose              │  │
│  ├──────────────────────────────┤  │
│  │  • 11 個微服務                │  │
│  │  • Redis                     │  │
│  │  • Kafka                     │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
            ↓
     ┌─────────────────┐
     │ RDS PostgreSQL  │
     │   ($15/月)       │
     └─────────────────┘
            ↓
     ┌─────────────────┐
     │  S3 + CloudFront│
     │   ($10/月)       │
     └─────────────────┘
```

---

## 🔧 主要特性

### Terraform
✅ 模組化設計（Lightsail, RDS, S3）
✅ Dev/Prod 環境分離
✅ 自動生成 SSH Key
✅ 完整的輸出（IP、endpoint 等）
✅ 安全設定（加密、VPC、Security Groups）

### Docker
✅ Multi-stage builds（優化映像大小）
✅ Health checks
✅ Non-root user（安全性）
✅ 自動重啟機制
✅ 網路隔離

### 部署腳本
✅ 一鍵部署
✅ 環境切換（dev/prod）
✅ SSH 連線整合
✅ 安全確認機制

---

## 📝 下一步

1. **設定 AWS Credentials**
   ```bash
   aws configure
   # 填入 Access Key、Secret Key、Region
   ```

2. **準備密鑰**
   - JWT Secret（至少 32 字元）
   - Stripe API Keys
   - RDS Password（Prod）

3. **測試部署**
   ```bash
   # 先在 Dev 測試
   ./infrastructure/deploy.sh dev apply
   
   # 確認無誤後部署 Prod
   ./infrastructure/deploy.sh prod apply
   ```

4. **設定 DNS**（可選）
   - Route 53 設定域名
   - 指向 Lightsail IP

5. **啟用監控**
   - CloudWatch Logs
   - Cost Explorer
   - Billing Alerts

---

## 🐛 故障排除

查看詳細文檔：`infrastructure/README.md`

常見問題：
- Terraform 錯誤 → 檢查 AWS credentials
- Docker 無法啟動 → 檢查 .env 配置
- 連不到 RDS → 檢查 Security Group

---

## 📚 相關文檔

- [AWS 部署方案](../docs/AWS_DEPLOYMENT.md)
- [Infrastructure README](./README.md)
- [Docker Compose 說明](./docker/README.md)

---

**準備好了嗎？開始部署吧！** 🚀
