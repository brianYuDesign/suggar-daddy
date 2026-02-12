# 代碼分析報告
**生成日期**: 2026-02-12
**專案**: Sugar Daddy Platform - Nx Monorepo
**分析範圍**: 全項目多領域靜態分析

---

## 📊 執行摘要

### 專案規模
- **總源碼文件**: ~305 個 (.ts/.tsx)
- **測試文件**: 27 個
- **測試用例**: 418 個 (describe/it/test)
- **測試覆蓋率**: ~8.9% ⚠️
- **架構**: NestJS 微服務 + Next.js 前端 + TypeORM + Redis + Kafka

### 整體健康度評分: 6.2/10 ⚠️

| 領域 | 評分 | 狀態 |
|------|------|------|
| **代碼質量** | 5/10 | ⚠️ 需要改進 |
| **安全性** | 6/10 | ⚠️ 有風險 |
| **性能** | 7/10 | ⚡ 良好但可優化 |
| **架構** | 7/10 | ✅ 設計合理 |
| **可維護性** | 5/10 | ⚠️ 需要改進 |
| **測試覆蓋** | 3/10 | 🔴 嚴重不足 |

---

## 🔴 嚴重問題 (Critical)

### 1. 極低的測試覆蓋率
**嚴重度**: 🔴 Critical
**影響**: 代碼質量、回歸風險、重構困難

**發現**:
- 僅 27 個測試文件覆蓋 305 個源碼文件 (8.9%)
- 大部分業務邏輯缺少單元測試
- 無集成測試或 E2E 測試證據
- 關鍵服務（payment, subscription）測試不足

**影響**:
- 重構和功能變更風險極高
- 難以驗證業務邏輯正確性
- 容易引入回歸錯誤
- 上線信心不足

**推薦**:
```bash
# 優先級：立即行動
1. 為核心業務服務添加單元測試（目標 >70%）:
   - payment-service (交易、錢包)
   - subscription-service (訂閱邏輯)
   - auth-service (認證流程)

2. 添加集成測試:
   - Kafka 事件流測試
   - Redis + PostgreSQL 數據一致性測試

3. 添加 E2E 測試:
   - 關鍵用戶流程（註冊、登錄、訂閱、支付）

4. 設置 CI/CD 測試門檻（最低 60% 覆蓋率）
```

**文件位置**:
- `apps/payment-service/src/app/*.service.ts` - 缺少完整測試
- `apps/subscription-service/src/app/*.service.ts` - 缺少完整測試
- `apps/*/src/**/*.ts` - 整體測試覆蓋不足

---

### 2. 大量使用 `any` 類型（249 次）
**嚴重度**: 🔴 Critical
**影響**: 類型安全、運行時錯誤、開發體驗

**發現**:
- 54 個文件中共 249 次使用 `any` 類型
- 主要分佈在服務層和控制器層
- 導致類型推斷失效，失去 TypeScript 保護

**高頻文件**:
```typescript
// apps/db-writer-service/src/app/db-writer.service.ts - 21 次
// apps/admin-service/src/app/analytics.service.spec.ts - 18 次
// apps/content-service/src/app/post.service.ts - 12 次
// apps/payment-service/src/app/transaction.service.ts - 6 次
```

**典型問題案例**:
```typescript
// ❌ 問題代碼 (transaction.service.ts:23)
async create(createDto: CreateTransactionDto): Promise<any> {
  // 返回類型為 any，失去類型安全
}

// ✅ 應該這樣
async create(createDto: CreateTransactionDto): Promise<Transaction> {
  // 明確返回類型
}
```

**推薦**:
```bash
# 優先級：高
1. 定義明確的返回類型和接口
2. 使用 TypeScript strict 模式
3. 逐步替換 any 為具體類型或 unknown
4. 添加 ESLint 規則禁止 any（除非明確標註 @ts-expect-error）

# 執行：
nx run-many -t lint --all --fix
```

**預計工作量**: 3-5 個開發日

---

### 3. JWT Token 存儲在 localStorage（XSS 風險）
**嚴重度**: 🔴 Critical - Security
**影響**: 安全性、OWASP Top 10 (XSS)

**發現**:
```typescript
// apps/admin/lib/auth.ts:6
const token = localStorage.getItem(TOKEN_KEY);
```

**風險**:
- localStorage 可被 JavaScript 訪問，易受 XSS 攻擊
- 若網站存在 XSS 漏洞，攻擊者可竊取 token
- 無 httpOnly 保護

**推薦**:
```typescript
// ✅ 使用 httpOnly cookies（後端設置）
// NestJS Controller:
@Post('login')
async login(@Res() res: Response, @Body() dto: LoginDto) {
  const tokens = await this.authService.login(dto);

  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,        // 防止 JavaScript 訪問
    secure: true,          // 僅 HTTPS
    sameSite: 'strict',    // CSRF 保護
    maxAge: 15 * 60 * 1000 // 15 分鐘
  });

  return { success: true };
}

// 前端不需要手動處理 token，瀏覽器自動發送
```

**文件位置**:
- `apps/admin/lib/auth.ts:1-50` - Token 存儲邏輯
- `apps/auth-service/src/app/auth.controller.ts` - 需要添加 cookie 邏輯

**預計工作量**: 1-2 個開發日

---

## ⚠️ 高優先級問題 (High)

### 4. Redis 默認 24 小時 TTL
**嚴重度**: ⚠️ High
**影響**: 數據持久性、業務邏輯正確性

**發現**:
```typescript
// libs/redis/src/redis.service.ts:13-15
async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const ttl = ttlSeconds ?? 86400; // 默認 24h
  await this.client.setex(key, ttl, value);
}
```

**問題**:
- 所有未指定 TTL 的數據默認 24 小時後過期
- 用戶數據、訂閱記錄等可能不應該有 TTL
- 可能導致數據意外丟失

**推薦**:
```typescript
// ✅ 明確區分臨時數據和持久數據
async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds) {
    await this.client.setex(key, ttlSeconds, value);
  } else {
    await this.client.set(key, value); // 無 TTL
  }
}

// 業務代碼中明確指定 TTL
await redis.set('session:123', data, 3600);      // 臨時會話
await redis.set('user:456', userData);           // 持久用戶數據
```

**文件位置**:
- `libs/redis/src/redis.service.ts:12-16`
- 所有調用 `redis.set()` 的服務

**預計工作量**: 0.5 個開發日

---

### 5. 環境變量直接訪問（70 次）
**嚴重度**: ⚠️ High
**影響**: 配置管理、測試困難度

**發現**:
- 31 個文件中直接使用 `process.env.VARIABLE`
- 缺少統一的配置驗證
- 缺少類型安全的配置接口

**推薦**:
```typescript
// ✅ 使用 @nestjs/config 統一管理
// libs/common/src/config/app.config.ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET, // 驗證會在下方 schema 中進行
}));

export const configValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test'),
  JWT_SECRET: Joi.string().required(),
  // ... 其他配置
});

// 使用
constructor(private config: ConfigService) {
  const secret = this.config.get<string>('app.jwtSecret');
}
```

**預計工作量**: 2-3 個開發日

---

### 6. 性能瓶頸：SCAN + 內存排序
**嚴重度**: ⚠️ High
**影響**: 性能、擴展性

**發現**:
```typescript
// apps/payment-service/src/app/transaction.service.ts:46-53
async findAll(page = 1, limit = 20): Promise<PaginatedResponse<any>> {
  const scannedKeys = await this.redis.scan('transaction:tx-*');  // 掃描所有 key
  const values = await this.redis.mget(...scannedKeys);           // 批量獲取
  const all = values.filter(Boolean).map((raw) => JSON.parse(raw!));
  all.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));      // 內存排序
  const skip = (page - 1) * limit;
  return { data: all.slice(skip, skip + limit), total: all.length };
}
```

**問題**:
- 掃描所有交易記錄到內存
- 在內存中排序（當交易量增長到 10 萬+ 時會很慢）
- 無法利用 Redis 索引

**推薦**:
```typescript
// ✅ 使用 Redis Sorted Set
async findAll(page = 1, limit = 20): Promise<PaginatedResponse<Transaction>> {
  const skip = (page - 1) * limit;

  // 使用 Sorted Set 存儲按時間排序的交易 ID
  const ids = await this.redis.getClient().zrevrange(
    'transactions:all:by-time',
    skip,
    skip + limit - 1
  );

  const total = await this.redis.getClient().zcard('transactions:all:by-time');
  const keys = ids.map(id => `transaction:${id}`);
  const values = await this.redis.mget(...keys);
  const data = values.filter(Boolean).map(raw => JSON.parse(raw!));

  return { data, total, page, limit };
}

// 創建交易時同步更新 Sorted Set
await this.redis.getClient().zadd(
  'transactions:all:by-time',
  Date.now(),
  tx.id
);
```

**文件位置**:
- `apps/payment-service/src/app/transaction.service.ts:46-53`

**預計工作量**: 1 個開發日

---

## 🟡 中優先級問題 (Medium)

### 7. 密碼哈希存儲在 Redis
**嚴重度**: 🟡 Medium - Security
**影響**: 數據安全、合規性

**發現**:
```typescript
// apps/auth-service/src/app/auth.service.ts:142
const user: StoredUser = {
  userId,
  email: normalizedEmail,
  passwordHash,  // ← 密碼哈希存儲在 Redis
  // ...
};
await this.redis.set(userKey, JSON.stringify(user));
```

**風險**:
- Redis 通常無加密存儲（除非配置 Redis-at-rest encryption）
- 若 Redis 被入侵，密碼哈希可能洩露
- 雖然是哈希，但仍是敏感數據

**推薦**:
```typescript
// ✅ 僅在 PostgreSQL 存儲密碼哈希
// Redis 只緩存公開的用戶信息
interface CachedUser {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  // 不包含 passwordHash
}

// 驗證密碼時從數據庫讀取
async validatePassword(email: string, password: string): Promise<boolean> {
  const user = await this.userRepo.findOne({ where: { email } });
  if (!user) return false;
  return bcrypt.compare(password, user.passwordHash);
}
```

**文件位置**:
- `apps/auth-service/src/app/auth.service.ts:39-49, 141-156`
- `apps/db-writer-service/src/app/db-writer.service.ts:62-68`

**預計工作量**: 1.5 個開發日

---

### 8. Console 語句殘留
**嚴重度**: 🟡 Medium
**影響**: 日誌污染、調試信息洩露

**發現**:
- 2 個文件中共 4 次 console.log/error/warn
- `apps/subscription-service/src/app/events/payment.consumer.ts:3`
- `libs/common/src/swagger/swagger.config.ts:1`

**推薦**:
```typescript
// ❌ 不要使用
console.log('debug info');

// ✅ 使用 NestJS Logger
private readonly logger = new Logger(ServiceName.name);
this.logger.log('Info message');
this.logger.error('Error message', error.stack);
this.logger.warn('Warning message');
this.logger.debug('Debug message');
```

**預計工作量**: 0.5 個開發日

---

### 9. TODO/FIXME 技術債務
**嚴重度**: 🟡 Medium
**影響**: 功能完整性

**發現**:
```typescript
// apps/auth-service/src/app/auth.service.ts:253
// TODO: Integrate email service to send verification link

// apps/auth-service/src/app/auth.service.ts:293
// TODO: Integrate email service to send reset link
```

**推薦**:
- 集成郵件服務（如 SendGrid, AWS SES）
- 完善郵件驗證和密碼重置流程

**預計工作量**: 2-3 個開發日

---

## ✅ 良好實踐 (Strengths)

### 架構設計
✅ **Event-Driven Architecture**: Kafka + db-writer-service 解耦設計
✅ **微服務架構**: 服務職責清晰分離
✅ **API Gateway**: 統一入口和路由管理
✅ **Nx Monorepo**: 共享代碼庫和構建優化

### 安全
✅ **密碼驗證**: 強密碼策略（大小寫、數字、長度）
✅ **登錄速率限制**: 5 次失敗後鎖定 15 分鐘
✅ **無危險代碼**: 無 eval、dangerouslySetInnerHTML
✅ **環境變量隔離**: 無 .env 文件提交到代碼庫

### 錯誤處理
✅ **Kafka 重試機制**: 指數退避 + 最多 3 次重試
✅ **優雅降級**: Kafka 連接失敗不影響服務啟動
✅ **統一異常過濾器**: `AllExceptionsFilter` 處理全局錯誤

### 數據管理
✅ **Redis SCAN**: 避免阻塞性的 KEYS 命令
✅ **Redis 批量操作**: 使用 mget 減少網絡往返

---

## 📋 改進路線圖

### 第一階段：修復嚴重問題（1-2 週）
1. **測試覆蓋率**: 為核心服務添加單元測試（目標 >60%）
2. **類型安全**: 移除前 50 個 `any` 類型
3. **Token 安全**: 遷移到 httpOnly cookies

### 第二階段：優化架構（2-3 週）
4. **Redis TTL**: 修復默認 TTL 邏輯
5. **性能優化**: 使用 Sorted Set 優化分頁查詢
6. **配置管理**: 統一環境變量驗證

### 第三階段：增強安全和功能（3-4 週）
7. **密碼哈希**: 從 Redis 移除敏感數據
8. **郵件服務**: 完成郵件驗證和密碼重置
9. **日誌系統**: 替換所有 console 語句
10. **監控告警**: 添加 APM 和錯誤追蹤

---

## 🛠️ 立即行動項

```bash
# 1. 設置測試覆蓋率檢查
npm install --save-dev @nx/jest

# 2. 添加 ESLint 規則
# .eslintrc.json:
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}

# 3. 運行 lint 並修復
nx run-many -t lint --all --fix

# 4. 創建測試模板
nx g @nx/nest:service my-service --project=my-app --dry-run

# 5. 運行測試並生成覆蓋率報告
nx run-many -t test --all --coverage
```

---

## 📊 指標追蹤

### 當前基線
| 指標 | 當前值 | 目標值 |
|------|--------|--------|
| 測試覆蓋率 | 8.9% | >70% |
| `any` 類型使用 | 249 次 | <20 次 |
| 安全漏洞 | 3 個 | 0 個 |
| Console 語句 | 4 個 | 0 個 |
| TODO 債務 | 2 個 | 0 個 |

### 下次檢查
建議 **2 週後** 重新運行分析，追蹤改進進度。

---

## 📚 參考資料

- [NestJS Best Practices](https://docs.nestjs.com/techniques/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Jest Coverage](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Nx Testing](https://nx.dev/recipes/jest/jest-root-setup)

---

**報告結束** | 生成者: Claude Code sc:analyze | 版本: 1.0
