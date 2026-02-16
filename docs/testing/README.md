# 測試文檔索引

Sugar Daddy 平台測試指南 - 簡潔實用版

---

## 📚 文檔列表

### 核心測試指南
- **[TESTING.md](./TESTING.md)** - 完整測試策略與工具
- **[E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)** - Playwright E2E 測試
- **[FRONTEND_TESTING.md](./FRONTEND_TESTING.md)** - 前端測試完整指南
- **[FRONTEND_TESTING_QUICKSTART.md](./FRONTEND_TESTING_QUICKSTART.md)** - 前端測試快速開始
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - 常用命令快速參考

---

## 🚀 快速開始

### 後端測試
```bash
# 所有測試
npm test

# 單一服務
nx test auth-service
nx test user-service

# 測試覆蓋率
nx run-many -t test --all --coverage
```

### 前端 E2E 測試
```bash
# Web 用戶端測試
npm run e2e:web

# Admin 管理後台測試
npm run e2e:admin:test

# UI 互動模式
npm run e2e:ui

# Debug 模式
npm run e2e:debug
```

### Lint 檢查
```bash
npm run lint
```

---

## 📊 測試覆蓋率

### 查看覆蓋率報告
```bash
nx run-many -t test --all --coverage
```

報告位置: `coverage/{project}/lcov-report/index.html`

### 當前狀態
- ✅ **後端測試**: 732+ 個測試全部通過
- ✅ **API Gateway**: 156 tests passed
- ✅ **Auth Service**: 55 tests passed
- ✅ **User Service**: 41 tests passed
- ✅ **Payment Service**: 86 tests passed
- ✅ **Content Service**: 93 tests passed
- ✅ **Admin Service**: 124 tests passed
- ✅ 其他所有微服務測試通過

---

## 🎯 測試策略

### 測試金字塔
1. **單元測試** (Unit Tests) - 服務邏輯、工具函數
2. **整合測試** (Integration Tests) - 控制器、中介層
3. **E2E 測試** (End-to-End Tests) - 使用者流程

### 測試原則
- ✅ 每個服務有完整的單元測試
- ✅ 使用 Mock 隔離外部依賴
- ✅ E2E 測試覆蓋關鍵使用者旅程
- ✅ 測試名稱清楚描述預期行為

---

## 🐛 除錯技巧

### 後端測試除錯
```bash
# Watch 模式
nx test auth-service --watch

# 單一測試檔案
nx test auth-service --testFile=auth.service.spec.ts

# 詳細輸出
nx test auth-service --verbose
```

### E2E 測試除錯
```bash
# 開啟 Playwright Inspector
npm run e2e:debug

# Headed 模式 (看到瀏覽器)
npm run e2e:headed

# 單一測試
npx playwright test e2e/auth.spec.ts --headed
```

---

## 📝 撰寫測試

### 後端測試範例
```typescript
describe('AuthService', () => {
  it('應成功註冊新用戶', async () => {
    const result = await service.register({
      email: 'test@example.com',
      password: 'Password123',
      userType: UserType.SUGAR_BABY,
    });
    
    expect(result.accessToken).toBeDefined();
    expect(kafka.sendEvent).toHaveBeenCalledWith('user.created', ...);
  });
});
```

### E2E 測試範例
```typescript
test('用戶可以成功註冊', async ({ page }) => {
  await page.goto('/register');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/discover');
});
```

---

## 🔗 相關資源

- [Jest 官方文檔](https://jestjs.io/)
- [Playwright 官方文檔](https://playwright.dev/)
- [NestJS Testing 指南](https://docs.nestjs.com/fundamentals/testing)

---

**最後更新**: 2026-02-16
