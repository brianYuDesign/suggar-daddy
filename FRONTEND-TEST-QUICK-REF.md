# 前端測試快速參考

## ✅ 已修復的問題

### 1. UI 組件庫測試 - 完全通過 (126/126)
**文件**: `libs/ui/src/lib/button/button.tsx`
**修改**: 添加 `disabled:pointer-events-none` 到 buttonVariants

```diff
const buttonVariants = cva(
- 'inline-flex items-center ... disabled:cursor-not-allowed disabled:opacity-50',
+ 'inline-flex items-center ... disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
```

### 2. Mock 文件重命名
```bash
# Admin
apps/admin/src/__mocks__/admin-api.ts → api.ts

# Web
apps/web/src/__mocks__/web-api.ts → api.ts
```

### 3. Jest 配置更新

**Admin** (`apps/admin/jest.config.ts`):
```typescript
moduleNameMapper: {
  '^@suggar-daddy/ui$': '<rootDir>/../../libs/ui/src/index.ts',
  '^@suggar-daddy/api-client$': '<rootDir>/../../libs/api-client/src/index.ts',
}
```

**Admin** (`apps/admin/tsconfig.spec.json`):
```json
{
  "compilerOptions": {
    "jsx": "react"  // 添加此行
  }
}
```

## 🚀 測試命令

```bash
# UI 測試 (全部通過)
npx nx test ui

# Admin 測試
npx nx test admin  

# Web 測試
npx nx test web

# 所有前端測試
npm run test:ui
npm run test

# 測試覆蓋率
npm run test:ui:coverage
npm run test:coverage
```

## 📊 測試結果摘要

| 項目 | 測試套件 | 測試用例 | 通過率 | 狀態 |
|------|---------|---------|--------|------|
| **UI 組件庫** | 7/7 | 126/126 | **100%** | ✅ 完美 |
| **Admin 應用** | 配置完成 | 待調整 | - | ⚠️ 配置OK |
| **Web 應用** | 17 (3✅/14⚠️) | 307 (197✅/110⚠️) | **64%** | ⚠️ 部分通過 |

## 🔧 修改的文件清單

```
✅ libs/ui/src/lib/button/button.tsx
✅ apps/admin/jest.config.ts
✅ apps/admin/tsconfig.spec.json
✅ apps/admin/src/__mocks__/api.ts (重命名)
✅ apps/web/src/__mocks__/api.ts (重命名)
📝 FRONTEND-TEST-FIX-REPORT.md (新增)
📝 FRONTEND-TEST-SUMMARY.md (新增)
📝 FRONTEND-TEST-QUICK-REF.md (本文件)
```

## ⚠️ 已知問題

### Admin 應用
- Middleware 測試已排除 (需要 Node 環境)
- 部分頁面測試需要組件實作

### Web 應用
- 64% 測試通過
- 主要問題: UI 元素查找失敗、異步超時
- 建議使用 `data-testid` 而非文字查找

## 💡 測試最佳實踐

### 1. 使用 data-testid
```typescript
// ❌ 脆弱
screen.getByText('目前方案')

// ✅ 穩定
screen.getByTestId('current-plan')
screen.getByRole('heading', { name: /plan/i })
```

### 2. 正確的異步測試
```typescript
// ✅ 使用 waitFor
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
}, { timeout: 10000 }); // 增加超時時間如需要
```

### 3. Mock API 正確配置
```typescript
// ✅ Mock 放在 src/__mocks__/api.ts
// ✅ 測試中使用: jest.mock('@/lib/api')
```

## 📝 下一步行動

### 優先級 1 (高)
- [ ] 修復 Web 應用核心功能測試
  - [ ] Login/Register 頁面
  - [ ] Subscription 頁面
  - [ ] Payment 頁面

### 優先級 2 (中)
- [ ] 修復 Admin 應用測試
- [ ] 提升 Web 測試通過率至 80%+

### 優先級 3 (低)
- [ ] 增加 E2E 測試
- [ ] 添加視覺回歸測試
- [ ] 提升測試覆蓋率至 90%+

## 🎉 成功指標

- ✅ UI 庫: 100% 測試通過
- ✅ 測試配置: 完全修復
- ✅ Mock 文件: 統一命名
- ✅ 文檔: 完整記錄

---

**Frontend Developer** - 2025
