# Infrastructure Setup Guide

## 📋 前置需求

1. **安裝 Terraform**
   ```bash
   # macOS
   brew install terraform
   
   # 驗證
   terraform version
   ```

2. **安裝 AWS CLI**
   ```bash
   # macOS
   brew install awscli
   
   # 設定 AWS credentials
   aws configure
   ```

3. **安裝 Docker & Docker Compose**
   ```bash
   # macOS
   brew install docker docker-compose
   ```

---

## 🚀 快速開始

### 1. Terraform 部署

#### Dev 環境

```bash
cd infrastructure/terraform/environments/dev

# 初始化 Terraform
terraform init

# 檢查計劃
terraform plan

# 部署
terraform apply

# 取得輸出（包含 SSH 私鑰）
terraform output -raw ssh_private_key > ~/.ssh/suggar-daddy-dev.pem
chmod 600 ~/.ssh/suggar-daddy-dev.pem

# 取得 IP
LIGHTSAIL_IP=$(terraform output -raw lightsail_ip)
echo "Lightsail IP: $LIGHTSAIL_IP"
```

#### Prod 環境

```bash
cd infrastructure/terraform/environments/prod

# 設定 RDS 密碼
export TF_VAR_rds_master_password="your_secure_password"

# 初始化
terraform init

# 部署
terraform apply

# 取得輸出
terraform output
```

---

### 2. Docker Compose 部署（Dev 本地）

```bash
cd infrastructure/docker

# 複製環境變數檔案
cp .env.example .env

# 編輯 .env，填入你的密鑰
vim .env

# 啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down
```

---

### 3. 部署到 Lightsail

#### SSH 連線到 Lightsail

```bash
# 使用 Terraform 產生的私鑰
ssh -i ~/.ssh/suggar-daddy-dev.pem ubuntu@<LIGHTSAIL_IP>
```

#### 在 Lightsail 上部署

```bash
# 1. Clone 專案
cd /opt
sudo git clone https://github.com/yourorg/suggar-daddy.git
sudo chown -R ubuntu:ubuntu suggar-daddy
cd suggar-daddy

# 2. 設定環境變數
cd infrastructure/docker
cp .env.example .env
vim .env  # 填入生產環境的密鑰

# 3. 啟動服務
docker-compose up -d

# 4. 查看狀態
docker-compose ps
docker-compose logs -f api-gateway
```

---

## 📊 成本預估

### Dev 環境
```
Lightsail (medium_2_0):  $20/月
S3:                      $2-5/月
────────────────────────────────
總計:                    ~$25/月
```

### Prod 環境
```
Lightsail (large_2_0):   $40/月
RDS PostgreSQL:          $15/月
S3 + CloudFront:         $10/月
────────────────────────────────
總計:                    ~$65/月
```

---

## 🔧 管理命令

### Terraform

```bash
# 查看當前狀態
terraform show

# 查看輸出
terraform output

# 銷毀資源（小心使用！）
terraform destroy

# 僅更新特定資源
terraform apply -target=module.lightsail
```

### Docker Compose

```bash
# 重啟特定服務
docker-compose restart api-gateway

# 查看特定服務日誌
docker-compose logs -f auth-service

# 進入容器
docker-compose exec api-gateway sh

# 重新建立容器
docker-compose up -d --build

# 清理未使用的資源
docker system prune -a
```

---

## 🔒 安全建議

### 1. SSH Key 管理
```bash
# 產生新的 SSH key
ssh-keygen -t ed25519 -C "suggar-daddy-prod"

# 上傳到 Lightsail
aws lightsail put-instance-public-ports \
  --instance-name suggar-daddy-prod \
  --port-infos fromPort=22,toPort=22,protocol=tcp,cidrs=YOUR_IP/32
```

### 2. 環境變數加密
```bash
# 使用 AWS Secrets Manager
aws secretsmanager create-secret \
  --name suggar-daddy/prod/rds-password \
  --secret-string "your_password"
```

### 3. 資料庫密碼
- Dev: 可以使用簡單密碼
- Prod: 至少 16 字元，包含大小寫、數字、特殊符號

---

## 🐛 故障排除

### Terraform 錯誤

**問題**: `Error: Invalid provider configuration`
```bash
# 解決: 檢查 AWS credentials
aws sts get-caller-identity
```

**問題**: `Error: Resource already exists`
```bash
# 解決: Import 現有資源
terraform import module.lightsail.aws_lightsail_instance.main <instance-name>
```

### Docker 問題

**問題**: 容器無法啟動
```bash
# 查看詳細日誌
docker-compose logs <service-name>

# 檢查健康狀態
docker-compose ps
```

**問題**: 連不到資料庫
```bash
# 檢查網路
docker network inspect suggar-network

# 測試連線
docker-compose exec api-gateway ping postgres
```

---

## 📚 下一步

1. [設定 CI/CD](./CICD.md)
2. [監控與告警](./MONITORING.md)
3. [備份策略](./BACKUP.md)
4. [擴展指南](./SCALING.md)
