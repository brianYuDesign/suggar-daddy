import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppConfigService } from "./app.config";
import { envValidationSchema, validateEnvironment } from "./env.validation";

/**
 * 全局配置模組
 * 集成環境變數驗證和類型化配置服務
 * 應該在應用程式啟動時在 AppModule 或 main.ts 中導入
 *
 * 使用方式：
 * - 在 AppModule 中導入: imports: [ConfigModule.forRoot(...), EnvConfigModule]
 * - 在服務中注入: constructor(private config: AppConfigService) {}
 * - 訪問配置: this.config.port, this.config.dbHost, 等
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        stripUnknown: false,
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class EnvConfigModule {
  constructor(private configService: AppConfigService) {
    // 在模組初始化時驗證所有環境變數
    validateEnvironment(process.env);
    // Logger not yet available at module init; use console.warn (allowed by lint rule)
    console.warn(
      `Environment configuration loaded successfully (${this.configService.nodeEnv})`,
    );
  }
}
