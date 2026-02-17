# Sugar Daddy CI/CD 測試配置指南

> **Tech Lead 審核通過** | 版本 1.0 | 2025-02-17

## 目錄

- [1. CI/CD 測試流程](#1-cicd-測試流程)
- [2. GitHub Actions 配置](#2-github-actions-配置)
- [3. 測試環境配置](#3-測試環境配置)
- [4. 測試分階段執行](#4-測試分階段執行)
- [5. 測試報告與覆蓋率](#5-測試報告與覆蓋率)
- [6. 性能優化策略](#6-性能優化策略)
- [7. 故障處理](#7-故障處理)
- [8. 最佳實踐](#8-最佳實踐)

---

## 1. CI/CD 測試流程

### 1.1 完整測試流程圖

```
開發者 Push/PR
    ↓
┌─────────────────────────────────────────┐
│  Stage 1: Pre-checks (2 min)            │
│  ✓ Lint                                 │
│  ✓ Type Check                           │
│  ✓ Format Check                         │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Stage 2: Unit Tests (3 min)            │
│  ✓ Backend Unit Tests                   │
│  ✓ Frontend Unit Tests                  │
│  ✓ Coverage Report                      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Stage 3: Integration Tests (5 min)     │
│  ✓ API Tests                            │
│  ✓ Database Tests                       │
│  ✓ Service Integration Tests            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Stage 4: Build (3 min)                 │
│  ✓ Docker Images                        │
│  ✓ Frontend Build                       │
│  ✓ Backend Build                        │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Stage 5: E2E Tests (10 min)            │
│  ✓ Critical Path Tests                  │
│  ✓ User Journey Tests                   │
│  ✓ Cross-Browser Tests                  │
└─────────────────────────────────────────┘
    ↓
✅ All Passed → Merge/Deploy
❌ Failed → Block & Notify
```

### 1.2 測試策略矩陣

| 分支/事件 | Lint | Unit | Integration | E2E | Deploy |
|----------|------|------|-------------|-----|--------|
| **Feature Branch** | ✅ | ✅ | ✅ | ⚪ | ❌ |
| **PR to Develop** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **PR to Main** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Merge to Develop** | ✅ | ✅ | ✅ | ✅ | ✅ Dev |
| **Merge to Main** | ✅ | ✅ | ✅ | ✅ | ✅ Prod |
| **Nightly Build** | ✅ | ✅ | ✅ | ✅ Full | ❌ |

---

## 2. GitHub Actions 配置

### 2.1 完整 CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  CACHE_VERSION: v1

jobs:
  # ==========================================
  # Stage 1: 預檢查
  # ==========================================
  pre-checks:
    name: Pre-checks
    runs-on: ubuntu-latest
    timeout-minutes: 5
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 完整歷史，用於 Nx affected
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Format check
        run: npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"

  # ==========================================
  # Stage 2: 單元測試
  # ==========================================
  unit-tests:
    name: Unit Tests
    needs: pre-checks
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 分片加速
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Run unit tests (Shard ${{ matrix.shard }})
        run: |
          npm run test:unit -- \
            --shard=${{ matrix.shard }}/4 \
            --coverage \
            --maxWorkers=2
        env:
          NODE_ENV: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./test/coverage/unit/lcov.info
          flags: unit-tests-shard-${{ matrix.shard }}
          name: unit-coverage-${{ matrix.shard }}

  # ==========================================
  # Stage 3: 整合測試
  # ==========================================
  integration-tests:
    name: Integration Tests
    needs: pre-checks
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: suggar_daddy_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
      
      kafka:
        image: confluentinc/cp-kafka:7.5.0
        env:
          KAFKA_BROKER_ID: 1
          KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
          KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
          KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
        ports:
          - 9092:9092
      
      zookeeper:
        image: confluentinc/cp-zookeeper:7.5.0
        env:
          ZOOKEEPER_CLIENT_PORT: 2181
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Wait for services
        run: |
          npx wait-on tcp:5432 tcp:6379 tcp:9092 -t 60000
      
      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/suggar_daddy_test
      
      - name: Run integration tests
        run: npm run test:integration -- --coverage
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/suggar_daddy_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          KAFKA_BROKERS: localhost:9092
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./test/coverage/integration/lcov.info
          flags: integration-tests
          name: integration-coverage

  # ==========================================
  # Stage 4: 建置
  # ==========================================
  build:
    name: Build
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    strategy:
      matrix:
        service:
          - api-gateway
          - auth-service
          - user-service
          - payment-service
          - subscription-service
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Build ${{ matrix.service }}
        run: npx nx build ${{ matrix.service }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.service }}-dist
          path: dist/apps/${{ matrix.service }}
          retention-days: 7

  # ==========================================
  # Stage 5: E2E 測試
  # ==========================================
  e2e-tests:
    name: E2E Tests
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}
      
      - name: Start services with Docker Compose
        run: |
          docker-compose -f docker-compose.test.yml up -d
          npx wait-on http://127.0.0.1:3000/health http://127.0.0.1:4200 -t 120000
      
      - name: Run E2E tests (${{ matrix.browser }})
        run: npm run test:e2e -- --project=${{ matrix.browser }}
        env:
          E2E_BASE_URL: http://127.0.0.1:4200
          E2E_API_URL: http://127.0.0.1:3000
      
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: test/coverage/e2e-report/
          retention-days: 30
      
      - name: Upload test traces
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-traces-${{ matrix.browser }}
          path: test/coverage/e2e-artifacts/
          retention-days: 30
      
      - name: Stop services
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v

  # ==========================================
  # 合併覆蓋率報告
  # ==========================================
  coverage-report:
    name: Merge Coverage Reports
    needs: [unit-tests, integration-tests, e2e-tests]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download all coverage reports
        uses: actions/download-artifact@v3
      
      - name: Merge coverage reports
        run: |
          npx nyc merge test/coverage/unit test/coverage/merged
          npx nyc merge test/coverage/integration test/coverage/merged
      
      - name: Generate merged report
        run: |
          npx nyc report --reporter=html --report-dir=test/coverage/merged
      
      - name: Upload merged coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./test/coverage/merged/lcov.info
          flags: all-tests
          name: merged-coverage
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ==========================================
  # 建置 Docker 映像（僅在 merge 後）
  # ==========================================
  docker-build:
    name: Build Docker Images
    needs: [unit-tests, integration-tests, e2e-tests]
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    strategy:
      matrix:
        service: [api-gateway, auth-service, user-service]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/${{ matrix.service }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: infrastructure/docker/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: |
            APP_NAME=${{ matrix.service }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 2.2 Nightly 完整測試

```yaml
# .github/workflows/nightly.yml
name: Nightly Full Test Suite

on:
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨 2:00 UTC
  workflow_dispatch:      # 允許手動觸發

jobs:
  full-e2e:
    name: Full E2E Test Suite
    runs-on: ubuntu-latest
    timeout-minutes: 120
    
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        device: [desktop, mobile]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start services
        run: docker-compose -f docker-compose.test.yml up -d
      
      - name: Run full E2E suite
        run: |
          npm run test:e2e -- \
            --project=${{ matrix.browser }} \
            --grep-invert="@skip-nightly"
        env:
          DEVICE: ${{ matrix.device }}
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: nightly-report-${{ matrix.browser }}-${{ matrix.device }}
          path: test/coverage/e2e-report/
  
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run load tests
        run: |
          docker-compose -f docker-compose.test.yml up -d
          npm run test:performance
      
      - name: Generate performance report
        run: npm run report:performance
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: test/reports/performance/
  
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run OWASP dependency check
        run: |
          npm install -g @owasp/dependency-check
          dependency-check --project "Sugar Daddy" --scan .

  # 發送報告
  notify:
    name: Send Nightly Report
    needs: [full-e2e, performance-tests, security-scan]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "Nightly Test Report",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Nightly Test Results*\n\nE2E: ${{ needs.full-e2e.result }}\nPerformance: ${{ needs.performance-tests.result }}\nSecurity: ${{ needs.security-scan.result }}"
                  }
                }
              ]
            }
```

---

## 3. 測試環境配置

### 3.1 Docker Compose for CI

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: suggar_daddy_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user"]
      interval: 5s
      timeout: 5s
      retries: 5
    tmpfs:
      - /var/lib/postgresql/data  # 使用 RAM，加速測試

  redis-test:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    tmpfs:
      - /data

  kafka-test:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper-test
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper-test:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_LOG_RETENTION_HOURS: 1
    ports:
      - "9092:9092"
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server=localhost:9092"]
      interval: 10s
      timeout: 10s
      retries: 5

  zookeeper-test:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  # API Gateway
  api-gateway-test:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile
      args:
        APP_NAME: api-gateway
    environment:
      NODE_ENV: test
      PORT: 3000
      DATABASE_URL: postgresql://test_user:test_pass@postgres-test:5432/suggar_daddy_test
      REDIS_HOST: redis-test
      KAFKA_BROKERS: kafka-test:9092
    ports:
      - "3000:3000"
    depends_on:
      postgres-test:
        condition: service_healthy
      redis-test:
        condition: service_healthy
      kafka-test:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Web App
  web-test:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      NODE_ENV: test
      NEXT_PUBLIC_API_URL: http://api-gateway-test:3000
    ports:
      - "4200:4200"
    depends_on:
      - api-gateway-test
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4200"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### 3.2 環境變數配置

```bash
# .env.ci
NODE_ENV=test

# Database
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/suggar_daddy_test
DB_POOL_SIZE=5

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=test-client

# JWT
JWT_SECRET=test-jwt-secret-key
JWT_EXPIRATION=1h

# Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# AWS (LocalStack)
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Email (MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASS=test
```

---

## 4. 測試分階段執行

### 4.1 快速反饋循環

```yaml
# 開發者本地 Pre-commit Hook
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# 只測試變更的文件
npm run lint -- --fix
npm run test:unit -- --onlyChanged --bail

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

echo "✅ All checks passed!"
```

### 4.2 PR 檢查策略

```yaml
# .github/workflows/pr-check.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  changed-files:
    name: Detect Changed Files
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
      e2e: ${{ steps.filter.outputs.e2e }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            backend:
              - 'apps/*/src/**/*.ts'
              - 'libs/*/src/**/*.ts'
            frontend:
              - 'apps/web/**/*.{ts,tsx}'
              - 'apps/admin/**/*.{ts,tsx}'
            e2e:
              - 'test/e2e/**/*'

  test-backend:
    name: Test Backend
    needs: changed-files
    if: needs.changed-files.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit -- --testPathPattern="apps|libs"

  test-frontend:
    name: Test Frontend
    needs: changed-files
    if: needs.changed-files.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:ui

  test-e2e:
    name: Test E2E
    needs: changed-files
    if: needs.changed-files.outputs.e2e == 'true' || needs.changed-files.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e -- --project=chromium
```

---

## 5. 測試報告與覆蓋率

### 5.1 Codecov 配置

```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 80%           # 專案整體目標
        threshold: 2%         # 允許下降 2%
        if_ci_failed: error
    
    patch:
      default:
        target: 90%           # 新代碼要求更高
        if_ci_failed: error

  ignore:
    - "**/*.spec.ts"
    - "**/*.spec.tsx"
    - "**/test/**"
    - "**/__mocks__/**"
    - "**/node_modules/**"

comment:
  layout: "diff, files, footer"
  behavior: default
  require_changes: true
  require_base: true
  require_head: true

github_checks:
  annotations: true
```

### 5.2 測試報告格式

```typescript
// test/config/reporters/custom-reporter.ts
import { Reporter, TestResult } from '@jest/reporters';

class CustomCIReporter implements Reporter {
  onRunComplete(contexts, results) {
    const summary = {
      total: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      skipped: results.numPendingTests,
      duration: results.testResults.reduce((acc, r) => acc + r.perfStats.runtime, 0),
      coverage: results.coverageMap?.getCoverageSummary(),
    };

    console.log('\n📊 Test Summary:');
    console.log(JSON.stringify(summary, null, 2));

    // 輸出 GitHub Actions 格式
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::set-output name=test-passed::${summary.passed}`);
      console.log(`::set-output name=test-failed::${summary.failed}`);
      console.log(`::set-output name=coverage::${summary.coverage.lines.pct}`);
    }

    // 失敗時顯示詳細資訊
    if (results.numFailedTests > 0) {
      console.error('\n❌ Failed Tests:');
      results.testResults.forEach(testResult => {
        testResult.testResults
          .filter(t => t.status === 'failed')
          .forEach(test => {
            console.error(`  - ${test.fullName}`);
            console.error(`    ${test.failureMessages[0]}`);
          });
      });
    }
  }
}

export default CustomCIReporter;
```

### 5.3 Playwright HTML Reporter 配置

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['html', {
      outputFolder: 'test/coverage/e2e-report',
      open: 'never',  // CI 環境不自動打開
    }],
    ['json', {
      outputFile: 'test/coverage/e2e-results.json',
    }],
    ['github'],  // GitHub Actions 註解
    ['list', { printSteps: true }],
  ],
});
```

---

## 6. 性能優化策略

### 6.1 測試並行化

```typescript
// jest.config.ci.ts
export default {
  ...baseConfig,
  
  // 根據 CI 環境調整並行度
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // 啟用測試分片
  shard: process.env.CI_NODE_INDEX 
    ? `${process.env.CI_NODE_INDEX}/${process.env.CI_NODE_TOTAL}`
    : undefined,
  
  // 優化記憶體使用
  workerIdleMemoryLimit: '512MB',
  
  // 快取優化
  cache: true,
  cacheDirectory: '/tmp/jest-cache',
};
```

### 6.2 Docker 層快取

```dockerfile
# Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]
```

### 6.3 GitHub Actions 快取

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
      */*/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache Jest
  uses: actions/cache@v3
  with:
    path: /tmp/jest-cache
    key: ${{ runner.os }}-jest-${{ hashFiles('**/*.spec.ts') }}
    restore-keys: |
      ${{ runner.os }}-jest-

- name: Cache Playwright browsers
  uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
```

---

## 7. 故障處理

### 7.1 自動重試策略

```yaml
# .github/workflows/ci.yml
- name: Run E2E tests with retry
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 30
    max_attempts: 3
    retry_wait_seconds: 60
    command: npm run test:e2e
```

```typescript
// playwright.config.ts
export default defineConfig({
  // CI 環境自動重試失敗的測試
  retries: process.env.CI ? 2 : 0,
  
  // 失敗時截圖和錄影
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
```

### 7.2 通知機制

```yaml
# .github/workflows/ci.yml
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ CI Failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*CI Pipeline Failed*\n\nBranch: `${{ github.ref }}`\nCommit: `${{ github.sha }}`\nAuthor: ${{ github.actor }}\n\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Details>"
            }
          }
        ]
      }
```

### 7.3 測試隔離與清理

```typescript
// test/config/global-teardown.ts
export default async function globalTeardown() {
  // 清理測試數據
  await cleanupTestDatabase();
  
  // 關閉服務
  await stopTestServices();
  
  // 清理臨時文件
  await cleanupTempFiles();
  
  console.log('✅ Global teardown completed');
}
```

---

## 8. 最佳實踐

### 8.1 CI 測試原則

1. **快速失敗（Fail Fast）**
   ```yaml
   strategy:
     fail-fast: true  # 一個失敗就停止其他任務
   ```

2. **測試隔離**
   - 每個測試使用獨立數據庫 schema
   - 測試後自動清理

3. **可重現性**
   - 固定依賴版本
   - 使用 Docker 確保環境一致

4. **可觀測性**
   - 詳細的日誌
   - 失敗時保存 artifacts

### 8.2 效能監控

```yaml
- name: Track test duration
  run: |
    START_TIME=$(date +%s)
    npm run test:unit
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "Test duration: ${DURATION}s"
    
    # 發送到監控系統
    curl -X POST $METRICS_ENDPOINT \
      -d "test.duration=$DURATION" \
      -d "test.type=unit" \
      -d "branch=$GITHUB_REF"
```

### 8.3 安全性檢查

```yaml
security-checks:
  runs-on: ubuntu-latest
  steps:
    - name: Run npm audit
      run: npm audit --audit-level=high
      
    - name: Check for secrets
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        
    - name: SAST scan
      uses: github/codeql-action/analyze@v2
```

---

## 附錄 A：故障排除

### 問題 1：測試超時

**症狀**：
```
Error: Timeout - Async callback was not invoked within the 5000ms timeout
```

**解決方案**：
```yaml
# 增加超時時間
- run: npm run test:integration
  timeout-minutes: 15

# 或在測試中設置
it('long test', async () => {
  // ...
}, 30000);
```

### 問題 2：服務啟動失敗

**症狀**：
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決方案**：
```yaml
# 等待服務就緒
- name: Wait for services
  run: |
    npx wait-on \
      tcp:5432 \
      tcp:6379 \
      http://127.0.0.1:3000/health \
      -t 60000 \
      --interval 1000
```

### 問題 3：覆蓋率不穩定

**症狀**：覆蓋率報告不一致

**解決方案**：
```yaml
# 確保完整的代碼覆蓋率收集
- run: npm run test:unit -- --coverage --collectCoverageFrom='apps/**/*.ts'
- run: npm run test:integration -- --coverage --collectCoverageFrom='apps/**/*.ts'

# 合併報告
- run: npx nyc merge coverage .nyc_output
- run: npx nyc report --reporter=lcov
```

---

**維護者**: Tech Lead  
**版本**: 1.0  
**最後更新**: 2025-02-17  
**審核週期**: 每季度
