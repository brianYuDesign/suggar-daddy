# CI/CD 設置指南 - GitHub Actions

## 📋 目錄

1. [概覽](#概覽)
2. [工作流說明](#工作流說明)
3. [設置 Secrets](#設置-secrets)
4. [觸發條件](#觸發條件)
5. [故障排除](#故障排除)
6. [最佳實踐](#最佳實踐)

---

## 🎯 概覽

本項目使用 GitHub Actions 實現自動化 CI/CD 流程：

| 工作流 | 觸發條件 | 用途 |
|--------|--------|------|
| **ci-feature.yml** | push to feature/* | 快速代碼檢查 (Lint + Test) |
| **ci-main.yml** | push to main/develop | 完整 CI + Docker 構建 + 推送 |
| **release.yml** | tag v*.*.* | 發佈版本鏡像 |

---

## 🔄 工作流說明

### 1. Feature Branch 工作流 (`ci-feature.yml`)

**觸發器**:
- 推送到 `feature/**`, `fix/**`, `dev/**` 分支
- Pull Request 到 `main`/`develop`

**執行步驟**:

```
1. Lint & Type Check
   ├── npm ci
   ├── npm run lint
   └── npx tsc --noEmit

2. Unit Tests
   ├── npm run test -- --coverage
   └── Upload to CodeCov

3. Docker Image Build (Cache Only)
   └── Build without push
```

**預期耗時**: 5-10 分鐘

**失敗處理**: 
- 如果 Lint/Test 失敗，阻止合併
- Docker 構建缺陷不阻止

---

### 2. Main Branch 工作流 (`ci-main.yml`)

**觸發器**:
- 推送到 `main` 或 `develop` 分支
- Pull Request 到 `main`

**執行步驟**:

```
1. Lint & Type Check
   ├── npm run lint (strict)
   ├── npx tsc --noEmit
   └── npm run test -- --coverage

2. Security Scan
   └── npm audit --audit-level=moderate

3. Build & Push to Docker Hub
   ├── Set up Docker Buildx
   ├── Login to Docker Hub
   ├── Build image
   └── Push with tags: latest + commit SHA

4. Integration Tests
   ├── docker-compose up
   ├── Wait for health checks
   └── Run integration tests

5. Cleanup
   └── docker-compose down -v
```

**預期耗時**: 15-25 分鐘

**所需 Secrets**:
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`

---

### 3. Release 工作流 (`release.yml`)

**觸發器**: 
- 新建 Tag: `v1.0.0`, `v2.1.3` 等

**執行步驟**:

```
1. Extract Version
   └── Extract version from tag (v1.0.0)

2. Build & Test
   ├── npm ci
   └── npm run test

3. Build & Push Release Image
   ├── Login to Docker Hub
   ├── Push with tags: version + stable + latest
   └── Example: v1.0.0, stable, latest

4. Create GitHub Release
   ├── Attach files (docker-compose.yml, .env.example)
   └── Create release notes
```

**推薦的發佈標籤格式**:

```bash
# 正確
git tag v1.0.0
git tag v2.3.1
git tag v0.1.0

# 推送
git push origin v1.0.0
```

---

## 🔐 設置 Secrets

### 在 GitHub 中配置

1. 進入 Repository → **Settings**
2. 左側 **Secrets and variables** → **Actions**
3. 點擊 **New repository secret**

### 必須的 Secrets

#### `DOCKER_USERNAME`
- 值: Docker Hub 用戶名
- 用途: `docker login` 認證

#### `DOCKER_PASSWORD`
- 值: Docker Hub 訪問令牌 (NOT 密碼)
- 用途: `docker login` 認證
- 安全: ✅ 自動遮蔽在日誌中

### 創建 Docker Hub 訪問令牌

1. 登錄 [Docker Hub](https://hub.docker.com)
2. 進入 **Account Settings** → **Security** → **Access Tokens**
3. 點擊 **Create new token**
4. 權限: `Read & Write`
5. 複製令牌到 GitHub Secrets

### 驗證 Secrets

```bash
# 在工作流中驗證 (安全方式)
- name: Verify secrets
  run: |
    if [ -z "${{ secrets.DOCKER_USERNAME }}" ]; then
      echo "❌ DOCKER_USERNAME not set"
      exit 1
    fi
    echo "✅ Secrets configured"
```

---

## 🎯 觸發條件

### 支持的觸發方式

#### Push 到分支

```yaml
on:
  push:
    branches:
      - 'feature/**'    # feature/user-auth, feature/payment-api
      - 'fix/**'        # fix/bug-123
      - 'main'          # 主分支
      - 'develop'       # 開發分支
```

#### Pull Requests

```yaml
on:
  pull_request:
    branches:
      - main
      - develop
```

#### Tags (版本發佈)

```yaml
on:
  push:
    tags:
      - 'v*.*.*'        # v1.0.0, v2.3.1, etc
```

### 手動觸發 (可選配置)

在工作流中添加：

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
```

然後在 GitHub UI 中選擇 **Actions** → **Run workflow**

---

## 📊 工作流狀態和日誌

### 查看工作流運行

1. 進入 Repository → **Actions**
2. 選擇工作流
3. 點擊具體的運行記錄

### 工作流狀態標記

| 狀態 | 含義 | 顏色 |
|------|------|------|
| ✅ Success | 所有步驟通過 | 綠色 |
| ❌ Failure | 至少一個步驟失敗 | 紅色 |
| ⏳ In Progress | 正在執行 | 黃色 |
| ⊘ Skipped | 條件不符合 | 灰色 |

### 查看詳細日誌

1. 點擊失敗的工作流
2. 展開失敗的步驟
3. 查看完整輸出

### 常見日誌位置

```
# Lint 失敗
ESLint error at src/main.ts:5

# Test 失敗
FAIL src/modules/recommendation.spec.ts

# Docker 構建失敗
Error: npm ERR! code EACCES

# 認證失敗
Error response from daemon: unauthorized
```

---

## 🔧 故障排除

### 問題 1: Docker Hub 認證失敗

**錯誤信息**:
```
Error response from daemon: unauthorized: incorrect username or password
```

**解決**:
```bash
# 1. 驗證 Secrets 已設置
# 進入 Settings → Secrets

# 2. 確認使用的是訪問令牌，不是密碼
# Docker Hub → Settings → Security → Access Tokens

# 3. 令牌有效期檢查
# 確保令牌未過期

# 4. 令牌權限檢查
# 需要 Read & Write 權限
```

### 問題 2: Lint 或 Test 失敗

**症狀**: CI 卡在代碼質量檢查

**檢查**:
```bash
# 本地運行相同命令
cd recommendation-service
npm ci
npm run lint
npm run test -- --coverage

# 檢查日誌輸出
# 修復報告的問題
# 提交更新的代碼
```

### 問題 3: Docker Buildx 缺少 QEMU

**錯誤**:
```
FAILED: linting dockerfile ./Dockerfile
failed to solve with frontend dockerfile.v0
```

**解決**: 在工作流中添加
```yaml
- uses: docker/setup-qemu-action@v3
```

### 問題 4: 超時失敗

**症狀**: 工作流卡住，最後超時

**原因**:
- 網絡不穩定
- npm install 卡住
- Docker 構建超時

**解決**:
```yaml
# 增加超時時間
timeout-minutes: 60

# 或使用緩存
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
```

---

## ✅ 最佳實踐

### 1. 分支命名規範

```bash
# Feature 分支
git checkout -b feature/user-authentication

# Bugfix 分支
git checkout -b fix/race-condition-issue

# 不支持的分支名
git checkout -b wip/something      # ❌ 不會觸發 CI
git checkout -b hotfix/urgent      # ❌ 不會觸發 CI
```

### 2. 提交信息

```bash
# 好的提交信息
git commit -m "feat: add recommendation caching layer"
git commit -m "fix: resolve race condition in stream handler"

# 不好的
git commit -m "update"
git commit -m "asdf"
```

### 3. 標籤規範

```bash
# 語義版本 (推薦)
git tag v1.0.0    # Major.Minor.Patch
git tag v1.2.3

# 推送標籤
git push origin v1.0.0

# 不推薦
git tag latest    # ❌ 不是語義版本
git tag release   # ❌ 太模糊
```

### 4. 代碼覆蓋率

- 目標: 80% 以上
- 檢查: CodeCov 自動評論 PR
- 改進: 編寫更多單元測試

### 5. 依賴管理

```bash
# 定期更新
npm outdated
npm update

# 檢查安全性
npm audit
npm audit fix

# 提交 package-lock.json
git add package-lock.json
```

### 6. Docker 鏡像標籤

推薦的標籤策略：

```
# Feature 分支
sugar-daddy-recommendation:feature-abc123

# Main 分支
sugar-daddy-recommendation:latest
sugar-daddy-recommendation:stable
sugar-daddy-recommendation:abc123def456

# Release 標籤
sugar-daddy-recommendation:v1.0.0
sugar-daddy-recommendation:v1.0.0-stable
```

---

## 📈 監控和統計

### 工作流統計

- **平均耗時**: Feature ~8 分鐘, Main ~20 分鐘
- **成功率**: 應 > 95%
- **緩存命中率**: npm dependencies 應 > 70%

### 代碼質量指標

```bash
# 本地檢查
npm run test:cov

# 期望覆蓋率
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%
```

---

## 🔒 安全建議

1. **Never** 在工作流中硬編碼密鑰
2. **Always** 使用 Secrets
3. **Rotate** Docker Hub 訪問令牌定期
4. **Restrict** Secrets 範圍 (僅生產工作流)
5. **Review** 工作流文件變更

---

## 📚 參考資源

- [GitHub Actions 文檔](https://docs.github.com/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [語義版本](https://semver.org)
- [Conventional Commits](https://www.conventionalcommits.org)

---

**最後更新**: 2026-02-19  
**維護者**: DevOps Team
