export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  entities: string[];
  migrations: string[];
  synchronize: boolean;
  logging: boolean;
}

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface CloudflareConfig {
  zoneId: string;
  apiToken: string;
  domain: string;
}

export interface TranscodingConfig {
  enabled: boolean;
  qualities: Quality[];
  timeout: number;
  maxConcurrent: number;
}

export interface Quality {
  name: string;
  resolution: string;
  bitrate: string;
  fps: number;
  codec: string;
}

export const defaultQualities: Quality[] = [
  { name: '720p', resolution: '1280x720', bitrate: '2500k', fps: 30, codec: 'h264' },
  { name: '480p', resolution: '854x480', bitrate: '1500k', fps: 30, codec: 'h264' },
  { name: '360p', resolution: '640x360', bitrate: '800k', fps: 30, codec: 'h264' },
  { name: '240p', resolution: '426x240', bitrate: '400k', fps: 30, codec: 'h264' },
];

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  database: DatabaseConfig;
  s3: S3Config;
  cloudflare: CloudflareConfig;
  transcoding: TranscodingConfig;
  maxUploadSize: number; // bytes
  maxConcurrentUploads: number;
}
