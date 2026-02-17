# Circuit Breaker 實施文檔

## 概述

Circuit Breaker（熔斷器）是一種防止雪崩效應的設計模式。當服務調用失敗率超過閾值時，自動「熔斷」請求，避免持續調用故障服務導致系統崩潰。

## 架構

### 核心組件

```
libs/common/src/circuit-breaker/
├── circuit-breaker.config.ts      # 配置定義
├── circuit-breaker.service.ts     # 核心服務
├── circuit-breaker.module.ts      # NestJS 模組
├── circuit-breaker.service.spec.ts # 單元測試
└── index.ts                        # 匯出
```

### 依賴

- **opossum**: 底層 Circuit Breaker 實作庫
- **@nestjs/common**: NestJS 框架整合

## 配置

### 預設配置

```typescript
{
  timeout: 3000,                     // 3 秒超時
  errorThresholdPercentage: 50,     // 50% 錯誤率觸發熔斷
  resetTimeout: 30000,               // 30 秒後嘗試恢復
  rollingCountTimeout: 10000,        // 10 秒滾動窗口
  rollingCountBuckets: 10,           // 10 個桶
  volumeThreshold: 10,               // 至少 10 個請求後才計算錯誤率
  enabled: true,
}
```

### 服務專用配置

#### API Gateway 配置
```typescript
API_GATEWAY_CONFIG = {
  timeout: 5000,                     // 微服務可能稍慢
  errorThresholdPercentage: 60,     // 容忍度較高
  resetTimeout: 20000,               // 較快恢復
  name: 'api-gateway',
}
```

#### Payment Service 配置
```typescript
PAYMENT_SERVICE_CONFIG = {
  timeout: 10000,                    // 外部 API 較慢
  errorThresholdPercentage: 40,     // 支付較敏感
  resetTimeout: 60000,               // 較慢恢復
  volumeThreshold: 5,                // 更快觸發熔斷
  name: 'payment-service',
}
```

#### Notification Service 配置
```typescript
NOTIFICATION_SERVICE_CONFIG = {
  timeout: 8000,
  errorThresholdPercentage: 70,     // 通知失敗影響較小
  resetTimeout: 30000,
  volumeThreshold: 20,
  name: 'notification-service',
}
```

## 使用方式

### 1. 在模組中導入

```typescript
import { CircuitBreakerModule } from '@suggar-daddy/common';

@Module({
  imports: [CircuitBreakerModule],
})
export class AppModule {}
```

### 2. 注入服務

```typescript
import { CircuitBreakerService } from '@suggar-daddy/common';

@Injectable()
export class MyService {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}
}
```

### 3. 包裝函數

```typescript
// 方式 1: 使用 wrap 方法
async callExternalService(data: any) {
  const wrapped = this.circuitBreaker.wrap(
    'external-api',
    async () => {
      return await axios.get('https://api.example.com/data');
    },
    PAYMENT_SERVICE_CONFIG,
    async () => {
      // Fallback: 返回快取或預設值
      return getCachedData();
    }
  );
  
  return wrapped();
}

// 方式 2: 先創建，後使用
constructor(private readonly circuitBreaker: CircuitBreakerService) {
  this.externalApiCall = this.circuitBreaker.wrap(
    'external-api',
    this.callApi.bind(this),
    PAYMENT_SERVICE_CONFIG,
    this.fallback.bind(this)
  );
}

async callData() {
  return this.externalApiCall(someData);
}
```

## 已實施服務

### 1. API Gateway → Backend Services

**位置**: `apps/api-gateway/src/app/proxy.service.ts`

**實施細節**:
- 包裝所有微服務調用
- 每個微服務獨立的熔斷器（如 `api-gateway-auth`, `api-gateway-users`）
- Fallback: 返回 503 Service Unavailable

**監控端點**:
- `GET /circuit-breakers` - 查看所有熔斷器狀態
- `GET /circuit-breakers/:name` - 查看特定熔斷器狀態

```bash
# 查看所有熔斷器
curl http://localhost:3000/circuit-breakers

# 查看特定服務
curl http://localhost:3000/circuit-breakers/api-gateway-auth
```

### 2. Payment Service → Stripe API

**位置**: `libs/common/src/stripe/stripe.service.ts`

**實施細節**:
- 包裝所有 Stripe API 調用
- 使用 `PAYMENT_SERVICE_CONFIG`
- 包含操作：
  - `stripe-create-customer`
  - `stripe-create-payment-intent`
  - `stripe-create-subscription`
  - `stripe-cancel-subscription`
  - `stripe-create-refund`

**特點**:
- 支付操作較敏感，錯誤容忍度低（40%）
- 超時較長（10 秒）適應外部 API
- 失敗後 60 秒才嘗試恢復

### 3. Notification Service → Firebase FCM

**位置**: `apps/notification-service/src/app/fcm.service.ts`

**實施細節**:
- 包裝 Firebase FCM 推播調用
- 使用 `NOTIFICATION_SERVICE_CONFIG`
- Fallback: 記錄錯誤但不中斷（通知非關鍵功能）

**特點**:
- 錯誤容忍度高（70%）
- 失敗影響較小
- Fallback 返回假成功，避免中斷主流程

## 熔斷器狀態

### 三種狀態

1. **Closed（關閉/正常）**
   - 請求正常通過
   - 統計成功/失敗次數

2. **Open（開啟/熔斷）**
   - 所有請求被拒絕
   - 直接返回 fallback
   - 等待 resetTimeout 後進入 Half-Open

3. **Half-Open（半開/測試）**
   - 允許少量請求通過測試服務是否恢復
   - 成功 → Closed（恢復）
   - 失敗 → Open（繼續熔斷）

### 狀態轉換

```
Closed (正常)
  ↓ 錯誤率 > 閾值
Open (熔斷)
  ↓ resetTimeout 後
Half-Open (測試)
  ↓ 成功 / 失敗
Closed / Open
```

## 監控

### 狀態查詢

```typescript
// 取得所有熔斷器狀態
const statuses = circuitBreakerService.getAllStatus();

// 取得特定熔斷器狀態
const status = circuitBreakerService.getStatus('api-gateway-auth');

// 狀態結構
{
  name: 'api-gateway-auth',
  state: 'closed',  // 'open' | 'closed' | 'halfOpen'
  stats: {
    failures: 2,
    successes: 98,
    rejects: 0,
    timeouts: 1,
    total: 100,
    errorRate: 3.0  // 百分比
  },
  config: { ... }
}
```

### 手動控制

```typescript
// 手動開啟熔斷器（強制熔斷）
circuitBreakerService.open('api-gateway-auth');

// 手動關閉熔斷器（強制恢復）
circuitBreakerService.close('api-gateway-auth');

// 清除統計資料
circuitBreakerService.clearStats('api-gateway-auth');
```

## 事件日誌

Circuit Breaker 會自動記錄以下事件：

- 🔴 **OPEN**: 熔斷器開啟（Too many failures）
- 🟢 **CLOSED**: 熔斷器關閉（Service recovered）
- 🟡 **HALF-OPEN**: 熔斷器半開（Testing recovery）
- ❌ **FAILURE**: 請求失敗
- ✅ **SUCCESS**: 請求成功
- ⏱️ **TIMEOUT**: 請求超時
- 🚫 **REJECT**: 請求被拒絕（熔斷中）
- 🔄 **FALLBACK**: Fallback 被執行

### 範例日誌

```
[CircuitBreakerService] Circuit Breaker created: api-gateway-auth
[ProxyService] [PROXY] GET /api/auth/verify -> http://localhost:3002/api/auth/verify
[CircuitBreakerService] ✅ Circuit Breaker SUCCESS: api-gateway-auth
[CircuitBreakerService] ❌ Circuit Breaker FAILURE: api-gateway-auth - Service error: 500
[CircuitBreakerService] 🔴 Circuit Breaker OPEN: api-gateway-auth - Too many failures, blocking requests
[CircuitBreakerService] 🚫 Circuit Breaker REJECT: api-gateway-auth - Request blocked by open circuit
[ProxyService] [CIRCUIT BREAKER] Fallback triggered for auth
[CircuitBreakerService] 🟡 Circuit Breaker HALF-OPEN: api-gateway-auth - Testing service recovery
[CircuitBreakerService] 💚 Circuit Breaker HEALTH CHECK SUCCESS: api-gateway-auth
[CircuitBreakerService] 🟢 Circuit Breaker CLOSED: api-gateway-auth - Service recovered
```

## 測試

### 單元測試

```bash
# 執行測試
npm test -- circuit-breaker.service.spec.ts

# 涵蓋範圍
- 熔斷器創建和重用
- 函數包裝
- Fallback 機制
- 狀態查詢
- 手動控制
- 錯誤閾值觸發
- 超時處理
- 清理和關閉
```

### 整合測試

模擬故障場景：

```typescript
// 1. 模擬服務故障
const failingService = jest.fn().mockRejectedValue(new Error('Service down'));
const wrapped = circuitBreaker.wrap('test', failingService);

// 2. 觸發多次失敗
for (let i = 0; i < 10; i++) {
  try { await wrapped(); } catch {}
}

// 3. 驗證熔斷器開啟
const status = circuitBreaker.getStatus('test');
expect(status.state).toBe('open');

// 4. 驗證 fallback 執行
const result = await wrapped();
expect(result).toBe('fallback-value');
```

## 性能影響

### Overhead

- 正常情況: < 1ms 額外延遲
- 熔斷狀態: 幾乎無延遲（直接返回 fallback）
- 記憶體: 每個熔斷器約 1-2 KB

### 建議

- 為高頻調用的服務設置熔斷器
- 合理設置 `volumeThreshold` 避免誤判
- 非關鍵服務可以設置較高的 `errorThresholdPercentage`

## 最佳實踐

### 1. Fallback 策略

```typescript
// ✅ 好的 fallback
const fallback = async () => {
  // 返回快取資料
  const cached = await redis.get(`cache:${key}`);
  if (cached) return JSON.parse(cached);
  
  // 或返回預設值
  return { status: 'unavailable', data: [] };
};

// ❌ 避免的 fallback
const badFallback = async () => {
  // 不要在 fallback 中調用相同的服務
  return await axios.get(sameFailingService);
};
```

### 2. 配置調整

```typescript
// 關鍵服務：嚴格配置
const criticalConfig = {
  timeout: 3000,
  errorThresholdPercentage: 30,  // 低容忍度
  volumeThreshold: 5,             // 快速觸發
};

// 非關鍵服務：寬鬆配置
const nonCriticalConfig = {
  timeout: 10000,
  errorThresholdPercentage: 70,  // 高容忍度
  volumeThreshold: 50,            // 避免誤判
};
```

### 3. 監控告警

建議設置告警規則：

- 熔斷器開啟超過 5 分鐘
- 錯誤率持續高於 40%
- 請求拒絕率超過 10%

## 故障排除

### 熔斷器一直開啟

**原因**: 服務持續故障或配置過於敏感

**解決**:
1. 檢查後端服務是否正常
2. 查看日誌找出失敗原因
3. 調整 `errorThresholdPercentage` 或 `volumeThreshold`
4. 必要時手動關閉: `circuitBreaker.close('service-name')`

### 誤觸發熔斷

**原因**: `volumeThreshold` 過低或 `errorThresholdPercentage` 過低

**解決**:
1. 增加 `volumeThreshold`（需要更多請求才計算錯誤率）
2. 提高 `errorThresholdPercentage`
3. 延長 `rollingCountTimeout`（更長的統計窗口）

### Fallback 未執行

**原因**: Fallback 函數未正確設置或熔斷器未開啟

**檢查**:
1. 確認 fallback 函數已傳入 `wrap()` 方法
2. 檢查熔斷器狀態是否為 `open`
3. 查看日誌確認 fallback 事件

## 未來改進

### Phase 2: 進階功能

- [ ] Prometheus 指標集成
- [ ] Grafana 儀表板
- [ ] 告警規則配置
- [ ] 分散式熔斷器（跨實例共享狀態）
- [ ] 自動配置調整（根據歷史數據）

### Phase 3: Chaos Engineering

- [ ] 故障注入工具
- [ ] 自動化測試場景
- [ ] 彈性測試報告

## 參考資源

- [Opossum 文檔](https://github.com/nodeshift/opossum)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Resilience4j](https://resilience4j.readme.io/docs/circuitbreaker) (Java 參考實作)

## 變更日誌

### 2024-01-XX - Phase A 完成
- ✅ 安裝 opossum 套件
- ✅ 創建 Circuit Breaker 配置和服務
- ✅ 整合到 API Gateway
- ✅ 整合到 Payment Service (Stripe)
- ✅ 整合到 Notification Service (FCM)
- ✅ 實施 fallback 策略
- ✅ 添加監控端點
- ✅ 編寫單元測試
- ✅ 完成文檔

---

**聯絡**: Backend Development Team
**最後更新**: 2024-01-XX
