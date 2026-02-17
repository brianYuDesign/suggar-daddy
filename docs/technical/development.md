# 開發者指南

> 目標：讓新開發者在 30 分鐘內完成環境設置並開始開發。

## 1. 環境需求

| 工具 | 最低版本 | 說明 |
|------|----------|------|
| Node.js | v20+ | 建議使用 LTS 版本 |
| npm | v10+ | 隨 Node.js 安裝 |
| Docker & Docker Compose | v24+ | 用於基礎設施服務 |
| Git | v2.30+ | 版本控制 |

全域安裝 Nx CLI（可選但建議）：

```bash
npm install -g nx
```

> 若不想全域安裝，可使用 `npx nx` 代替所有 `nx` 指令。

## 2. 快速啟動

### 2.1 安裝依賴

```bash
git clone <repo-url> && cd suggar-daddy
npm install
```

### 2.2 環境變數

```bash
cp .env.example .env
```

開發環境使用預設值即可運作。如需 Stripe、Cloudinary 等第三方服務，填入對應 key。

### 2.3 啟動基礎設施（Docker）

```bash
docker compose up -d postgres-master redis-master zookeeper kafka
```

等待服務健康檢查通過（約 30-60 秒）：

```bash
# 確認所有服務 healthy
docker compose ps
```

核心基礎設施 port 對應：

| 服務 | Port |
|------|------|
| PostgreSQL | 5432 |
| Redis | 6379 |
| Kafka | 9092 (容器內) / 9094 (本機) |
| Zookeeper | 2181 |

### 2.4 啟動後端服務

**方式一：一鍵啟動（推薦）**

```bash
npm run dev          # 基礎設施 + 核心後端 + web 前端
npm run dev:all      # 包含所有服務（matching, notification, messaging 等）
```

**方式二：個別啟動**

```bash
# 核心服務（通常開發只需這些）
nx serve api-gateway            # :3000 — API 入口
nx serve auth-service           # :3002
nx serve user-service           # :3001
nx serve db-writer-service      # Kafka consumer，負責寫入 PostgreSQL

# 按需啟動
nx serve payment-service        # :3007
nx serve subscription-service   # :3005
nx serve matching-service       # :3003
nx serve content-service        # :3006
nx serve media-service          # :3008
```

### 2.5 啟動前端

```bash
nx serve web       # 使用者前端 → http://localhost:4200
nx serve admin     # 管理後台 → http://localhost:4300
```

### 2.6 驗證環境

```bash
# API Gateway 健康檢查
curl http://localhost:3000/health

# 前端頁面
open http://localhost:4200
```

## 3. 專案結構

```
suggar-daddy/
├── apps/                       # 應用程式
│   ├── api-gateway/            # HTTP proxy，轉發所有 /api/* 請求
│   ├── auth-service/           # 認證：註冊、登入、JWT
│   ├── user-service/           # 使用者 CRUD、檔案上傳
│   ├── matching-service/       # 配對、滑動、搜尋
│   ├── subscription-service/   # 訂閱方案管理
│   ├── content-service/        # 貼文、評論、按讚
│   ├── payment-service/        # 打賞、交易、Stripe
│   ├── media-service/          # 媒體上傳處理
│   ├── notification-service/   # 通知（Kafka-driven）
│   ├── messaging-service/      # 即時訊息（Kafka-driven）
│   ├── db-writer-service/      # Kafka consumer → PostgreSQL
│   ├── admin-service/          # 管理後台 API
│   ├── web/                    # Next.js 使用者前端
│   └── admin/                  # Next.js 管理後台
├── libs/                       # 共用函式庫
│   ├── common/                 # Config, guards, decorators, Stripe helpers
│   ├── auth/                   # AuthModule, JWT strategy
│   ├── database/               # TypeORM 設定、所有 Entity
│   ├── kafka/                  # KafkaModule, Producer/Consumer
│   ├── redis/                  # RedisModule, RedisService
│   ├── dto/                    # 共用 TypeScript interfaces
│   ├── ui/                     # 共用 React 元件
│   └── api-client/             # Typed HTTP client（axios）
├── infrastructure/             # Docker、Redis、PostgreSQL 配置
├── scripts/                    # 開發腳本
├── docs/                       # 文件
├── docker-compose.yml          # 基礎設施 + 服務定義
└── CLAUDE.md                   # AI 開發助手指南
```

### 資料流模式（重要）

```
Client → API Gateway (:3000)
           → 各 Service 讀取 Redis（快取）
           → 各 Service 寫入 Kafka（事件）
                → db-writer-service 消費 Kafka → PostgreSQL（持久化）
```

**關鍵原則：** 後端服務不直接寫入 PostgreSQL。所有寫入透過 Kafka 事件由 `db-writer-service` 統一處理，確保解耦和最終一致性。

## 4. TypeScript 配置注意事項

### 4.1 Decorator 設定

`tsconfig.base.json` 啟用了 NestJS 所需的 decorator 支援：

```json
{
  "emitDecoratorMetadata": true,
  "experimentalDecorators": true
}
```

**所有前端專案**（web, admin, ui, api-client）必須覆寫為 `false`：

```json
{
  "emitDecoratorMetadata": false,
  "experimentalDecorators": false
}
```

### 4.2 TypeScript paths 不合併問題

TypeScript `paths` 在繼承時**不會合併**，而是完全覆蓋。

- `apps/web/` 直接繼承 `tsconfig.base.json` 的 paths（無需重新宣告）
- `apps/admin/` 因為額外需要 `@/*` alias，**必須重新宣告所有** `@suggar-daddy/*` paths

如果你在 admin 新增 lib 參照，記得同時更新 `apps/admin/tsconfig.json` 的 paths。

## 5. NestJS 開發慣例

### 5.1 Global Modules

以下模組使用 `@Global()` + `forRoot()`，注入一次即全域可用：

- **RedisModule** — Redis 快取操作
- **KafkaModule** — Kafka 訊息發送
- **DatabaseModule** — TypeORM 資料庫連接

### 5.2 認證與授權

```typescript
// 公開端點（跳過 JWT 驗證）
@Public()
@Get('public-data')

// 需要特定角色
@Roles(UserRole.ADMIN)
@Get('admin-only')

// 取得當前使用者
@Get('me')
getProfile(@CurrentUser() user: UserPayload) { }

// 取得使用者 ID
@Get('my-id')
getId(@CurrentUser('userId') userId: string) { }
```

### 5.3 Guards

| Guard | 用途 |
|-------|------|
| `JwtAuthGuard` | 預設全域啟用，驗證 JWT token |
| `OptionalJwtGuard` | 可選認證（登入使用者有額外資料） |
| `RolesGuard` | 搭配 `@Roles()` 限制角色存取 |

### 5.4 使用者角色

- `ADMIN` — 管理員
- `CREATOR` — 創作者
- `SUBSCRIBER` — 訂閱者

### 5.5 Kafka 事件

Topic 命名慣例：`domain.action`

```
subscription.created    payment.completed    content.post.created
media.uploaded          message.created      notification.created
```

## 6. 前端開發

### 6.1 技術棧

- **Next.js 14** — App Router
- **Tailwind CSS** — 樣式
- **shadcn/ui** — admin 專用元件庫
- **axios** — API 請求（透過 `@suggar-daddy/api-client`）

### 6.2 API Proxy

前端開發時，`/api/*` 請求透過 `next.config.js` rewrites 轉發到 API Gateway：

```javascript
// apps/web/next.config.js & apps/admin/next.config.js
async rewrites() {
  return [{
    source: '/api/:path*',
    destination: 'http://localhost:3000/api/:path*',
  }];
}
```

開發時無需處理 CORS，所有 API 呼叫直接使用 `/api/...` 相對路徑。

### 6.3 共用元件

`libs/ui/` 提供共用 React 元件（如 Button），使用 CVA (class-variance-authority) 管理 variants。

`libs/api-client/` 提供 typed HTTP client，涵蓋所有 API 端點。

## 7. 測試

### 7.1 單元測試

```bash
# 測試單一專案
nx test user-service
nx test web
nx test common

# 測試所有專案
nx run-many -t test --all
```

- 後端使用 `testEnvironment: 'node'`
- 前端使用 `testEnvironment: 'jsdom'` + `identity-obj-proxy`（CSS module mock）

### 7.2 E2E 測試

```bash
# 需先安裝 Playwright browsers
npx playwright install

# 執行所有 E2E 測試
npm run e2e

# 帶 UI 的互動模式
npm run e2e:ui

# 有頭瀏覽器（除錯用）
npm run e2e:headed

# 僅 admin 測試
npm run e2e:admin

# 檢視測試報告
npm run e2e:report
```

### 7.3 Lint

```bash
nx run-many -t lint --all
```

## 8. 常用指令速查

```bash
# 查看所有 Nx 專案
nx show projects

# 建置
nx build web
nx build admin

# 產生新的 NestJS 模組/服務
nx g @nx/nest:module <name> --project=<service>
nx g @nx/nest:service <name> --project=<service>
```

## 9. 常見問題排查

### Docker 服務啟動失敗

```bash
# 查看容器日誌
docker compose logs postgres-master
docker compose logs kafka

# 重置（清除資料）
docker compose down -v && docker compose up -d
```

### Port 被佔用

```bash
# 查看佔用 port 的程序
lsof -i :3000
lsof -i :4200

# 終止程序
kill -9 <PID>
```

### Kafka 連接失敗

本機開發連接 Kafka 使用 `localhost:9094`（非 9092）。9092 是容器內部通訊 port。

### TypeORM Entity 變更後無效

確認 Entity 已在 `libs/database/src/` 中匯出，並且 `db-writer-service` 有重啟。

### 前端 API 呼叫 404

1. 確認 API Gateway 正在運作：`curl http://localhost:3000/health`
2. 確認目標服務已啟動
3. 檢查 `apps/api-gateway/src/app/proxy.service.ts` 的路由對應

### nx serve 很慢或失敗

```bash
# 清除 Nx 快取
nx reset

# 重新安裝依賴
rm -rf node_modules && npm install
```

### 服務日誌位置

使用 `npm run dev` 啟動時，各服務日誌存放於：

```
/tmp/suggar-daddy-<service-name>.log
```
