# 🏗️ Sugar-Daddy 系統架構文檔

## 系統概述

Sugar-Daddy 是一個現代化的視頻流媒體和訂閱管理平台，採用微服務架構。

### 架構特點

- ✅ **微服務設計** - 5 個獨立服務，高度解耦
- ✅ **API Gateway 模式** - 統一入口，請求路由
- ✅ **非同步處理** - 隊列和事件驅動
- ✅ **數據分離** - 每個服務有獨立數據庫
- ✅ **容器化部署** - 完整 Docker/Kubernetes 支持
- ✅ **監控告警** - Prometheus + Grafana 實時監控

---

## 📐 系統整體架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端應用層                                │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  Web UI      │  │  Mobile App  │  │  Third-party Apps   │   │
│  │  (React)     │  │  (iOS/Android)   │  (API Clients)      │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    🌉 API Gateway (Express)
                      Port: 3000
                     (路由、認證、速率限制)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        後端服務層                                │
│                                                                  │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │              │              │              │              │  │
│  ▼              ▼              ▼              ▼              ▼  │
│
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│ │ Auth Service │ │Content Stream │ │ Payment Srv  │ │Subscr...│ │
│ │(NestJS)      │ │ (NestJS)      │ │ (NestJS)     │ │(NestJS) │ │
│ │              │ │               │ │              │ │         │ │
│ │ - Auth       │ │ - Upload      │ │ - Payments   │ │ - Plans │ │
│ │ - Users      │ │ - Streaming   │ │ - Refunds    │ │ - Mgmt  │ │
│ │ - Roles      │ │ - Transcode   │ │ - Analytics  │ │ - Bill  │ │
│ │ - Perms      │ │ - Quality     │ │ - Webhooks   │ │         │ │
│ │              │ │               │ │              │ │         │ │
│ │ Port: 3001   │ │ Port: 3001    │ │ Port: 3002   │ │3003     │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │            🤖 Recommendation Service (Node.js)          │   │
│  │                                                          │   │
│  │  - ML-based Recommendations                             │   │
│  │  - Interaction Tracking                                 │   │
│  │  - User Preferences                                     │   │
│  │                                                          │   │
│  │  Port: 3004                                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        數據層                                    │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │PostgreSQL│  │PostgreSQL│  │PostgreSQL│  │PostgreSQL      │  │
│  │Auth DB   │  │Content DB│  │Payment DB│  │Subscription DB │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AWS S3 (視頻存儲)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        Redis Cache (會話、快取)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      外部服務集成                                │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │  Stripe  │  │  Twilio  │  │  SendGrid│  │  AWS Services   │ │
│  │ Payment  │  │   SMS    │  │  Email   │  │ (S3, CloudFront)│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 數據流圖

### 1. 用戶登入流程

```
┌─────────────┐
│ User        │
└──────┬──────┘
       │ 輸入認證信息
       ▼
┌─────────────────────┐
│ API Gateway         │
│ - 驗證格式          │
│ - 速率限制          │
└──────┬──────────────┘
       │ 轉發到 Auth Service
       ▼
┌─────────────────────┐
│ Auth Service        │
│ - 查詢數據庫        │
│ - 驗證密碼          │
│ - 生成 JWT Token    │
└──────┬──────────────┘
       │ 緩存 Session
       ▼
┌─────────────────────┐
│ Redis Cache         │
│ - 存儲會話         │
└──────┬──────────────┘
       │ 返回 Token
       ▼
┌─────────────┐
│ User        │
│ Token: JWT  │
└─────────────┘
```

### 2. 視頻上傳和轉碼流程

```
┌──────────────────┐
│ User App         │
│ - 選擇視頻文件   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ API Gateway /api/uploads/initiate │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Content-Streaming Service            │
│ - 創建上傳會話 (Session)             │
│ - 生成 SessionId                    │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Redis - 存儲會話信息                 │
└────────┬─────────────────────────────┘
         │
    ╔════╩════════════════════════════════════╗
    │                                         │
    ▼                                         ▼
┌──────────────────┐               ┌──────────────────┐
│ 分片上傳 (Loop)  │               │ 監控進度          │
│ POST /chunk      │               │ GET /status      │
└────────┬─────────┘               └──────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ AWS S3                               │
│ - 存儲視頻分片                       │
└────────┬─────────────────────────────┘
         │ (當所有分片上傳完成)
         ▼
┌──────────────────────────────────────┐
│ POST /uploads/{sessionId}/complete   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Content-Streaming Service            │
│ - 合併視頻文件                       │
│ - 創建視頻記錄                       │
│ - 發送轉碼任務                       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ 隊列 / 事件系統                      │
│ - 轉碼任務發送                       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ FFmpeg Worker (後臺轉碼)            │
│ - 生成多種質量版本                   │
│ - 縮略圖生成                         │
│ - 元數據提取                         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ AWS S3                               │
│ - 存儲轉碼後的視頻                   │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Content-Streaming Service            │
│ - 更新視頻狀態 (ready)               │
│ - 更新數據庫                         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────┐
│ 用戶看到     │
│ 視頻已就緒   │
└──────────────┘
```

### 3. 支付流程

```
┌──────────────┐
│ User         │
│ 訂閱計劃     │
└────────┬─────┘
         │
         ▼
┌────────────────────────────────────┐
│ POST /api/payments/intent       │
│ (選擇支付方式、金額)              │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Payment Service                    │
│ - 驗證金額                         │
│ - 建立 Payment Intent              │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Stripe / 支付網關                  │
│ - 生成客戶端密鑰                   │
└────────┬───────────────────────────┘
         │ 返回 clientSecret
         ▼
┌──────────────┐
│ 用戶         │
│ 支付頁面     │
└────────┬─────┘
         │ 填寫支付信息
         ▼
┌────────────────────────────────────┐
│ POST /api/payments/confirm      │
│ (提交支付信息)                    │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Payment Service                    │
│ - 調用 Stripe API                  │
│ - 確認支付                         │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Stripe                             │
│ - 處理信用卡                       │
│ - 返回確認                         │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Payment Service                    │
│ - 儲存支付記錄                     │
│ - 發送事件                         │
└────────┬───────────────────────────┘
         │
    ╔════╩═══════════════════════╗
    │                            │
    ▼                            ▼
┌──────────────┐      ┌──────────────────────┐
│ 更新訂閱     │      │ 發送確認郵件         │
│ 開通服務     │      │ (SendGrid)          │
└──────────────┘      └──────────────────────┘
```

---

## 🔗 服務通信圖

```
Auth Service
    │
    ├─────────────────────┬──────────────────────┬──────────────────┐
    │                     │                      │                  │
    ▼                     ▼                      ▼                  ▼
API Gateway ◄───── Content-Streaming      Payment Service    Subscription
(驗證)           (檢查用戶權限)          (驗證Token)        (查詢計劃)
    │
    │
    └────────────────────────────┬─────────────────────────────────┐
                                 │                                 │
                                 ▼                                 ▼
                        Recommendation             外部Services
                        (用戶交互記錄)              (Stripe, Email)

非同步通信:
Auth Service ─────┐
Content-Stream────├─► Message Queue ─────► Worker Processes
Payment Service ──┤
Subscription ─────┤
Recommendation────┘
```

---

## 📦 部署拓撲圖

```
互聯網
  │
  ▼
┌─────────────────────────────────────┐
│     AWS Load Balancer               │
│     (HTTPS, SSL 終止)               │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────────────────────────────────────────────┐
│          Kubernetes 集群 (EKS)                 │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Ingress (API Gateway)                   │ │
│  └───────┬────────────────────┬─────────────┘ │
│          │                    │               │
│    ┌─────▼────┐        ┌──────▼──────┐       │
│    │ Pod 副本  │        │ Pod 副本    │       │
│    │ (多個)    │        │ (自動擴展)  │       │
│    └──────────┘        └─────────────┘       │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Service Discovery (CoreDNS)              │ │
│  │  - Auth Service (3001)                    │ │
│  │  - Content Service (3001)                 │ │
│  │  - Payment Service (3002)                 │ │
│  │  - Subscription Service (3003)            │ │
│  │  - Recommendation Service (3004)          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  PersistentVolumes (數據儲存)             │ │
│  │  - Database Volumes                       │ │
│  │  - Cache Volumes                          │ │
│  │  - Log Volumes                            │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
  RDS      ElastiCache   S3
(PostgreSQL) (Redis)  (視頻)
  (多可用區) (多節點) (CDN)
```

---

## 🗄️ 數據庫架構

### 共享數據模型

```sql
-- Auth Service 數據庫
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  status ENUM('active', 'inactive', 'suspended'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  description TEXT,
  created_at TIMESTAMP
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  resource VARCHAR(255),
  action VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP
);

-- 關聯表
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- Content Service 數據庫
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  uploaded_by UUID REFERENCES users(id),
  duration INTEGER,
  status ENUM('draft', 'processing', 'ready', 'archived'),
  s3_key VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Payment Service 數據庫
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  status ENUM('pending', 'completed', 'failed', 'refunded'),
  payment_method VARCHAR(50),
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMP
);

-- Subscription Service 數據庫
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status ENUM('active', 'paused', 'cancelled'),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  auto_renew BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  price DECIMAL(10,2),
  billing_cycle VARCHAR(50),
  created_at TIMESTAMP
);
```

---

## 🔐 安全架構

```
┌──────────────────────────────────────────────────┐
│               HTTPS / TLS 加密                    │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│         API Gateway (認證層)                     │
│  - JWT Token 驗證                                │
│  - 速率限制 (Rate Limiting)                      │
│  - 請求日誌記錄                                  │
│  - DDoS 保護                                     │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│      微服務 (細粒度權限控制)                     │
│  - RBAC (Role-Based Access Control)              │
│  - 服務間認證 (mTLS)                            │
│  - 審計日誌                                      │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│          數據庫層 (加密存儲)                      │
│  - 密碼 Hash (bcrypt)                            │
│  - 敏感數據加密                                  │
│  - 數據庫防火牆                                  │
│  - 備份加密                                      │
└──────────────────────────────────────────────────┘
```

---

## 📊 擴展性設計

### 水平擴展

```
負載均衡器
    │
    ├─► Auth Service (副本 1)  ┐
    ├─► Auth Service (副本 2)  │
    ├─► Auth Service (副本 3)  │ 自動擴展
    │                          │ (基於 CPU/Memory)
    ├─► Content Service (副本 1) ┤
    ├─► Content Service (副本 2) │
    └─► Content Service (副本 3) │
                               ┘
```

### 垂直擴展

```
服務配置調整:
- Pod 資源: 100m CPU → 500m CPU
- 內存: 256Mi → 1Gi
- 數據庫連接池: 5 → 20
```

---

## 🔍 監控和可觀測性

### Prometheus 指標

```
sugar_daddy_http_requests_total{method="GET", status="200"}
sugar_daddy_http_request_duration_seconds{service="auth"}
sugar_daddy_database_connections_active{service="payment"}
sugar_daddy_cache_hit_ratio{cache="redis"}
sugar_daddy_queue_depth{queue="transcoding"}
```

### 日誌管理

```
應用日誌 ──┐
系統日誌 ──┼─► Elasticsearch
審計日誌 ──┤
性能日誌 ──┘
               │
               ▼
           Kibana (可視化)
               │
               ▼
           告警規則
```

---

## 🔌 集成點

| 服務 | 集成方式 | 用途 |
|-----|---------|------|
| Stripe | REST API | 支付處理 |
| SendGrid | SMTP + REST API | 郵件發送 |
| Twilio | REST API | SMS 發送 |
| AWS S3 | SDK | 視頻存儲 |
| AWS CloudFront | SDK | CDN 分發 |
| Firebase | SDK | 推送通知 |

---

## 📈 性能優化

### 快取策略

```
    用戶請求
        │
        ▼
    ┌─ Redis 快取
    │   (5 分鐘)
    │   ├─ 用戶信息
    │   ├─ 推薦列表
    │   └─ 視頻元數據
    │
    └─ 數據庫查詢
        (如果快取未命中)
```

### CDN 分發

```
用戶 ─┬─► CDN 邊界節點 (快速)
      │   - 視頻預告片
      │   - 靜態資源
      │
      └─► 源伺服器 (備用)
          - 完整視頻
          - 實時內容
```

---

## 🚀 部署流程

```
1. 開發者推送代碼到 Git
                ↓
2. CI/CD 觸發 (GitHub Actions)
   - 單元測試
   - 集成測試
   - 代碼掃描
                ↓
3. 構建 Docker 鏡像
   - 編譯應用
   - 創建層
   - 推送到註冊表
                ↓
4. 部署到 Kubernetes
   - 更新部署配置
   - 滾動更新
   - 健康檢查
                ↓
5. 生產驗證
   - 煙霧測試
   - 監控告警
   - 功能驗證
```

---

## 📚 參考資源

- [服務架構詳細說明](./SERVICE_ARCHITECTURE.md)
- [數據庫架構](./DATABASE_SCHEMA.md)
- [API 網關配置](./GATEWAY_CONFIG.md)
- [部署指南](../operations/DEPLOYMENT.md)

---

**最後更新**: 2026-02-19  
**版本**: 1.0.0  
**狀態**: ✅ 完整
