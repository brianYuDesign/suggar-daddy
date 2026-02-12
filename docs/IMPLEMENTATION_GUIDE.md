# 環境變數管理實施指南

本指南介紹如何在 Suggar Daddy 應用中使用新的環境變數管理系統。

## 目錄

- [概述](#概述)
- [安裝與配置](#安裝與配置)
- [使用應用配置服務](#使用應用配置服務)
- [驗證環境變數](#驗證環境變數)
- [本地開發設定](#本地開發設定)
- [常見問題](#常見問題)

---

## 概述

環境變數管理系統包含三個主要部分：

1. **Joi 驗證架構** (`libs/common/src/config/env.validation.ts`)
   - 定義所有環境變數的類型和規則
   - 在應用啟動時進行驗證
   - 提供詳細的錯誤信息

2. **類型化配置服務** (`libs/common/src/config/app.config.ts`)
   - 提供強型別的環境變數訪問
   - IDE 自動完成支援
   - 保護一次性讀取的值

3. **配置模組** (`libs/common/src/config/env-config.module.ts`)
   - 全局模組，可在所有服務中使用
   - 在應用啟動時自動驗證所有環境變數
   - 提供 AppConfigService 作為依賴注入

## 安裝與配置

### 1. 安裝依賴

```bash
npm install
```

這將安裝 `joi` 包，用於環境變數驗證。

### 2. 設定環境變數

在應用根目錄或每個微服務目錄中創建 `.env` 檔案：

```bash
cp .env.example .env       # 複製示例到本地
# 或使用以下命令進行每個環境設定
cp .env.example .env.local       # 本地開發
cp .env.example .env.production  # 生產環境
```

### 3. 使用 EnvConfigModule

所有微服務的 `AppModule` 都應包含 `EnvConfigModule`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvConfigModule } from '@suggar-daddy/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EnvConfigModule, // 新增此模組
    // ... 其他導入
  ],
})
export class AppModule {}
```

## 使用應用配置服務

### 基本用法

在任何 NestJS 服務中注入 `AppConfigService`：

```typescript
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@suggar-daddy/common';

@Injectable()
export class MyService {
  constructor(private config: AppConfigService) {}

  async myMethod() {
    // 存取配置
    const port = this.config.port;
    const dbHost = this.config.dbHost;
    const isDev = this.config.isDevelopment;
    
    // 類型安全 - IDE 將提供自動完成
    // this.config.invalidProperty // ❌ 編譯時錯誤
  }
}
```

### 可用的配置屬性

```typescript
// Core Environment
config.nodeEnv           // 'development' | 'staging' | 'production'
config.isDevelopment     // boolean
config.isProduction      // boolean
config.isStaging         // boolean
config.logLevel          // string

// Server Configuration
config.port              // number
config.corsOrigins       // string[]

// Database Configuration
config.dbHost            // string
config.dbPort            // number
config.dbUsername        // string
config.dbPassword        // string
config.dbDatabase        // string
config.dbPoolMax         // number
config.dbPoolMin         // number

// Redis Configuration
config.redisHost         // string
config.redisPort         // number
config.redisPassword     // string | null
config.redisUrl          // string (預構建的)

// Kafka Configuration
config.kafkaBrokers      // string[]
config.kafkaClientId     // string
config.kafkaGroupId      // string

// JWT Authentication
config.jwtSecret         // string
config.jwtExpiresIn      // string

// Third-party Services
config.stripeSecretKey       // string | null
config.firebaseProjectId     // string | null
config.cloudinaryCloudName   // string | null
config.nextPublicApiUrl      // string
```

### 在模組配置中使用

許多 NestJS 模組在初始化時需要配置。使用非同步配置工廠：

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { KafkaModule } from '@suggar-daddy/kafka';
import { AppConfigService } from '@suggar-daddy/common';

@Module({
  imports: [
    // ❌ 不要這樣做（會得到未定義的值）
    // JwtModule.register({
    //   secret: process.env.JWT_SECRET,
    // }),

    // ✅ 正確做法（使用工廠函式）
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn },
      }),
    }),

    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
  ],
})
export class MyModule {}
```

## 驗證環境變數

### 自動驗證

應用啟動時會自動驗證環境變數。如果有問題，應用將失敗並顯示詳細錯誤：

```
⚠️  環境驗證失敗:
  - DB_HOST: must be a string
  - JWT_SECRET: is required in production
  - STRIPE_SECRET_KEY: must be a string when provided
```

### 手動驗證

如果需要在代碼中手動驗證，可以使用 `validateEnvironment` 函式：

```typescript
import { validateEnvironment } from '@suggar-daddy/common';

try {
  const validated = validateEnvironment(process.env);
  console.log('✅ 環境變數驗證通過');
} catch (error) {
  console.error('❌ 環境變數驗證失敗:', error.message);
  process.exit(1);
}
```

## 本地開發設定

### 快速開始

1. **複製環境模板**
   ```bash
   cp .env.example .env.local
   ```

2. **編輯 `.env.local` 設定本地值**
   ```env
   NODE_ENV=development
   LOG_LEVEL=debug
   
   # 數據庫
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # Kafka
   KAFKA_BROKERS=localhost:9092
   
   # JWT（開發可用簡單值）
   JWT_SECRET=dev-secret-key
   
   # 可選服務（開發時跳過）
   # STRIPE_SECRET_KEY=...
   # FIREBASE_PROJECT_ID=...
   ```

3. **在微服務中設定環境變數**

   每個微服務都應有自己的 `.env` 或使用根目錄的共享設定。

   對於 Docker Compose：
   ```yaml
   services:
     api-gateway:
       environment:
         - NODE_ENV=development
         - DB_HOST=postgres
         - REDIS_HOST=redis
         - KAFKA_BROKERS=kafka:9092
   ```

### Docker Compose 環境變數

將環境變數傳遞給 Docker 容器：

```yaml
version: '3.8'
services:
  api-gateway:
    image: suggar-daddy/api-gateway:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: postgres-service
      DB_PASSWORD: ${DB_PASSWORD}  # 從主機環境讀取
      REDIS_HOST: redis-service
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    depends_on:
      - postgres-service
      - redis-service
```

### 使用 env-cmd（推薦）

```bash
# 使用特定環境檔案運行
npx env-cmd -f .env.local npm run start

# 或直接在應用中
npm run start -- --env .env.local
```

## 常見問題

### Q: 如何為不同環境使用不同的環境變數？

**A:** 在應用目錄中創建環境特定的檔案：

```
.env                    # 預設
.env.local              # 本地開發（Git 忽略）
.env.development        # 開發環境
.env.staging            # 預安裝環境
.env.production         # 生產環境
```

然後在 `ConfigModule` 中設定：

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`, // .env.development.local
    `.env.${process.env.NODE_ENV}`,       // .env.development
    '.env.local',                          // .env.local
    '.env'                                 // .env
  ],
})
```

### Q: 生產環境如何安全地傳遞祕密？

**A:** 從不提交祕密到代碼庫。而是使用：

1. **CI/CD 環境變數**
   ```yaml
   # GitHub Actions
   - name: Deploy
     env:
       DB_PASSWORD: ${{ secrets.PROD_DB_PASSWORD }}
       JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
     run: npm run deploy
   ```

2. **容器編排祕密**
   ```bash
   # Kubernetes
   kubectl create secret generic app-secrets \
     --from-literal=db-password=$DB_PASSWORD \
     --from-literal=jwt-secret=$JWT_SECRET
   ```

3. **雲服務祕密管理**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager

### Q: 環境變數改變後如何重新載入？

**A:** 環境變數在應用啟動時讀取。若要更改配置，必須：

1. 更新環境變數（`.env`、系統變數、容器變數等）
2. 重新啟動應用程式

應用程式啟動時會再次驗證和載入所有環境變數。

### Q: 如何新增新的環境變數？

**A:** 按以下步驟：

1. **在 Joi 架構中定義**（`libs/common/src/config/env.validation.ts`）
   ```typescript
   const envValidationSchema = Joi.object({
     // ... 現有變數
     MY_NEW_VAR: Joi.string().required().default('default-value'),
   });
   ```

2. **在 AppConfigService 中新增 Getter**（`libs/common/src/config/app.config.ts`）
   ```typescript
   @Injectable()
   export class AppConfigService {
     get myNewVar(): string {
       return this.configService.get<string>('MY_NEW_VAR', 'default-value');
     }
   }
   ```

3. **在 `.env.example` 中記錄**
   ```env
   # My Feature
   MY_NEW_VAR=some-value
   ```

4. **在程式碼中使用**
   ```typescript
   const value = this.config.myNewVar;
   ```

### Q: 舊的代碼使用 `process.env` 怎麼辦？

**A:** 逐步遷移到 `AppConfigService`：

```typescript
// ❌ 舊寫法
const port = parseInt(process.env['PORT'] ?? '3000', 10);
const host = process.env['DB_HOST'] || 'localhost';

// ✅ 新寫法
const port = this.config.port;
const host = this.config.dbHost;
```

對於舊的代碼，可以使用 ESLint 規則強制遷移：

```javascript
// .eslintrc.js
{
  rules: {
    'no-process-env': 'warn',
  }
}
```

---

## 檢查清單

使用此清單進行環境變數管理實施驗證：

- [ ] 運行 `npm install` 以安裝 Joi 依賴
- [ ] 所有微服務 `AppModule` 都導入了 `EnvConfigModule`
- [ ] `.env.example` 檔案已更新所有變數
- [ ] 本地 `.env.local` 檔案已建立且正確配置
- [ ] 應用在啟動時沒有驗證錯誤
- [ ] 所有配置訪問都使用 `AppConfigService` 而不是 `process.env`
- [ ] 生產祕密沒有提交到版本控制
- [ ] CI/CD 管道設定了環境祕密
- [ ] 文檔已更新以反映新的配置方式

---

## 相關檔案

- [環境變數文檔](./ENV_VARS_DOCUMENTATION.md) - 完整的環境變數參考
- [Joi 驗證架構](./libs/common/src/config/env.validation.ts) - 驗證規則定義
- [應用配置服務](./libs/common/src/config/app.config.ts) - 類型化配置訪問
- [配置模組](./libs/common/src/config/env-config.module.ts) - 全局模組設定
- [.env.example](./.env.example) - 環境變數模板

---

**最後更新**: 2024 年
