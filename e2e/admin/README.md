# E2E Admin 測試指南

## 概述

Admin e2e 測試現已完整配置，可以獨立運行而不依賴 web 的 auth setup。

## 架構說明

### 服務配置

- **基礎設施（Docker）**：PostgreSQL、Redis、Kafka、Zookeeper、Jaeger
- **後端服務（本地）**：API Gateway (3000)、Auth Service (3002)、User Service (3001)
- **前端應用（本地）**：Admin Panel (4300)

### 為什麼這樣設計？

1. **基礎設施用 Docker**：統一環境，確保一致性
2. **後端服務本地運行**：方便開發和調試
3. **SSR 前端本地運行**：支援熱重載，提升開發體驗

## 快速開始

### 方法 1：一鍵啟動並測試（推薦）

```bash
# 自動啟動所有服務並運行測試
npm run e2e:admin:test
```

此命令會：
1. 檢查 Docker 基礎設施是否運行（如未運行則自動啟動）
2. 啟動必要的後端服務（API Gateway、Auth Service、User Service）
3. 啟動 Admin 前端
4. 運行 e2e 測試
5. 測試結束後自動關閉所有服務

### 方法 2：手動控制

#### 步驟 1：啟動 Docker 基礎設施

```bash
# 啟動輕量級開發環境（推薦）
docker-compose up -d

# 或啟動完整的 HA 環境
docker-compose up -d postgres-master redis-master kafka zookeeper
```

#### 步驟 2：啟動服務並保持運行

```bash
# 啟動所有必要服務，保持運行狀態
npm run e2e:admin:start
```

此命令會啟動服務並保持在前台運行，方便你在另一個終端運行測試或進行開發。

#### 步驟 3：（在另一個終端）運行測試

```bash
# 運行 admin e2e 測試
npm run e2e:admin

# 或以 UI 模式運行
npm run e2e:ui -- --project=admin

# 或 debug 模式
npm run e2e:debug -- --project=admin
```

#### 步驟 4：停止服務

按 `Ctrl+C` 停止 `e2e:admin:start` 啟動的所有服務。

### 方法 3：完全手動（最大控制）

```bash
# 1. 確保 Docker 基礎設施運行
docker-compose up -d

# 2. 啟動後端服務（在不同終端或背景運行）
npx nx serve api-gateway
npx nx serve auth-service
npx nx serve user-service

# 3. 啟動 Admin 前端
cd apps/admin && npx next dev -p 4300

# 4. 運行測試
npm run e2e:admin
```

## 測試命令

| 命令 | 說明 |
|------|------|
| `npm run e2e:admin:test` | 一鍵啟動服務、運行測試、自動清理 |
| `npm run e2e:admin:start` | 啟動服務並保持運行，方便開發 |
| `npm run e2e:admin` | 只運行測試（需要服務已啟動） |
| `npm run e2e:ui -- --project=admin` | UI 模式運行測試 |
| `npm run e2e:debug -- --project=admin` | Debug 模式 |
| `npm run e2e:report` | 查看測試報告 |

## 日誌位置

所有服務日誌保存在 `/tmp/` 目錄：

- API Gateway: `/tmp/e2e-admin-api-gateway.log`
- Auth Service: `/tmp/e2e-admin-auth-service.log`
- User Service: `/tmp/e2e-admin-user-service.log`
- Admin Frontend: `/tmp/e2e-admin-frontend.log`

## 故障排除

### 問題：測試失敗，顯示無法連接到服務

**解決方案**：
```bash
# 檢查服務是否運行
curl http://localhost:3000  # API Gateway
curl http://localhost:4300  # Admin Panel

# 檢查日誌
tail -f /tmp/e2e-admin-*.log

# 重啟服務
npm run e2e:admin:start
```

### 問題：端口已被佔用

**解決方案**：
```bash
# 查找佔用端口的進程
lsof -i :3000  # API Gateway
lsof -i :4300  # Admin Panel

# 終止進程
kill <PID>

# 或使用清理腳本
pkill -f "nx serve"
pkill -f "next dev"
```

### 問題：Docker 容器未運行

**解決方案**：
```bash
# 檢查容器狀態
docker ps

# 啟動容器
docker-compose up -d

# 檢查容器健康狀態
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### 問題：測試超時

**檢查**：
1. 確認所有服務都已啟動並健康
2. 檢查 API Gateway 是否能正常回應
3. 查看服務日誌確認沒有錯誤

## 配置文件說明

### playwright.config.ts

- 添加了獨立的 `admin` project
- `admin` project 不依賴 `setup`（web auth）
- 支援 `PLAYWRIGHT_SKIP_WEBSERVER` 環境變數

### package.json

- `e2e:admin`：使用 `PLAYWRIGHT_SKIP_WEBSERVER=1` 和 `--project=admin`
- `e2e:admin:start`：啟動服務腳本
- `e2e:admin:test`：一鍵測試腳本

### scripts/e2e-admin-start.sh

自動化腳本，處理：
1. Docker 基礎設施檢查與啟動
2. 後端服務啟動與健康檢查
3. Admin 前端啟動與就緒檢查
4. 可選的自動測試運行

## 開發建議

### 日常開發流程

```bash
# 1. 早上第一次啟動（一次性）
docker-compose up -d

# 2. 開發時保持服務運行
npm run e2e:admin:start  # 在一個終端

# 3. 修改代碼後運行測試
npm run e2e:admin  # 在另一個終端

# 4. 下班前（可選）
docker-compose down
```

### CI/CD 配置

```bash
# CI 環境建議使用一鍵命令
npm run e2e:admin:test
```

這會自動處理所有服務的生命週期，確保測試環境乾淨且可重複。

## 測試覆蓋

當前測試包含：

- ✅ 管理員登入流程
- ✅ 側邊欄導航
- ✅ Dashboard 概覽
- ✅ 用戶管理
- ✅ 支付分析
- ✅ 交易記錄
- ✅ 提現管理
- ✅ 內容審核
- ✅ 訂閱管理
- ✅ 進階分析
- ✅ 審計日誌
- ✅ 系統監控
- ✅ 響應式設計

共 62 個測試案例。

## 相關文件

- [Playwright 配置](../playwright.config.ts)
- [Admin 測試文件](../e2e/admin/admin-dashboard.spec.ts)
- [啟動腳本](../scripts/e2e-admin-start.sh)
- [Docker Compose](../docker-compose.yml)
