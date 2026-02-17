# 前端依賴檢查工具

## 用途

此腳本用於確保前端模組不會直接依賴後端模組，維護清晰的架構邊界。

## 檢查的模組

### 前端模組（被檢查）
- `apps/admin` - 管理後台
- `apps/web` - 用戶前端
- `libs/ui` - UI 組件庫
- `libs/api-client` - API 客戶端

### 不允許的後端依賴
- `@suggar-daddy/dto`
- `@suggar-daddy/common`
- `@suggar-daddy/database`
- `@suggar-daddy/kafka`
- `@suggar-daddy/redis`
- `@suggar-daddy/auth`

## 使用方式

### 手動執行

```bash
# 在專案根目錄執行
./scripts/check-frontend-dependencies.sh
```

### CI/CD 整合

在 `.github/workflows/ci.yml` 或其他 CI 配置中加入：

```yaml
- name: Check Frontend Dependencies
  run: ./scripts/check-frontend-dependencies.sh
```

### Pre-commit Hook

在 `.husky/pre-commit` 中加入：

```bash
#!/bin/sh
./scripts/check-frontend-dependencies.sh
```

## 輸出範例

### 成功情況

```
=== 前端模組依賴檢查 ===

檢查 apps/admin...
  ✓ 無不當的後端依賴

檢查 apps/web...
  ✓ 無不當的後端依賴

檢查 libs/ui...
  ✓ 無不當的後端依賴

檢查 libs/api-client...
  ✓ 無不當的後端依賴

=== 檢查總結 ===
✓ 所有檢查通過！前端模組無不當的後端依賴
```

### 失敗情況

```
=== 前端模組依賴檢查 ===

檢查 apps/admin...
  ✗ 發現 1 個檔案引用 @suggar-daddy/dto
    apps/admin/app/some-page.tsx

=== 檢查總結 ===
✗ 發現 1 個違規依賴

請修正以下問題：
1. 移除前端模組中對後端模組的直接引用
2. 改用 @suggar-daddy/api-client 中的類型
3. 如果需要新類型，請在 libs/api-client/src/types.ts 中添加
```

## 修復建議

### 情況 1：使用了後端 DTO

❌ **錯誤：**
```typescript
import type { UserProfileDto } from '@suggar-daddy/dto';
```

✅ **正確：**
```typescript
import type { UserProfileDto } from '@suggar-daddy/api-client';
```

### 情況 2：使用了 common 模組的類型

❌ **錯誤：**
```typescript
import { UserType, PermissionRole } from '@suggar-daddy/common';
```

✅ **正確：**
```typescript
import { UserType, PermissionRole } from '@suggar-daddy/api-client';
```

### 情況 3：需要新的類型定義

如果 `api-client` 中沒有你需要的類型：

1. 在 `libs/api-client/src/types.ts` 中添加類型定義
2. 在 `libs/api-client/src/index.ts` 中導出該類型
3. 在前端代碼中從 `@suggar-daddy/api-client` 引入

範例：

```typescript
// libs/api-client/src/types.ts
export interface NewFeatureDto {
  id: string;
  name: string;
  // ...
}

// libs/api-client/src/index.ts
export type { NewFeatureDto } from './types';

// 前端代碼
import type { NewFeatureDto } from '@suggar-daddy/api-client';
```

## 架構原則

### 允許的依賴方向

```
apps/admin, apps/web
    ↓
@suggar-daddy/api-client, @suggar-daddy/ui
    ↓
無進一步依賴（自包含）
```

### 不允許的依賴

```
apps/admin, apps/web
    ✗
@suggar-daddy/dto, @suggar-daddy/common, 等後端模組
```

## 維護

### 添加新的前端模組

在腳本中的 `FRONTEND_MODULES` 陣列添加新模組：

```bash
FRONTEND_MODULES=(
  "apps/admin"
  "apps/web"
  "apps/mobile"  # 新增
  "libs/ui"
  "libs/api-client"
)
```

### 添加新的後端模組限制

在腳本中的 `BACKEND_MODULES` 陣列添加：

```bash
BACKEND_MODULES=(
  "@suggar-daddy/dto"
  "@suggar-daddy/common"
  "@suggar-daddy/new-backend-module"  # 新增
  # ...
)
```

## 相關文檔

- [重構摘要](../../.copilot/session-state/7435f916-881e-4069-84c4-4a195893dd2b/REFACTORING_SUMMARY.md)
- [依賴審查報告](../../.copilot/session-state/7435f916-881e-4069-84c4-4a195893dd2b/DEPENDENCY_AUDIT_REPORT.md)
