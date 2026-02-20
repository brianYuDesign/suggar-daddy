import { Injectable } from '@nestjs/common';
import { AppConfig, DatabaseConfig, S3Config, CloudflareConfig, TranscodingConfig, defaultQualities } from './config.types';

@Injectable()
export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    return {
      port: parseInt(process.env.PORT || '3001'),
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      database: this.loadDatabaseConfig(),
      s3: this.loadS3Config(),
      cloudflare: this.loadCloudflareConfig(),
      transcoding: this.loadTranscodingConfig(),
      maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '524288000'), // 500MB
      maxConcurrentUploads: parseInt(process.env.MAX_CONCURRENT_UPLOADS || '5'),
    };
  }

  private loadDatabaseConfig(): DatabaseConfig {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'content_streaming',
      entities: ['dist/**/*.entity.js'],
      migrations: ['dist/database/migrations/*.js'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.DB_LOGGING === 'true',
    };
  }

  private loadS3Config(): S3Config {
    return {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      bucket: process.env.AWS_S3_BUCKET || 'content-streaming-videos',
    };
  }

  private loadCloudflareConfig(): CloudflareConfig {
    return {
      zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      domain: process.env.CLOUDFLARE_DOMAIN || '',
    };
  }

  private loadTranscodingConfig(): TranscodingConfig {
    return {
      enabled: process.env.TRANSCODING_ENABLED !== 'false',
      qualities: defaultQualities,
      timeout: parseInt(process.env.TRANSCODING_TIMEOUT || '3600000'), // 1 hour
      maxConcurrent: parseInt(process.env.TRANSCODING_MAX_CONCURRENT || '2'),
    };
  }

  get(): AppConfig {
    return this.config;
  }

  getDatabase(): DatabaseConfig {
    return this.config.database;
  }

  getS3(): S3Config {
    return this.config.s3;
  }

  getCloudflare(): CloudflareConfig {
    return this.config.cloudflare;
  }

  getTranscoding(): TranscodingConfig {
    return this.config.transcoding;
  }

  getPort(): number {
    return this.config.port;
  }

  getNodeEnv(): string {
    return this.config.nodeEnv;
  }
}
