# E2E 測試速率限制問題解決方案

## 問題描述

在執行 e2e 測試時，`TC-014: 登入限流保護` 測試會故意嘗試 6 次錯誤登入，觸發帳號鎖定機制（MAX_LOGIN_ATTEMPTS = 5，鎖定 15 分鐘）。這會導致後續使用相同帳號的測試失敗。

## 解決方案

我們採用了**多層防護策略**，確保測試之間不會互相干擾：

### 1. Redis 測試清理工具 (`e2e/utils/redis-helper.ts`)

建立了專門的 Redis 工具類，提供以下功能：

- ✅ 清除登入嘗試記錄
- ✅ 清除使用者認證資料
- ✅ 安全的 SCAN 操作（不阻塞 Redis）
- ✅ 批次清理測試資料

```typescript
import { getRedisTestHelper } from './utils/redis-helper';

const redisHelper = getRedisTestHelper();
await redisHelper.clearLoginAttempts('test@example.com');
```

### 2. 測試前自動清理 (`e2e/auth.setup.ts`)

在所有測試執行前，自動清理所有測試帳號的登入嘗試記錄：

```typescript
setup('清理 Redis 測試資料', async () => {
  const redisHelper = getRedisTestHelper();
  await redisHelper.clearAllTestData();
});
```

### 3. 使用獨立測試帳號 (`e2e/tests/auth/login.spec.ts`)

TC-014 使用專屬的測試 email (`ratelimit-test@example.com`)，避免影響其他測試：

```typescript
test('TC-014: 登入限流保護', async ({ page, loginPage }) => {
  const rateLimitTestEmail = 'ratelimit-test@example.com';
  
  try {
    // 測試邏輯...
  } finally {
    // 測試後清理
    await redisHelper.clearLoginAttempts(rateLimitTestEmail);
  }
});
```

## 使用方式

### 執行所有測試

```bash
npm run e2e
```

測試會自動：
1. 連接到 Redis
2. 清理舊的登入嘗試記錄
3. 執行測試
4. 清理 TC-014 的測試資料

### 手動清理 Redis（如需要）

```typescript
import { getRedisTestHelper } from './utils/redis-helper';

const redisHelper = getRedisTestHelper();

// 清除特定帳號的登入嘗試
await redisHelper.clearLoginAttempts('user@example.com');

// 清除所有測試資料
await redisHelper.clearAllTestData();

// 查看登入嘗試次數
const attempts = await redisHelper.getLoginAttempts('user@example.com');
console.log(`登入嘗試次數: ${attempts}`);
```

## 環境需求

確保測試環境可以連接到 Redis：

```env
# .env 或 .env.local
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # 如果有密碼
```

## 測試帳號管理

### 標準測試帳號（不受速率限制測試影響）
- `subscriber@test.com` - 訂閱者
- `creator@test.com` - 創作者
- `admin@test.com` - 管理員

### 速率限制測試專用帳號
- `ratelimit-test@example.com` - 專門用於 TC-014 測試

## 架構優勢

### ✅ 測試隔離
每個測試使用獨立帳號或在測試前清理資料，互不影響。

### ✅ 真實測試
能夠測試真正的速率限制功能，不需要在測試環境停用安全機制。

### ✅ 生產環境安全
生產環境的速率限制機制完整保留，測試環境的特殊處理不會洩漏到生產。

### ✅ 可維護性
- 集中的 Redis 工具類
- 自動化清理流程
- 清晰的錯誤處理

## 故障排除

### Redis 連線失敗

如果 Redis 連線失敗，測試會跳過清理步驟並記錄警告：

```
[Setup] ⚠️ Redis 連線失敗，跳過清理步驟
```

**解決方法：**
1. 確認 Redis 服務正在運行：`redis-cli ping`
2. 檢查環境變數：`REDIS_HOST` 和 `REDIS_PORT`
3. 檢查防火牆設定

### 測試仍然失敗

如果帳號仍被鎖定：

```bash
# 手動清理 Redis
redis-cli
> KEYS auth:login-attempts:*
> DEL auth:login-attempts:test@example.com
```

或使用我們的工具：

```bash
node -e "
const { getRedisTestHelper } = require('./e2e/utils/redis-helper');
(async () => {
  const helper = getRedisTestHelper();
  await helper.clearAllTestData();
  await helper.close();
})();
"
```

### 查看當前登入嘗試狀態

```bash
redis-cli
> KEYS auth:login-attempts:*
> GET auth:login-attempts:ratelimit-test@example.com
```

## 相關檔案

- `e2e/utils/redis-helper.ts` - Redis 工具類
- `e2e/auth.setup.ts` - 測試前置設定
- `e2e/tests/auth/login.spec.ts` - 登入測試（包含 TC-014）
- `apps/auth-service/src/app/auth.service.ts` - 速率限制實作

## 未來改進

如果需要更靈活的測試環境控制，可以考慮：

1. **環境變數控制速率限制閾值**
   ```typescript
   const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
   ```

2. **測試環境專用的速率限制配置**
   - 開發環境：5 次，鎖定 15 分鐘
   - 測試環境：10 次，鎖定 1 分鐘
   - 生產環境：5 次，鎖定 30 分鐘

3. **Admin API 清理端點**（僅限測試環境）
   ```typescript
   // POST /api/admin/test/clear-rate-limits
   ```

但目前的方案已經足夠且更安全，因為不需要修改核心業務邏輯。
