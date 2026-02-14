# 🚀 P1 API 快速參考指南

## 📦 導入方式

```typescript
import { ApiClient, SubscriptionsApi, PaymentsApi } from '@suggar-daddy/api-client';
import type { 
  CreateTierDto, 
  UpdateTierDto, 
  DmPurchase,
  TransactionStatus 
} from '@suggar-daddy/api-client';
```

---

## 🎯 Subscription APIs

### 建立訂閱方案
```typescript
const tier = await client.subscriptions.createSubscriptionTier({
  name: 'VIP會員',
  description: '專屬內容與福利',
  price: 999,              // 以分為單位 ($9.99)
  currency: 'USD',
  billingPeriod: 'MONTHLY',
  benefits: ['專屬貼文', '優先回覆'],
  isActive: true
});

// 回傳: SubscriptionTierDetail
console.log(tier.tierId);
console.log(tier.subscribersCount);
```

### 更新訂閱方案
```typescript
await client.subscriptions.updateSubscriptionTier('tier-123', {
  price: 1299,  // 更新價格為 $12.99
  benefits: ['專屬貼文', '優先回覆', '獨家周邊']
});
```

### 刪除訂閱方案
```typescript
const result = await client.subscriptions.deleteSubscriptionTier('tier-123');
console.log(result.success); // true
```

---

## 💰 Payment APIs

### 購買 DM 訪問權限
```typescript
const purchase = await client.payments.purchaseDmAccess('creator-user-id');

if (purchase.status === 'COMPLETED') {
  console.log('✅ DM 權限已開通');
  console.log('購買金額:', purchase.amount);
}
```

### 更新交易狀態（管理員）
```typescript
await client.payments.updateTransaction(
  'txn-abc123',
  'REFUNDED',
  '使用者申請退款，已審核通過'
);
```

---

## 🔐 權限要求

| API | 權限要求 |
|-----|---------|
| createSubscriptionTier | Creator |
| updateSubscriptionTier | Creator (必須是方案擁有者) |
| deleteSubscriptionTier | Creator (必須是方案擁有者) |
| purchaseDmAccess | User (已登入) |
| updateTransaction | Admin |

---

## 📋 完整範例：創作者工作流程

```typescript
import { ApiClient } from '@suggar-daddy/api-client';

// 1. 初始化客戶端
const client = new ApiClient({ 
  baseURL: 'https://api.example.com' 
});

// 2. 設定 Token
client.setToken(creatorToken);

// 3. 建立訂閱方案
const tier = await client.subscriptions.createSubscriptionTier({
  name: '月度 VIP',
  description: '每月專屬福利',
  price: 1999,
  currency: 'TWD',
  billingPeriod: 'MONTHLY',
  benefits: [
    '每月 10 篇專屬貼文',
    'DM 優先回覆',
    '專屬直播',
    '限量周邊商品'
  ],
  isActive: true
});

console.log('✅ 訂閱方案已建立');
console.log('方案 ID:', tier.tierId);
console.log('當前訂閱人數:', tier.subscribersCount);

// 4. 監控訂閱數量，適時調整價格
if (tier.subscribersCount > 100) {
  await client.subscriptions.updateSubscriptionTier(tier.tierId, {
    price: 2499,
    description: '每月專屬福利（熱門方案）'
  });
  console.log('✅ 價格已更新');
}

// 5. 如需停止方案
await client.subscriptions.updateSubscriptionTier(tier.tierId, {
  isActive: false
});
console.log('✅ 方案已停用');
```

---

## 💡 最佳實踐

### 錯誤處理
```typescript
try {
  const tier = await client.subscriptions.createSubscriptionTier(dto);
} catch (error) {
  if (error.response?.status === 403) {
    console.error('權限不足：需要 Creator 權限');
  } else if (error.response?.status === 400) {
    console.error('參數錯誤:', error.response.data);
  } else {
    console.error('伺服器錯誤:', error.message);
  }
}
```

### 價格處理
```typescript
// ❌ 錯誤：直接使用美金金額
price: 9.99  

// ✅ 正確：轉換為分
price: 999  // $9.99

// 輔助函數
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

price: dollarsToCents(9.99)  // 999
```

### 批次操作
```typescript
// 建立多個訂閱方案
const tiers = await Promise.all([
  client.subscriptions.createSubscriptionTier({
    name: '基礎會員',
    price: 499,
    billingPeriod: 'MONTHLY'
  }),
  client.subscriptions.createSubscriptionTier({
    name: 'VIP 會員',
    price: 999,
    billingPeriod: 'MONTHLY'
  }),
  client.subscriptions.createSubscriptionTier({
    name: '白金會員',
    price: 1999,
    billingPeriod: 'MONTHLY'
  })
]);

console.log(`✅ 建立了 ${tiers.length} 個訂閱方案`);
```

---

## 🧪 測試範例

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Subscription API', () => {
  it('應該成功建立訂閱方案', async () => {
    const dto = {
      name: 'Test Tier',
      price: 999,
      currency: 'USD',
      billingPeriod: 'MONTHLY' as const
    };
    
    const result = await api.createSubscriptionTier(dto);
    
    expect(result.tierId).toBeDefined();
    expect(result.name).toBe('Test Tier');
    expect(result.price).toBe(999);
    expect(result.subscribersCount).toBe(0);
  });
  
  it('應該成功更新訂閱方案', async () => {
    const result = await api.updateSubscriptionTier('tier-123', {
      price: 1299
    });
    
    expect(result.price).toBe(1299);
  });
});
```

---

## 📞 支援

- **文件**: `P1_API_IMPLEMENTATION_SUMMARY.md`
- **驗證報告**: `P1_API_VERIFICATION_COMPLETE.md`
- **原始碼**: `libs/api-client/src/{subscriptions,payments}.ts`

---

**最後更新**: 2025-01-XX  
**版本**: 1.0.0
