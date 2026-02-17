# Sugar Daddy 測試改善路線圖

> **Tech Lead 批准** | 2025-02-17 - 2025-08-17 (6個月計劃)

## 📅 執行時間軸

```
2025年
Feb  ████░░░░░░░░░░░░░░░░░░░░ Phase 1: 基礎修復
Mar  ░░░░████████░░░░░░░░░░░░ Phase 2: 覆蓋率提升
Apr  ░░░░░░░░████████░░░░░░░░ Phase 2: 覆蓋率提升 (續)
May  ░░░░░░░░░░░░████████░░░░ Phase 3: E2E 完善
Jun  ░░░░░░░░░░░░░░░░████████ Phase 4: CI/CD 優化
Jul  ░░░░░░░░░░░░░░░░░░░░████ Phase 5: 監控與維護
Aug  ░░░░░░░░░░░░░░░░░░░░░░░█ 持續改進
```

---

## Phase 1: 基礎修復 (Week 1-2) 🔧

### 目標
解決所有阻塞問題，讓測試系統正常運作

### 任務清單

#### Week 1: 配置修復
- [ ] **Day 1-2: 修復 Module Resolution**
  ```typescript
  // 任務：更新 jest.unit.config.ts
  // 負責人：Tech Lead
  // 時間：4 小時
  
  moduleNameMapper: {
    '^@suggar-daddy/common$': '<rootDir>/libs/common/src/index.ts',
    '^@suggar-daddy/redis$': '<rootDir>/libs/redis/src/index.ts',
    '^@suggar-daddy/kafka$': '<rootDir>/libs/kafka/src/index.ts',
    '^@suggar-daddy/database$': '<rootDir>/libs/database/src/index.ts',
    '^@suggar-daddy/auth$': '<rootDir>/libs/auth/src/index.ts',
    '^@suggar-daddy/dto$': '<rootDir>/libs/dto/src/index.ts',
    '^@suggar-daddy/ui$': '<rootDir>/libs/ui/src/index.ts',
    '^@suggar-daddy/api-client$': '<rootDir>/libs/api-client/src/index.ts',
  }
  ```

- [ ] **Day 2-3: 解決 Mock 衝突**
  ```bash
  # 任務：統一 mock 文件
  # 負責人：Backend Developer
  # 時間：4 小時
  
  mkdir -p test/mocks
  mv apps/web/src/__mocks__/api.ts test/mocks/web-api.ts
  mv apps/admin/src/__mocks__/api.ts test/mocks/admin-api.ts
  ```

- [ ] **Day 4-5: 修復失敗的測試**
  ```bash
  # 任務：讓所有單元測試通過
  # 負責人：全體開發者
  # 時間：8 小時
  
  npm run test:unit
  # 修復所有失敗的測試
  ```

#### Week 2: 工具建設
- [ ] **Day 1-2: 建立測試工具庫**
  ```typescript
  // test/utils/factories/
  // test/utils/helpers/
  // test/utils/assertions/
  
  // 負責人：QA Engineer
  // 時間：8 小時
  ```

- [ ] **Day 3-4: 建立測試數據管理**
  ```typescript
  // test/fixtures/
  // test/factories/
  
  // 負責人：QA Engineer
  // 時間：8 小時
  ```

- [ ] **Day 5: 文檔更新**
  ```markdown
  # 更新所有測試文檔
  # 負責人：Tech Lead
  # 時間：4 小時
  ```

### 成功指標
- ✅ 所有單元測試可執行
- ✅ 測試通過率 > 95%
- ✅ 無配置錯誤
- ✅ 測試工具庫建立完成

### 驗收標準
```bash
npm run test:unit               # 100% pass
npm run test:integration        # 100% pass
npm run test:ui                 # 100% pass
npm run lint                    # 0 errors
```

---

## Phase 2: 覆蓋率提升 (Week 3-8) 📈

### 目標
將測試覆蓋率提升至可接受水平

### Week 3-4: 後端單元測試 (60% → 75%)

#### 高優先級服務
- [ ] **訂閱服務** (0% → 90%)
  ```typescript
  // apps/subscription-service/src/app/
  - [ ] subscription.service.spec.ts      // 6 operations
  - [ ] billing.service.spec.ts           // 4 operations
  - [ ] tier-management.service.spec.ts   // 3 operations
  
  // 負責人：Backend Developer 1
  // 時間：2 天
  ```

- [ ] **配對服務** (0% → 85%)
  ```typescript
  // apps/matching-service/src/app/
  - [ ] matching-algorithm.service.spec.ts // 4 algorithms
  - [ ] preference.service.spec.ts         // 5 operations
  
  // 負責人：Backend Developer 2
  // 時間：2 天
  ```

- [ ] **訊息服務** (0% → 80%)
  ```typescript
  // apps/messaging-service/src/app/
  - [ ] messaging.service.spec.ts          // 5 features
  - [ ] real-time.service.spec.ts          // 3 features
  
  // 負責人：Backend Developer 3
  // 時間：2 天
  ```

### Week 5-6: 整合測試 (20% → 50%)

#### 關鍵流程整合測試
- [ ] **支付流程** (0% → 100%)
  ```typescript
  // test/integration/scenarios/
  - [ ] payment-charge.integration.spec.ts
  - [ ] payment-refund.integration.spec.ts
  - [ ] payment-webhook.integration.spec.ts
  
  // 負責人：QA Engineer + Backend Dev
  // 時間：3 天
  ```

- [ ] **認證流程** (0% → 100%)
  ```typescript
  - [ ] auth-register.integration.spec.ts
  - [ ] auth-login.integration.spec.ts
  - [ ] auth-oauth.integration.spec.ts
  
  // 負責人：QA Engineer + Backend Dev
  // 時間：2 天
  ```

- [ ] **訂閱流程** (0% → 100%)
  ```typescript
  - [ ] subscription-purchase.integration.spec.ts
  - [ ] subscription-renewal.integration.spec.ts
  - [ ] subscription-cancel.integration.spec.ts
  
  // 負責人：QA Engineer + Backend Dev
  // 時間：3 天
  ```

### Week 7-8: 前端測試 (64% → 80%)

#### Admin 應用測試
- [ ] **Admin 核心功能** (0% → 70%)
  ```typescript
  // apps/admin/app/(dashboard)/
  - [ ] users/page.spec.tsx
  - [ ] creators/page.spec.tsx
  - [ ] transactions/page.spec.tsx
  - [ ] content-moderation/page.spec.tsx
  
  // 負責人：Frontend Developer
  // 時間：4 天
  ```

#### Web 應用測試改善
- [ ] **修復失敗的測試** (64% → 80%)
  ```typescript
  // apps/web/app/(authenticated)/
  - [ ] 修復 discover/page.spec.tsx
  - [ ] 修復 messages/page.spec.tsx
  - [ ] 修復 subscription/page.spec.tsx
  
  // 負責人：Frontend Developer
  // 時間：3 天
  ```

### 成功指標
- ✅ 單元測試覆蓋率 > 75%
- ✅ 整合測試覆蓋率 > 50%
- ✅ 前端測試覆蓋率 > 75%

---

## Phase 3: E2E 完善 (Week 9-12) 🎯

### 目標
建立完整的端對端測試保護

### Week 9-10: 關鍵用戶旅程

#### 旅程 1: 訂閱者註冊與訂閱
- [ ] **完整流程測試**
  ```typescript
  // test/e2e/specs/user-journey/subscriber-flow.spec.ts
  test('Subscriber journey: Register → Browse → Subscribe', async ({ page }) => {
    // 1. 註冊
    // 2. 完成個人資料
    // 3. 瀏覽創作者
    // 4. 選擇訂閱方案
    // 5. 完成支付
    // 6. 訪問訂閱內容
  });
  
  // 負責人：QA Engineer
  // 時間：1 天
  ```

#### 旅程 2: 創作者發布內容
- [ ] **創作者流程測試**
  ```typescript
  // test/e2e/specs/user-journey/creator-flow.spec.ts
  test('Creator journey: Register → Setup → Publish', async ({ page }) => {
    // 1. 註冊為創作者
    // 2. 設定訂閱方案
    // 3. 上傳個人資料
    // 4. 發布第一篇內容
    // 5. 檢查訂閱者列表
  });
  
  // 負責人：QA Engineer
  // 時間：1 天
  ```

#### 旅程 3: 支付與提現
- [ ] **金流完整測試**
  ```typescript
  // test/e2e/specs/critical-paths/payment-flow.spec.ts
  test('Payment flow: Charge → Use → Withdraw', async ({ page }) => {
    // 1. 訂閱者購買訂閱
    // 2. 創作者收到收益
    // 3. 創作者申請提現
    // 4. 驗證交易記錄
  });
  
  // 負責人：QA Engineer
  // 時間：1.5 天
  ```

#### 旅程 4: 配對與訊息
- [ ] **社交功能測試**
  ```typescript
  // test/e2e/specs/user-journey/social-flow.spec.ts
  test('Social flow: Match → Message → Engage', async ({ page }) => {
    // 1. 配對推薦
    // 2. 發送訊息
    // 3. 即時通訊
    // 4. 通知系統
  });
  
  // 負責人：QA Engineer
  // 時間：1.5 天
  ```

#### 旅程 5: 內容審核
- [ ] **管理後台測試**
  ```typescript
  // test/e2e/specs/admin-flows/content-moderation.spec.ts
  test('Admin flow: Review → Moderate → Notify', async ({ page }) => {
    // 1. 登入管理後台
    // 2. 查看待審核內容
    // 3. 審核通過/拒絕
    // 4. 驗證通知發送
  });
  
  // 負責人：QA Engineer
  // 時間：1 天
  ```

### Week 11-12: 跨瀏覽器與裝置測試

#### 瀏覽器兼容性
- [ ] **Chromium 測試** (已有)
- [ ] **Firefox 測試**
  ```bash
  npm run test:e2e -- --project=firefox
  # 負責人：QA Engineer
  # 時間：0.5 天
  ```
- [ ] **WebKit (Safari) 測試**
  ```bash
  npm run test:e2e -- --project=webkit
  # 負責人：QA Engineer
  # 時間：0.5 天
  ```

#### 響應式測試
- [ ] **Desktop 測試** (已有)
- [ ] **Tablet 測試**
  ```typescript
  test('should work on iPad', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    // 測試平板版面
  });
  ```
- [ ] **Mobile 測試**
  ```typescript
  test('should work on iPhone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // 測試手機版面
  });
  ```

### 成功指標
- ✅ 5 條關鍵路徑 E2E 測試
- ✅ 3 種瀏覽器支援
- ✅ 3 種裝置尺寸測試
- ✅ E2E 測試穩定性 > 95%

---

## Phase 4: CI/CD 優化 (Week 13-16) ⚡

### 目標
建立高效的 CI/CD 測試流程

### Week 13: 測試分片與並行化

- [ ] **實施 Jest 分片**
  ```yaml
  # .github/workflows/ci.yml
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  
  steps:
    - run: npm test -- --shard=${{ matrix.shard }}/4
  
  # 負責人：DevOps Engineer
  # 時間：1 天
  ```

- [ ] **Playwright 並行執行**
  ```yaml
  strategy:
    matrix:
      browser: [chromium, firefox, webkit]
  
  # 負責人：DevOps Engineer
  # 時間：0.5 天
  ```

### Week 14: 覆蓋率檢查

- [ ] **整合 Codecov**
  ```yaml
  - name: Upload coverage
    uses: codecov/codecov-action@v3
    with:
      fail_ci_if_error: true
  
  # 負責人：DevOps Engineer
  # 時間：0.5 天
  ```

- [ ] **設置覆蓋率閾值**
  ```yaml
  # codecov.yml
  coverage:
    status:
      project:
        default:
          target: 80%
          threshold: 2%
  
  # 負責人：Tech Lead
  # 時間：0.5 天
  ```

### Week 15: 測試報告系統

- [ ] **設置 HTML 報告**
  ```yaml
  - name: Generate test report
    run: npm run test:report
  
  - name: Upload report
    uses: actions/upload-artifact@v3
    with:
      name: test-report
      path: test/coverage/
  
  # 負責人：DevOps Engineer
  # 時間：1 天
  ```

- [ ] **PR 評論整合**
  ```yaml
  - name: Comment PR
    uses: marocchino/sticky-pull-request-comment@v2
    with:
      message: |
        ## Test Results
        - Unit: ${{ steps.test.outputs.unit-passed }} passed
        - Coverage: ${{ steps.test.outputs.coverage }}%
  
  # 負責人：DevOps Engineer
  # 時間：0.5 天
  ```

### Week 16: 通知與監控

- [ ] **Slack 通知**
  ```yaml
  - name: Notify Slack
    if: failure()
    uses: slackapi/slack-github-action@v1
  
  # 負責人：DevOps Engineer
  # 時間：0.5 天
  ```

- [ ] **測試指標儀表板**
  ```bash
  # 設置 Grafana/Datadog 監控
  # 追蹤測試執行時間、通過率、覆蓋率
  
  # 負責人：DevOps Engineer
  # 時間：1 天
  ```

### 成功指標
- ✅ CI 執行時間 < 15 分鐘
- ✅ 測試覆蓋率自動檢查
- ✅ PR 自動評論
- ✅ 失敗通知 < 5 分鐘

---

## Phase 5: 監控與維護 (Week 17-24) 📊

### 目標
建立長期測試維護機制

### 每週任務

#### 測試債務清理
```bash
# 每週五執行
- [ ] 檢查被跳過的測試 (it.skip)
- [ ] 檢查 TODO 註解
- [ ] 更新過時的測試
- [ ] 重構脆弱的測試

# 負責人：全體開發者 (輪流)
# 時間：2 小時/週
```

#### 測試覆蓋率審查
```bash
# 每兩週一次
- [ ] 審查覆蓋率報告
- [ ] 識別覆蓋缺口
- [ ] 規劃補充測試
- [ ] 更新測試計劃

# 負責人：Tech Lead + QA Engineer
# 時間：1 小時/兩週
```

#### 測試性能優化
```bash
# 每月一次
- [ ] 分析測試執行時間
- [ ] 識別慢測試
- [ ] 優化測試設置
- [ ] 更新 CI 配置

# 負責人：DevOps Engineer
# 時間：4 小時/月
```

### 季度目標

#### Q2 (Apr-Jun 2025)
- ✅ 單元測試覆蓋率 > 80%
- ✅ 整合測試覆蓋率 > 70%
- ✅ E2E 關鍵路徑 100%

#### Q3 (Jul-Sep 2025)
- ✅ 性能測試建立
- ✅ 視覺回歸測試
- ✅ 無障礙測試

#### Q4 (Oct-Dec 2025)
- ✅ 測試覆蓋率 > 85%
- ✅ CI 執行時間 < 10 分鐘
- ✅ 測試穩定性 > 99%

---

## 資源分配

### 人力投入（每週）

| 角色 | Week 1-2 | Week 3-8 | Week 9-12 | Week 13-16 | Week 17+ |
|------|----------|----------|-----------|------------|----------|
| **Tech Lead** | 80% | 20% | 20% | 20% | 10% |
| **QA Engineer** | 100% | 100% | 100% | 80% | 50% |
| **Backend Dev 1** | 40% | 60% | 20% | 10% | 10% |
| **Backend Dev 2** | 40% | 60% | 20% | 10% | 10% |
| **Backend Dev 3** | 40% | 60% | 20% | 10% | 10% |
| **Frontend Dev** | 40% | 80% | 20% | 10% | 10% |
| **DevOps Engineer** | 20% | 20% | 40% | 100% | 30% |

### 預估工時

| Phase | 總工時 | 說明 |
|-------|--------|------|
| Phase 1 | 80h | 2 人 x 2 週 x 20h |
| Phase 2 | 480h | 4 人 x 6 週 x 20h |
| Phase 3 | 320h | 2 人 x 4 週 x 40h |
| Phase 4 | 160h | 2 人 x 4 週 x 20h |
| Phase 5 | 持續 | 維護模式 |
| **Total** | **1040h** | **約 6 人月** |

---

## 進度追蹤

### 每週檢查點

```markdown
## 週報模板

### 本週完成
- [ ] 任務 1
- [ ] 任務 2

### 下週計劃
- [ ] 任務 3
- [ ] 任務 4

### 指標
- 單元測試覆蓋率: XX%
- 整合測試覆蓋率: XX%
- E2E 測試數量: XX

### 風險與阻礙
- 風險 1: 描述 + 緩解措施
- 阻礙 1: 描述 + 解決方案
```

### 月度審查

```markdown
## 月度報告模板

### 本月成就
- 完成的 Phase
- 達成的指標

### 下月目標
- Phase 目標
- 指標目標

### 學習與改進
- 經驗教訓
- 流程改進建議
```

---

## 成功標準

### 必須達成（Must Have）
- ✅ 所有單元測試可執行
- ✅ 關鍵路徑 E2E 測試 100%
- ✅ CI 執行時間 < 20 分鐘
- ✅ 測試覆蓋率 > 75%

### 應該達成（Should Have）
- ✅ 單元測試覆蓋率 > 80%
- ✅ 整合測試覆蓋率 > 70%
- ✅ CI 執行時間 < 15 分鐘
- ✅ 測試穩定性 > 98%

### 期望達成（Nice to Have）
- ✅ 測試覆蓋率 > 85%
- ✅ CI 執行時間 < 10 分鐘
- ✅ 測試穩定性 > 99%
- ✅ 完整的測試文化建立

---

**批准者**: Tech Lead  
**開始日期**: 2025-02-17  
**預計完成**: 2025-08-17  
**狀態**: ✅ 已批准，等待執行

**下次審查**: 2025-03-17 (每月審查)
