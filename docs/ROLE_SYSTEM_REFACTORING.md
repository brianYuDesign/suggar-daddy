# 角色系統統一重構方案

## 現狀分析

### ✅ 已完成的優化
專案已經建立了完善的統一角色系統：

1. **統一的角色定義** (`libs/common/src/types/roles.types.ts`)
   - ✅ `UserType` enum：業務角色（sugar_baby, sugar_daddy）
   - ✅ `PermissionRole` enum：權限角色（subscriber, creator, admin）
   - ✅ `UserRole` enum：標記為 deprecated，向後兼容

2. **User Entity 已分離** (`libs/database/src/entities/user.entity.ts`)
   - ✅ `userType` 欄位：業務角色
   - ✅ `permissionRole` 欄位：權限角色
   - ✅ `role` 欄位：標記為 deprecated，nullable

3. **DTO 層已更新**
   - ✅ `libs/dto/src/user.dto.ts`：使用 UserType enum
   - ✅ `libs/dto/src/types.ts`：TypeScript 類型定義正確

### ⚠️ 需要清理的遺留問題

#### 1. auth.dto.ts 仍使用舊的 role 欄位
**問題檔案：** `libs/dto/src/auth.dto.ts`

```typescript
// ❌ 目前
@IsIn(['sugar_baby', 'sugar_daddy'])
role: 'sugar_baby' | 'sugar_daddy';

// ✅ 應改為
@IsEnum(UserType)
userType: UserType;
```

#### 2. user.dto.ts 有重複的 deprecated role 欄位
**問題檔案：** `libs/dto/src/user.dto.ts`

```typescript
// ❌ 目前
@IsOptional()
@IsIn(['sugar_baby', 'sugar_daddy'])
role?: 'sugar_baby' | 'sugar_daddy';

// 可移除，已被 userType 取代
```

#### 3. 測試檔案使用硬編碼字串
**問題檔案：** `apps/admin/app/(dashboard)/users/page.spec.tsx`

```typescript
// ❌ 目前
role: 'sugar_daddy',
role: 'sugar_baby',

// ✅ 應改為
userType: UserType.SUGAR_DADDY,
permissionRole: PermissionRole.SUBSCRIBER,
```

#### 4. 前端頁面使用舊欄位名稱
**問題檔案：** `apps/web/app/(auth)/register/page.tsx`

```typescript
// ❌ 目前
role: z.enum(['sugar_baby', 'sugar_daddy'])

// ✅ 應改為
userType: z.enum([UserType.SUGAR_BABY, UserType.SUGAR_DADDY])
```

## 重構計畫

### Phase 1: 更新 DTO 層（高優先級）
- [ ] 更新 `auth.dto.ts` 的 RegisterDto
- [ ] 移除 `user.dto.ts` 的 deprecated role 欄位
- [ ] 移除 `types.ts` 的 deprecated role 欄位

### Phase 2: 更新前端應用（中優先級）
- [ ] 更新 `apps/web/app/(auth)/register/page.tsx`
- [ ] 更新 auth provider
- [ ] 更新相關頁面

### Phase 3: 更新測試（低優先級）
- [ ] 更新 admin 測試檔案
- [ ] 更新 web 測試檔案

### Phase 4: 資料庫清理（未來版本）
- [ ] 建立 migration 移除 user.role 欄位
- [ ] 確認所有服務不再依賴舊欄位

## 實作細節

### 1. 統一的角色定義（已完成）

```typescript
// libs/common/src/types/roles.types.ts

/** 業務角色：使用者註冊時選擇的身份類型 */
export enum UserType {
  SUGAR_BABY = 'sugar_baby',
  SUGAR_DADDY = 'sugar_daddy',
}

/** 權限角色：使用者在系統中的權限等級 */
export enum PermissionRole {
  SUBSCRIBER = 'subscriber',  // 一般訂閱者
  CREATOR = 'creator',        // 內容創作者
  ADMIN = 'admin',            // 系統管理員
}
```

### 2. 使用方式

#### 後端 DTO

```typescript
import { UserType, PermissionRole } from '@suggar-daddy/common';

export class RegisterDto {
  @IsEnum(UserType)
  userType: UserType;
  
  // 其他欄位...
}
```

#### 前端頁面

```typescript
import { UserType } from '@suggar-daddy/common';

const registerSchema = z.object({
  userType: z.nativeEnum(UserType, {
    message: '請選擇你的身份',
  }),
});
```

#### Entity

```typescript
import { UserType, PermissionRole } from '@suggar-daddy/common';

@Entity('users')
export class UserEntity {
  @Column({ type: 'varchar', enum: UserType })
  userType!: UserType;
  
  @Column({ 
    type: 'varchar', 
    enum: PermissionRole,
    default: PermissionRole.SUBSCRIBER 
  })
  permissionRole!: PermissionRole;
}
```

### 3. 權限檢查

```typescript
import { PermissionRole } from '@suggar-daddy/common';

// 檢查權限角色
@Roles(PermissionRole.ADMIN, PermissionRole.CREATOR)
@UseGuards(RolesGuard)
async adminOnlyEndpoint() {
  // ...
}

// 檢查業務角色（如果需要）
if (user.userType === UserType.SUGAR_DADDY) {
  // Sugar Daddy 專屬邏輯
}
```

## 優點總結

✅ **明確分離關注點**
- `userType`：業務邏輯（Sugar Baby vs Sugar Daddy）
- `permissionRole`：權限控制（Admin, Creator, Subscriber）

✅ **類型安全**
- 使用 TypeScript enum，避免字串拼寫錯誤
- IDE 自動完成和類型檢查

✅ **可擴展性**
- 新增業務角色：修改 `UserType` enum
- 新增權限等級：修改 `PermissionRole` enum

✅ **向後兼容**
- 保留 deprecated `role` 欄位（nullable）
- 舊代碼仍可運行，逐步遷移

## 遷移檢查清單

### 開發階段
- [x] 定義統一的角色 enum
- [x] 更新 User entity
- [x] 更新核心 DTO
- [ ] 更新 auth.dto.ts
- [ ] 移除 deprecated 欄位
- [ ] 更新前端註冊頁面
- [ ] 更新前端 auth provider

### 測試階段
- [ ] 單元測試使用新欄位
- [ ] 整合測試驗證
- [ ] E2E 測試更新

### 部署階段
- [ ] 資料庫備份
- [ ] 部署新代碼（保留舊欄位）
- [ ] 監控錯誤日誌
- [ ] 驗證功能正常

### 清理階段（未來）
- [ ] 移除所有 deprecated 標記
- [ ] 建立 migration 移除 role 欄位
- [ ] 更新文檔

## 風險評估

### 低風險 ✅
- 更新 DTO 類型定義
- 更新測試檔案
- 前端頁面更新

### 中風險 ⚠️
- Auth provider 更新（需全面測試）
- API 端點回應格式（確保向後兼容）

### 高風險 ❌
- 移除資料庫 role 欄位（需謹慎規劃）
- 修改已部署的服務（建議分階段部署）

## 建議

1. **短期（1-2 週）**：完成 Phase 1 和 Phase 2，清理 DTO 和前端代碼
2. **中期（1 個月）**：完成 Phase 3，更新所有測試
3. **長期（3-6 個月後）**：考慮 Phase 4，移除資料庫舊欄位

## 參考文件

- [TypeORM Enum Column](https://typeorm.io/entities#enum-column-type)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [Zod Schema](https://zod.dev/)
