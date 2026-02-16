import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Docker Secrets 管理工具類
 * 
 * 提供統一的方式來讀取 Docker secrets 或環境變數
 * 
 * 使用順序：
 * 1. 嘗試從環境變數 {KEY}_FILE 指定的檔案路徑讀取
 * 2. 嘗試從 /run/secrets/{key} 讀取 (Docker Swarm secrets)
 * 3. 回退到直接讀取環境變數 {KEY}
 * 4. 使用提供的預設值
 */

const SECRETS_PATH = '/run/secrets';

function readSecretFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8').trim();
  } catch (error) {
    return null;
  }
}

export function getSecret(
  key: string,
  defaultValue?: string,
  required = false
): string {
  // 1. 從 {KEY}_FILE 環境變數讀取
  const filePathFromEnv = process.env[`${key}_FILE`];
  if (filePathFromEnv) {
    const value = readSecretFile(filePathFromEnv);
    if (value !== null) return value;
  }

  // 2. 從 /run/secrets/{key} 讀取
  const secretFileName = key.toLowerCase();
  const dockerSecretPath = join(SECRETS_PATH, secretFileName);
  const dockerSecretValue = readSecretFile(dockerSecretPath);
  if (dockerSecretValue !== null) return dockerSecretValue;

  // 3. 從環境變數讀取
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== '') return envValue;

  // 4. 使用預設值
  if (defaultValue !== undefined) return defaultValue;

  // 必須但未找到
  if (required) {
    throw new Error(
      `Secret "${key}" is required but not found. ` +
      `Please set "${key}", "${key}_FILE", or "/run/secrets/${secretFileName}"`
    );
  }

  return '';
}

export function getSecrets(keys: string[]): Record<string, string> {
  const secrets: Record<string, string> = {};
  for (const key of keys) {
    secrets[key] = getSecret(key);
  }
  return secrets;
}

export function hasSecret(key: string): boolean {
  try {
    const value = getSecret(key);
    return value !== '';
  } catch {
    return false;
  }
}

export function getDatabaseConfig() {
  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'postgres',
    password: getSecret('POSTGRES_PASSWORD', 'postgres'),
    database: process.env.POSTGRES_DB || 'suggar_daddy',
  };
}

export function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: getSecret('REDIS_PASSWORD'),
  };
}

export function getJwtConfig() {
  return {
    secret: getSecret('JWT_SECRET', 'default-jwt-secret-change-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}

export function getStripeConfig() {
  return {
    secretKey: getSecret('STRIPE_SECRET_KEY'),
    webhookSecret: getSecret('STRIPE_WEBHOOK_SECRET'),
    publishableKey: getSecret('STRIPE_PUBLISHABLE_KEY'),
  };
}

export function getCloudinaryConfig() {
  return {
    cloudName: getSecret('CLOUDINARY_CLOUD_NAME'),
    apiKey: getSecret('CLOUDINARY_API_KEY'),
    apiSecret: getSecret('CLOUDINARY_API_SECRET'),
  };
}

export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '****';
  const start = secret.substring(0, 4);
  const end = secret.substring(secret.length - 4);
  return `${start}****${end}`;
}

export function validateProductionSecrets(requiredSecrets: string[]): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;
  
  const missingSecrets: string[] = [];
  for (const key of requiredSecrets) {
    if (!hasSecret(key)) {
      missingSecrets.push(key);
    }
  }
  
  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing required secrets in production: ${missingSecrets.join(', ')}`
    );
  }
}
