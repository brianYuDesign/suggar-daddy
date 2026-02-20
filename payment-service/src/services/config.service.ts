import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  getStripeApiKey(): string {
    return process.env.STRIPE_API_KEY || '';
  }

  getStripeWebhookSecret(): string {
    return process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  getStripeApiVersion(): string {
    return process.env.STRIPE_API_VERSION || '2024-04-10';
  }

  getDatabaseUrl(): string {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'payment_user';
    const password = process.env.DB_PASSWORD || 'payment_password';
    const database = process.env.DB_NAME || 'sugar_daddy_payment';

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  getJwtSecret(): string {
    return process.env.JWT_SECRET || 'default_jwt_secret';
  }

  getAppPort(): number {
    return parseInt(process.env.APP_PORT || '3002', 10);
  }

  getNodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  getLogLevel(): string {
    return process.env.LOG_LEVEL || 'debug';
  }

  getWebhookUrl(): string {
    return process.env.WEBHOOK_URL || 'http://localhost:3002/api/webhooks/stripe';
  }

  getWebhookTimeout(): number {
    return parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10);
  }

  getSendGridApiKey(): string {
    return process.env.SENDGRID_API_KEY || '';
  }

  getAwsRegion(): string {
    return process.env.AWS_REGION || 'us-east-1';
  }

  getAwsAccessKeyId(): string {
    return process.env.AWS_ACCESS_KEY_ID || '';
  }

  getAwsSecretAccessKey(): string {
    return process.env.AWS_SECRET_ACCESS_KEY || '';
  }

  getAwsS3Bucket(): string {
    return process.env.AWS_S3_BUCKET || 'payment-invoices';
  }
}
