/**
 * 測試幫助函數
 * 提供常用的測試工具方法
 */

import axios, { AxiosInstance } from 'axios';
import * as jwt from 'jsonwebtoken';
import { TestEnvironment } from '../setup/test-environment';

export class TestHelpers {
  /**
   * 取得 API 端點 URL
   * 統一通過 API Gateway 訪問，或直接訪問微服務
   */
  static getApiUrl(service?: 'auth' | 'user' | 'content' | 'payment'): string {
    const config = TestEnvironment.getConfig();
    
    // 始終返回 Gateway 基礎 URL
    // 測試中自己拼接完整路徑如 /api/auth/register
    return config.apiGateway;
  }

  /**
   * 建立 HTTP 客戶端
   */
  static createHttpClient(baseURL: string, token?: string): AxiosInstance {
    const client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (token) {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return client;
  }

  /**
   * 建立使用 API Gateway 的 HTTP 客戶端
   */
  static createGatewayClient(service?: 'auth' | 'user' | 'content' | 'payment' | 'media', token?: string): AxiosInstance {
    const baseURL = this.getApiUrl();
    return this.createHttpClient(baseURL, token);
  }

  /**
   * 生成測試 JWT Token
   */
  static generateToken(
    payload: Record<string, any>,
    secret = 'test-jwt-secret',
    expiresIn = '1h'
  ): string {
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * 解析 JWT Token
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * 等待條件成立（輪詢）
   */
  static async waitFor(
    condition: () => Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    const {
      timeout = 10000,
      interval = 100,
      errorMessage = 'Condition not met within timeout',
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(errorMessage);
  }

  /**
   * 等待 Kafka 訊息
   */
  static async waitForKafkaMessage<T = any>(
    consumer: any,
    topic: string,
    predicate: (message: T) => boolean,
    timeout = 10000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for Kafka message on topic ${topic}`));
      }, timeout);

      consumer.run({
        eachMessage: async ({ message }: any) => {
          try {
            const value = JSON.parse(message.value.toString());
            if (predicate(value)) {
              clearTimeout(timer);
              resolve(value);
            }
          } catch (error) {
            // 忽略解析錯誤
          }
        },
      });
    });
  }

  /**
   * 等待 Redis 鍵值
   */
  static async waitForRedisKey(
    redisClient: any,
    key: string,
    timeout = 5000
  ): Promise<string | null> {
    return this.waitFor(
      async () => {
        const value = await redisClient.get(key);
        return value !== null;
      },
      {
        timeout,
        errorMessage: `Redis key ${key} not found within timeout`,
      }
    ).then(() => redisClient.get(key));
  }

  /**
   * 等待資料庫記錄
   */
  static async waitForDbRecord<T>(
    repository: any,
    criteria: any,
    timeout = 5000
  ): Promise<T> {
    let record: T | null = null;

    await this.waitFor(
      async () => {
        record = await repository.findOne({ where: criteria });
        return record !== null;
      },
      {
        timeout,
        errorMessage: 'Database record not found within timeout',
      }
    );

    return record!;
  }

  /**
   * 生成隨機字串
   */
  static randomString(length = 10): string {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  /**
   * 生成隨機郵箱
   */
  static randomEmail(): string {
    return `test-${this.randomString()}@example.com`;
  }

  /**
   * 生成隨機數字
   */
  static randomNumber(min = 0, max = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 睡眠
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 重試函數
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      retries?: number;
      delay?: number;
      onRetry?: (error: Error, attempt: number) => void;
    } = {}
  ): Promise<T> {
    const { retries = 3, delay = 1000, onRetry } = options;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        if (onRetry) onRetry(error as Error, i + 1);
        await this.sleep(delay);
      }
    }

    throw new Error('Retry failed');
  }

  /**
   * 格式化時間為 ISO 字串
   */
  static toISOString(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * 深度複製物件
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 驗證 API 回應格式
   */
  static validateApiResponse(response: any, expectedKeys: string[]): void {
    for (const key of expectedKeys) {
      if (!(key in response)) {
        throw new Error(`Missing key in API response: ${key}`);
      }
    }
  }

  /**
   * 建立模擬 Stripe 客戶
   */
  static createMockStripeCustomer(overrides = {}) {
    return {
      id: `cus_${this.randomString(14)}`,
      email: this.randomEmail(),
      created: Math.floor(Date.now() / 1000),
      ...overrides,
    };
  }

  /**
   * 建立模擬 Stripe 訂閱
   */
  static createMockStripeSubscription(customerId: string, overrides = {}) {
    return {
      id: `sub_${this.randomString(14)}`,
      customer: customerId,
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
      ...overrides,
    };
  }

  /**
   * 建立模擬 Stripe PaymentIntent
   */
  static createMockStripePaymentIntent(amount: number, overrides = {}) {
    return {
      id: `pi_${this.randomString(14)}`,
      amount,
      currency: 'usd',
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
      ...overrides,
    };
  }
}
