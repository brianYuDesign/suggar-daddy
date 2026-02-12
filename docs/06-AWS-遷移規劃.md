# AWS 逐步遷移規劃

本文件為 Sugar Daddy 後端從現有環境（本地 / 自建）**逐步遷移**到 AWS 的階段性計畫，採「先基礎設施、再應用」的方式，降低風險並可隨時回滾。

---

## 現狀摘要

| 項目 | 現況 |
|------|------|
| 架構 | Nx Monorepo + NestJS 微服務 |
| 服務 | Auth、User、Matching、Subscription、Content、Payment、Media、Messaging、Notification、DB Writer、Admin（共 12 個後端服務） |
| 資料層 | PostgreSQL、Redis、Kafka |
| 部署 | Docker Compose（本地開發）、Kafka 在 `suggar-daddy/docker-compose.yml` |
| 監控 | Prometheus + Grafana + Exporters |
| 資料流 | API → Redis 讀 / Kafka 寫 → DB Writer → PostgreSQL |

---

## 遷移原則

1. **逐步遷移**：一個階段驗證後再進行下一階段，不一次全搬。
2. **先託管資料、再託管應用**：先讓 RDS / ElastiCache / MSK 上線，應用可暫時仍跑在現有環境。
3. **環境變數驅動**：同一套程式碼用不同環境變數切換本地 / AWS，方便比對與回滾。
4. **保留本地與監控**：本地 Docker 環境維持不變，監控可先並存（Prometheus/Grafana 或 AWS 方案並行）。

---

## 階段總覽

| 階段 | 重點 | 預估時間 | 可回滾性 |
|------|------|----------|----------|
| 0 | AWS 基礎：帳號、VPC、IAM、網路 | 1–2 週 | 高 |
| 1 | 託管資料層：RDS、ElastiCache、MSK | 2–4 週 | 高 |
| 2 | 容器與計算：ECR、ECS 或 EKS 試跑 | 2–3 週 | 高 |
| 3 | 流量與服務：ALB、API Gateway、逐步切服務 | 2–4 週 | 中 |
| 4 | 觀測與維運：CloudWatch、日誌、告警 | 1–2 週 | 高 |
| 5 | CI/CD：建置、部署自動化 | 1–2 週 | 高 |

以下各階段可再依人力拆成更小的迭代（例如先只上 RDS，再上 Redis）。

---

## 階段 0：AWS 基礎建設

**目標**：建立安全、可擴展的網路與權限基礎，不遷移任何應用或資料。

### 0.1 帳號與組織（建議）

- 使用 **AWS Organizations** 區分 dev / staging / prod。
- 各環境獨立帳號或 OU，便於成本與權限隔離。
- 啟用 **Cost Explorer**、**Budget** 與必要 **CloudTrail**。

### 0.2 網路（VPC）

- 在目標 Region（例如 `ap-northeast-1`）建立 **VPC**。
- 至少 2 個 **AZ**，各 AZ 內：
  - **Public subnet**：給 ALB、NAT、Bastion（若需要）。
  - **Private subnet**：給 RDS、Redis、MSK、ECS/EKS 等。
- **NAT Gateway**（或 NAT Instance）讓 Private subnet 可對外（拉映像、呼叫 Stripe 等）。
- 若有現有機房或 VPN，可後續加 **VPN / Direct Connect** 做混合架構。

### 0.3 IAM

- 建立 **部署用 IAM User / Role**（僅授予必要權限，例如 ECR、ECS、RDS 等）。
- 為 **CI/CD** 預留 Role（例如 GitHub Actions OIDC 或 CodeBuild Role）。
- 避免長期 Access Key；優先使用 **Role + 短期憑證**。

### 0.4 檢查點

- [ ] VPC / Subnet / Route Table / NACL 規劃完成並建好。
- [ ] Private 子網內 EC2 或 ECS 可經 NAT 訪問外網。
- [ ] IAM 最小權限、無 Root 日常使用。

**產出**：VPC ID、Subnet ID、可用 AZ 清單、IAM Role 名稱等，供後續階段使用。

---

## 階段 1：託管資料層（先遷資料、應用可後遷）

**目標**：在 AWS 建立 PostgreSQL、Redis、Kafka 的託管服務，應用仍可跑在現有環境，僅改連線字串做驗證。

### 1.1 RDS PostgreSQL

- 建立 **RDS for PostgreSQL 16**（與目前版本一致）。
- 放在 **Private subnet**，安全群組僅開放 5432 給應用所在網段（或之後的 ECS 安全群組）。
- 建議先單 AZ，之後再加 **Multi-AZ** 與 **讀取副本**（對應現有讀寫分離設計）。
- 參數群組與 **DB_MASTER_HOST / DB_REPLICA_HOSTS** 對齊（見 [04-運維與效能.md](./04-運維與效能.md)）。
- 從現有 DB **匯出 / 匯入**（pg_dump → S3 → RDS 還原），或若資料量小可先空庫上線再同步。

**環境變數切換範例**：

```bash
# 切到 AWS RDS 時
DATABASE_HOST=<rds-endpoint>
DATABASE_PORT=5432
# 若啟用讀寫分離
DB_MASTER_HOST=<rds-primary>
DB_REPLICA_HOSTS=<rds-replica>
```

### 1.2 ElastiCache Redis

- 建立 **ElastiCache for Redis 7**，放在 Private subnet。
- 先 **單節點** 或 **Cluster Mode Disabled** 即可，之後再評估 **Cluster Mode** 以對應「Redis Cluster」目標。
- 安全群組僅允許應用與 DB Writer 等服務存取 6379。
- 應用端將 **REDIS_URL** 改為 ElastiCache 端點即可。

### 1.3 Amazon MSK（Kafka）

- 建立 **Amazon MSK**（Kafka 託管），建議 **2+ broker**、2 AZ。
- 使用 **IAM 認證** 或 **SASL/SCRAM**，並在 Private subnet。
- 建立與現有邏輯對應的 **Topic**（可對照 `KAFKA_TOPICS` 與各服務的 produce/consume）。
- 應用端改 **KAFKA_BROKERS** 為 MSK bootstrap servers。

**注意**：MSK 與自建 Kafka 的 broker 字串、認證方式不同，需在 libs/kafka 或各 app 的 Kafka 設定中支援（例如 IAM 或 SASL），可先在一支服務上試連。

### 1.4 檢查點

- [ ] RDS 可從本機或測試機連線，並完成一次 pg_restore 或遷移腳本驗證。
- [ ] ElastiCache 可連線，現有 Redis 讀寫邏輯在測試環境跑一輪。
- [ ] MSK Topic 建立完成，至少一個 Producer（如 auth-service）與 Consumer（如 db-writer-service）能成功送收訊息。
- [ ] 環境變數文件（如 `.env.example` 或內部維運文件）已區分「本地 / AWS」兩套。

**產出**：RDS endpoint、ElastiCache endpoint、MSK bootstrap servers、對應的 security group 與 IAM 設定說明。

---

## 階段 2：容器與計算（先一個服務試跑）

**目標**：把映像推到 ECR，並在 ECS（或 EKS）上跑起「一個」微服務，仍連階段 1 的 RDS/Redis/MSK。

### 2.1 映像儲存

- 建立 **ECR** repository（可依服務命名，例如 `suggar-daddy/auth-service`）。
- 在本地或 CI 使用 `docker build` + `docker push` 推送映像（需先 `aws ecr get-login-password` 登入）。

### 2.2 計算選擇（二擇一或並行試跑）

**選項 A：Amazon ECS（Fargate）**

- 建立 **ECS Cluster**、**Task Definition**（CPU/Memory、環境變數、連到 RDS/Redis/MSK 的 VPC 設定）。
- 使用 **Secrets Manager** 或 **SSM Parameter Store** 存 DB 密碼、Stripe key 等，Task Definition 從中注入。
- 先不掛 ALB，用 **Assign public IP** 或 **NAT** 做健康檢查與除錯；確認無誤後再在階段 3 掛 ALB。

**選項 B：Amazon EKS**

- 若團隊已有 Kubernetes 經驗或打算長期用 K8s，可建 **EKS Cluster**。
- 用 **Helm** 或 manifest 部署一個服務（如 auth-service），同樣透過環境變數連階段 1 的資料層。
- Ingress 可留到階段 3 再上。

### 2.3 建議先上線的服務

- **auth-service** 或 **user-service**：依賴少、介面清晰，適合做「第一個在 AWS 上跑的服務」。
- 該服務的 **DATABASE_* / REDIS_URL / KAFKA_BROKERS** 全部指到階段 1 的 AWS 資源。

### 2.4 檢查點

- [ ] 映像可成功 push 到 ECR 並被 ECS/EKS 拉取。
- [ ] 至少一個服務在 ECS/EKS 內啟動並通過健康檢查。
- [ ] 該服務能成功連 RDS、Redis、MSK（可打一兩個 API 或看日誌驗證）。

**產出**：ECR 倉庫名、ECS Task Definition 或 EKS manifest 範本、部署步驟說明。

---

## 階段 3：流量與服務逐步切換

**目標**：對外提供入口（ALB + 可選 API Gateway），並將流量從現有環境「逐步」切到 AWS 上的服務。

### 3.1 負載平衡與網域

- 建立 **Application Load Balancer (ALB)** 在 Public subnet。
- 若有網域，在 **Route 53** 建立 Hosted Zone（或委派），用 **ALB alias** 或 CNAME 指到 ALB。
- **SSL**：用 **ACM** 在 ALB 上掛 HTTPS，保留 HTTP 重導向到 HTTPS。

### 3.2 API Gateway（可選）

- 若希望統一對外介面、限流、API Key，可加一層 **API Gateway HTTP API** 或 **REST API**，後端指到 ALB 或個別服務的 NLB/ALB。
- 若現有架構已是單一 API Gateway 對多微服務，可先在 AWS 用 ALB 做路徑或 Host 導向，再視需求引入 API Gateway。

### 3.3 服務切換策略

- **藍綠或金絲雀**：同一服務在「現有環境」與「AWS」並存，用 ALB 權重或 Route 53 權重做部分流量切換。
- **按服務切**：例如先切 Auth/User，再切 Matching、Payment 等；未切換的服務仍回傳到現有環境的 Gateway。
- 需注意 **跨環境呼叫**（例如 AWS 上的 auth-service 呼叫仍在本地的 user-service）：可透過「內部 API 基址」環境變數區分，必要時在 VPC 與現有機房間拉 VPN。

### 3.4 檢查點

- [ ] ALB 健康檢查通過，至少一個在 AWS 上的服務可經 ALB 對外回應。
- [ ] HTTPS 與網域正常。
- [ ] 已規劃「先切哪幾個服務、再切哪幾個」的順序與回滾步驟。

**產出**：ALB DNS、API 基址、切換與回滾 Runbook。

---

## 階段 4：觀測與維運

**目標**：日誌、指標、告警集中在 AWS，可選保留既有 Grafana 做對比。

### 4.1 日誌

- 應用輸出 **stdout/stderr**，由 ECS/EKS 的 **FireLens** 或 **Fluent Bit** 送到 **CloudWatch Logs**。
- 或使用 **CloudWatch Logs Agent**（若跑在 EC2）。
- 建立 **Log Group** 與保留天數，必要時用 **Subscription Filter** 觸發 Lambda 或告警。

### 4.2 指標與告警

- **CloudWatch Metrics**：從 ALB、RDS、ElastiCache、MSK、ECS 自動取得基本指標。
- **自訂指標**：若應用有暴露 Prometheus 格式，可用 **CloudWatch Agent** 或 **ADOT** 收集後送到 CloudWatch。
- **告警**：在 CloudWatch Alarms 設定閾值（CPU、錯誤率、RDS 連線數等），通知 **SNS → Email / Slack**。

### 4.3 與現有監控並存

- 可保留現有 **Prometheus + Grafana** 抓取 AWS 上服務的 metrics（需網路可達或透過 VPN）。
- 或逐步改為 **Grafana Cloud** / **Amazon Managed Grafana** 連 CloudWatch 資料源，再關閉自建 Prometheus。

### 4.4 檢查點

- [ ] 關鍵服務的日誌可在 CloudWatch 查詢。
- [ ] 至少一個 CloudWatch Alarm 已設定並測試通知。
- [ ] 維運文件已更新（誰負責看告警、如何查日誌）。

**產出**：Log Group 清單、Alarm 清單、Grafana/CloudWatch 使用說明。

---

## 階段 5：CI/CD 自動化

**目標**：程式碼變更後自動建置映像、跑測試、部署到指定環境。

### 5.1 建置

- **AWS CodeBuild** 或 **GitHub Actions**：在 push/PR 時執行 `nx build <app>`、`docker build`、單元測試。
- 建置成功後 **push 到 ECR**，並打上 tag（例如 `git-sha`、`latest`）。

### 5.2 部署

- **ECS**：用 **CodeDeploy** 藍綠或 Rolling 更新 Task Definition；或 **GitHub Actions** 呼叫 `aws ecs update-service`。
- **EKS**：用 **Helm** 或 **kubectl set image** 在 CI 中更新 deployment。
- 敏感參數從 **Secrets Manager / Parameter Store** 讀取，不寫進程式碼或映像。

### 5.3 檢查點

- [ ] 指定分支 push 後會觸發建置並更新 ECR。
- [ ] 部署流程可一鍵或自動更新指定環境（如 staging），且回滾步驟已演練過。

**產出**：CI/CD 流程圖、觸發條件、部署與回滾 Runbook。

---

## 風險與回滾

| 風險 | 緩解 |
|------|------|
| 資料庫遷移失敗或延遲 | 先做 pg_dump 還原演練；可保留舊 DB 唯讀一段時間對比 |
| Kafka 訊息格式或 Topic 不一致 | 在 MSK 建立與本機相同 Topic 名稱與 partition 策略；先單一 consumer 試跑 |
| 網路或安全群組設定錯誤 | 用最小權限、文件記錄每個 SG 用途；必要時用 VPC Flow Logs 除錯 |
| 成本超支 | Budget 告警、階段 0 就設好；優先使用 Reserved Capacity（RDS/ElastiCache）當流量穩定後 |
| 回滾需求 | 每階段保留「環境變數改回本機/原環境」即可回滾的選項；DB 可做快照再還原 |

---

## 建議執行順序（精簡版）

1. **階段 0**：開好 VPC、IAM、子網、NAT。
2. **階段 1a**：只上 **RDS**，應用改連 RDS 做一次完整回歸。
3. **階段 1b**：上 **ElastiCache**，再跑一輪回歸。
4. **階段 1c**：上 **MSK**，Topic 與一組 producer/consumer 驗證通過。
5. **階段 2**：一個服務（如 auth-service）上 ECS/EKS，連 AWS 的 RDS/Redis/MSK。
6. **階段 3**：ALB + 網域，小流量或單一服務切到 ALB。
7. **階段 4**：CloudWatch 日誌與告警上線。
8. **階段 5**：CI 建置 + 部署自動化。
9. 其餘服務依依賴關係與優先級，重複 2→3 逐步遷移。

每完成一個子階段都可停下來營運一段時間再進行下一步，以「慢慢遷移」為前提調整節奏即可。

---

## 成本估算

### 方案 A：MVP 階段（月費約 $80）

適用：用戶 < 10,000、DAU < 1,000

| 項目 | 月費 |
|------|------|
| Lightsail (8GB/4vCPU) | $40 |
| RDS PostgreSQL (t4g.micro) | $15 |
| ElastiCache Redis (t4g.micro) | $12 |
| S3 + CloudFront | $10 |
| **合計** | **~$77** |

### 方案 B：成長期（月費約 $200–300）

適用：用戶 10K–100K、需高可用

- ECS Fargate + ALB
- RDS Multi-AZ
- ElastiCache Cluster
- MSK Serverless

### 方案 C：擴展期（月費約 $500–1000）

適用：100K+ 用戶

- ECS Fargate Auto Scaling
- RDS Aurora Serverless
- MSK / Confluent Cloud
- CloudFront + WAF

---

## 相關文件

- [01-專案架構與設計](./01-專案架構與設計.md)
- [04-運維與效能](./04-運維與效能.md)
- [03-資料庫遷移](./03-資料庫遷移.md)
- [infrastructure/docker/](../infrastructure/docker/)
