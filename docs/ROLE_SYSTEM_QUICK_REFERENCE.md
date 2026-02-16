# 角色系統快速參考

## 📚 文檔導航

**根據你的角色，選擇適合的文檔**：

| 角色 | 推薦文檔 | 說明 |
|------|---------|------|
| 👨‍💻 **開發者**（日常開發）| [本文檔] | 快速查閱 enum、使用範例、最佳實踐 |
| 📊 **PM/TL**（項目管理）| [COMPLETION_REPORT](./ROLE_SYSTEM_COMPLETION_REPORT.md) | 項目成果、Phase 狀態、效益分析 |
| 🏗️ **架構師**（技術規劃）| [REFACTORING](./ROLE_SYSTEM_REFACTORING.md) | 架構設計、風險評估、遷移計畫 |

**文檔結構**：
- 本文檔（Quick Reference）→ 日常開發手冊
- Completion Report → 項目完成總結
- Refactoring → 架構設計方案

---


專案現在使用兩個獨立的 enum 來管理角色：

1. **`UserType`** - 業務角色（Sugar Baby / Sugar Daddy）
2. **`PermissionRole`** - 權限角色（Subscriber / Creator / Admin）

---

## 🎯 核心定義

### 位置
`libs/common/src/types/roles.types.ts`

### UserType（業務角色）
```typescript
export enum UserType {
  SUGAR_BABY = 'sugar_baby',
  SUGAR_DADDY = 'sugar_daddy',
}
```

### PermissionRole（權限角色）
```typescript
export enum PermissionRole {
  SUBSCRIBER = 'subscriber',  // 一般訂閱者
  CREATOR = 'creator',        // 內容創作者
  ADMIN = 'admin',            // 系統管理員
}
```

---

## 🔧 使用方式

### 1. 後端 - DTO 驗證

```typescript
import { IsEnum } from 'class-validator';
import { UserType, PermissionRole } from '@suggar-daddy/common';

export class RegisterDto {
  @IsEnum(UserType)
  userType: UserType;
  
  // 其他欄位...
}

export class UpdateRoleDto {
  @IsEnum(PermissionRole)
  permissionRole: PermissionRole;
}
```

### 2. 後端 - Entity

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

### 3. 後端 - Guard 權限檢查

```typescript
import { PermissionRole } from '@suggar-daddy/common';

@Roles(PermissionRole.ADMIN, PermissionRole.CREATOR)
@UseGuards(RolesGuard)
async adminOnlyEndpoint() {
  // 只有 Admin 和 Creator 可以訪問
}
```

### 4. 後端 - Service 邏輯

```typescript
import { UserType, PermissionRole } from '@suggar-daddy/common';

class PostService {
  async createPost(userId: string, data: CreatePostDto) {
    const user = await this.userRepo.findOne(userId);
    
    // 業務邏輯判斷
    if (user.userType === UserType.SUGAR_BABY) {
      // Sugar Baby 可以建立付費內容
    }
    
    // 權限檢查
    if (user.permissionRole === PermissionRole.CREATOR) {
      // Creator 有額外功能
    }
  }
}
```

### 5. 前端 - Zod 驗證

```typescript
import { z } from 'zod';
import { UserType } from '@suggar-daddy/common';

const registerSchema = z.object({
  userType: z.nativeEnum(UserType, {
    errorMap: () => ({ message: '請選擇你的身份' }),
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;
```

### 6. 前端 - 條件渲染

```typescript
import { UserType, PermissionRole } from '@suggar-daddy/common';

function ProfilePage() {
  const { user } = useAuth();
  
  return (
    <div>
      {/* 業務邏輯顯示 */}
      {user.userType === UserType.SUGAR_BABY && (
        <CreatorTools />
      )}
      
      {/* 權限控制 */}
      {user.permissionRole === PermissionRole.ADMIN && (
        <AdminPanel />
      )}
    </div>
  );
}
```

### 7. 前端 - API 類型

```typescript
import { UserType, PermissionRole } from '@suggar-daddy/common';

interface UserProfile {
  id: string;
  userType: UserType;
  permissionRole: PermissionRole;
  // ...
}

// API 呼叫
const registerUser = async (data: {
  userType: UserType;
  // ...
}) => {
  return await authApi.register(data);
};
```

---

## 📝 常見場景

### 場景 1: 新使用者註冊

```typescript
// 前端
const data = {
  email: 'user@example.com',
  password: 'password123',
  userType: UserType.SUGAR_DADDY,  // 使用者選擇
  displayName: 'John',
};

// 後端自動設定
user.permissionRole = PermissionRole.SUBSCRIBER;  // 預設值
```

### 場景 2: 升級為 Creator

```typescript
// Service
async upgradeToCreator(userId: string) {
  await this.userRepo.update(userId, {
    permissionRole: PermissionRole.CREATOR,
  });
  // userType 保持不變
}
```

### 場景 3: 權限檢查

```typescript
// 業務角色檢查
const isSugarBaby = user.userType === UserType.SUGAR_BABY;
const isSugarDaddy = user.userType === UserType.SUGAR_DADDY;

// 權限角色檢查
const isCreator = user.permissionRole === PermissionRole.CREATOR;
const isAdmin = user.permissionRole === PermissionRole.ADMIN;
const canCreatePaidContent = isCreator || isAdmin;
```

### 場景 4: 篩選和查詢

```typescript
// 找出所有 Sugar Baby Creator
const creators = await this.userRepo.find({
  where: {
    userType: UserType.SUGAR_BABY,
    permissionRole: PermissionRole.CREATOR,
  },
});
```

---

## ✅ 最佳實踐

### DO ✅

```typescript
// ✅ 使用 enum 常數
if (user.userType === UserType.SUGAR_BABY) { }

// ✅ 導入統一的定義
import { UserType, PermissionRole } from '@suggar-daddy/common';

// ✅ 使用明確的欄位名稱
const { userType, permissionRole } = user;

// ✅ TypeScript 自動完成
const types: UserType[] = [UserType.SUGAR_BABY, UserType.SUGAR_DADDY];
```

### DON'T ❌

```typescript
// ❌ 避免硬編碼字串
if (user.role === 'sugar_baby') { }

// ❌ 避免使用舊的 role 欄位
const role = user.role;

// ❌ 避免混淆業務角色和權限角色
if (user.userType === 'admin') { }  // 錯誤！admin 是 PermissionRole
```

---

## 🔄 遷移指南

### 舊代碼模式 → 新代碼模式

#### 模式 1: 型別定義
```typescript
// ❌ 舊
role: 'sugar_baby' | 'sugar_daddy'

// ✅ 新
userType: UserType
```

#### 模式 2: 驗證
```typescript
// ❌ 舊
@IsIn(['sugar_baby', 'sugar_daddy'])
role: string;

// ✅ 新
@IsEnum(UserType)
userType: UserType;
```

#### 模式 3: 前端 Schema
```typescript
// ❌ 舊
role: z.enum(['sugar_baby', 'sugar_daddy'])

// ✅ 新
userType: z.nativeEnum(UserType)
```

#### 模式 4: 條件判斷
```typescript
// ❌ 舊
if (user.role === 'sugar_baby') { }

// ✅ 新
if (user.userType === UserType.SUGAR_BABY) { }
```

---

## 🛠️ 工具和命令

### 驗證角色系統
```bash
./scripts/verify-role-system.sh
```

### TypeScript 編譯檢查
```bash
npx tsc --noEmit -p libs/dto/tsconfig.json
```

### 搜尋遺留的硬編碼
```bash
grep -r "role.*=.*'sugar_" libs/ apps/ --include="*.ts" --include="*.tsx"
```

---

## 📊 資料庫 Schema

### users 表

| 欄位 | 類型 | 說明 | 預設值 |
|------|------|------|--------|
| userType | varchar(50) | 業務角色 | 必填 |
| permissionRole | varchar(50) | 權限角色 | 'subscriber' |
| role | varchar(50) | 舊欄位 (deprecated) | 'subscriber' |

### 索引
```sql
CREATE INDEX idx_users_user_type ON users(userType);
CREATE INDEX idx_users_permission_role ON users(permissionRole);
```

---

## 🐛 疑難排解

### 問題 1: TypeScript 錯誤 "Type 'string' is not assignable to type 'UserType'"

**原因：** 使用了字串而非 enum

**解決：**
```typescript
// ❌ 錯誤
const type: UserType = 'sugar_baby';

// ✅ 正確
const type: UserType = UserType.SUGAR_BABY;
```

### 問題 2: 驗證失敗 "userType must be either sugar_baby or sugar_daddy"

**原因：** 前端發送的欄位名稱錯誤

**解決：**
```typescript
// ❌ 錯誤
{ role: UserType.SUGAR_BABY }

// ✅ 正確
{ userType: UserType.SUGAR_BABY }
```

### 問題 3: Entity 找不到 UserType

**原因：** 未導入

**解決：**
```typescript
import { UserType, PermissionRole } from '@suggar-daddy/common';
```

---

## 📚 相關文件

- [角色系統重構方案](./ROLE_SYSTEM_REFACTORING.md)
- [實作總結](./ROLE_SYSTEM_COMPLETION_REPORT.md#-完整的變更記錄)
- [TypeORM Enum 文檔](https://typeorm.io/entities#enum-column-type)
- [Zod 文檔](https://zod.dev/)

---

## 🤝 支援

如有問題，請參考：
1. 驗證腳本輸出
2. TypeScript 編譯錯誤訊息
3. 相關文件

或聯繫開發團隊。
