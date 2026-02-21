# 📖 Jest 測試框架 - 使用指南

## 概述

本項目使用 Jest 作為測試框架，支持三層次測試：
- **單元測試** - 測試業務邏輯單元
- **集成測試** - 測試 API 端點和模塊協作
- **E2E 測試** - 測試完整的業務流程

## 快速開始

### 安裝依賴

```bash
npm install
```

### 運行測試

```bash
# 執行全部測試
npm test

# 監視模式（持續運行，文件變化時自動重跑）
npm run test:watch

# 只運行單元測試
npm run test:unit

# 只運行集成測試
npm run test:integration

# 只運行 E2E 測試
npm run test:e2e

# 生成覆蓋率報告
npm run test:cov
```

## 目錄結構

```
recommendation-service/
├── src/
│   ├── services/
│   │   ├── recommendation.service.ts
│   │   └── recommendation.service.spec.ts      # 單元測試
│   ├── modules/
│   │   ├── recommendation.controller.ts
│   │   └── recommendation.controller.spec.ts   # 集成測試
│   └── utils/
│       ├── recommendation.utils.ts
│       └── recommendation.utils.spec.ts        # 工具函數測試
├── test/
│   ├── setup.ts                                # Jest 配置
│   ├── fixtures/
│   │   └── data.fixtures.ts                    # 測試數據工廠
│   ├── integration/
│   │   └── recommendation.controller.spec.ts   # API 測試
│   └── e2e/
│       └── recommendation-flow.e2e-spec.ts     # 業務流程測試
├── jest.config.js                              # Jest 配置文件
└── .github/workflows/
    └── test.yml                                # CI/CD 配置
```

## 編寫測試

### 1️⃣ 單元測試模板

**位置**: `src/**/*.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('應該被定義', () => {
    expect(service).toBeDefined();
  });

  it('應該執行特定功能', () => {
    const result = service.someMethod();
    expect(result).toEqual(expectedValue);
  });
});
```

### 2️⃣ 集成測試模板

**位置**: `test/integration/**/*.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MyController } from '../../src/modules/my.controller';
import { MyService } from '../../src/services/my.service';

describe('MyController (Integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MyController],
      providers: [MyService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('應該返回 200 狀態碼', () => {
    return request(app.getHttpServer())
      .get('/api/endpoint')
      .expect(200);
  });
});
```

### 3️⃣ E2E 測試模板

**位置**: `test/e2e/**/*.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestUser } from '../fixtures/data.fixtures';

describe('Complete User Flow (E2E)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // 初始化應用
  });

  it('應該執行完整的業務流程', async () => {
    const testUser = createTestUser();
    // 模擬真實用戶場景
  });
});
```

## 使用 Fixtures 生成測試數據

```typescript
import {
  createTestUser,
  createTestUsers,
  createTestContent,
  mockRecommendationResults,
} from '../fixtures/data.fixtures';

// 創建單個用戶
const user = createTestUser({
  interests: ['tech', 'music'],
});

// 創建多個用戶
const users = createTestUsers(5);

// 創建內容
const content = createTestContent({
  title: 'My Article',
  category: 'tech',
});
```

## Mock 外部服務

### Mock Redis Service

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../src/cache/redis.service';

describe('MyServiceWithRedis', () => {
  let service: MyService;
  let redisService: RedisService;

  beforeEach(async () => {
    const mockRedisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(void 0),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('應該調用 Redis', async () => {
    await service.getWithCache('key');
    expect(redisService.get).toHaveBeenCalledWith('key');
  });
});
```

### Mock S3 Service

```typescript
const mockS3Service = {
  uploadFile: jest.fn().mockResolvedValue({ url: 'https://...' }),
  deleteFile: jest.fn().mockResolvedValue(void 0),
};

// 在 module 定義中使用
{
  provide: S3Service,
  useValue: mockS3Service,
}
```

## 測試覆蓋率

### 生成覆蓋率報告

```bash
npm run test:cov
```

覆蓋率報告將生成在 `coverage/` 目錄中。

### 查看覆蓋率

```bash
# 生成 HTML 報告
npm run test:cov

# 在瀏覽器中打開
open coverage/lcov-report/index.html
```

### 覆蓋率目標

- **Statements**: 70%+
- **Branches**: 65%+
- **Functions**: 70%+
- **Lines**: 70%+

## 最佳實踐

### ✅ DO（應該做的）

1. **清晰的測試名稱**
   ```typescript
   // ✅ Good
   it('應該在用戶不存在時返回 404 錯誤', () => {});

   // ❌ Bad
   it('應該測試用戶', () => {});
   ```

2. **一個測試一個概念**
   ```typescript
   // ✅ Good
   describe('calculateScore', () => {
     it('應該計算正確的分數', () => {});
     it('應該處理邊界值', () => {});
   });
   ```

3. **使用 beforeEach/afterEach 清理**
   ```typescript
   beforeEach(() => {
     // 設置
   });

   afterEach(() => {
     // 清理
   });
   ```

4. **Mock 外部依賴**
   ```typescript
   const mockService = {
     method: jest.fn().mockResolvedValue(value),
   };
   ```

5. **測試邊界和錯誤情況**
   ```typescript
   it('應該拒絕無效的分數', () => {
     expect(() => validateScore(-1)).toThrow();
   });
   ```

### ❌ DON'T（不應該做的）

1. **不要在測試中使用真實外部服務**
   ```typescript
   // ❌ Bad
   const data = await realS3Service.uploadFile();

   // ✅ Good
   const mockS3 = { uploadFile: jest.fn() };
   ```

2. **不要使測試相互依賴**
   ```typescript
   // ❌ Bad - 測試 B 依賴於測試 A 的結果
   let userId;
   it('Test A', () => { userId = '123'; });
   it('Test B', () => { expect(userId).toBe('123'); });
   ```

3. **不要測試第三方庫**
   ```typescript
   // ❌ Bad - 測試 Jest 而不是你的代碼
   it('should use expect', () => {
     expect(true).toBe(true);
   });
   ```

4. **不要忽略異常情況**
   ```typescript
   // ✅ Good - 測試 happy path 和 error cases
   it('應該在有效輸入時成功', () => {});
   it('應該在無效輸入時拋出錯誤', () => {});
   ```

## 常見問題

### Q: 如何在 TypeScript 中使用 Jest？

A: 使用 `ts-jest` 預設，已在 `jest.config.js` 中配置。

### Q: 如何測試異步函數？

```typescript
it('應該異步返回值', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Q: 如何 Mock Promise？

```typescript
const mockFn = jest.fn().mockResolvedValue(value); // 解決
const mockFn = jest.fn().mockRejectedValue(error); // 拒絕
```

### Q: 如何測試 NestJS 依賴注入？

```typescript
const module = await Test.createTestingModule({
  providers: [MyService],
}).compile();

const service = module.get<MyService>(MyService);
```

## 有用的 Jest 方法

```typescript
// 基本斷言
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// 數字
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3, 5);

// 字符串
expect(value).toMatch(/regex/);
expect(value).toContain('substring');

// 數組/對象
expect(array).toContain(item);
expect(object).toHaveProperty('key');
expect(object).toHaveProperty('key', value);

// 異常
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);

// Mock
jest.fn();
jest.fn().mockReturnValue(value);
jest.fn().mockResolvedValue(value);
jest.spyOn(obj, 'method');
```

## 性能優化

### 運行特定測試

```bash
# 運行特定文件
npm test -- recommendation.service.spec.ts

# 運行匹配正則的測試
npm test -- --testNamePattern="calculateScore"

# 運行單個 describe 塊
npm test -- --testNamePattern="RecommendationService"
```

### 並行運行

Jest 默認並行運行測試，提高速度。如果有衝突，可以禁用：

```bash
npm test -- --runInBand
```

## 相關資源

- [Jest 官方文檔](https://jestjs.io/docs/getting-started)
- [NestJS 測試文檔](https://docs.nestjs.com/fundamentals/testing)
- [Supertest 文檔](https://github.com/visionmedia/supertest)
- [TypeScript + Jest 最佳實踐](https://www.typescriptlang.org/docs/handbook/testing.html)

---

**祝你測試愉快！** 🚀✨
