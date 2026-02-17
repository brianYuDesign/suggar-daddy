# 🎯 Sugar Daddy 開發最佳實踐

Sugar Daddy 項目的開發、測試和部署最佳實踐指南

---

## 📑 目錄

- [開發環境](#開發環境)
- [代碼品質](#代碼品質)
- [測試](#測試)
- [Git 工作流](#git-工作流)
- [API 開發](#api-開發)
- [資料庫](#資料庫)
- [性能優化](#性能優化)
- [安全性](#安全性)
- [腳本使用](#腳本使用)

---

## 🚀 開發環境

### ✅ 使用新腳本系統

```bash
# ✅ 好的做法 - 使用新腳本
npm run dev              # 啟動開發環境
npm run dev:stop         # 停止服務
npm run dev:reset        # 重置環境

# ❌ 避免 - 使用舊腳本
./scripts/legacy/dev-start.sh
```

**原因**: 新腳本更快、更可靠、更易用。

### ✅ 查看幫助信息

```bash
# ✅ 養成查看幫助的習慣
./scripts/dev/start.sh --help
npm run test:unit -- --help

# 了解所有可用選項
./scripts/test/e2e.sh --help
```

**原因**: 了解所有選項，充分利用工具功能。

### ✅ 只啟動需要的服務

```bash
# ✅ 開發前端時
./scripts/dev/start.sh --core-only

# ✅ 不需要前端時
./scripts/dev/start.sh --no-web

# ❌ 避免 - 總是啟動所有服務
npm run dev:all  # 除非真的需要
```

**原因**: 節省資源，加快啟動速度。

### ✅ 使用環境變數

```bash
# ✅ 好的做法 - 使用 .env
DATABASE_HOST=localhost
DATABASE_PORT=5432

# ❌ 避免 - 硬編碼
const DB_HOST = 'localhost';  // 不要這樣做
```

**原因**: 環境變數更靈活、更安全、更易配置。

### ✅ 定期清理環境

```bash
# 每週或遇到問題時
npm run dev:reset

# 清理 Docker
docker system prune

# 清理 node_modules
rm -rf node_modules && npm install
```

**原因**: 避免累積的問題和過期的依賴。

---

## 📝 代碼品質

### ✅ 遵循代碼風格

```bash
# 運行 linter
npm run lint

# 自動修復
npm run lint:fix

# 格式化代碼
npm run format
```

**原因**: 一致的代碼風格提高可讀性和可維護性。

### ✅ 使用 TypeScript

```typescript
// ✅ 好的做法 - 明確的類型
interface User {
  id: string;
  email: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ 避免 - 使用 any
function getUser(id: any): Promise<any> {
  // ...
}
```

**原因**: 類型安全減少 bug，提高代碼品質。

### ✅ 編寫有意義的註解

```typescript
// ✅ 好的註解 - 解釋為什麼
// 使用 SHA-256 而非 MD5，因為 MD5 已被證明不安全
const hash = crypto.createHash('sha256');

// ❌ 壞的註解 - 重述代碼
// 創建一個哈希
const hash = crypto.createHash('sha256');
```

**原因**: 好的註解解釋意圖和決策，而非重述代碼。

### ✅ 保持函數簡短

```typescript
// ✅ 好的做法 - 單一職責
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createUser(data: CreateUserDto): Promise<User> {
  if (!validateEmail(data.email)) {
    throw new BadRequestException('Invalid email');
  }
  return this.userRepository.save(data);
}

// ❌ 避免 - 函數過長，職責過多
function createUserWithEverything(data: any): any {
  // 100 行代碼...
}
```

**原因**: 短函數更易測試、理解和維護。

---

## 🧪 測試

### ✅ 編寫測試

```bash
# 總是運行測試
npm run test:unit

# 監聽模式開發
npm run test:unit -- --watch

# 檢查覆蓋率
npm run test:coverage
```

**原則**: 
- **必須**: 新功能必須有測試
- **目標**: 覆蓋率 > 80%
- **優先**: 關鍵路徑 100% 覆蓋

### ✅ 測試金字塔

```
      /\
     /  \     E2E 測試（少量，關鍵用戶流程）
    /____\
   /      \   整合測試（適量，服務間交互）
  /________\
 /          \ 單元測試（大量，所有業務邏輯）
/__________\
```

**比例建議**: 70% 單元測試，20% 整合測試，10% E2E 測試

### ✅ 測試命名

```typescript
// ✅ 好的測試名稱 - 清晰描述行為
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // ...
    });

    it('should throw BadRequestException when email is invalid', async () => {
      // ...
    });

    it('should throw ConflictException when email already exists', async () => {
      // ...
    });
  });
});

// ❌ 避免 - 模糊的測試名稱
it('test1', () => { /* ... */ });
it('works', () => { /* ... */ });
```

### ✅ 隔離測試

```typescript
// ✅ 好的做法 - 每個測試獨立
beforeEach(() => {
  jest.clearAllMocks();
  // 重置測試資料
});

// ❌ 避免 - 測試之間共享狀態
let sharedUser;  // 不要這樣做
```

**原因**: 測試應該獨立運行，不依賴執行順序。

### ✅ 使用合適的測試工具

```bash
# 單元測試 - Jest
npm run test:unit

# E2E 測試 - Playwright
npm run test:e2e

# 整合測試 - Jest + Supertest
npm run test:integration
```

---

## 🔀 Git 工作流

### ✅ 分支命名

```bash
# ✅ 好的分支名稱
feature/user-authentication
fix/payment-error
hotfix/security-vulnerability
refactor/database-connection

# ❌ 避免
my-branch
test
temp
```

**格式**: `<type>/<description>`

**類型**: feature, fix, hotfix, refactor, docs, test

### ✅ 提交訊息

```bash
# ✅ 好的提交訊息
git commit -m "feat: add user email verification"
git commit -m "fix: resolve payment timeout issue"
git commit -m "refactor: optimize database queries"

# ❌ 避免
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

**格式**: `<type>: <description>`

**類型**: feat, fix, refactor, docs, test, chore, style

### ✅ 提交前檢查

```bash
# 運行測試
npm run test:unit

# 檢查代碼風格
npm run lint

# 檢查類型
npm run type-check

# 或使用腳本（如果有）
npm run pre-commit
```

### ✅ Pull Request

**好的 PR**:
- 單一目的（一個 feature 或 fix）
- 有清晰的描述
- 包含測試
- 代碼審查通過
- CI/CD 通過

**PR 描述模板**:
```markdown
## 變更內容
- 添加用戶郵件驗證功能
- 修復支付超時問題

## 測試
- [ ] 單元測試通過
- [ ] E2E 測試通過
- [ ] 手動測試完成

## 截圖（如適用）
[添加截圖]

## 相關 Issue
Closes #123
```

---

## 🔌 API 開發

### ✅ RESTful API 設計

```typescript
// ✅ 好的 API 設計
GET    /users          # 獲取用戶列表
GET    /users/:id      # 獲取單個用戶
POST   /users          # 創建用戶
PUT    /users/:id      # 更新用戶
DELETE /users/:id      # 刪除用戶

// ❌ 避免
GET    /getUsers
POST   /createUser
POST   /updateUser/:id
```

### ✅ 使用 DTO

```typescript
// ✅ 好的做法 - 使用 DTO
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;
}

// ❌ 避免 - 直接使用 any
async createUser(@Body() body: any) {
  // ...
}
```

**原因**: DTO 提供驗證、文檔和類型安全。

### ✅ 統一錯誤處理

```typescript
// ✅ 好的做法 - 使用標準異常
throw new BadRequestException('Invalid email format');
throw new NotFoundException('User not found');
throw new UnauthorizedException('Invalid credentials');

// ❌ 避免 - 自定義錯誤格式
throw new Error('Something went wrong');
```

### ✅ API 文檔

```typescript
// ✅ 添加 Swagger 註解
@ApiTags('users')
@ApiOperation({ summary: 'Create a new user' })
@ApiResponse({ status: 201, description: 'User created successfully' })
@ApiResponse({ status: 400, description: 'Bad request' })
@Post()
createUser(@Body() dto: CreateUserDto) {
  // ...
}
```

**訪問**: http://localhost:3000/api/docs

---

## 💾 資料庫

### ✅ 使用遷移

```bash
# ✅ 好的做法 - 使用遷移
npm run db:migrate

# 預覽遷移
npm run db:migrate -- --dry-run

# ❌ 避免 - 手動修改資料庫
psql -c "ALTER TABLE users ADD COLUMN ..."  # 不要這樣做
```

**原因**: 遷移可追蹤、可回滾、可重現。

### ✅ 索引優化

```sql
-- ✅ 好的做法 - 為常用查詢添加索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- ❌ 避免 - 過度索引
-- 每個欄位都加索引會降低寫入性能
```

### ✅ 使用事務

```typescript
// ✅ 好的做法 - 使用事務
await this.dataSource.transaction(async (manager) => {
  const user = await manager.save(User, userData);
  await manager.save(Profile, { userId: user.id, ...profileData });
});

// ❌ 避免 - 不使用事務
const user = await this.userRepository.save(userData);
await this.profileRepository.save({ userId: user.id, ...profileData });
// 如果第二步失敗，第一步無法回滾
```

### ✅ 查詢優化

```typescript
// ✅ 好的做法 - 使用關聯載入
const users = await this.userRepository.find({
  relations: ['profile', 'posts'],
  where: { active: true }
});

// ❌ 避免 - N+1 查詢問題
const users = await this.userRepository.find();
for (const user of users) {
  user.profile = await this.profileRepository.findOne({ userId: user.id });
}
```

### ✅ 定期備份

```bash
# 每日備份
npm run db:backup

# 備份到指定位置
BACKUP_DIR=/path/to/backups npm run db:backup
```

---

## ⚡ 性能優化

### ✅ 使用快取

```typescript
// ✅ 好的做法 - 快取頻繁訪問的資料
@Cacheable('user', 3600)  // 快取 1 小時
async getUserById(id: string): Promise<User> {
  return this.userRepository.findOne(id);
}
```

### ✅ 分頁

```typescript
// ✅ 好的做法 - 使用分頁
@Get()
async getUsers(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20
) {
  return this.userService.findAll({ page, limit });
}

// ❌ 避免 - 返回所有資料
@Get()
async getUsers() {
  return this.userRepository.find();  // 可能返回數百萬筆
}
```

### ✅ 並行處理

```typescript
// ✅ 好的做法 - 並行執行獨立操作
const [users, posts, comments] = await Promise.all([
  this.userService.findAll(),
  this.postService.findAll(),
  this.commentService.findAll()
]);

// ❌ 避免 - 順序執行
const users = await this.userService.findAll();
const posts = await this.postService.findAll();
const comments = await this.commentService.findAll();
```

---

## 🔒 安全性

### ✅ 環境變數

```bash
# ✅ 好的做法 - 敏感資料使用環境變數
JWT_SECRET=your-secret-key
DATABASE_PASSWORD=your-password

# ❌ 避免 - 硬編碼
const JWT_SECRET = 'my-secret-123';  // 不要這樣做
```

### ✅ 輸入驗證

```typescript
// ✅ 好的做法 - 驗證所有輸入
@Post()
async createUser(@Body() dto: CreateUserDto) {
  // DTO 自動驗證
}

// ❌ 避免 - 不驗證輸入
@Post()
async createUser(@Body() data: any) {
  // 直接使用未驗證的資料
}
```

### ✅ SQL 注入防護

```typescript
// ✅ 好的做法 - 使用參數化查詢
const user = await this.userRepository.findOne({
  where: { email: userEmail }
});

// ❌ 避免 - 字串拼接
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;  // SQL 注入風險
```

### ✅ 密碼處理

```typescript
// ✅ 好的做法 - 哈希密碼
import * as bcrypt from 'bcrypt';

async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// ❌ 避免 - 明文儲存
user.password = password;  // 不要這樣做
```

---

## 📜 腳本使用

### ✅ 使用智能等待

```bash
# ✅ 腳本內使用健康檢查
wait_for_service "postgres" 60
wait_for_service "api-gateway" 60

# ❌ 避免 - 固定延遲
sleep 30  # 可能太短或太長
```

### ✅ 並行啟動

```bash
# ✅ 新腳本 - 並行啟動
npm run dev  # 自動並行

# ❌ 舊方式 - 順序啟動
for service in $SERVICES; do
  start_service $service
done
```

### ✅ 錯誤處理

```bash
# ✅ 好的做法 - 檢查錯誤
if ! npm run build; then
  echo "Build failed"
  exit 1
fi

# ❌ 避免 - 忽略錯誤
npm run build
# 繼續執行，即使失敗
```

### ✅ 使用日誌函數

```bash
# ✅ 使用統一的日誌函數
log_info "Starting services..."
log_success "Services started"
log_error "Failed to start service"

# ❌ 避免 - 直接 echo
echo "Starting..."  # 格式不一致
```

---

## 🎓 學習資源

### 推薦閱讀

1. **[Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)** - Robert C. Martin
2. **[NestJS 官方文檔](https://docs.nestjs.com/)**
3. **[TypeScript 手冊](https://www.typescriptlang.org/docs/)**
4. **[Docker 最佳實踐](https://docs.docker.com/develop/dev-best-practices/)**

### 內部文檔

- [快速開始](./QUICK_START.md)
- [腳本系統指南](../scripts/README.md)
- [API 文檔](./api/README.md)
- [測試指南](./testing/README.md)

---

## 📋 檢查清單

### 提交代碼前

- [ ] 代碼通過 lint 檢查
- [ ] 所有測試通過
- [ ] 添加了新功能的測試
- [ ] 更新了相關文檔
- [ ] 提交訊息符合規範
- [ ] 代碼審查通過

### 部署前

- [ ] 所有測試通過（unit + e2e + integration）
- [ ] 建置成功
- [ ] 資料庫遷移測試
- [ ] 環境變數配置正確
- [ ] 備份資料庫
- [ ] 回滾計劃準備

---

## 🎯 總結

**核心原則**:
1. **自動化** - 能自動化的就不手動
2. **測試驅動** - 測試先行，信心十足
3. **代碼品質** - 可讀性和可維護性優先
4. **安全第一** - 安全是設計的一部分
5. **持續改進** - 定期回顧和優化

**記住**:
> 寫代碼容易，寫好代碼難。寫出其他人能讀懂和維護的代碼是藝術。

---

**保持優秀！** 🚀

有問題？查看 [FAQ](./FAQ.md) 或聯繫團隊。
