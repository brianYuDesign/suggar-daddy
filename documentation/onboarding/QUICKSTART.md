# 🚀 Sugar-Daddy 新人上手指南

## 歡迎！👋

本指南帮助新开发者快速上手 Sugar-Daddy 项目。预计耗时：**5-10 分钟**

---

## 5 分鐘快速開始

### 第 1 步: 環境準備 (2 分鐘)

```bash
# 1. 確保已安裝必要工具
node -v          # Node.js 18+
npm -v           # npm 9+
docker -v        # Docker 20+
git -v           # Git 2+

# 2. 克隆項目
git clone https://github.com/sugardaddy/platform.git
cd platform

# 3. 安裝依賴
npm install

# 4. 複製環境配置
cp .env.example .env
```

### 第 2 步: 啟動服務 (2 分鐘)

```bash
# 啟動所有服務
docker-compose up -d

# 驗證服務狀態
docker-compose ps

# 應該看到 6 個運行中的服務:
# ✅ api-gateway
# ✅ auth-service
# ✅ content-streaming-service
# ✅ payment-service
# ✅ subscription-service
# ✅ recommendation-service
```

### 第 3 步: 第一個 API 調用 (1 分鐘)

```bash
# 檢查 API Gateway 健康狀態
curl http://localhost:3000/health

# 預期輸出:
# {
#   "status": "ok",
#   "timestamp": "2026-02-19T13:24:00Z",
#   "services": {
#     "auth": "up",
#     "contentStreaming": "up",
#     "payment": "up",
#     "subscription": "up",
#     "recommendation": "up"
#   }
# }

# 恭喜！🎉 系統已就緒
```

---

## 代碼庫結構說明

```
sugar-daddy/
├── api-gateway/                   # API 網關 (Express)
│   ├── src/
│   │   ├── routes/               # 路由定義
│   │   ├── middleware/           # 中間件 (認證、日誌)
│   │   └── app.ts               # 應用入口
│   ├── docker-compose.yml
│   └── package.json
│
├── auth-service/                  # 身份驗證服務 (NestJS)
│   ├── src/
│   │   ├── controllers/          # API 控制器
│   │   ├── services/             # 業務邏輯
│   │   ├── entities/             # 數據模型
│   │   ├── guards/               # 守衛 (JWT 驗證)
│   │   └── app.module.ts         # 應用模塊
│   ├── test/                     # 測試文件
│   └── docker-compose.yml
│
├── content-streaming-service/     # 視頻流媒體服務
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── entities/
│   │   └── app.module.ts
│   ├── docs/
│   │   └── openapi.yaml          # API 規範文檔
│   └── docker-compose.yml
│
├── payment-service/               # 支付服務
│   ├── src/
│   ├── test/
│   └── docker-compose.yml
│
├── subscription-service/          # 訂閱管理服務
│   ├── src/
│   └── docker-compose.yml
│
├── recommendation-service/        # 推薦引擎
│   ├── src/
│   ├── algorithm/                # ML 算法
│   └── docker-compose.yml
│
├── frontend/                      # 前端應用 (React)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── App.tsx
│   └── package.json
│
├── e2e-tests/                     # 端到端測試
│   └── integration.spec.js
│
├── monitoring/                    # 監控和告警
│   ├── prometheus/
│   ├── grafana/
│   └── docker-compose.yml
│
├── deployment/                    # 部署配置
│   ├── kubernetes/               # K8s manifests
│   ├── docker-compose.yml        # 本地開發環境
│   └── scripts/                  # 部署腳本
│
├── documentation/                 # 📚 項目文檔
│   ├── api/                      # API 文檔
│   ├── architecture/             # 架構文檔
│   ├── operations/               # 運維指南
│   └── onboarding/               # 新人指南
│
├── .env.example                  # 環境變量模板
├── .dockerignore
├── .gitignore
├── docker-compose.yml            # 完整堆棧配置
└── README.md
```

---

## 開發環境設置

### 必需工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ LTS | JavaScript 運行環境 |
| **npm** | 9+ | 包管理器 |
| **Docker** | 20+ | 容器化 |
| **Git** | 2+ | 版本控制 |
| **VS Code** | 最新 | 代碼編輯器 |
| **Postman** | 最新 | API 測試 |
| **pgAdmin** | 最新 | 數據庫管理 |

### VS Code 推薦擴展

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",      // ESLint
    "esbenp.prettier-vscode",      // Prettier
    "ms-rest-tools.rest-client",   // REST Client
    "ms-docker.docker",            // Docker
    "ms-kubernetes-tools.vscode-kubernetes-tools", // Kubernetes
    "eamodio.gitlens",             // GitLens
    "ms-vscode-remote.remote-containers" // Dev Containers
  ]
}
```

### 開發服務器配置

#### 啟動單個服務

```bash
# 進入服務目錄
cd auth-service

# 安裝依賴
npm install

# 啟動開發服務器 (自動重載)
npm run start:dev

# 服務將在 http://localhost:3001 啟動
```

#### 調試模式

```bash
# 使用 Node 調試器
node --inspect-brk ./dist/main.js

# 或在 VS Code 中設置調試 (.vscode/launch.json)
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Auth Service Debug",
      "program": "${workspaceFolder}/auth-service/dist/main.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 常見任務

### 任務 1: 添加新 API 端點

#### 在 Auth Service 中添加新端點

```bash
# 1. 創建新的 DTO (Data Transfer Object)
# auth-service/src/dtos/get-user-preferences.dto.ts

export class GetUserPreferencesDto {
  @IsUUID()
  userId: string;
}

# 2. 在 Service 中實現業務邏輯
# auth-service/src/services/user.service.ts

async getUserPreferences(userId: string) {
  return this.userRepository.findUserPreferences(userId);
}

# 3. 在 Controller 中添加端點
# auth-service/src/controllers/user.controller.ts

@Get(':userId/preferences')
async getUserPreferences(@Param('userId') userId: string) {
  const preferences = await this.userService.getUserPreferences(userId);
  return {
    statusCode: 200,
    message: 'User preferences retrieved',
    data: preferences
  };
}

# 4. 測試端點
curl http://localhost:3001/api/v1/auth/users/user-id/preferences \
  -H "Authorization: Bearer TOKEN"
```

### 任務 2: 運行測試

```bash
# 單元測試
npm run test

# 覆蓋率報告
npm run test:cov

# E2E 測試
npm run test:e2e

# 監視模式 (自動重新運行)
npm run test:watch
```

### 任務 3: 提交代碼變更

```bash
# 1. 創建功能分支
git checkout -b feature/user-preferences

# 2. 進行更改
# ... 編輯文件 ...

# 3. 提交更改
git add .
git commit -m "feat: add user preferences endpoint"

# 4. 推送分支
git push origin feature/user-preferences

# 5. 創建 Pull Request
# 在 GitHub 上創建 PR，供審核

# 6. 審核通過后合併
git checkout main
git pull origin main
git merge feature/user-preferences
git push origin main
```

### 任務 4: 查看數據庫

```bash
# 使用 pgAdmin
# 訪問: http://localhost:5050

# 使用命令行
docker exec postgres psql -h localhost -U postgres -d sugardaddy_db

# 常用命令
\dt               # 列出所有表
\d users          # 查看 users 表結構
SELECT * FROM users LIMIT 10;  # 查詢數據
\q               # 退出
```

### 任務 5: 查看 API 文檔

```bash
# Swagger UI (如果配置)
open http://localhost:3001/api-docs

# 或訪問 OpenAPI 文檔
open documentation/api/OPENAPI-3.0.yaml

# 或使用 Postman
# 導入 postman-collection.json
```

---

## 開發工作流

```
1. 選擇任務
   ├─ 從 GitHub Issues 中選擇
   ├─ 或從 Jira 板中選擇
   └─ 或與團隊討論

2. 創建分支
   ├─ git checkout -b feature/task-name
   └─ 命名規則: feature/, bugfix/, hotfix/

3. 開發
   ├─ 編寫代碼
   ├─ 編寫測試
   └─ 本地驗證

4. 提交
   ├─ git add .
   ├─ git commit -m "type: description"
   └─ 遵循 Conventional Commits

5. 推送
   ├─ git push origin feature/task-name
   └─ 創建 Pull Request

6. 審核
   ├─ 等待代碼審查
   ├─ 回應評論
   └─ 修改代碼

7. 合併
   ├─ 獲得批准后合併
   ├─ 刪除特性分支
   └─ 自動部署到 CI/CD

8. 驗證
   ├─ 監控部署
   ├─ 檢查監控指標
   └─ 驗證功能
```

---

## 提交規範

使用 Conventional Commits 標準:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 示例

```
feat(auth): add user preferences endpoint

- Add GET /users/{userId}/preferences endpoint
- Store preferences in database
- Include preference validation

Closes #123
```

### Commit 類型

| 類型 | 說明 | 示例 |
|------|------|------|
| **feat** | 新功能 | `feat: add email notification` |
| **fix** | 修復 bug | `fix: incorrect user count` |
| **docs** | 文檔 | `docs: update API guide` |
| **style** | 代碼風格 | `style: format code` |
| **refactor** | 重構 | `refactor: simplify user service` |
| **test** | 測試 | `test: add user validation tests` |
| **chore** | 構建/依賴 | `chore: update dependencies` |
| **perf** | 性能 | `perf: optimize query` |

---

## 常見問題 (FAQ)

### Q: 如何重置開發環境？

```bash
# 完全重置
docker-compose down -v
rm -rf node_modules
npm install
docker-compose up -d
```

### Q: 如何查看特定服務的日誌？

```bash
# 實時日誌
docker-compose logs -f auth-service

# 最後 100 行
docker logs auth-service --tail 100

# 查看錯誤
docker-compose logs auth-service | grep ERROR
```

### Q: 如何訪問數據庫？

```bash
# 使用 psql
docker exec -it postgres psql -h localhost -U postgres -d sugardaddy_db

# 或使用 pgAdmin
# 訪問: http://localhost:5050
# 用戶: admin@admin.com
# 密碼: admin
```

### Q: 如何修改環境變量？

```bash
# 編輯 .env 文件
nano .env

# 重新啟動服務以應用更改
docker-compose restart

# 或刪除容器并重新創建
docker-compose down
docker-compose up -d
```

### Q: 如何查看 API 請求？

```bash
# 使用 VS Code REST Client
# 創建 .http 或 .rest 文件

### 獲取健康檢查
GET http://localhost:3000/health

### 登入用戶
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

### 以上記錄中使用返回的 token
GET http://localhost:3000/api/v1/auth/me
Authorization: Bearer your_token_here
```

### Q: 我的更改沒有生效，怎么辦？

```bash
# 1. 清除 Docker 快取
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 2. 清除 npm 快取
npm ci --clean  # 比 npm install 更幹凈

# 3. 檢查環境變量
docker-compose exec api-gateway env | grep NODE

# 4. 查看服務日誌
docker-compose logs -f api-gateway
```

---

## 下一步

✅ **完成了快速開始？**

現在可以：

1. 📖 [閱讀 API 文檔](../api/API_REFERENCE.md)
2. 🏗️ [了解系統架構](../architecture/SYSTEM_ARCHITECTURE.md)
3. 📋 [查看運維指南](../operations/OPERATIONS_GUIDE.md)
4. 🎯 [選擇第一個任務開始編碼](https://github.com/sugardaddy/platform/issues)

---

## 尋求幫助

- 💬 **Slack**: #sugardaddy-dev
- 📧 **郵件**: dev-team@sugardaddy.com
- 📚 **Wiki**: https://wiki.sugardaddy.com
- 🐛 **Bug 報告**: https://github.com/sugardaddy/platform/issues

---

## 團隊介紹

| 角色 | 名字 | Slack | 專業 |
|------|------|-------|------|
| Backend Lead | Jane Smith | @jane.smith | NestJS, PostgreSQL |
| DevOps Lead | John Doe | @john.doe | Docker, Kubernetes |
| Frontend Lead | Alice Johnson | @alice.johnson | React, TypeScript |
| QA Lead | Bob Wilson | @bob.wilson | 測試自動化 |

---

**最後更新**: 2026-02-19  
**版本**: 1.0.0  
**狀態**: ✅ 完整
