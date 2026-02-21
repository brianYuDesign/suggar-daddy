# Sugar-Daddy 專案架構學習筆記

## 📋 專案概述

**Sugar-Daddy** 是一個內容創作者社交平台（類似 OnlyFans × Tinder 融合），提供訂閱制內容分享、視頻流媒體、支付訂閱管理等功能。

---

## 🏗️ 系統架構

### 微服務架構 (Microservices)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Next.js 14)                      │
│  ┌──────────────┬──────────────┬──────────────┬────────────────┐ │
│  │   Explore    │   Creator    │    Admin     │   Analytics    │ │
│  │   (發現)     │   (創作者)    │   (管理員)    │   (數據分析)    │ │
│  └──────────────┴──────────────┴──────────────┴────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    API Gateway (Port 3000)                       │
│              (路由轉發、JWT驗證、Rate Limiting)                   │
└───────┬─────────────┬─────────────┬─────────────┬───────────────┘
        │             │             │             │
┌───────▼──┐  ┌───────▼──┐  ┌───────▼──┐  ┌───────▼──┐  ┌────────▼──────┐
│  Auth    │  │ Content  │  │Recommend │  │ Payment  │  │ Subscription  │
│ Service  │  │Streaming │  │ Service  │  │ Service  │  │   Service     │
│  :3001   │  │  :3001   │  │  :3000   │  │  :3002   │  │    :3003      │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘
     │             │             │             │                │
     └─────────────┴─────────────┴─────────────┴────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      PostgreSQL 16 + Redis 7  │
                    └───────────────────────────────┘
```

---

## 🛠️ 技術棧

### 後端 (Backend)
| 組件 | 技術 | 說明 |
|------|------|------|
| 框架 | **NestJS 10.x** | 企業級 Node.js 框架 |
| 語言 | **TypeScript 5.x** | 類型安全 |
| ORM | **TypeORM 0.3.x** | 數據庫操作 |
| 數據庫 | **PostgreSQL 14+** | 主要數據存儲 |
| 緩存 | **Redis 7+** | 快取、隊列、Session |
| 認證 | **JWT + Passport** | 身份驗證 |
| API | **RESTful + OpenAPI** | API 設計 |

### 前端 (Frontend)
| 組件 | 技術 | 說明 |
|------|------|------|
| 框架 | **Next.js 14** | React SSR/SSG |
| 語言 | **TypeScript 5.x** | 類型安全 |
| 樣式 | **TailwindCSS 3.x** | 原子化 CSS |
| 狀態 | **Redux Toolkit** | 全局狀態管理 |
| 圖表 | **Recharts** | 數據可視化 |
| 測試 | **Jest + React Testing Library** | 單元測試 |

### 基礎設施 (Infrastructure)
| 組件 | 技術 | 說明 |
|------|------|------|
| 容器化 | **Docker + Docker Compose** | 服務編排 |
| 監控 | **Prometheus + Grafana** | 指標收集和可視化 |
| 日誌 | **ELK Stack** | 日誌聚合分析 |
| 告警 | **AlertManager** | 告警管理 |
| 存儲 | **AWS S3** | 視頻文件存儲 |
| CDN | **Cloudflare** | 內容分發 |
| 支付 | **Stripe** | 支付處理 |

---

## 📦 服務詳情

### 1. Auth Service (Port 3001)
**職責**: 用戶認證與授權
- ✅ JWT Token (Access + Refresh)
- ✅ RBAC 角色權限控制 (Admin/Creator/User)
- ✅ Permission-based 授權
- ✅ Token Blacklist 登出機制
- 🗄️ 數據庫: `auth_db`

**API 前綴**: `/api/auth/*`, `/api/users/*`, `/api/roles/*`

---

### 2. Content-Streaming Service (Port 3001)
**職責**: 視頻內容管理和流媒體
- ✅ 分片上傳 (支持 500MB+)
- ✅ 自動轉碼 (720p/480p/360p/240p)
- ✅ HLS 流媒體播放
- ✅ CDN 集成 (Cloudflare)
- ✅ 創作者內容隔離
- 🗄️ 數據庫: `content_db`
- ☁️ 存儲: AWS S3

**API 前綴**: `/api/videos/*`, `/api/uploads/*`, `/api/streaming/*`

---

### 3. Recommendation Service (Port 3000)
**職責**: 個性化內容推薦
- ✅ 多維度算法 (熱度 + 興趣 + 新鮮度 + 隨機)
- ✅ Redis 快取 (<500ms 響應)
- ✅ 非阻塞異步更新
- ✅ 用戶互動追蹤
- 🗄️ 數據庫: `recommendation_db`
- 💨 緩存: Redis

**API 前綴**: `/api/recommendations/*`, `/api/contents/*`

---

### 4. Payment Service (Port 3002)
**職責**: 支付和財務管理
- ✅ Stripe PaymentIntent 集成
- ✅ 多種支付方式
- ✅ 自動發票生成
- ✅ 退款處理
- ✅ Webhook 幂等性處理
- 🗄️ 數據庫: `payment_db`

**API 前綴**: `/api/payments/*`, `/api/invoices/*`

---

### 5. Subscription Service (Port 3003)
**職責**: 訂閱管理
- ✅ 多層級訂閱計劃
- ✅ 自動續費
- ✅ 升級/降級/暫停
- ✅ Stripe Subscription 集成
- 🗄️ 數據庫: `subscription_db`

**API 前綴**: `/api/subscriptions/*`

---

### 6. API Gateway (Port 3000)
**職責**: 統一入口和流量管理
- ✅ 請求路由轉發
- ✅ JWT 驗證
- ✅ Rate Limiting (100 req/15s)
- ✅ 錯誤處理和日誌
- ✅ CORS 配置

**路由映射**:
| 路徑 | 目標服務 |
|------|----------|
| `/api/auth/*` | auth-service:3001 |
| `/api/videos/*` | content-streaming:3001 |
| `/api/recommendations/*` | recommendation-service:3000 |
| `/api/payments/*` | payment-service:3002 |
| `/api/subscriptions/*` | subscription-service:3003 |

---

## 🎨 前端結構

```
frontend/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 首頁 (Explore)
│   ├── layout.tsx                # 根佈局
│   ├── globals.css               # 全局樣式
│   ├── explore/                  # 內容發現頁
│   ├── creator/                  # 創作者中心
│   │   ├── page.tsx              # 創作者主頁
│   │   ├── content/              # 內容管理
│   │   ├── analytics/            # 數據分析
│   │   └── upload/               # 視頻上傳
│   ├── admin/                    # 管理員後台
│   │   ├── page.tsx              # 儀表板
│   │   ├── users/                # 用戶管理
│   │   ├── content/              # 內容審核
│   │   └── payments/             # 財務報表
│   ├── settings/                 # 用戶設置
│   └── analytics/                # 分析頁面
├── components/                   # 組件庫
│   ├── admin/                    # 管理員組件
│   ├── creator/                  # 創作者組件
│   ├── content/                  # 內容組件
│   ├── recommendation/           # 推薦組件
│   ├── cards/                    # 卡片組件
│   ├── buttons/                  # 按鈕組件
│   └── common/                   # 通用組件
├── lib/                          # 工具庫
│   ├── performance/              # 性能監控
│   ├── offline/                  # 離線支持
│   └── theme/                    # 主題管理
├── hooks/                        # 自定義 Hooks
├── types/                        # TypeScript 類型
└── utils/                        # 工具函數
```

---

## 🐳 Docker 服務

### 核心服務
| 服務 | 端口 | 說明 |
|------|------|------|
| postgres | 5432 | PostgreSQL 16 |
| redis | 6379 | Redis 7 |
| api-gateway | 3000 | API 網關 |
| auth-service | 3001 | 認證服務 |
| content-streaming | 3001 | 內容流服務 |
| recommendation | 3000 | 推薦服務 |
| payment-service | 3002 | 支付服務 |
| subscription-service | 3003 | 訂閱服務 |

### 監控服務
| 服務 | 端口 | 說明 |
|------|------|------|
| prometheus | 9090 | 指標收集 |
| grafana | 3010 | 可視化儀表板 |
| alertmanager | 9093 | 告警管理 |
| elasticsearch | 9200 | 日誌存儲 |
| kibana | 5601 | 日誌可視化 |
| logstash | 5044 | 日誌處理 |

---

## 🔄 開發工作流程

### 本地開發啟動
```bash
# 1. 啟動基礎設施
docker-compose up -d postgres redis

# 2. 啟動各服務 (每個服務目錄)
cd auth-service && npm run start:dev
cd content-streaming-service && npm run start:dev
cd recommendation-service && npm run start:dev
cd payment-service && npm run start:dev
cd subscription-service && npm run start:dev
cd api-gateway && npm run start:dev

# 3. 啟動前端
cd frontend && npm run dev
```

### 一鍵部署
```bash
# 完整堆棧啟動
docker-compose up -d

# 監控堆棧啟動
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## 🧪 測試策略

| 測試類型 | 工具 | 覆蓋率目標 |
|----------|------|------------|
| 單元測試 | Jest | 70%+ |
| 集成測試 | Jest + Supertest | 60%+ |
| E2E 測試 | Playwright | 核心流程 |
| 性能測試 | k6 | API < 500ms |
| 負載測試 | Artillery | 1000+ RPS |

---

## 🔐 安全設計

- ✅ JWT Token + Refresh Token 機制
- ✅ RBAC + Permission-based 授權
- ✅ Rate Limiting 防濫用
- ✅ Stripe Webhook 簽名驗證
- ✅ SQL 注入防護 (TypeORM 參數化)
- ✅ XSS 防護
- ✅ CORS 白名單
- ✅ 輸入驗證 (class-validator)

---

## 📊 監控告警

### 關鍵指標
| 指標 | 目標 | 告警條件 |
|------|------|----------|
| API P95 延遲 | < 100ms | > 500ms |
| 錯誤率 | < 0.1% | > 5% |
| 可用性 | 99.9% | < 99% |
| CPU 使用率 | < 70% | > 80% |
| 內存使用率 | < 80% | > 90% |

### 自動回滾條件
- 錯誤率 > 5% 持續 2 分鐘
- P95 延遲 > 500ms 持續 2 分鐘
- Pod 宕機持續 1 分鐘

---

## 📝 文檔規範

每個服務應包含：
- `README.md` - 服務概述
- `docs/openapi.yaml` - API 規格
- `ARCHITECTURE.md` - 架構設計
- `QUICKSTART.md` - 快速開始
- `Dockerfile` + `docker-compose.yml`

---

## 🎯 開發原則

1. **SOLID 原則** - 每個服務單一職責
2. **API First** - 先定義接口再實現
3. **Test Coverage** - 70%+ 覆蓋率
4. **Docker Ready** - 所有服務容器化
5. **Observability** - 完整監控和日誌
6. **Security by Design** - 內建安全機制

---

## 🚀 部署狀態

- **Week 1-2**: ✅ 完成 (架構 + 核心服務)
- **Week 3**: ✅ 完成 (聯調集成)
- **Week 4**: ✅ 完成 (灰度準備)
- **Week 5**: ⏳ 進行中 (灰度部署 5%→100%)

**預計上線**: 2026-02-24

---

*最後更新: 2026-02-20 17:35 GMT+8*
