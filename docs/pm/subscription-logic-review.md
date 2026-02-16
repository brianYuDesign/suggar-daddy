# 訂閱與權限邏輯審查報告

**審查日期**: 2024-01-XX  
**審查者**: Tech Lead  
**服務**: subscription-service  
**審查範圍**: 訂閱層級、升降級、過期處理、權限控制、試用期、自動續訂

---

## 📊 執行摘要

### 總體評分：⚠️ 需要重大改進（6/10）

**優勢**：
- ✅ Redis 數據結構設計高效（O(1) 查詢）
- ✅ Stripe 基礎集成完整
- ✅ Kafka 事件驅動架構清晰
- ✅ 支付續訂自動化機制

**嚴重缺陷**：
- 🔴 **無訂閱升級/降級功能**（核心業務缺失）
- 🔴 **無試用期管理**（影響獲客）
- 🔴 **缺乏自動過期處理**（收入準確性問題）
- 🔴 **僅 Redis 存儲，無數據持久化**（生產風險）

---

## 🏗️ 1. 訂閱層級定義

### 1.1 當前實現

**關鍵文件**：
- `apps/subscription-service/src/app/entities/subscription-tier.entity.ts`
- `apps/subscription-service/src/app/subscription-tier.service.ts`

**數據模型**：
```typescript
interface SubscriptionTier {
  id: string;
  creatorId: string;
  name: string;              // 自定義層級名稱
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  benefits: string[];        // 權益列表（文字描述）
  stripePriceId: string;     // Stripe Price ID
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 1.2 架構評估

**🟡 現狀分析**：
```
✓ 優點：
  - 創作者可自定義無限個訂閱層級
  - 支持月付和年付兩種計費模式
  - 權益列表靈活配置

❌ 缺陷：
  - 缺乏預定義的標準層級（Basic/Premium/VIP）
  - 無層級優先級或排序機制
  - benefits 僅為文字描述，無法用於程式化權限控制
  - 無層級之間的繼承關係（高級層級應包含低級層級權限）
```

### 1.3 權限控制缺陷

**🔴 嚴重問題**：

| 問題 | 影響 | 優先級 |
|------|------|--------|
| 權益僅為文字，無法程式化檢查 | 無法根據層級自動開放功能 | 🔴 高 |
| 無權限模型（RBAC/ABAC） | 所有訂閱者權限相同 | 🔴 高 |
| 無層級繼承機制 | VIP 無法自動獲得 Premium 權限 | 🟡 中 |

**建議改進**：
```typescript
interface SubscriptionTier {
  // ... 現有字段
  permissions: {
    maxPostsPerMonth?: number;      // 發文限制
    maxUploadSizeGB?: number;        // 上傳大小
    canAccessExclusiveContent: boolean;
    canAccessLiveStream: boolean;
    canSendDirectMessages: boolean;
    prioritySupport: boolean;
    customBadge?: string;
  };
  inheritsFrom?: string;  // 繼承其他層級的權限
  priority: number;        // 層級優先級（用於排序）
}
```

---

## ⬆️⬇️ 2. 訂閱升級/降級邏輯

### 2.1 當前實現

**代碼位置**：`stripe-subscription.service.ts` L34-42

```typescript
const existingSubscription = existingSubscriptions.find(
  (s) => s.creatorId === tier.creatorId && s.status === 'active'
);

if (existingSubscription) {
  throw new BadRequestException(
    'User already has an active subscription to this creator'
  );
}
```

### 2.2 問題分析

**🔴 完全缺失核心功能**

| 功能 | 狀態 | 業務影響 |
|------|------|----------|
| 升級到更高層級 | ❌ 不存在 | 用戶無法升級，損失增值收入 |
| 降級到較低層級 | ❌ 不存在 | 用戶流失（無法降級只能取消） |
| 按比例退款（Proration） | ❌ 不存在 | 合規風險 |
| 升級時差價補繳 | ❌ 不存在 | 收入損失 |
| 降級時立即生效 vs 週期末生效 | ❌ 不存在 | 用戶體驗差 |

### 2.3 用戶流程缺陷

**現有流程**：
```
用戶想升級 → 系統拒絕（已有訂閱） → 用戶必須取消 → 等待過期 → 重新訂閱
                                     ↓
                              內容訪問中斷
                              創作者收入中斷
                              用戶體驗極差
```

**應有流程**：
```
用戶升級請求 → 計算差價 → 補繳差價 → 立即生效 → 權限升級
                                              ↓
                                         Kafka事件: SUBSCRIPTION_UPGRADED

用戶降級請求 → 設置pending_downgrade → 當前週期結束 → 自動降級
                                                      ↓
                                                 Kafka事件: SUBSCRIPTION_DOWNGRADED
```

### 2.4 Stripe 集成缺失

**🔴 Stripe API 未使用**：

```typescript
// 缺失的 Stripe API 調用
await stripe.subscriptions.update(subscriptionId, {
  items: [
    {
      id: subscriptionItemId,
      price: newPriceId,  // 新層級的 Price ID
    },
  ],
  proration_behavior: 'create_prorations',  // 按比例計費
  billing_cycle_anchor: 'unchanged',         // 保持計費週期
});
```

**影響**：
- ❌ 無法變更 Stripe subscription item
- ❌ 無法利用 Stripe 內建的按比例計費
- ❌ 升降級需要手動計算金額（容易出錯）

---

## ⏰ 3. 訂閱過期處理

### 3.1 當前實現

**代碼位置**：`subscription.service.ts` L129-131

```typescript
const now = Date.now();
const notExpired = !s.currentPeriodEnd || s.currentPeriodEnd >= now;
if (!notExpired) continue;
```

### 3.2 過期檢查機制

**🟡 被動檢查模式**

| 檢查方式 | 實現 | 問題 |
|---------|------|------|
| 主動掃描 | ❌ 無 | 過期訂閱不會被自動標記 |
| 被動檢查 | ✅ 有 | 僅在查詢時檢查，可能延遲 |
| 狀態更新 | ❌ 無 | `status` 不會自動變為 `expired` |

**風險**：
```
情境：訂閱於 2024-01-01 00:00 過期
問題：
  1. Redis 中 status 仍為 'active'
  2. 若用戶在 00:00-00:05 訪問內容，可能仍然通過檢查（緩存問題）
  3. hasActiveSubscription() 可能返回舊數據
  4. 無過期事件通知其他服務
```

### 3.3 自動過期處理缺失

**❌ 缺少定時任務**：

```typescript
// 建議實現（Cron Job）
@Cron('0 */5 * * * *')  // 每5分鐘執行
async processExpiredSubscriptions() {
  const now = Date.now();
  const allIds = await this.redis.smembers('subscriptions:all');
  
  for (const id of allIds) {
    const sub = await this.findOne(id);
    if (sub.status === 'active' && sub.currentPeriodEnd < now) {
      await this.updateStatus(id, 'expired');
      await this.kafkaProducer.send({
        topic: 'subscription-events',
        messages: [{
          key: sub.id,
          value: JSON.stringify({
            type: 'SUBSCRIPTION_EXPIRED',
            subscriptionId: sub.id,
            subscriberId: sub.subscriberId,
            creatorId: sub.creatorId,
          }),
        }],
      });
    }
  }
}
```

### 3.4 寬限期邏輯

**❌ 完全缺失**

```
建議功能：
  - gracePeriodDays: 3  // 3天寬限期
  - 過期後3天內仍可訪問內容
  - 顯示"即將過期"提醒
  - 寬限期結束後才真正鎖定內容
```

---

## 🔐 4. 權限控制矩陣

### 4.1 權限檢查端點

**代碼位置**：`subscription.controller.ts`

```typescript
@Get('check')
@Public()
async checkAccess(
  @Query('subscriberId') subscriberId: string,
  @Query('creatorId') creatorId: string,
  @Query('tierId') tierId?: string,
): Promise<{ hasAccess: boolean }> {
  const hasAccess = await this.subscriptionService.hasActiveSubscription(
    subscriberId,
    creatorId,
    tierId,
  );
  return { hasAccess };
}
```

### 4.2 權限檢查實現

**Redis Set 檢查**：O(1) 時間複雜度

```typescript
async hasActiveSubscription(
  subscriberId: string,
  creatorId: string,
  tierId?: string,
): Promise<boolean> {
  const key = tierId
    ? `sub:active:${subscriberId}:${creatorId}:${tierId}`
    : `sub:active:${subscriberId}:${creatorId}`;
  
  return this.redis.sismember('subscriptions:active', key) === 1;
}
```

### 4.3 權限矩陣缺陷

**🔴 單一維度權限**

| 功能 | 當前實現 | 缺失 |
|------|---------|------|
| 基礎訂閱檢查 | ✅ | - |
| 層級權限檢查 | ✅ | - |
| **功能級權限** | ❌ | 無法區分"能看"和"能評論" |
| **內容級權限** | ❌ | 無法限制特定內容類型 |
| **時間級權限** | ❌ | 無法設置時段限制 |
| **數量級權限** | ❌ | 無法限制每日觀看次數 |

**建議權限矩陣**：

```typescript
interface PermissionMatrix {
  content: {
    canViewPosts: boolean;
    canViewVideos: boolean;
    canViewLiveStreams: boolean;
    canDownload: boolean;
  };
  interaction: {
    canComment: boolean;
    canLike: boolean;
    canShare: boolean;
    canSendDM: boolean;
  };
  limits: {
    maxDailyViews?: number;
    maxDownloadsPerMonth?: number;
    videoQualityMax?: '720p' | '1080p' | '4K';
  };
}
```

### 4.4 與其他服務集成

**集成點**：
```
content-service → subscription-service.check (REST)
  ↓
  每次訪問內容都需要調用
  ↓
  無緩存 → 高延遲
```

**🟡 性能問題**：
- 每次內容訪問都需要 HTTP 調用（~50-200ms）
- 無緩存層（雖然定義了 `SUBSCRIPTION_CHECK_CACHE_TTL`）
- 批量檢查時串聯調用（應使用批量API）

---

## 🎁  5. 免費試用邏輯

### 5.1 當前實現

**❌ 完全不存在**

**搜索結果**：
```bash
grep -r "trial" apps/subscription-service/
# 無結果
```

### 5.2 試用期功能缺失

| 功能 | 狀態 | 業務影響 |
|------|------|----------|
| 試用期定義 | ❌ | 無法吸引新用戶 |
| 試用免費天數 | ❌ | 無差異化獲客手段 |
| 試用→付費轉換 | ❌ | 無自動轉換機制 |
| 試用期檢查 | ❌ | - |
| 一次性試用限制 | ❌ | 用戶可能重複試用 |

### 5.3 建議實現

**數據模型擴展**：
```typescript
interface Subscription {
  // ... 現有字段
  trialEndsAt?: string;      // 試用結束時間
  isTrialUsed: boolean;      // 是否已使用過試用
  trialDays?: number;        // 試用天數（快照）
}

interface SubscriptionTier {
  // ... 現有字段
  trialDays: number;         // 該層級的試用天數
}
```

**試用期檢查邏輯**：
```typescript
async hasActiveAccess(subscriberId: string, creatorId: string): Promise<boolean> {
  const sub = await this.findActiveSubscription(subscriberId, creatorId);
  if (!sub) return false;
  
  const now = Date.now();
  
  // 試用期內
  if (sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() > now) {
    return true;
  }
  
  // 正常訂閱期內
  if (sub.currentPeriodEnd >= now) {
    return true;
  }
  
  return false;
}
```

**試用轉換流程**：
```typescript
@Cron('0 0 * * *')  // 每日執行
async processTrialConversions() {
  const expiredTrials = await this.findExpiredTrials();
  
  for (const sub of expiredTrials) {
    try {
      // 嘗試首次扣款
      await this.stripeService.chargeSubscription(sub.stripeSubscriptionId);
      await this.updateTrialStatus(sub.id, { isTrialUsed: true });
      // 發送"歡迎成為正式訂閱者"郵件
    } catch (e) {
      // 扣款失敗 → 取消訂閱
      await this.cancelSubscription(sub.id, 'trial_payment_failed');
      // 發送"試用期結束"郵件
    }
  }
}
```

---

## 🔄 6. 自動續訂邏輯

### 6.1 當前實現

**代碼位置**：`payment-event.consumer.ts` L30-46

```typescript
@EventPattern(PAYMENT_EVENTS.PAYMENT_COMPLETED)
async handlePaymentCompleted(@Payload() message: KafkaMessage) {
  const event = JSON.parse(message.value.toString());
  
  if (event.type !== 'subscription_renewal') {
    return;  // 僅處理續訂支付
  }
  
  const subscriptionId = event.subscriptionId;
  
  // 重試邏輯（最多3次）
  for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
    try {
      const nextEnd = new Date();
      nextEnd.setMonth(nextEnd.getMonth() + 1);  // 延長1個月
      
      await this.subscriptionService.extendPeriod(
        subscriptionId,
        nextEnd.toISOString()
      );
      
      this.logger.log(`Extended subscription ${subscriptionId}`);
      return;
    } catch (e) {
      if (attempt < this.maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
      } else {
        this.logger.error('Failed to extend subscription', e);
      }
    }
  }
}
```

### 6.2 續訂機制評估

**✅ 優點**：
```
✓ 基於 Kafka 事件驅動
✓ 有失敗重試邏輯（3次，指數退避）
✓ 自動延長訂閱期限
```

**❌ 缺陷**：

| 問題 | 影響 | 優先級 |
|------|------|--------|
| 完全依賴 Stripe webhook | 若 webhook 失敗則不續訂 | 🔴 高 |
| 無備份續訂機制 | 無 Plan B | 🔴 高 |
| 重試次數固定（3次） | 無配置化 | 🟡 中 |
| 失敗後無通知 | 用戶不知道續訂失敗 | 🔴 高 |
| 無續訂前提醒 | 用戶未被告知即將扣款 | 🟡 中 |
| 無主動續訂任務 | 不會主動檢查即將到期的訂閱 | 🔴 高 |

### 6.3 Stripe Webhook 依賴風險

**風險情境**：
```
1. Stripe webhook 發送失敗（網路問題）
   → payment-service 收不到事件
   → subscription-service 不延期
   → 用戶訂閱過期（但 Stripe 已扣款）
   
2. Kafka 消息丟失
   → payment-service 已收到 webhook
   → 但 Kafka 發送失敗
   → subscription-service 不延期
   
3. subscription-service 處理失敗
   → extendPeriod() 重試3次後失敗
   → 用戶已付款但訂閱未延期
```

### 6.4 建議改進

**A. 備份續訂機制（Cron Job）**

```typescript
@Cron('0 */6 * * *')  // 每6小時執行
async syncWithStripe() {
  // 找出即將在24小時內到期的訂閱
  const expiringSoon = await this.findExpiringSoon(24);
  
  for (const sub of expiringSoon) {
    try {
      // 從 Stripe 同步最新狀態
      const stripeSub = await this.stripe.subscriptions.retrieve(
        sub.stripeSubscriptionId
      );
      
      // 檢查 Stripe 是否已續訂但本地未更新
      if (stripeSub.current_period_end > sub.currentPeriodEnd) {
        await this.extendPeriod(sub.id, stripeSub.current_period_end);
        this.logger.warn(`Synced missed renewal for ${sub.id}`);
      }
    } catch (e) {
      this.logger.error(`Failed to sync ${sub.id}`, e);
    }
  }
}
```

**B. 續訂前通知**

```typescript
@Cron('0 8 * * *')  // 每天早上8點
async sendRenewalReminders() {
  const expiringIn3Days = await this.findExpiringSoon(72);
  
  for (const sub of expiringIn3Days) {
    await this.notificationService.send({
      userId: sub.subscriberId,
      type: 'SUBSCRIPTION_RENEWAL_REMINDER',
      data: {
        creatorName: await this.getCreatorName(sub.creatorId),
        renewalDate: sub.currentPeriodEnd,
        amount: sub.price,
      },
    });
  }
}
```

**C. 失敗通知與人工介入**

```typescript
// 在重試失敗後
if (attempt >= this.maxRetries) {
  // 通知用戶
  await this.notificationService.send({
    userId: sub.subscriberId,
    type: 'SUBSCRIPTION_RENEWAL_FAILED',
    urgent: true,
  });
  
  // 通知管理員
  await this.alerting.send({
    level: 'ERROR',
    message: `Subscription renewal failed after ${this.maxRetries} attempts`,
    subscriptionId: sub.id,
  });
  
  // 標記需要人工處理
  await this.flagForManualReview(sub.id);
}
```

---

## 📊 7. 數據持久化風險

### 7.1 當前存儲架構

**純 Redis 存儲**：

```
優點：
  ✓ 高性能（O(1) 查詢）
  ✓ 支持複雜數據結構
  ✓ 原子操作

致命缺陷：
  ✗ 無持久化保證（Redis AOF/RDB 可能丟失數據）
  ✗ Redis 重啟數據丟失
  ✗ 無歷史記錄審計
  ✗ 無法進行複雜查詢（如收入報表）
```

### 7.2 生產環境風險

**風險等級**：🔴 **嚴重**

| 風險場景 | 機率 | 影響 |
|---------|------|------|
| Redis 實例故障 | 中 | 所有訂閱數據丟失 |
| Docker容器重啟 | 高 | 數據重置 |
| 手動誤操作（FLUSHDB） | 低 | 災難性數據丟失 |
| 內存溢出（OOM） | 中 | Redis崩潰+數據丟失 |

### 7.3 建議改進

**雙寫架構**：

```typescript
async create(dto: CreateSubscriptionDto): Promise<Subscription> {
  const subscription = { ... };
  
  // 1. 寫入 PostgreSQL（主存儲）
  await this.db.subscriptions.create(subscription);
  
  // 2. 寫入 Redis（緩存層）
  await this.redis.hset(
    `subscription:${subscription.id}`,
    subscription
  );
  
  // 3. 更新索引
  await this.updateIndexes(subscription);
  
  return subscription;
}
```

**數據恢復機制**：
```typescript
@Cron('0 2 * * *')  // 每日凌晨2點
async rebuildRedisCache() {
  this.logger.log('Starting Redis cache rebuild...');
  
  // 從 PostgreSQL 重建 Redis 緩存
  const allSubscriptions = await this.db.subscriptions.findAll();
  
  for (const sub of allSubscriptions) {
    await this.redis.hset(`subscription:${sub.id}`, sub);
    await this.updateIndexes(sub);
  }
  
  this.logger.log(`Rebuilt ${allSubscriptions.length} subscriptions`);
}
```

---

## 🚨 8. 關鍵風險總結

### 8.1 阻塞性問題（必須修復）

| # | 問題 | 影響 | 預計修復時間 |
|---|------|------|------------|
| 1 | 無升降級功能 | 用戶流失，收入損失 | 5天 |
| 2 | 無數據持久化 | 生產環境數據丟失風險 | 3天 |
| 3 | 無自動過期處理 | 收入統計不準確 | 2天 |
| 4 | 續訂完全依賴webhook | 續訂失敗風險高 | 2天 |

### 8.2 重要改進（應儘快修復）

| # | 問題 | 影響 | 預計修復時間 |
|---|------|------|------------|
| 5 | 無試用期管理 | 獲客困難 | 3天 |
| 6 | 無權限矩陣 | 功能限制不足 | 4天 |
| 7 | 無續訂提醒 | 用戶體驗差 | 1天 |
| 8 | 無寬限期 | 用戶體驗差 | 1天 |

### 8.3 優化建議（可延後）

- 優惠券系統
- 訂閱包（多層級組合）
- 家庭帳戶共享
- 積分支付系統

---

## 📝 9. 代碼缺陷清單

### 9.1 Stripe 價格字段錯誤

**位置**：`stripe-subscription.service.ts:56`

```typescript
// ❌ 錯誤：tier.price 不存在
const price = tier.priceMonthly ?? tier.price ?? 0;

// ✅ 應改為
const price = tier.priceMonthly ?? tier.priceYearly ?? 0;
```

### 9.2 安全漏洞

**位置**：`subscription.controller.ts`

```typescript
// ❌ 無速率限制
@Get('check')
@Public()  // 公開端點
async checkAccess(...) { ... }
```

**風險**：可被濫用掃描所有用戶的訂閱狀態

**建議修復**：
```typescript
@Get('check')
@Public()
@Throttle(100, 60)  // 每分鐘100次
async checkAccess(...) { ... }
```

### 9.3 性能問題

**位置**：`subscription.service.ts:78-102`

```typescript
async findAll(): Promise<Subscription[]> {
  // ⚠️ 註釋中警告：避免在生產環境使用
  const ids = await this.redis.smembers('subscriptions:all');
  // 需要掃描所有訂閱
}
```

---

## ✅ 10. 修復優先級建議

### Phase 1（立即修復 - 1週內）
```
1. 修復 Stripe 價格字段錯誤 (30分鐘)
2. 添加數據庫持久化 (3天)
3. 實現自動過期檢查 Cron Job (1天)
4. 添加 Stripe 同步備份機制 (1天)
```

### Phase 2（重要功能 - 2週內）
```
5. 實現訂閱升降級功能 (5天)
6. 添加試用期管理 (3天)
7. 實現續訂前提醒 (1天)
8. 添加速率限制 (1天)
```

### Phase 3（功能完善 - 1月內）
```
9. 構建權限矩陣系統 (4天)
10. 添加寬限期邏輯 (1天)
11. 實現訂閱包功能 (5天)
12. 優化查詢性能（緩存層） (2天)
```

---

## 📚 11. 參考資料

### 關鍵代碼文件
```
apps/subscription-service/src/app/
├── subscription.service.ts              (核心業務邏輯)
├── stripe-subscription.service.ts       (Stripe集成)
├── payment-event.consumer.ts            (自動續訂)
├── subscription-tier.service.ts         (層級管理)
└── entities/
    ├── subscription.entity.ts           (數據模型)
    └── subscription-tier.entity.ts      (層級模型)
```

### Stripe API 文檔
- [Subscription Updates](https://stripe.com/docs/billing/subscriptions/update)
- [Proration](https://stripe.com/docs/billing/subscriptions/prorations)
- [Trial Periods](https://stripe.com/docs/billing/subscriptions/trials)

---

**報告完成日期**: 2024-01-XX  
**下一次審查**: Phase 1 修復完成後
