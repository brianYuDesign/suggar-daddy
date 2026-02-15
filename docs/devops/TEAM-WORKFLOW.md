# Sugar Daddy 技術團隊工作流程

> **目標**：建立高效、可擴展的團隊協作流程，確保代碼質量與快速交付

**最後更新**: 2026-02-14

---

## 📋 目錄

- [團隊結構](#團隊結構)
- [開發流程](#開發流程)
- [分支策略](#分支策略)
- [代碼審查](#代碼審查)
- [測試策略](#測試策略)
- [部署流程](#部署流程)
- [溝通協作](#溝通協作)
- [工具與規範](#工具與規範)

---

## 👥 團隊結構

### 角色與職責

| 角色 | 人數 | 主要職責 | 專注領域 |
|------|------|---------|----------|
| **Tech Lead** | 1 | 技術決策、架構審查、團隊協調 | 全棧、系統設計 |
| **Backend Developer** | 2-3 | 微服務開發、API 設計、資料庫優化 | NestJS、PostgreSQL、Kafka |
| **Frontend Developer** | 2 | 用戶界面、前端架構、UX 優化 | Next.js、React、Tailwind |
| **DevOps Engineer** | 1 | CI/CD、容器化、監控、運維 | Docker、K8s、監控 |
| **QA Engineer** | 1 | 測試策略、自動化測試、品質把關 | E2E、整合測試 |

### 代理角色（Custom Agents）

專案已配置專業代理角色協助開發：

| 代理 | 用途 | 使用時機 |
|------|------|---------|
| **backend-developer** | 後端服務開發、API 設計 | 新增/修改微服務功能 |
| **frontend-developer** | 前端組件開發、UX 優化 | Web/Admin 界面開發 |
| **devops-engineer** | CI/CD、基礎設施自動化 | 部署、監控配置 |
| **qa-engineer** | 測試策略、自動化測試 | 測試計劃、測試覆蓋率 |
| **solution-architect** | 系統架構設計、技術選型 | 重大架構決策 |
| **tech-lead** | 技術協調、code review | 技術規劃、跨團隊協作 |

**使用範例**:
```bash
# 使用 backend-developer 代理開發新功能
gh copilot -p "實作會員等級升級邏輯" --agent backend-developer

# 使用 qa-engineer 代理規劃測試
gh copilot -p "為訂閱服務編寫整合測試" --agent qa-engineer
```

---

## 🔄 開發流程

### 工作流概覽

```
需求確認 → 任務分配 → 開發 → 自測 → Code Review → 測試 → 部署 → 監控
```

### 1. 需求確認階段

**輸入**: Product backlog, User stories  
**輸出**: 技術規格文件

- [ ] Tech Lead 與 PM 確認需求
- [ ] 拆分為技術任務（GitHub Issues）
- [ ] 評估工作量與技術風險
- [ ] 確認依賴關係與優先級

**工具**: GitHub Issues, 每週 Planning Meeting

---

### 2. 任務分配

**規則**:
- 每個任務關聯一個 GitHub Issue
- 任務標籤: `feature`, `bug`, `refactor`, `docs`, `test`
- 優先級標籤: `P0` (緊急), `P1` (高), `P2` (中), `P3` (低)
- 服務標籤: `auth-service`, `user-service`, `payment-service` 等

**範例 Issue**:
```markdown
Title: [Feature] 實作訂閱自動續訂邏輯

Labels: feature, P1, subscription-service, backend

## 描述
用戶訂閱到期時自動扣款續訂

## 驗收標準
- [ ] 到期前 3 天發送提醒通知
- [ ] 自動扣款並更新訂閱狀態
- [ ] 扣款失敗後重試 3 次
- [ ] 記錄 Kafka 事件

## 技術要點
- 使用 NestJS Schedule 實作 Cron Job
- 整合 Stripe Subscription API
- 發送 Kafka 事件至 notification-service
```

---

### 3. 開發階段

#### 3.1 創建功能分支

```bash
# 從 develop 分支創建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/subscription-auto-renewal

# 分支命名規範
feature/{issue-number}-{short-description}  # 新功能
bugfix/{issue-number}-{short-description}   # 修復 bug
hotfix/{short-description}                   # 緊急修復
refactor/{scope}                             # 重構
```

#### 3.2 開發規範

**Nx 命令**:
```bash
# 啟動單一服務開發
nx serve subscription-service

# 啟動依賴服務（API Gateway + 目標服務）
nx serve api-gateway &
nx serve subscription-service &

# 僅測試受影響的專案（Nx affected）
nx affected:test --base=develop

# 僅 lint 受影響的專案
nx affected:lint --base=develop
```

**開發檢查清單**:
- [ ] 遵循 TypeScript strict mode
- [ ] 使用共享 DTOs (`@suggar-daddy/dto`)
- [ ] 遵循 NestJS 模組化架構
- [ ] 添加 Swagger 註解（`@ApiOperation`, `@ApiResponse`）
- [ ] 遵循資料流原則：讀 Redis → 寫 Kafka → DB Writer 寫入 PostgreSQL
- [ ] 錯誤處理使用統一的 Exception Filters
- [ ] 敏感操作添加日誌

**代碼風格**:
```typescript
// ✅ 良好範例
@Controller('subscriptions')
@ApiTags('Subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  @Post('renew/:id')
  @Roles(UserRole.SUBSCRIBER)
  @ApiOperation({ summary: '手動續訂訂閱' })
  @ApiResponse({ status: 200, description: '續訂成功' })
  async renewSubscription(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const result = await this.subscriptionService.renew(id, userId);
    
    // 發送 Kafka 事件
    await this.kafkaProducer.send('subscription.renewed', {
      subscriptionId: id,
      userId,
      timestamp: new Date(),
    });

    return result;
  }
}
```

#### 3.3 本地測試

```bash
# 運行單元測試
nx test subscription-service

# 運行整合測試（需要依賴服務）
docker-compose up -d postgres redis kafka
nx test subscription-service:integration

# 手動測試：訪問 Swagger UI
open http://localhost:3009/api/docs
```

#### 3.4 提交代碼

**Commit 規範** (遵循 Conventional Commits):
```bash
# 格式
<type>(<scope>): <subject>

# 類型
feat:     新功能
fix:      修復 bug
docs:     文檔更新
style:    代碼格式（不影響功能）
refactor: 重構
test:     測試相關
chore:    構建/工具相關

# 範例
git commit -m "feat(subscription): 實作自動續訂邏輯"
git commit -m "fix(payment): 修復錢包餘額競態條件"
git commit -m "test(matching): 新增滑動配對整合測試"
```

**使用自動化 commit 腳本**:
```bash
# 自動執行 lint + test 後 commit
npm run commit "feat(subscription): 實作自動續訂邏輯"

# 僅檢查不提交
./scripts/commit.sh --no-commit

# 跳過檢查（慎用）
./scripts/commit.sh --skip-check "fix: hotfix"
```

---

## 🌿 分支策略

### Git Flow 變體

```
main (production)
  └─ develop (integration)
      ├─ feature/xxx
      ├─ bugfix/xxx
      └─ refactor/xxx
  └─ hotfix/xxx (緊急修復)
```

### 分支規則

| 分支 | 用途 | 保護規則 | 部署環境 |
|------|------|---------|---------|
| `main` | 生產環境 | ✅ 需要 PR + 2 人審查 + CI 通過 | Production |
| `develop` | 開發整合 | ✅ 需要 PR + 1 人審查 + CI 通過 | Staging |
| `feature/*` | 功能開發 | ❌ 無限制 | Local |
| `bugfix/*` | Bug 修復 | ❌ 無限制 | Local |
| `hotfix/*` | 緊急修復 | ✅ 需要 PR + 1 人審查 | Production |

### 合併流程

#### 功能開發完成

```bash
# 1. 更新本地 develop
git checkout develop
git pull origin develop

# 2. Rebase 功能分支
git checkout feature/subscription-auto-renewal
git rebase develop

# 3. 推送到遠端
git push origin feature/subscription-auto-renewal

# 4. 創建 Pull Request
gh pr create --base develop --title "feat(subscription): 實作自動續訂邏輯" \
  --body "Closes #123"
```

#### Pull Request 檢查清單

**創建 PR 時**:
- [ ] 標題遵循 Conventional Commits 規範
- [ ] 關聯相關 Issue (`Closes #123`)
- [ ] 描述變更內容與測試方法
- [ ] 添加適當的標籤
- [ ] 指派 Reviewer（至少 1 人）
- [ ] 確保 CI 通過

**PR 模板**:
```markdown
## 變更描述
簡要描述此 PR 的變更內容

## 關聯 Issue
Closes #123

## 變更類型
- [ ] Feature (新功能)
- [ ] Bug Fix (修復 bug)
- [ ] Refactor (重構)
- [ ] Documentation (文檔)

## 測試
- [ ] 單元測試已通過
- [ ] 整合測試已通過
- [ ] 手動測試已完成

## 檢查清單
- [ ] 代碼遵循專案規範
- [ ] 已添加/更新測試
- [ ] 已添加/更新文檔
- [ ] 已添加 Swagger 註解
- [ ] CI 已通過
```

---

## 🔍 代碼審查

### Code Review 原則

**目標**: 提升代碼質量、知識共享、減少 bug

**審查重點**:
1. **功能正確性**: 是否符合需求？是否處理邊界情況？
2. **代碼品質**: 可讀性、可維護性、遵循規範
3. **測試覆蓋**: 是否有足夠的測試？測試是否有意義？
4. **性能**: 是否有性能問題？N+1 查詢？記憶體洩漏？
5. **安全性**: 是否有安全漏洞？敏感資料處理？
6. **架構**: 是否遵循微服務架構原則？

### 審查流程

#### 審查者（Reviewer）

**時間要求**: 24 小時內完成審查

**審查步驟**:
```bash
# 1. Checkout PR 分支
gh pr checkout 123

# 2. 運行測試
nx affected:test --base=develop

# 3. 本地驗證功能
nx serve {service-name}

# 4. 檢查代碼變更
git diff develop...HEAD

# 5. 提供反饋
```

**審查模板**:
```markdown
## 整體評價
✅ LGTM (Looks Good To Me)
⚠️ 需要小調整
❌ 需要重大修改

## 優點
- 代碼清晰易懂
- 測試覆蓋充分

## 建議改進
- [ ] Line 45: 建議使用 `async/await` 而非 callback
- [ ] Line 78: 缺少錯誤處理

## 問題
- [ ] Line 102: 此處可能存在記憶體洩漏

## 測試
- [x] 單元測試已通過
- [x] 手動測試已驗證
```

#### 作者（Author）

**回應時間**: 12 小時內回應審查意見

**處理流程**:
```bash
# 1. 修改代碼
git add .
git commit -m "refactor: 根據 review 意見調整"

# 2. 推送更新
git push origin feature/xxx

# 3. 回覆審查意見
# 在 GitHub PR 頁面逐條回覆
```

### 自動化檢查

**CI Pipeline 會自動執行**:
- ✅ Lint 檢查
- ✅ 單元測試
- ✅ 建置檢查
- ✅ 依賴安全性掃描

**審查者無需檢查的項目**:
- 代碼格式（由 Prettier 自動格式化）
- TypeScript 類型錯誤（由 CI 檢查）
- 基本語法錯誤（由 ESLint 檢查）

---

## 🧪 測試策略

### 測試金字塔

```
        E2E Tests (10%)
   ━━━━━━━━━━━━━━━━━━━━━
    Integration Tests (30%)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━
      Unit Tests (60%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 1. 單元測試 (Unit Tests)

**目標覆蓋率**: 80%  
**測試範圍**: Service、Controller、Utility

**範例**:
```typescript
// subscription.service.spec.ts
describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockRedis: jest.Mocked<RedisService>;
  let mockKafka: jest.Mocked<KafkaProducerService>;

  beforeEach(() => {
    mockRedis = createMockRedis();
    mockKafka = createMockKafka();
    service = new SubscriptionService(mockRedis, mockKafka);
  });

  describe('renew', () => {
    it('應該成功續訂訂閱', async () => {
      mockRedis.get.mockResolvedValue({ status: 'expired' });
      
      const result = await service.renew('sub-123', 'user-123');
      
      expect(result.status).toBe('active');
      expect(mockKafka.send).toHaveBeenCalledWith('subscription.renewed', 
        expect.objectContaining({ subscriptionId: 'sub-123' })
      );
    });

    it('應該拋出錯誤當訂閱不存在', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      await expect(service.renew('invalid', 'user-123'))
        .rejects.toThrow('Subscription not found');
    });
  });
});
```

**運行測試**:
```bash
# 單一服務
nx test subscription-service

# 受影響的服務
nx affected:test

# 監視模式
nx test subscription-service --watch

# 覆蓋率報告
nx test subscription-service --coverage
```

---

### 2. 整合測試 (Integration Tests)

**目標覆蓋率**: 關鍵業務流程 100%  
**測試範圍**: API 端點、Kafka 事件、資料庫操作

**範例**:
```typescript
// subscription.integration.spec.ts
describe('Subscription API (Integration)', () => {
  let app: INestApplication;
  let redis: RedisService;
  let kafka: KafkaProducerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [SubscriptionModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /subscriptions/renew/:id', () => {
    it('應該成功續訂並發送 Kafka 事件', async () => {
      const kafkaSpy = jest.spyOn(kafka, 'send');

      const response = await request(app.getHttpServer())
        .post('/subscriptions/renew/sub-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.status).toBe('active');
      expect(kafkaSpy).toHaveBeenCalledWith('subscription.renewed', 
        expect.any(Object)
      );
    });
  });
});
```

---

### 3. E2E 測試 (End-to-End Tests)

**目標覆蓋率**: 核心用戶旅程 100%  
**測試範圍**: 完整業務流程（跨服務）

**使用 Playwright**:
```typescript
// e2e/subscription-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('訂閱流程', () => {
  test('用戶應該能夠訂閱 Creator', async ({ page }) => {
    // 1. 登入
    await page.goto('http://localhost:4200/login');
    await page.fill('[name="email"]', 'subscriber@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 2. 選擇訂閱方案
    await page.goto('http://localhost:4200/creator/creator-123');
    await page.click('text=訂閱 $9.99/月');

    // 3. 輸入支付資訊
    await page.fill('[name="cardNumber"]', '4242424242424242');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvc"]', '123');
    await page.click('button:has-text("確認訂閱")');

    // 4. 驗證訂閱成功
    await expect(page.locator('text=訂閱成功')).toBeVisible();
    await expect(page.locator('[data-testid="subscription-status"]'))
      .toHaveText('已訂閱');
  });
});
```

**運行 E2E 測試**:
```bash
# 執行所有 E2E 測試
npm run e2e

# UI 模式（推薦開發時使用）
npm run e2e:ui

# Debug 模式
npm run e2e:debug

# 查看報告
npm run e2e:report
```

---

### 測試最佳實踐

**DO ✅**:
- 測試業務邏輯，而非實作細節
- 使用描述性的測試名稱
- 遵循 AAA 模式（Arrange, Act, Assert）
- Mock 外部依賴（Redis, Kafka, 第三方 API）
- 每個測試應該獨立且可重複運行

**DON'T ❌**:
- 不要測試第三方函式庫
- 不要測試 TypeORM 內建功能
- 不要在測試中使用真實資料庫（使用 Mock）
- 不要寫依賴執行順序的測試

---

## 🚀 部署流程

### 環境配置

| 環境 | 分支 | 自動部署 | 審查要求 |
|------|------|---------|---------|
| **Local** | feature/* | ❌ | 無 |
| **Staging** | develop | ✅ | 1 人審查 + CI 通過 |
| **Production** | main | ⚠️ 手動觸發 | 2 人審查 + CI 通過 + QA 簽核 |

### CI/CD Pipeline

#### 1. Pull Request 階段

```yaml
# .github/workflows/ci.yml 會自動執行
on:
  pull_request:
    branches: [main, develop]

jobs:
  - lint
  - test
  - build
```

**檢查項目**:
- ✅ ESLint 檢查通過
- ✅ 所有測試通過
- ✅ 建置成功
- ✅ Docker 映像建置成功

#### 2. Staging 部署 (自動)

```yaml
# develop 分支合併後自動部署
on:
  push:
    branches: [develop]

jobs:
  - build_and_push_images
  - deploy_to_staging
  - run_smoke_tests
```

**部署後驗證**:
```bash
# 健康檢查
curl https://staging.suggar-daddy.com/api/health

# 查看日誌
kubectl logs -f deployment/api-gateway -n staging

# 執行煙霧測試
npm run e2e:smoke -- --env=staging
```

#### 3. Production 部署 (手動)

**部署前檢查清單**:
- [ ] Staging 環境測試通過
- [ ] QA 簽核完成
- [ ] 資料庫遷移腳本已準備
- [ ] 回滾計劃已確認
- [ ] 監控與告警已配置
- [ ] 團隊成員已通知

**部署步驟**:
```bash
# 1. 創建 Release Tag
git tag -a v1.2.0 -m "Release v1.2.0: 訂閱自動續訂功能"
git push origin v1.2.0

# 2. 手動觸發部署（在 GitHub Actions）
gh workflow run cd-production.yml --ref v1.2.0

# 3. 監控部署進度
kubectl rollout status deployment/api-gateway -n production

# 4. 驗證部署
npm run e2e:smoke -- --env=production

# 5. 如需回滾
kubectl rollout undo deployment/api-gateway -n production
```

---

### 部署後監控

**監控指標**:
- 服務健康狀態（Health Check）
- API 回應時間
- 錯誤率
- Kafka 消費延遲
- 資料庫連線數

**告警規則**:
- 🔴 **Critical**: 服務 Down、錯誤率 > 5%
- 🟠 **Warning**: 回應時間 > 500ms、Kafka 延遲 > 1000 條

**工具**:
```bash
# Grafana Dashboard
open http://monitoring.suggar-daddy.com/grafana

# Prometheus Metrics
open http://monitoring.suggar-daddy.com/prometheus

# Kibana Logs
open http://monitoring.suggar-daddy.com/kibana
```

---

## 💬 溝通協作

### 會議節奏

| 會議 | 頻率 | 時長 | 參與者 | 目的 |
|------|------|------|--------|------|
| **Daily Standup** | 每日 10:00 | 15 分鐘 | 全員 | 同步進度、阻礙 |
| **Sprint Planning** | 每兩週一 10:00 | 2 小時 | 全員 | 規劃下個 Sprint |
| **Sprint Review** | 每兩週五 15:00 | 1 小時 | 全員 + PM | Demo 完成功能 |
| **Sprint Retro** | 每兩週五 16:00 | 1 小時 | 全員 | 回顧改進 |
| **Tech Sync** | 每週三 14:00 | 30 分鐘 | Tech Lead + 開發者 | 技術討論 |

### Daily Standup 格式

**每人分享（<3 分鐘）**:
1. 昨天完成了什麼？
2. 今天計劃做什麼？
3. 有什麼阻礙嗎？

**範例**:
```
【昨天】
- 完成訂閱自動續訂邏輯
- Code review 2 個 PR

【今天】
- 撰寫自動續訂的整合測試
- 開始實作失敗重試機制

【阻礙】
- 需要 DevOps 協助配置 Stripe Webhook
```

---

### 協作工具

| 工具 | 用途 | 連結 |
|------|------|------|
| **GitHub** | 代碼管理、Issue 追蹤、PR 審查 | [github.com/org/suggar-daddy](https://github.com) |
| **Slack** | 即時溝通 | #engineering, #backend, #frontend |
| **Notion** | 文檔、知識庫 | [notion.so/team](https://notion.so) |
| **Figma** | 設計稿 | [figma.com/project](https://figma.com) |
| **Grafana** | 監控 Dashboard | http://monitoring.suggar-daddy.com |

---

### Slack 頻道規範

| 頻道 | 用途 | 通知級別 |
|------|------|---------|
| **#engineering** | 技術討論、公告 | 🔔 全部通知 |
| **#backend** | 後端開發討論 | 🔔 提及時通知 |
| **#frontend** | 前端開發討論 | 🔔 提及時通知 |
| **#devops** | 部署、監控告警 | 🔔 全部通知 |
| **#alerts** | 自動化告警（Grafana） | 🔔 Critical only |
| **#deployments** | 部署通知 | 🔔 全部通知 |
| **#pr-reviews** | PR 審查提醒（Bot） | 🔔 提及時通知 |

---

## 🛠️ 工具與規範

### 開發環境設置

**必備工具**:
```bash
# 1. Node.js (透過 nvm)
nvm install 20
nvm use 20

# 2. Docker Desktop
# 下載：https://www.docker.com/products/docker-desktop

# 3. GitHub CLI
brew install gh
gh auth login

# 4. VS Code 擴展
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-azuretools.vscode-docker
code --install-extension GitHub.copilot
```

**專案設置**:
```bash
# 1. Clone 專案
git clone git@github.com:org/suggar-daddy.git
cd suggar-daddy

# 2. 安裝依賴
npm install

# 3. 複製環境變數
cp .env.example .env.local

# 4. 啟動基礎設施
docker-compose up -d postgres redis kafka

# 5. 啟動服務
nx serve api-gateway
```

---

### 代碼規範

#### TypeScript

**tsconfig.json 規則**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### ESLint 規則

**自動修復**:
```bash
# 修復所有可自動修復的問題
nx affected:lint --fix

# 手動檢查單一專案
nx lint subscription-service
```

#### Prettier

**自動格式化**:
```bash
# VS Code 儲存時自動格式化
# 設定 settings.json:
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

### 命名規範

#### 檔案命名

```
{name}.{type}.ts

# 範例
subscription.service.ts
subscription.controller.ts
subscription.service.spec.ts
subscription.dto.ts
subscription.entity.ts
```

#### 類別命名

```typescript
// PascalCase
export class SubscriptionService {}
export class CreateSubscriptionDto {}
export class Subscription {}
```

#### 變數命名

```typescript
// camelCase
const userId = '123';
const subscriptionData = await this.fetch();

// 常數使用 UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const KAFKA_TOPIC = 'subscription.created';
```

---

## 📈 效能與品質指標

### 開發速度指標

| 指標 | 目標 | 測量方式 |
|------|------|---------|
| **PR 平均審查時間** | < 24 小時 | GitHub Insights |
| **CI 執行時間** | < 10 分鐘 | GitHub Actions |
| **部署頻率** | 每天 2-3 次 | Deployment logs |
| **平均修復時間 (MTTR)** | < 1 小時 | Incident tracking |

### 代碼品質指標

| 指標 | 目標 | 測量方式 |
|------|------|---------|
| **測試覆蓋率** | > 80% | Jest coverage |
| **TypeScript 嚴格模式** | 100% | tsconfig |
| **Lint 通過率** | 100% | ESLint |
| **技術債務** | < 5% | SonarQube |

### 系統穩定性指標

| 指標 | 目標 | 測量方式 |
|------|------|---------|
| **API 可用性** | > 99.9% | Uptime monitoring |
| **API P95 回應時間** | < 500ms | Grafana |
| **錯誤率** | < 0.1% | Error tracking |
| **Kafka 消費延遲** | < 100 條 | Kafka monitoring |

---

## 🔐 安全規範

### 敏感資料處理

**環境變數管理**:
```bash
# ✅ 正確：使用環境變數
const stripeKey = process.env.STRIPE_SECRET_KEY;

# ❌ 錯誤：硬編碼
const stripeKey = 'sk_live_xxxxx';
```

**不要提交到 Git**:
- API Keys
- Database 密碼
- JWT Secret
- 第三方服務 Token

**檢查工具**:
```bash
# Git pre-commit hook 會自動檢查
git commit -m "feat: add payment"
# 若包含敏感資料會被阻止
```

---

### API 安全

**認證與授權**:
```typescript
// 所有端點預設需要 JWT
@UseGuards(JwtAuthGuard)

// 公開端點需明確標記
@Public()

// 角色驗證
@Roles(UserRole.ADMIN)
```

**輸入驗證**:
```typescript
// 使用 class-validator
export class CreateSubscriptionDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  amount: number;

  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;
}
```

---

## 📚 學習資源

### 內部文檔

- [專案架構](./01-專案架構與設計.md)
- [開發指南](./02-開發指南.md)
- [API 文檔](./api/README.md)
- [測試策略](./testing/README.md)
- [DevOps 指南](./devops/README.md)

### 外部資源

**NestJS**:
- [官方文檔](https://docs.nestjs.com/)
- [Best Practices](https://docs.nestjs.com/fundamentals/testing)

**Nx Monorepo**:
- [官方文檔](https://nx.dev/)
- [Affected Commands](https://nx.dev/concepts/affected)

**微服務架構**:
- [Martin Fowler - Microservices](https://martinfowler.com/articles/microservices.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

---

## 🚨 故障處理

### 問題升級流程

```
Level 1: 開發者自行解決 (< 30 分鐘)
   ↓
Level 2: 向 Tech Lead 求助 (< 1 小時)
   ↓
Level 3: 團隊討論 (< 2 小時)
   ↓
Level 4: 外部支援 / 回滾
```

### 緊急故障（Production Down）

**立即行動**:
```bash
# 1. 通知團隊
post to #engineering "🚨 Production Down: {service-name}"

# 2. 查看日誌
kubectl logs -f deployment/{service-name} -n production

# 3. 回滾到上一版本
kubectl rollout undo deployment/{service-name} -n production

# 4. 驗證恢復
curl https://api.suggar-daddy.com/health
```

**事後處理**:
- 撰寫事故報告（Post-Mortem）
- 分析根本原因
- 制定預防措施
- 更新 Runbook

---

## 📝 總結

### 工作流核心原則

1. **自動化優先**: 能自動化的流程就自動化（CI/CD、測試、部署）
2. **代碼審查必須**: 所有代碼必須經過至少 1 人審查
3. **測試金字塔**: 單元測試為主，整合測試為輔，E2E 測試覆蓋核心流程
4. **小步快跑**: 小 PR、頻繁提交、快速反饋
5. **文檔同步**: 代碼變更時同步更新文檔

### 持續改進

**每個 Sprint Retro 檢討**:
- 哪些流程運作良好？
- 哪些流程需要改進？
- 有哪些阻礙需要移除？

**定期回顧指標**:
- PR 審查時間是否在目標內？
- CI 時間是否過長？
- 部署是否順暢？
- 測試覆蓋率是否提升？

---

**任何疑問？**  
請在 #engineering 頻道提出，或聯繫 Tech Lead。

**工作流文檔維護**: 每月檢視並更新此文檔  
**最後更新**: 2026-02-14  
**維護者**: Tech Lead
