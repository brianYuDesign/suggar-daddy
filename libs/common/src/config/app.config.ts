import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * 類型化的應用配置服務
 * 提供強型別的環境變數訪問，避免魔法字串和類型不安全
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // ─── Core Environment ───
  get nodeEnv(): "development" | "staging" | "production" {
    return this.configService.get<"development" | "staging" | "production">(
      "NODE_ENV",
      "development",
    );
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  get isStaging(): boolean {
    return this.nodeEnv === "staging";
  }

  get logLevel(): string {
    return this.configService.get<string>("LOG_LEVEL", "info");
  }

  // ─── Server Configuration ───
  get port(): number {
    return this.configService.get<number>("PORT", 3000);
  }

  get corsOrigins(): string[] {
    const origins = this.configService.get<string>(
      "CORS_ORIGINS",
      "http://localhost:4200",
    );
    return origins.split(",").map((o) => o.trim());
  }

  // ─── Database Configuration ───
  get dbHost(): string {
    return this.configService.get<string>("DB_HOST", "localhost");
  }

  get dbPort(): number {
    return this.configService.get<number>("DB_PORT", 5432);
  }

  get dbUsername(): string {
    return this.configService.get<string>("DB_USERNAME", "postgres");
  }

  get dbPassword(): string {
    return this.configService.get<string>("DB_PASSWORD", "postgres");
  }

  get dbDatabase(): string {
    return this.configService.get<string>("DB_DATABASE", "suggar_daddy");
  }

  get dbMasterHost(): string | null {
    return this.configService.get<string>("DB_MASTER_HOST") ?? null;
  }

  get dbReplicaHosts(): string[] {
    const hosts = this.configService.get<string>("DB_REPLICA_HOSTS", "");
    return hosts ? hosts.split(",").map((h) => h.trim()) : [];
  }

  get dbPoolMax(): number {
    return this.configService.get<number>("DB_POOL_MAX", 20);
  }

  get dbPoolMin(): number {
    return this.configService.get<number>("DB_POOL_MIN", 5);
  }

  get dbPoolIdleTimeoutMs(): number {
    return this.configService.get<number>("DB_POOL_IDLE_TIMEOUT_MS", 30000);
  }

  get hasReadWriteSplit(): boolean {
    return !!this.dbMasterHost && this.dbReplicaHosts.length > 0;
  }

  // ─── Redis Configuration ───
  get redisHost(): string {
    return this.configService.get<string>("REDIS_HOST", "localhost");
  }

  get redisPort(): number {
    return this.configService.get<number>("REDIS_PORT", 6379);
  }

  get redisPassword(): string | null {
    return this.configService.get<string>("REDIS_PASSWORD") ?? null;
  }

  get redisDb(): number {
    return this.configService.get<number>("REDIS_DB", 0);
  }

  get redisUrl(): string {
    const password = this.redisPassword ? `${this.redisPassword}@` : "";
    return `redis://${password}${this.redisHost}:${this.redisPort}/${this.redisDb}`;
  }

  // ─── Kafka Configuration ───
  get kafkaBrokers(): string[] {
    const brokers = this.configService.get<string>(
      "KAFKA_BROKERS",
      "localhost:9092",
    );
    return brokers.split(",").map((b) => b.trim());
  }

  get kafkaClientId(): string {
    return this.configService.get<string>("KAFKA_CLIENT_ID", "default-client");
  }

  get kafkaGroupId(): string {
    return this.configService.get<string>("KAFKA_GROUP_ID", "default-group");
  }

  // ─── JWT Configuration ───
  get jwtSecret(): string {
    return this.configService.get<string>(
      "JWT_SECRET",
      "fallback-secret-key-change-in-production",
    );
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>("JWT_EXPIRES_IN", "7d");
  }

  // ─── Stripe Configuration ───
  get stripeSecretKey(): string | null {
    return this.configService.get<string>("STRIPE_SECRET_KEY") ?? null;
  }

  get stripeWebhookSecret(): string | null {
    return this.configService.get<string>("STRIPE_WEBHOOK_SECRET") ?? null;
  }

  get stripePublishableKey(): string | null {
    return this.configService.get<string>("STRIPE_PUBLISHABLE_KEY") ?? null;
  }

  // ─── Firebase Configuration ───
  get firebaseProjectId(): string | null {
    return this.configService.get<string>("FIREBASE_PROJECT_ID") ?? null;
  }

  get firebaseClientEmail(): string | null {
    return this.configService.get<string>("FIREBASE_CLIENT_EMAIL") ?? null;
  }

  get firebasePrivateKey(): string | null {
    return this.configService.get<string>("FIREBASE_PRIVATE_KEY") ?? null;
  }

  // ─── Cloudinary Configuration ───
  get cloudinaryCloudName(): string | null {
    return this.configService.get<string>("CLOUDINARY_CLOUD_NAME") ?? null;
  }

  get cloudinaryApiKey(): string | null {
    return this.configService.get<string>("CLOUDINARY_API_KEY") ?? null;
  }

  get cloudinaryApiSecret(): string | null {
    return this.configService.get<string>("CLOUDINARY_API_SECRET") ?? null;
  }

  // ─── AWS / S3 Configuration ───
  get awsRegion(): string {
    return this.configService.get<string>('AWS_REGION', 'ap-northeast-1');
  }

  get awsAccessKeyId(): string {
    return this.configService.get<string>('AWS_ACCESS_KEY_ID', '');
  }

  get awsSecretAccessKey(): string {
    return this.configService.get<string>('AWS_SECRET_ACCESS_KEY', '');
  }

  get s3Bucket(): string {
    return this.configService.get<string>('S3_BUCKET', 'suggar-daddy-videos');
  }

  // ─── CloudFront Configuration ───
  get cloudfrontDomain(): string {
    return this.configService.get<string>('CLOUDFRONT_DOMAIN', '');
  }

  get cloudfrontKeyPairId(): string {
    return this.configService.get<string>('CLOUDFRONT_KEY_PAIR_ID', '');
  }

  get cloudfrontPrivateKey(): string {
    return this.configService.get<string>('CLOUDFRONT_PRIVATE_KEY', '');
  }

  // ─── Frontend Configuration ───
  get nextPublicApiUrl(): string {
    return this.configService.get<string>(
      "NEXT_PUBLIC_API_URL",
      "http://localhost:3000",
    );
  }
}
