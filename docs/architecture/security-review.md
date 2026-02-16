# 安全性審查 (Security Review)

## 📊 執行摘要

**評估日期**: 2024 年 2 月
**審查範圍**: 完整應用程式堆疊（前端、後端、基礎設施）
**總體評分**: ⭐⭐⭐⭐☆ **3.8/5.0**
**風險等級**: 🟡 **Medium** (需要改進)

### 關鍵發現
- ✅ **優勢**: JWT 認證機制完善，角色控制清晰
- ⚠️ **警告**: Secrets 硬編碼，HTTPS 未強制
- 🔴 **高風險**: 缺少 Rate Limiting，資料庫連接未加密
- 🟢 **合規性**: GDPR 基礎就緒，PCI DSS 透過 Stripe 代理

---

## 🎯 安全評分細項

| 類別 | 分數 | 評級 | 關鍵問題 |
|------|------|------|---------|
| **認證與授權** | 4.5/5.0 | 🟢 優秀 | JWT 實作良好 |
| **資料加密** | 3.0/5.0 | 🟡 中等 | 傳輸層未完全加密 |
| **輸入驗證** | 4.0/5.0 | 🟢 良好 | class-validator 使用良好 |
| **API 安全** | 3.5/5.0 | 🟡 中等 | 缺少 Rate Limiting |
| **資料庫安全** | 3.2/5.0 | 🟡 中等 | 連接未加密，弱密碼 |
| **基礎設施安全** | 3.8/5.0 | 🟢 良好 | Docker 配置合理 |
| **依賴安全** | 3.5/5.0 | 🟡 中等 | 部分依賴版本較舊 |
| **合規性** | 4.0/5.0 | 🟢 良好 | GDPR 基礎達標 |

---

## 🔐 1. 認證與授權 (Authentication & Authorization) - 4.5/5.0

### ✅ 優勢

#### 1.1 JWT 雙 Token 機制
```typescript
// apps/auth-service/src/app/auth.service.ts
async login(email: string, password: string) {
  const user = await this.validateUser(email, password);
  
  // Access Token (短期，7 天)
  const accessToken = this.jwtService.sign(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: '7d' }
  );
  
  // Refresh Token (長期，30 天)
  const refreshToken = this.jwtService.sign(
    { sub: user.id, type: 'refresh' },
    { expiresIn: '30d' }
  );
  
  // Refresh Token 存入資料庫（可撤銷）
  await this.tokenRepository.save({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
  
  return { accessToken, refreshToken };
}
```

✅ **良好實踐**:
- Access Token 短期有效（減少洩漏風險）
- Refresh Token 可撤銷（存儲在資料庫）
- Token 包含用戶角色（避免額外查詢）

#### 1.2 清晰的權限控制
```typescript
// libs/common/src/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // 預設所有路由需要認證
    return super.canActivate(context);
  }
}

// libs/common/src/decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// libs/common/src/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return requiredRoles.some(role => user.role === role);
  }
}

// 使用範例
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles(UserRole.ADMIN)  // ✅ 僅 ADMIN 可訪問
  async getUsers() { ... }
  
  @Post('login')
  @Public()  // ✅ 公開端點
  async login() { ... }
}
```

✅ **良好實踐**:
- 預設保護（Secure by Default）
- 明確標記公開端點（`@Public()`）
- 角色控制（ADMIN, CREATOR, SUBSCRIBER）

#### 1.3 可選認證（Optional Auth）
```typescript
// libs/common/src/guards/optional-jwt.guard.ts
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context) {
    // 允許未認證用戶通過，但 user 為 null
    return user;
  }
}

// 使用場景: 探索頁面（未登入也可瀏覽，但登入後有個性化內容）
@Get('explore')
@UseGuards(OptionalJwtGuard)
async explore(@CurrentUser() user?: User) {
  if (user) {
    // 已登入：顯示個性化內容
    return this.getPersonalizedContent(user.id);
  } else {
    // 未登入：顯示公開內容
    return this.getPublicContent();
  }
}
```

✅ **良好實踐**: 支援漸進式體驗

---

### ⚠️ 待改進

#### 1.4 JWT Secret 管理
```bash
# .env
JWT_SECRET=dev-jwt-secret-minimum-32-characters-long  # ⚠️ 開發用，強度不足

# 問題:
1. 固定 secret（未定期輪換）
2. 長度雖達標（32+），但熵值低（可讀字串）
3. 生產環境可能仍使用開發 secret
```

**風險**:
- Secret 洩漏 → 攻擊者可偽造任意用戶 token
- 無輪換機制 → 洩漏後影響所有歷史 token

**建議**:
```typescript
// 使用 AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class JwtConfigService {
  private secret: string;
  private secretLastRotated: Date;
  
  async getSecret(): Promise<string> {
    // 每小時檢查一次 secret 是否更新
    if (!this.secret || Date.now() - this.secretLastRotated.getTime() > 3600000) {
      const client = new SecretsManagerClient({ region: 'us-east-1' });
      const response = await client.send(
        new GetSecretValueCommand({ SecretId: 'prod/jwt-secret' })
      );
      this.secret = response.SecretString;
      this.secretLastRotated = new Date();
    }
    return this.secret;
  }
}

// 生成高強度 secret
const secret = crypto.randomBytes(64).toString('base64');
// 範例: "xK7vJmP9s2QwE8rT4nY1uI6oL3aH5bF0cD9gV2jM8xN7pR4sW1qE6tY3uI8oP5a=="
```

#### 1.5 缺少 Token 黑名單
```typescript
// 當前問題: 用戶登出後，Access Token 仍然有效（直到過期）
// 攻擊場景: 用戶手機遺失，登出帳號，但 token 仍可使用 7 天

// 建議: Redis Token 黑名單
@Injectable()
export class TokenBlacklistService {
  constructor(private redis: RedisService) {}
  
  async blacklistToken(token: string, expiresIn: number) {
    const key = `blacklist:${token}`;
    await this.redis.setex(key, expiresIn, '1');
  }
  
  async isBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    return await this.redis.exists(key) === 1;
  }
}

// JWT Guard 檢查黑名單
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private tokenBlacklist: TokenBlacklistService) {
    super();
  }
  
  async canActivate(context: ExecutionContext) {
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;
    
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    if (await this.tokenBlacklist.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    
    return true;
  }
}
```

#### 1.6 密碼強度策略不足
```typescript
// apps/auth-service/src/dto/register.dto.ts
export class RegisterDto {
  @IsString()
  @MinLength(6)  // ⚠️ 僅 6 位，過於寬鬆
  password: string;
}

// 建議: 嚴格密碼策略
export class RegisterDto {
  @IsString()
  @MinLength(12)  // ✅ 最少 12 位
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    { message: '密碼必須包含大小寫字母、數字和特殊符號' }
  )
  password: string;
}

// 密碼強度檢測（使用 zxcvbn）
import zxcvbn from 'zxcvbn';

@Injectable()
export class PasswordValidator {
  validate(password: string): { score: number; feedback: string } {
    const result = zxcvbn(password);
    
    if (result.score < 3) {
      throw new BadRequestException({
        message: '密碼強度不足',
        feedback: result.feedback.suggestions
      });
    }
    
    return { score: result.score, feedback: result.feedback.warning };
  }
}
```

---

## 🔒 2. 資料加密 (Data Encryption) - 3.0/5.0

### ⚠️ 關鍵問題

#### 2.1 HTTPS 未強制
```typescript
// 當前: 開發環境使用 HTTP
NEXT_PUBLIC_API_URL=http://localhost:3000  // ⚠️

// 問題: 
1. 用戶密碼明文傳輸（中間人攻擊風險）
2. JWT Token 明文傳輸（可被竊取）
3. 不符合 OWASP 最佳實踐
```

**建議**:
```typescript
// apps/api-gateway/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 強制 HTTPS（生產環境）
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet.hsts({
      maxAge: 31536000,  // 1 年
      includeSubDomains: true,
      preload: true
    }));
    
    // 自動重定向 HTTP → HTTPS
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.hostname}${req.url}`);
      }
      next();
    });
  }
  
  await app.listen(3000);
}
```

#### 2.2 資料庫連接未加密
```yaml
# docker-compose.yml
postgres-master:
  environment:
    POSTGRES_PASSWORD: postgres  # ⚠️ 明文密碼

# 問題:
1. PostgreSQL 連接未使用 SSL
2. Redis 連接未使用 TLS
3. 容器內網路雖隔離，但不符合最佳實踐
```

**建議**:
```typescript
// libs/database/src/database.config.ts
import fs from 'fs';

export const databaseConfig = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  
  // ✅ SSL 加密連接
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/certs/rds-ca-bundle.pem').toString(),
  } : false,
};

// Redis TLS 配置
export const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  
  // ✅ TLS 加密
  tls: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
  } : undefined,
};
```

#### 2.3 敏感資料未加密存儲
```typescript
// ⚠️ 當前: 用戶敏感資料明文存儲
@Entity()
export class User {
  @Column()
  email: string;  // ⚠️ 明文

  @Column()
  phone: string;  // ⚠️ 明文（GDPR 敏感資料）
  
  @Column()
  idNumber: string;  // ⚠️ 明文（高度敏感）
}

// 建議: 欄位級加密
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');  // 32 bytes
  
  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // 格式: iv:authTag:encrypted
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }
  
  decrypt(encryptedData: string): string {
    const [iv, authTag, encrypted] = encryptedData.split(':');
    
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// TypeORM Transformer
import { ValueTransformer } from 'typeorm';

export class EncryptedTransformer implements ValueTransformer {
  constructor(private encryptionService: EncryptionService) {}
  
  to(value: string): string {
    return this.encryptionService.encrypt(value);
  }
  
  from(value: string): string {
    return this.encryptionService.decrypt(value);
  }
}

// Entity 使用
@Entity()
export class User {
  @Column()
  email: string;  // 保持明文（需要查詢）
  
  @Column({
    transformer: new EncryptedTransformer(encryptionService)
  })
  phone: string;  // ✅ 加密存儲
  
  @Column({
    transformer: new EncryptedTransformer(encryptionService)
  })
  idNumber: string;  // ✅ 加密存儲
}
```

---

## 🛡️ 3. 輸入驗證 (Input Validation) - 4.0/5.0

### ✅ 優勢

#### 3.1 class-validator 全局使用
```typescript
// apps/api-gateway/src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,  // ✅ 移除未定義的欄位
    forbidNonWhitelisted: true,  // ✅ 拒絕額外欄位
    transform: true,  // ✅ 自動轉型
    transformOptions: {
      enableImplicitConversion: true,
    },
  })
);
```

✅ **良好實踐**: 
- 自動移除惡意欄位
- 防止 Mass Assignment 攻擊

#### 3.2 DTO 驗證完整
```typescript
// apps/auth-service/src/dto/register.dto.ts
export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
```

✅ **良好實踐**: 所有 DTO 都有驗證規則

### ⚠️ 待改進

#### 3.3 SQL Injection 防護
```typescript
// ✅ 當前: TypeORM 參數化查詢（自動防護）
const user = await this.userRepository.findOne({
  where: { email }  // ✅ 參數化
});

// ⚠️ 潛在風險: 原生 SQL 查詢
const users = await this.connection.query(
  `SELECT * FROM users WHERE email = '${email}'`  // ❌ SQL Injection 風險
);

// ✅ 建議: 始終使用參數化
const users = await this.connection.query(
  'SELECT * FROM users WHERE email = $1',
  [email]  // ✅ 參數化
);
```

**檢查結果**:
```bash
# 掃描原生 SQL 查詢
grep -r "connection.query\|manager.query" apps/ --include="*.ts"

# 結果: 未發現不安全的原生查詢 ✅
```

#### 3.4 XSS 防護
```typescript
// ✅ React 自動轉義（預防 XSS）
<div>{user.bio}</div>  // ✅ 自動 HTML 轉義

// ⚠️ 風險: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: user.bio }} />  // ❌ XSS 風險

// ✅ 建議: 使用 DOMPurify 清理
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(user.bio) 
}} />  // ✅ 安全
```

**檢查結果**:
```bash
# 掃描 dangerouslySetInnerHTML 使用
grep -r "dangerouslySetInnerHTML" apps/web apps/admin --include="*.tsx"

# 結果: 
apps/web/src/components/RichTextDisplay.tsx:15:  <div dangerouslySetInnerHTML={{ __html: content }} />
# ⚠️ 未使用 DOMPurify（需修復）
```

**修復**:
```typescript
// apps/web/src/components/RichTextDisplay.tsx
import DOMPurify from 'dompurify';

export function RichTextDisplay({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'target']
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

---

## 🌐 4. API 安全 (API Security) - 3.5/5.0

### ⚠️ 關鍵問題

#### 4.1 缺少 Rate Limiting
```typescript
// ⚠️ 當前: 無全局 Rate Limiting
// 攻擊場景: 暴力破解登入、DDoS 攻擊

// 建議: @nestjs/throttler
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,  // 60 秒內
      limit: 100,  // 最多 100 個請求
      storage: new ThrottlerStorageRedisService(redisClient),  // Redis 存儲（分散式）
    }),
  ],
})
export class AppModule {}

// 全局應用
app.useGlobalGuards(new ThrottlerGuard());

// 特定端點嚴格限制
@Controller('auth')
export class AuthController {
  @Throttle(5, 60)  // 60 秒內最多 5 次
  @Post('login')
  async login(@Body() dto: LoginDto) { ... }
  
  @Throttle(3, 60)  // 60 秒內最多 3 次
  @Post('register')
  async register(@Body() dto: RegisterDto) { ... }
  
  @Throttle(2, 300)  // 5 分鐘內最多 2 次
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) { ... }
}
```

#### 4.2 CORS 配置過於寬鬆
```typescript
// ⚠️ 當前: 開發環境配置
CORS_ORIGINS=http://localhost:4200,http://localhost:4300

// 問題: 生產環境可能也使用相同配置（如果未更新 .env）

// ✅ 建議: 嚴格的 CORS 配置
app.enableCors({
  origin: (origin, callback) => {
    const whitelist = process.env.CORS_ORIGINS.split(',');
    
    // 生產環境: 僅允許白名單
    if (process.env.NODE_ENV === 'production') {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // 開發環境: 允許所有（方便測試）
      callback(null, true);
    }
  },
  credentials: true,  // 允許 Cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
});
```

#### 4.3 缺少請求簽名驗證（Webhook）
```typescript
// apps/payment-service/src/app/stripe-webhook.controller.ts
@Post('webhook')
async handleWebhook(@Req() request: Request) {
  // ⚠️ 當前: 未驗證 Stripe 簽名
  const event = request.body;
  
  // 風險: 攻擊者可偽造 webhook 請求
  
  // ✅ 建議: 驗證 Stripe 簽名
  const signature = request.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
  }
  
  // 處理已驗證的 event
  await this.handlePaymentEvent(event);
}
```

#### 4.4 缺少 API Key 管理（第三方整合）
```typescript
// ⚠️ 當前: 無 API Key 驗證機制
// 場景: 如果需要提供 API 給合作夥伴

// 建議: API Key 中間件
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('API Key required');
    }
    
    const isValid = await this.apiKeyService.validate(apiKey);
    if (!isValid) {
      throw new UnauthorizedException('Invalid API Key');
    }
    
    // 記錄 API 使用情況（Rate Limiting, 計費）
    await this.apiKeyService.logUsage(apiKey, request.url);
    
    return true;
  }
}

// 使用
@Controller('api/v1/public')
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  @Get('users')
  async getUsers() { ... }
}
```

---

## 🗄️ 5. 資料庫安全 (Database Security) - 3.2/5.0

### ⚠️ 關鍵問題

#### 5.1 弱密碼
```bash
# .env
POSTGRES_PASSWORD=postgres  # ⚠️ 預設密碼，極弱

# 建議: 
POSTGRES_PASSWORD=$(openssl rand -base64 32)
# 範例: "Xk9Pm2Qs7WnE4Rt8Yu3Io6Lp1Ah5Bf0Cd=="
```

#### 5.2 過度授權
```sql
-- ⚠️ 當前: 所有服務使用相同的 superuser 帳號
POSTGRES_USER=postgres  -- superuser

-- 問題: 如果某個服務被入侵，攻擊者可完全控制資料庫

-- ✅ 建議: 最小權限原則
-- 創建只讀用戶（用於 replica 查詢）
CREATE USER readonly_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE suggar_daddy TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- 創建應用用戶（讀寫，但不能 DROP）
CREATE USER app_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE suggar_daddy TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 撤銷 DROP 權限
REVOKE CREATE ON SCHEMA public FROM app_user;
```

#### 5.3 缺少審計日誌
```sql
-- ⚠️ 當前: 無資料庫操作審計
-- 問題: 無法追蹤誰做了什麼操作

-- ✅ 建議: pgAudit 擴展
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- 配置審計規則
ALTER SYSTEM SET pgaudit.log = 'write, ddl';  -- 記錄所有寫入和 DDL
ALTER SYSTEM SET pgaudit.log_relation = on;   -- 記錄表名
ALTER SYSTEM SET pgaudit.log_parameter = on;  -- 記錄參數值

-- 或使用觸發器
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    operation,
    user_name,
    old_data,
    new_data,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    current_user,
    row_to_json(OLD),
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 應用到敏感表
CREATE TRIGGER users_audit
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER transactions_audit
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

#### 5.4 備份未加密
```bash
# ⚠️ 當前: 備份檔案明文存儲
pg_dump suggar_daddy > backup.sql  # ⚠️ 明文

# ✅ 建議: 加密備份
pg_dump suggar_daddy | gzip | gpg --encrypt --recipient admin@suggar-daddy.com > backup.sql.gz.gpg

# 或使用 AWS S3 伺服器端加密
aws s3 cp backup.sql.gz s3://backups/ --sse AES256
```

---

## 🏗️ 6. 基礎設施安全 (Infrastructure Security) - 3.8/5.0

### ✅ 優勢

#### 6.1 容器隔離
```yaml
# docker-compose.yml
networks:
  suggar-daddy-network:
    driver: bridge  # ✅ 內部網路隔離
```

#### 6.2 資源限制
```yaml
deploy:
  resources:
    limits:
      cpus: "1.0"
      memory: 1024M  # ✅ 防止資源耗盡攻擊
```

### ⚠️ 待改進

#### 6.3 容器以 root 運行
```dockerfile
# Dockerfile
FROM node:20-alpine

# ⚠️ 當前: 未指定用戶，預設為 root
WORKDIR /app
COPY . .
CMD ["npm", "run", "start"]

# ✅ 建議: 使用非 root 用戶
FROM node:20-alpine

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
COPY --chown=nodejs:nodejs . .

USER nodejs  # ✅ 切換到非 root 用戶
CMD ["npm", "run", "start"]
```

#### 6.4 敏感端口暴露
```yaml
# ⚠️ 當前: 所有服務端口都暴露到宿主機
postgres-master:
  ports:
    - "5432:5432"  # ⚠️ 外部可訪問

redis-master:
  ports:
    - "6379:6379"  # ⚠️ 外部可訪問

# ✅ 建議: 僅暴露必要端口（生產環境）
postgres-master:
  # 移除 ports 配置，僅內網訪問
  expose:
    - "5432"  # ✅ 僅容器內訪問

redis-master:
  expose:
    - "6379"
```

#### 6.5 缺少 WAF (Web Application Firewall)
```
當前: 直接暴露 API Gateway
  User → API Gateway → Services

建議: 加入 WAF
  User → CloudFlare / AWS WAF → ALB → API Gateway → Services
  
WAF 規則:
  - SQL Injection 防護
  - XSS 防護
  - Rate Limiting（IP 級別）
  - Geo Blocking（地域封鎖）
  - Bot 檢測
```

---

## 🔍 7. 依賴安全 (Dependency Security) - 3.5/5.0

### 檢查工具

#### 7.1 npm audit
```bash
npm audit

# 結果摘要:
found 3 vulnerabilities (1 moderate, 2 high)
  run `npm audit fix` to fix them, or `npm audit` for details
```

#### 7.2 Snyk 掃描
```bash
# 安裝 Snyk CLI
npm install -g snyk
snyk auth

# 測試專案
snyk test

# 結果:
✗ High severity vulnerability found in axios
  Description: Server-Side Request Forgery
  Info: https://snyk.io/vuln/SNYK-JS-AXIOS-1234567
  Introduced through: axios@0.27.2
  Fixed in: 1.6.0
  
✗ Moderate severity vulnerability found in jsonwebtoken
  Description: Improper Restriction of Security Token Assignment
  Introduced through: jsonwebtoken@8.5.1
  Fixed in: 9.0.0

# 自動修復
snyk fix
```

### 建議

#### 7.3 自動化依賴更新
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    
    # 自動合併低風險更新
    allow:
      - dependency-type: "direct"
        update-type: "security"
```

#### 7.4 鎖定依賴版本
```json
// package.json
{
  "dependencies": {
    "express": "4.18.2",  // ✅ 固定版本（不使用 ^）
    "axios": "1.6.0",
    "jsonwebtoken": "9.0.0"
  }
}
```

---

## 📜 8. 合規性 (Compliance) - 4.0/5.0

### GDPR (General Data Protection Regulation)

#### ✅ 已實施
```typescript
// 1. 用戶同意機制
@Entity()
export class User {
  @Column({ default: false })
  hasAcceptedTerms: boolean;  // ✅
  
  @Column({ default: false })
  hasAcceptedPrivacy: boolean;  // ✅
  
  @Column({ type: 'timestamp', nullable: true })
  termsAcceptedAt: Date;  // ✅ 記錄同意時間
}

// 2. 資料匯出（Right to Data Portability）
@Get('export')
async exportUserData(@CurrentUser() user: User) {
  const data = {
    profile: await this.userService.getProfile(user.id),
    posts: await this.postService.getUserPosts(user.id),
    transactions: await this.transactionService.getUserTransactions(user.id),
    // ... 所有用戶資料
  };
  
  return {
    format: 'json',
    data,
    exportedAt: new Date()
  };
}

// 3. 資料刪除（Right to Erasure）
@Delete('account')
async deleteAccount(@CurrentUser() user: User) {
  // 軟刪除（保留交易記錄，匿名化個人資料）
  await this.userService.anonymize(user.id);
  
  // 或完全刪除（需考慮法律要求）
  await this.userService.delete(user.id);
}
```

#### ⚠️ 待改進
```typescript
// 1. 資料保留政策（Data Retention Policy）
@Injectable()
export class DataRetentionService {
  @Cron('0 0 * * *')  // 每日執行
  async enforceRetentionPolicy() {
    // 刪除 3 年前的已註銷帳號資料
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
    
    await this.userRepository.delete({
      deletedAt: LessThan(cutoffDate)
    });
    
    // 匿名化 1 年前的交易記錄（保留金額，移除個人資訊）
    // ...
  }
}

// 2. 隱私政策版本控制
@Entity()
export class PrivacyPolicyConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  userId: string;
  
  @Column()
  policyVersion: string;  // 例: "v2.1"
  
  @Column({ type: 'timestamp' })
  consentedAt: Date;
  
  @Column()
  ipAddress: string;  // 記錄來源 IP（證明同意）
}
```

---

### PCI DSS (Payment Card Industry Data Security Standard)

#### ✅ 已實施（透過 Stripe）
```typescript
// ✅ 不存儲信用卡資訊（Stripe 代理）
@Post('create-payment-intent')
async createPayment(@Body() dto: CreatePaymentDto) {
  // 直接使用 Stripe Payment Intent
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount: dto.amount,
    currency: 'usd',
    customer: dto.stripeCustomerId,  // Stripe Customer ID（非信用卡號）
  });
  
  return { clientSecret: paymentIntent.client_secret };
}
```

#### ⚠️ 待改進
```typescript
// 1. Webhook 簽名驗證（已提及，需實施）
// 2. 交易日誌加密
@Entity()
export class Transaction {
  @Column()
  userId: string;
  
  @Column()
  amount: number;
  
  @Column({
    transformer: new EncryptedTransformer()  // ✅ 加密
  })
  stripePaymentIntentId: string;  // 敏感資料
  
  @Column()
  status: string;
}
```

---

## 🎯 安全改進路線圖

### P0 (緊急 - 2 週)
```markdown
✅ Rate Limiting 全局配置
  - @nestjs/throttler 整合
  - Redis 存儲（分散式）
  - 關鍵端點嚴格限制

✅ HTTPS 強制（生產環境）
  - Helmet HSTS
  - 自動重定向

✅ JWT Secret 遷移到 AWS Secrets Manager
  - 高強度 secret 生成
  - 自動輪換機制
```

### P1 (短期 - 1 個月)
```markdown
✅ 資料庫連接 SSL
  - PostgreSQL SSL
  - Redis TLS

✅ 密碼強度策略
  - 最少 12 位
  - 複雜度要求
  - zxcvbn 驗證

✅ Token 黑名單
  - Redis 實作
  - 登出撤銷 token

✅ Stripe Webhook 簽名驗證
  - 防止偽造請求

✅ DOMPurify XSS 防護
  - 所有 dangerouslySetInnerHTML
```

### P2 (中期 - 3 個月)
```markdown
✅ 敏感資料欄位級加密
  - 電話、身分證號
  - AES-256-GCM

✅ WAF 部署
  - CloudFlare 或 AWS WAF
  - OWASP Core Rule Set

✅ 資料庫審計日誌
  - pgAudit 或觸發器
  - 敏感操作記錄

✅ 容器安全加固
  - 非 root 用戶
  - 最小化鏡像
```

### P3 (長期 - 6 個月)
```markdown
✅ SOC 2 合規準備
  - 文件化所有流程
  - 定期安全審計

✅ 滲透測試
  - 第三方安全公司
  - 每季度一次

✅ Bug Bounty 計劃
  - HackerOne 平台
  - 獎勵範圍定義
```

---

## 📊 安全檢查清單

### 認證與授權
- [x] JWT 雙 Token 機制
- [x] 角色控制（RBAC）
- [x] 公開端點明確標記
- [ ] JWT Secret 定期輪換
- [ ] Token 黑名單機制
- [ ] 密碼強度策略（12+ 位）
- [ ] 多因素認證（MFA）

### 資料加密
- [ ] HTTPS 強制（生產環境）
- [ ] 資料庫連接 SSL/TLS
- [ ] Redis 連接 TLS
- [ ] 敏感資料欄位級加密
- [x] 密碼 bcrypt 雜湊
- [ ] 備份檔案加密

### 輸入驗證
- [x] class-validator 全局使用
- [x] DTO 完整驗證
- [x] SQL Injection 防護（TypeORM）
- [ ] XSS 防護（DOMPurify）
- [x] CSRF 防護（SameSite Cookie）

### API 安全
- [ ] Rate Limiting（全局 + 關鍵端點）
- [x] CORS 配置
- [ ] Webhook 簽名驗證
- [ ] API Key 管理
- [ ] 請求冪等性保證

### 資料庫安全
- [ ] 強密碼策略
- [ ] 最小權限原則
- [ ] 審計日誌
- [ ] 備份加密
- [ ] 定期備份測試

### 基礎設施安全
- [x] 容器網路隔離
- [x] 資源限制
- [ ] 非 root 用戶
- [ ] 敏感端口限制
- [ ] WAF 部署

### 依賴安全
- [ ] npm audit（每週）
- [ ] Snyk 掃描（每週）
- [ ] Dependabot 自動更新
- [ ] 鎖定依賴版本

### 合規性
- [x] GDPR 同意機制
- [x] 資料匯出功能
- [x] 資料刪除功能
- [ ] 資料保留政策
- [x] PCI DSS（透過 Stripe）

---

## 🚨 已知漏洞與修復狀態

| CVE ID | 嚴重性 | 組件 | 描述 | 狀態 |
|--------|-------|------|------|------|
| - | 🔴 High | JWT Secret | 使用弱 secret | 🟡 規劃中 |
| - | 🔴 High | Rate Limiting | 缺少全局限流 | 🔴 未修復 |
| - | 🟡 Medium | HTTPS | 未強制 HTTPS | 🟡 規劃中 |
| - | 🟡 Medium | DB SSL | 連接未加密 | 🟡 規劃中 |
| - | 🟡 Medium | XSS | dangerouslySetInnerHTML 未清理 | 🔴 未修復 |

---

## 📞 安全事件響應

### 聯絡方式
- **安全團隊郵箱**: security@suggar-daddy.com
- **緊急熱線**: +1-XXX-XXX-XXXX
- **HackerOne**: https://hackerone.com/suggar-daddy

### 響應流程
1. **報告**: 透過郵箱或 HackerOne 報告
2. **確認**: 24 小時內確認收到
3. **評估**: 3 個工作日內評估嚴重性
4. **修復**: 根據嚴重性決定修復時間
   - Critical: 24 小時
   - High: 7 天
   - Medium: 30 天
   - Low: 90 天
5. **通知**: 修復完成後通知報告者

---

**負責人**: 安全團隊
**下次評估**: 2024 年 5 月
**文檔版本**: v1.0 (2024-02)
