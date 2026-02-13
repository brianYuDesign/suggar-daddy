import * as Joi from "joi";

/**
 * 環境變數驗證 Schema
 * 定義所有環境變數的必需性、類型、範圍等規則
 * 啟動時自動驗證，缺少或無效的變數會立即拋出錯誤
 */
export const envValidationSchema = Joi.object({
  // ─── Core & Environment ───
  NODE_ENV: Joi.string()
    .valid("development", "staging", "production")
    .default("development"),
  LOG_LEVEL: Joi.string()
    .valid("debug", "info", "warn", "error")
    .default("info"),

  // ─── API Gateway & Server ───
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().default(
    "http://localhost:4200,http://localhost:4300",
  ),

  // ─── Database Configuration ───
  DB_HOST: Joi.string().default("localhost"),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().when("NODE_ENV", {
    is: "production",
    then: Joi.string().required(),
    otherwise: Joi.string().default("postgres"),
  }),
  DB_PASSWORD: Joi.string().when("NODE_ENV", {
    is: "production",
    then: Joi.string().required(),
    otherwise: Joi.string().default("postgres"),
  }),
  DB_DATABASE: Joi.string().default("suggar_daddy"),
  DB_MASTER_HOST: Joi.string().optional(),
  DB_REPLICA_HOSTS: Joi.string().optional(),
  DB_POOL_MAX: Joi.number().default(20),
  DB_POOL_MIN: Joi.number().default(5),
  DB_POOL_IDLE_TIMEOUT_MS: Joi.number().default(30000),

  // ─── Redis Configuration ───
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),

  // ─── Kafka Configuration ───
  KAFKA_BROKERS: Joi.string().default("localhost:9092"),
  KAFKA_CLIENT_ID: Joi.string().optional(),
  KAFKA_GROUP_ID: Joi.string().optional(),

  // ─── JWT Configuration ───
  JWT_SECRET: Joi.string().when("NODE_ENV", {
    is: "production",
    then: Joi.string().min(32).required().messages({
      "string.min": "JWT_SECRET must be at least 32 characters in production",
      "any.required": "JWT_SECRET is required in production",
    }),
    otherwise: Joi.string().optional(),
  }),
  JWT_EXPIRES_IN: Joi.string().default("7d"),

  // ─── Stripe Configuration ───
  STRIPE_SECRET_KEY: Joi.string().when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.string().allow("").default(""),
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().when("NODE_ENV", {
    is: "production",
    then: Joi.required(),
    otherwise: Joi.string().allow("").default(""),
  }),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),

  // ─── Firebase Configuration (Optional) ───
  FIREBASE_PROJECT_ID: Joi.string().allow("").default(""),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow("").default(""),
  FIREBASE_PRIVATE_KEY: Joi.string().allow("").default(""),

  // ─── Cloudinary Configuration (File Uploads) ───
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),

  // ─── Frontend Configuration ───
  NEXT_PUBLIC_API_URL: Joi.string().default("http://localhost:3000"),
})
  .unknown(true) // 允許未定義的環境變數（如 npm 注入的變數）
  .required();

/**
 * 驗證環境變數
 * 在應用啟動時調用此函數
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateEnvironment(envConfig: Record<string, any>) {
  const { error, value } = envValidationSchema.validate(envConfig, {
    abortEarly: false, // 收集所有錯誤，不只第一個
    stripUnknown: false,
  });

  if (error) {
    const errors = error.details.map(
      (detail) =>
        `${detail.path.join(".")}: ${detail.message} (received: ${JSON.stringify(detail.context?.value)})`,
    );
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }

  return value;
}
